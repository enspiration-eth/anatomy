// Expressive looks for three.js figures: procedural textures, a shader library,
// vertex-colour ramps, a procedural studio environment and instancing helpers.
// Everything is generated in the page from code; there are no image assets.
// Inlined with kit/three-runtime.js by scripts/inline-three.mjs.
import * as THREE from "three";

// ---------------------------------------------------------------- ramps

/** Named colour ramps for vertex colours. Stops are [t, "#rrggbb"], t from 0 to 1. */
export const RAMPS = {
  // Blackbody-like: what a body looks like as it heats (cold violet-black to white-hot).
  heat: [[0, "#1b1530"], [0.3, "#7a1f1f"], [0.55, "#d9471b"], [0.8, "#ffb340"], [1, "#fff4d6"]],
  // Engineering stress: blue low, green, yellow, red high (as in a finite-element plot).
  stress: [[0, "#2f5bd9"], [0.35, "#2fb7c9"], [0.55, "#3ccf6e"], [0.75, "#f2cf3a"], [1, "#e8402a"]],
  // Depth below a surface: pale at the top, deep at the bottom.
  depth: [[0, "#c9eef7"], [0.5, "#3b8fb0"], [1, "#0d2a3d"]],
  // Steel temper colours: the oxide a steel surface takes as it is heated in air.
  temper: [[0, "#c9ced4"], [0.25, "#e2d28a"], [0.45, "#c08a42"], [0.65, "#7b3f86"], [0.85, "#3f57b8"], [1, "#6d8fa8"]],
  // A neutral grey ramp, for tone gradients that are not data.
  tone: [[0, "#2a2a2a"], [1, "#d4d4d4"]],
};

const parsed = new Map();
function stopsOf(ramp) {
  const key = typeof ramp === "string" ? ramp : JSON.stringify(ramp);
  if (!parsed.has(key)) parsed.set(key, (typeof ramp === "string" ? RAMPS[ramp] : ramp).map(([t, hex]) => [t, new THREE.Color(hex)]));
  return parsed.get(key);
}

/** The colour at t (clamped to 0..1) along a named ramp or a stops list. */
export function rampColor(ramp, t, out = new THREE.Color()) {
  const stops = stopsOf(ramp);
  const v = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
      return out.copy(c0).lerp(c1, t1 > t0 ? (v - t0) / (t1 - t0) : 0);
    }
  }
  return out.copy(stops[stops.length - 1][1]);
}

/**
 * Writes vertex colours. `fn(x, y, z, index)` gets each vertex in the mesh's own
 * frame and returns t (0..1, coloured through `ramp`) or a THREE.Color.
 */
export function paintVertices(mesh, fn, ramp = mesh.userData.ramp ?? "heat") {
  // Tone materials are shared between parts; painting gives this part its own, white, so the ramp reads true.
  if (!mesh.userData.painted) { mesh.material = mesh.material.clone(); mesh.material.color?.set(0xffffff); mesh.userData.painted = true; }
  const geometry = mesh.geometry, pos = geometry.attributes.position;
  let attr = geometry.attributes.color;
  if (!attr || attr.count !== pos.count) {
    attr = new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3);
    geometry.setAttribute("color", attr);
  }
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const v = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i);
    if (v instanceof THREE.Color) c.copy(v); else rampColor(ramp, v, c);
    attr.setXYZ(i, c.r, c.g, c.b);
  }
  attr.needsUpdate = true;
  if (!mesh.material.vertexColors) { mesh.material.vertexColors = true; mesh.material.needsUpdate = true; }
}

/** Bakes a part's `colors: { ramp, axis, range }` spec as a gradient along one local axis (or radius). */
export function bakeColors(mesh, spec) {
  const axis = spec.axis ?? "z";
  const [a, b] = spec.range;
  const along = { x: (x) => x, y: (x, y) => y, z: (x, y, z) => z, r: (x, y) => Math.hypot(x, y) }[axis];
  mesh.userData.ramp = spec.ramp ?? spec.stops;
  mesh.userData.painted = true; // a colors part already has its own material
  paintVertices(mesh, (x, y, z) => (along(x, y, z) - a) / (b - a), spec.ramp ?? spec.stops);
}

// ---------------------------------------------------------------- textures

/** A small seeded random generator, so every texture is the same on every load. */
function seeded(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s ^ (s << 13)) >>> 0, s = (s ^ (s >>> 17)) >>> 0, s = (s ^ (s << 5)) >>> 0) / 4294967296);
}
const canvasOf = (w, h = w) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
const tex = (canvas, { srgb = true, repeat = true } = {}) => {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};
const INK = { dark: { ink: "#e6e6e6", faint: "#8a8a82", face: "#1d1d1c", paper: "#3a3a36" }, light: { ink: "#18181a", faint: "#77776f", face: "#f4f4ef", paper: "#f6f3ea" } };

/**
 * Procedural texture generators. Each returns { map, roughnessMap?, bumpMap?, bumpScale?, plain? }.
 * `plain` means the map already carries the colour, so the material colour is white.
 */
export const TEXTURES = {
  // Brushed metal: fine streaks along u. The streaks live in the roughness and bump maps as well as the colour,
  // so the highlight stretches across the grain the way a real brushed surface's does.
  brushed({ color, seed = 3, size = 1024, theme }) {
    color ??= theme === "light" ? "#d2d5d8" : "#6c7076"; // a theme-aware default, like the tones
    const [c, g] = canvasOf(size), [r, gr] = canvasOf(size), rnd = seeded(seed);
    g.fillStyle = color; g.fillRect(0, 0, size, size);
    gr.fillStyle = "#8c8c8c"; gr.fillRect(0, 0, size, size);
    for (let i = 0; i < size * 5; i++) {
      const y = rnd() * size, len = size * (0.2 + rnd() * 0.8), x = rnd() * size, v = rnd();
      g.fillStyle = `rgba(${v > 0.5 ? "255,255,255" : "0,0,0"},${0.025 + rnd() * 0.05})`;
      g.fillRect(x, y, len, 1); g.fillRect(x - size, y, len, 1);
      gr.fillStyle = `rgba(${v > 0.5 ? "255,255,255" : "0,0,0"},${0.1 + rnd() * 0.2})`;
      gr.fillRect(x, y, len, 1); gr.fillRect(x - size, y, len, 1);
    }
    return { map: tex(c), roughnessMap: tex(r, { srgb: false }), bumpMap: tex(r, { srgb: false }), bumpScale: 0.15, plain: true };
  },
  // Knurling: a diamond cross-hatch carried by the bump map, for knobs and grips.
  knurl({ pitch = 16, size = 256 }) {
    const [c, g] = canvasOf(size);
    g.fillStyle = "#808080"; g.fillRect(0, 0, size, size);
    g.strokeStyle = "#202020"; g.lineWidth = Math.max(1, pitch / 5);
    for (let i = -size; i < size * 2; i += pitch) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + size, size); g.stroke();
      g.beginPath(); g.moveTo(i, size); g.lineTo(i + size, 0); g.stroke();
    }
    return { bumpMap: tex(c, { srgb: false }), bumpScale: 0.6 };
  },
  // A dial face: graduations and numerals laid out from the same numbers the model uses.
  // count marks round the face, a major mark every `every`, numerals on majors from `from` by `step`.
  dial({ count = 100, every = 10, from = 0, step = 10, ring = 0.92, size = 1024, theme, font = 0.07, reverse = false }) {
    const [c, g] = canvasOf(size), ink = INK[theme];
    const R = size / 2;
    g.fillStyle = ink.face; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = ink.faint; g.lineWidth = size * 0.004; g.beginPath(); g.arc(R, R, R * ring, 0, Math.PI * 2); g.stroke();
    g.fillStyle = ink.ink; g.strokeStyle = ink.ink; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `600 ${Math.round(size * font)}px ui-monospace, Menlo, monospace`;
    for (let i = 0; i < count; i++) {
      const a = ((reverse ? -1 : 1) * i / count) * Math.PI * 2 - Math.PI / 2;
      const major = i % every === 0;
      const r0 = R * ring, r1 = R * (ring - (major ? 0.1 : 0.05));
      g.lineWidth = size * (major ? 0.006 : 0.003);
      g.beginPath(); g.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0); g.lineTo(R + Math.cos(a) * r1, R + Math.sin(a) * r1); g.stroke();
      if (major) {
        const rt = R * (ring - 0.2);
        g.fillText(String(from + (i / every) * step), R + Math.cos(a) * rt, R + Math.sin(a) * rt);
      }
    }
    return { map: tex(c, { repeat: false }), plain: true };
  },
  // A printed scale along u: ticks every `step` units from `from` to `to`, numerals every `every` ticks.
  ruler({ from = 0, to = 100, step = 1, every = 10, label = 1, size = 2048, theme }) {
    const [c, g] = canvasOf(size, 128), ink = INK[theme];
    g.fillStyle = ink.face; g.fillRect(0, 0, size, 128);
    g.strokeStyle = ink.ink; g.fillStyle = ink.ink; g.font = "600 40px ui-monospace, Menlo, monospace"; g.textAlign = "center";
    const n = Math.round((to - from) / step);
    for (let i = 0; i <= n; i++) {
      const x = 8 + ((size - 16) * i) / n, major = i % every === 0, half = i % (every / 2) === 0;
      g.lineWidth = major ? 4 : 2;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, major ? 56 : half ? 40 : 26); g.stroke();
      if (major) g.fillText(String(Math.round((from + i * step) * label * 100) / 100), x, 104);
    }
    return { map: tex(c, { repeat: false }), plain: true };
  },
  // A label plate: a title, rule lines for printed detail, a border. Text is what a real plate would carry.
  label({ title = "", lines = [], size = 512, aspect = 0.5, theme }) {
    const h = Math.round(size * aspect), [c, g] = canvasOf(size, h), ink = INK[theme];
    g.fillStyle = ink.face; g.fillRect(0, 0, size, h);
    g.strokeStyle = ink.ink; g.lineWidth = 6; g.strokeRect(10, 10, size - 20, h - 20);
    g.fillStyle = ink.ink; g.textBaseline = "top";
    g.font = `700 ${Math.round(h * 0.2)}px ui-monospace, Menlo, monospace`; g.fillText(title, 28, 26);
    g.font = `500 ${Math.round(h * 0.11)}px ui-monospace, Menlo, monospace`;
    lines.forEach((line, i) => g.fillText(line, 28, 30 + h * 0.26 + i * h * 0.15));
    return { map: tex(c, { repeat: false }), plain: true };
  },
  // A key legend or engraved glyph: the text alone on a transparent ground (alpha-tested, so no sorting).
  glyph({ text = "", ink = "#26261f", size = 64, font = 0.66 }) {
    const [c, g] = canvasOf(size);
    g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${Math.round(size * font * (text.length > 2 ? 0.7 : 1))}px ui-monospace, Menlo, monospace`;
    g.fillText(text, size / 2, size / 2 + size * 0.03);
    return { map: tex(c, { repeat: false }), plain: true, alphaTest: 0.25 };
  },
  // A printed circuit board: FR-4 green, copper traces on a 45-degree router grid, pads, silkscreen outlines.
  pcb({ seed = 7, size = 1024, theme }) {
    const [c, g] = canvasOf(size), [b, gb] = canvasOf(size), rnd = seeded(seed);
    g.fillStyle = "#1d5a3a"; g.fillRect(0, 0, size, size);
    gb.fillStyle = "#606060"; gb.fillRect(0, 0, size, size);
    const grid = size / 64;
    for (let i = 0; i < 140; i++) {
      let x = Math.round(rnd() * 64) * grid, y = Math.round(rnd() * 64) * grid;
      g.strokeStyle = "#c9a04a"; gb.strokeStyle = "#a0a0a0"; g.lineWidth = gb.lineWidth = grid * (rnd() > 0.8 ? 0.6 : 0.3);
      g.beginPath(); gb.beginPath(); g.moveTo(x, y); gb.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const dir = Math.floor(rnd() * 8) * (Math.PI / 4) * (rnd() > 0.6 ? 1 : 0) + (rnd() > 0.5 ? 0 : Math.PI / 2) * (k % 2);
        const len = grid * (2 + Math.floor(rnd() * 10));
        x += Math.round(Math.cos(dir)) * len; y += Math.round(Math.sin(dir)) * len;
        g.lineTo(x, y); gb.lineTo(x, y);
      }
      g.stroke(); gb.stroke();
      g.fillStyle = "#d8b45a"; g.beginPath(); g.arc(x, y, grid * 0.6, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = "rgba(240,240,230,0.8)"; g.lineWidth = 2;
    for (let i = 0; i < 16; i++) g.strokeRect(Math.round(rnd() * 56) * grid, Math.round(rnd() * 56) * grid, grid * (3 + rnd() * 6), grid * (2 + rnd() * 4));
    return { map: tex(c), bumpMap: tex(b, { srgb: false }), bumpScale: 0.3, plain: true };
  },
  // Paper: fibre noise and a faint tooth, lighter than the card so the figure's surfaces read as paper.
  paper({ seed = 11, size = 512, theme }) {
    const [c, g] = canvasOf(size), rnd = seeded(seed), ink = INK[theme];
    g.fillStyle = ink.paper; g.fillRect(0, 0, size, size);
    for (let i = 0; i < size * 6; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "0,0,0"},${0.02 + rnd() * 0.03})`;
      const a = rnd() * Math.PI, l = 2 + rnd() * 10, x = rnd() * size, y = rnd() * size;
      g.save(); g.translate(x, y); g.rotate(a); g.fillRect(0, 0, l, 1); g.restore();
    }
    return { map: tex(c), plain: true };
  },
  // Wood: growth rings stretched along u with a little waviness, for cabinets, benches and handles.
  wood({ seed = 5, size = 1024, color = "#6b4a32", theme, rings = 48 }) {
    const [c, g] = canvasOf(size), rnd = seeded(seed);
    g.fillStyle = color; g.fillRect(0, 0, size, size);
    const f = (rings * Math.PI * 2) / size; // whole rings per tile, so the pattern tiles seamlessly
    for (let y = 0; y < size; y += 1) {
      const v = Math.sin(y * f + Math.sin((y / size) * Math.PI * 2 * 3) * 2.5) * 0.5 + 0.5;
      g.fillStyle = `rgba(0,0,0,${0.05 + v * 0.18})`;
      g.fillRect(0, y, size, 1);
    }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(rnd() * size, rnd() * size, 30 + rnd() * 120, 1); }
    return { map: tex(c), plain: true };
  },
};

/** Re-maps UVs in world units: a box (triplanar by face normal) or top-down projection, `tile` units per repeat. */
export function projectUVs(geometry, tile, mode = "box") {
  const pos = geometry.attributes.position, nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (mode === "top") { u = x; v = y; }
    else {
      const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
      if (az >= ax && az >= ay) { u = x; v = y; } else if (ax >= ay) { u = y; v = z; } else { u = x; v = z; }
    }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
}

// ---------------------------------------------------------------- shaders

const NOISE = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }`;
const DITHER = `float dither(vec2 p) { return (hash(p) - 0.5) / 255.0; }`;
const WORLD_VERTEX = `varying vec2 vWorld; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FIELD = `
uniform float uTime, uK, uDecay, uHalf, uAmp, uBeat;
uniform vec2 uSource;
float wave(vec2 p, vec2 s) {
  float r = max(distance(p, s), 0.6);
  return cos(uK * r - 6.2831853 * uBeat * uTime) * exp(-uDecay * r) * inversesqrt(max(r * uK / 6.2831853, 0.35));
}
float field(vec2 p) { return uAmp * (wave(p, uSource + vec2(0.0, -uHalf)) + wave(p, uSource + vec2(0.0, uHalf))); }`;
const uniformsOf = (defaults, given = {}) => Object.fromEntries(Object.entries({ ...defaults, ...given }).map(([k, v]) => [k, { value: Array.isArray(v) ? (v.length === 2 ? new THREE.Vector2(...v) : new THREE.Vector3(...v)) : typeof v === "string" ? new THREE.Color(v) : v }]));

/**
 * The shader library. Each entry takes ({ uniforms, theme, map }) and returns a ShaderMaterial whose
 * uniforms the live code drives (all share uTime and most uLevel, an envelope from 0 to 1).
 */
export const SHADERS = {
  // An exhaust plume on an open cylinder or cone, uv.y running from the exit (1) to the far end (0):
  // a hot core, a cooler mantle, Mach diamonds that fade downstream, turbulence that travels with the flow.
  plume({ uniforms, theme }) {
    const dark = theme === "dark";
    return new THREE.ShaderMaterial({
      uniforms: uniformsOf({ uTime: 0, uLevel: 0, uDiamonds: 4, uSpeed: 6, uDark: dark ? 1 : 0 }, uniforms),
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform float uTime, uLevel, uDiamonds, uSpeed, uDark; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${NOISE}${DITHER}
void main() {
  float d = 1.0 - vUv.y;
  float a = vUv.x * 6.2831853;
  float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);
  float shock = 0.5 + 0.5 * cos(d * 6.2831853 * uDiamonds);
  float turb = noise(vec2(a * 3.0, d * 9.0 - uTime * uSpeed)) * 0.6 + noise(vec2(a * 9.0, d * 22.0 - uTime * uSpeed * 2.3)) * 0.4;
  float body = facing * (0.55 + 0.45 * shock * (1.0 - d)) * (0.65 + 0.5 * turb);
  float ends = smoothstep(0.0, 0.04, d) * (1.0 - smoothstep(0.8, 1.0, d)) + (1.0 - smoothstep(0.0, 0.04, d));
  float k = clamp(body * ends * uLevel, 0.0, 1.0);
  vec3 hot = vec3(1.0, 0.88, 0.74), mid = vec3(1.0, 0.38, 0.22), cool = vec3(0.55, 0.12, 0.1);
  vec3 c = mix(hot, mix(mid, cool, smoothstep(0.3, 1.0, d)), smoothstep(0.0, 0.35, d));
  if (uDark > 0.5) gl_FragColor = vec4(c * k * 1.4 + dither(gl_FragCoord.xy), 1.0);
  else gl_FragColor = vec4(mix(c, vec3(0.75, 0.2, 0.12), 0.35), k * 0.85);
}`,
    });
  },
  // Water in a ripple tank: the surface height of two in-phase point sources, shaded by its slope.
  ripple({ uniforms, theme }) {
    const dark = theme === "dark";
    return new THREE.ShaderMaterial({
      uniforms: uniformsOf({ uTime: 0, uK: 0.5, uDecay: 0, uHalf: 25, uAmp: 1, uBeat: 0.75, uSource: [0, 0], uDark: dark ? 1 : 0 }, uniforms),
      transparent: true, depthWrite: false, vertexShader: WORLD_VERTEX,
      fragmentShader: `${FIELD}${NOISE}${DITHER}
uniform float uDark; varying vec2 vWorld;
void main() {
  float e = 0.35;
  vec2 g = vec2(field(vWorld + vec2(e, 0.0)) - field(vWorld - vec2(e, 0.0)), field(vWorld + vec2(0.0, e)) - field(vWorld - vec2(0.0, e))) / (2.0 * e);
  vec3 n = normalize(vec3(-g * 9.0, 1.0));
  float spec = pow(max(dot(n, normalize(vec3(-0.25, -0.35, 1.0))), 0.0), 60.0);
  float sky = 0.5 + 0.5 * n.x - 0.3 * n.y;
  vec3 deep = mix(vec3(0.62, 0.72, 0.72), vec3(0.08, 0.12, 0.13), uDark);
  vec3 lit = mix(vec3(0.92, 0.97, 0.97), vec3(0.36, 0.46, 0.48), uDark);
  gl_FragColor = vec4(mix(deep, lit, clamp(sky, 0.0, 1.0)) + spec * 0.8 + dither(gl_FragCoord.xy), mix(0.55, 0.8, uDark));
}`,
    });
  },
  // The caustics a ripple tank throws on the paper below: each point of paper looks up through the lamp's
  // magnification to the water, and a crest (a weak lens) brightens where the surface curves.
  caustics({ uniforms, theme }) {
    const dark = theme === "dark";
    return new THREE.ShaderMaterial({
      uniforms: uniformsOf({ uTime: 0, uK: 0.5, uDecay: 0, uHalf: 25, uAmp: 1, uBeat: 0.75, uSource: [0, 0], uLift: 1.5, uLamp: [0, 0], uInside: [100, 100], uFocus: 0.5, uDark: dark ? 1 : 0 }, uniforms),
      vertexShader: WORLD_VERTEX,
      fragmentShader: `${FIELD}${NOISE}${DITHER}
uniform float uLift, uFocus, uDark; uniform vec2 uLamp, uInside; varying vec2 vWorld;
void main() {
  vec2 p = uLamp + (vWorld - uLamp) / uLift;
  vec2 edge = uInside - abs(p);
  float inside = smoothstep(0.0, 6.0, min(edge.x, edge.y));
  float e = 0.5, c = field(p);
  float lap = (field(p + vec2(e, 0.0)) + field(p - vec2(e, 0.0)) + field(p + vec2(0.0, e)) + field(p - vec2(0.0, e)) - 4.0 * c) / (e * e);
  float light = 1.0 - clamp(uFocus * lap, -0.9, 1.6) * 0.55;
  float pool = 1.0 - smoothstep(60.0, 260.0, length(vWorld - uLamp)) * 0.35;
  vec3 paper = mix(vec3(0.96, 0.95, 0.91), vec3(0.42, 0.42, 0.40), uDark);
  vec3 col = mix(paper * 0.78, paper * light, inside) * pool;
  gl_FragColor = vec4(col + dither(gl_FragCoord.xy), 1.0);
}`,
    });
  },
  // A CRT: the picture from a canvas texture on a curved, scanned, masked tube face that glows.
  // uPower runs 1 (on) to 0 (off) and collapses the raster to a line, then a dot; uVertical turns the
  // raster for a monitor on its side; uWarm is the heater's warm-up (brightness and focus rise together).
  crt({ uniforms, map, theme }) {
    return new THREE.ShaderMaterial({
      uniforms: uniformsOf({ uMap: map, uTime: 0, uPower: 1, uWarm: 1, uVertical: 0, uLines: 240, uGlow: 0.6, uCurve: 0.12, uTint: [0.86, 1.0, 0.9] }, uniforms),
      toneMapped: false,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D uMap; uniform float uTime, uPower, uWarm, uVertical, uLines, uGlow, uCurve; uniform vec3 uTint; varying vec2 vUv;
${NOISE}${DITHER}
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  q *= 1.0 + uCurve * dot(q, q) * 0.25;                    // a curved face: the picture bows out at the edges
  vec2 uv = q * 0.5 + 0.5;
  // Power: the deflection collapses across the scan first (to a line), then along it (to a dot).
  float across = clamp(uPower * 2.0 - 1.0, 0.004, 1.0), along = clamp(uPower * 2.0, 0.01, 1.0);
  vec2 squash = uVertical > 0.5 ? vec2(across, along) : vec2(along, across);
  vec2 s = (uv - 0.5) / squash + 0.5;
  float inRaster = step(0.0, s.x) * step(s.x, 1.0) * step(0.0, s.y) * step(s.y, 1.0);
  float blur = (1.0 - uWarm) * 0.01 + 0.0015;
  vec3 pic = texture2D(uMap, s).rgb * 0.5 + (texture2D(uMap, s + vec2(blur, 0.0)).rgb + texture2D(uMap, s - vec2(blur, 0.0)).rgb + texture2D(uMap, s + vec2(0.0, blur)).rgb + texture2D(uMap, s - vec2(0.0, blur)).rgb) * 0.125;
  vec3 halo = (texture2D(uMap, s + vec2(0.01, 0.0)).rgb + texture2D(uMap, s - vec2(0.01, 0.0)).rgb + texture2D(uMap, s + vec2(0.0, 0.01)).rgb + texture2D(uMap, s - vec2(0.0, 0.01)).rgb) * 0.25;
  float line = uVertical > 0.5 ? s.x : s.y;
  float scan = 0.72 + 0.28 * sin(line * uLines * 3.14159265);  // scan lines run along the raster
  float px = (uVertical > 0.5 ? gl_FragCoord.y : gl_FragCoord.x);
  vec3 mask = vec3(0.9 + 0.1 * sin(px * 2.09), 0.9 + 0.1 * sin(px * 2.09 + 2.09), 0.9 + 0.1 * sin(px * 2.09 + 4.19));
  float bright = uWarm * (0.92 + 0.08 * noise(vec2(uTime * 30.0, 0.0)));
  float spot = (1.0 - smoothstep(0.5, 1.0, uPower)) * 2.5;   // a collapsing raster concentrates its energy
  vec3 c = (pic * scan * mask * 1.5 + halo * uGlow) * uTint * bright * (1.0 + spot) * inRaster;
  float edge = smoothstep(1.0, 0.86, max(abs(q.x), abs(q.y)));
  vec3 glass = vec3(0.025, 0.03, 0.03) * (1.0 - dot(q, q) * 0.3);
  gl_FragColor = vec4((glass + c) * edge + dither(gl_FragCoord.xy), 1.0);
}`,
    });
  },
  // A glow round a small light (an LED, a filament, a lamp): a rim that faces the viewer, scaled by uLevel.
  glow({ uniforms, theme }) {
    const dark = theme === "dark";
    return new THREE.ShaderMaterial({
      uniforms: uniformsOf({ uColor: "#3cff8a", uLevel: 1, uPower: 2.2 }, uniforms),
      transparent: true, depthWrite: false, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: "varying vec3 vN; varying vec3 vV; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform vec3 uColor; uniform float uLevel, uPower; varying vec3 vN; varying vec3 vV;
void main() { float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), uPower) * uLevel; gl_FragColor = vec4(uColor * f, f); }`,
    });
  },
};

// ---------------------------------------------------------------- environment

/**
 * A procedural studio for image-based lighting: a gradient dome (vertex colours) with two soft boxes and a
 * floor bounce, prefiltered by PMREMGenerator. Metal and glass need something to reflect; this is it.
 */
export function studioEnvironment(renderer, theme) {
  const dark = theme === "dark";
  const room = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  paintVertices(dome, (x, y, z) => (z / 50 + 1) / 2, dark ? [[0, "#0a0a0a"], [0.5, "#2a2a2a"], [1, "#5a5a5a"]] : [[0, "#9a9a96"], [0.5, "#d8d8d4"], [1, "#ffffff"]]);
  room.add(dome);
  const panel = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m);
  };
  panel(30, 14, -24, -30, 30, dark ? 3 : 2.2);  // key soft box, high front-left
  panel(16, 30, 36, 10, 16, dark ? 1.4 : 1.2);   // fill strip, right
  panel(40, 6, 0, 40, 6, dark ? 0.8 : 0.9);      // rim, behind
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.02).texture;
  pmrem.dispose();
  return env;
}

// ---------------------------------------------------------------- instancing

/** Geometry for one instance of an `instances` part. */
export function instanceGeometry(part) {
  const seg = part.segments ?? 16;
  if (part.shape === "box") return new THREE.BoxGeometry(...part.size).translate(0, 0, part.size[2] / 2);
  if (part.shape === "cylinder") return new THREE.CylinderGeometry(part.r2 ?? part.r, part.r, part.h, seg).rotateX(Math.PI / 2).translate(0, 0, part.h / 2);
  return new THREE.SphereGeometry(part.r, seg, Math.max(6, seg / 2));
}

/** An InstancedMesh with one copy per item [x, y, z, rz°?]; per-instance colours with `colors`. */
export function instancesOf(part, material) {
  const mesh = new THREE.InstancedMesh(instanceGeometry(part), material, part.items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  part.items.forEach(([x, y, z, rz = 0], i) => {
    e.set(...(part.tilt ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180)); e.z += (rz * Math.PI) / 180;
    mesh.setMatrixAt(i, m.compose(p.set(x, y, z), q.setFromEuler(e), one));
    if (part.itemColors) mesh.setColorAt(i, new THREE.Color(part.itemColors[i % part.itemColors.length]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
