import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../ripple-tank/model.mjs";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, Z, LAMP, IN, XS, START, optics, PAPER, DIPPERS, Z_PAPER } from "./scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const model = readFileSync(join(HERE, "../ripple-tank/model.mjs"), "utf8").replace(/^export /gm, "");
const at16 = M.stateOf(16, 50, optics), at28 = M.stateOf(28, 50, optics);

const live = `
const RANGE = M_RANGE, optics = ${JSON.stringify(optics)}, XS = ${XS}, LAMP = ${JSON.stringify(LAMP)}, ZW = ${Z.water};
const IN = ${JSON.stringify(IN)}, PAPER = ${JSON.stringify(PAPER)};
const { THREE } = fig;
const dark = fig.theme === "dark";
const FIELD = \`
uniform float uTime, uK, uDecay, uHalf, uAmp, uBeat;
uniform vec2 uSource;
float wave(vec2 p, vec2 s) {
  float r = max(distance(p, s), 0.6);
  return cos(uK * r - 6.2831853 * uBeat * uTime) * exp(-uDecay * r) * inversesqrt(max(r * uK / 6.2831853, 0.35));
}
float field(vec2 p) { return uAmp * (wave(p, uSource + vec2(0.0, -uHalf)) + wave(p, uSource + vec2(0.0, uHalf))); }
\`;
const uniforms = { uTime: { value: 0 }, uK: { value: 1 }, uDecay: { value: 0 }, uHalf: { value: START_SPACING / 2 }, uAmp: { value: 1 }, uBeat: { value: M_BEAT }, uSource: { value: new THREE.Vector2(XS, 0) },
  uLift: { value: optics.magnification }, uLamp: { value: new THREE.Vector2(LAMP[0], LAMP[1]) }, uInside: { value: new THREE.Vector2(IN.w / 2 - 8, IN.d / 2 - 8) },
  uFocus: { value: 0.5 }, uDark: { value: dark ? 1 : 0 } };
const vertex = \`varying vec2 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }\`;
const water = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, transparent: true, depthWrite: false, fragmentShader: FIELD + \`
uniform float uDark; varying vec2 vWorld;
void main() {
  float e = 0.35;
  vec2 g = vec2(field(vWorld + vec2(e, 0.0)) - field(vWorld - vec2(e, 0.0)), field(vWorld + vec2(0.0, e)) - field(vWorld - vec2(0.0, e))) / (2.0 * e);
  vec3 n = normalize(vec3(-g * 9.0, 1.0));
  float spec = pow(max(dot(n, normalize(vec3(-0.25, -0.35, 1.0))), 0.0), 60.0);
  float sky = 0.5 + 0.5 * n.x - 0.3 * n.y;
  vec3 deep = mix(vec3(0.62, 0.72, 0.72), vec3(0.08, 0.12, 0.13), uDark);
  vec3 lit = mix(vec3(0.92, 0.97, 0.97), vec3(0.36, 0.46, 0.48), uDark);
  vec3 c = mix(deep, lit, clamp(sky, 0.0, 1.0)) + spec * 0.8;
  gl_FragColor = vec4(c, mix(0.55, 0.8, uDark));
}\` });
const paper = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: FIELD + \`
uniform float uLift, uFocus, uDark; uniform vec2 uLamp, uInside; varying vec2 vWorld;
void main() {
  vec2 p = uLamp + (vWorld - uLamp) / uLift;
  vec2 edge = uInside - abs(p);
  float inside = smoothstep(0.0, 6.0, min(edge.x, edge.y));
  // A crest is a weak lens: brightness follows the surface's curvature (the field's negative Laplacian).
  float e = 0.5, c = field(p);
  float lap = (field(p + vec2(e, 0.0)) + field(p - vec2(e, 0.0)) + field(p + vec2(0.0, e)) + field(p - vec2(0.0, e)) - 4.0 * c) / (e * e);
  float light = 1.0 - clamp(uFocus * lap, -0.9, 1.6) * 0.55;
  float pool = 1.0 - smoothstep(60.0, 260.0, length(vWorld - uLamp)) * 0.35;
  vec3 paperTone = mix(vec3(0.96, 0.95, 0.91), vec3(0.42, 0.42, 0.40), uDark);
  vec3 shade = paperTone * mix(0.72, 1.0, 1.0 - uDark * 0.2);
  vec3 col = mix(shade * 0.78, paperTone * light, inside) * pool;
  gl_FragColor = vec4(col, 1.0);
}\` });
fig.parts.get("water").material = water;
fig.parts.get("paper").material = paper;
const dippers = ${JSON.stringify(DIPPERS)}.map((id) => fig.parts.get(id));
const bar = fig.parts.get("bar"), barZ = bar.position.z, eccentric = fig.parts.get("eccentric");
const knob = fig.parts.get("knob"), needle = fig.parts.get("meter-needle");
let f = START_F, s = START_SPACING, fTarget = f, sTarget = s, clock = 0;
const tour = idleTour(3600, () => runner.kick());
const stateNow = () => stateOf(f, s, optics);
function draw(time) {
  const st = stateNow();
  uniforms.uK.value = (2 * Math.PI) / st.lambdaMm;
  uniforms.uDecay.value = st.decay;
  uniforms.uHalf.value = s / 2;
  uniforms.uFocus.value = st.focus / (uniforms.uK.value * uniforms.uK.value * 1);
  uniforms.uTime.value = still.matches ? 0 : time;
  dippers[0].position.y = -s / 2; dippers[1].position.y = s / 2;
  // The bar dips at f, seen under a strobe BEAT Hz slower: it seems to bob at BEAT Hz.
  bar.position.z = barZ + (still.matches ? 0 : Math.sin(2 * Math.PI * M_BEAT * time) * 0.5);
  eccentric.rotation.x = still.matches ? 0 : 2 * Math.PI * M_BEAT * time;
  const share = (f - RANGE.frequency[0]) / (RANGE.frequency[1] - RANGE.frequency[0]);
  knob.rotation.z = -share * 4.4 + 2.2;
  needle.rotation.z = 1 - share * 2;
  readoutTo(stage, readoutOf(st), Math.round(f));
  stage.setAttribute("aria-valuetext", wordsOf(st));
  fig.render();
}
const runner = loop(stage, (dt, time) => {
  if (tour.touring) {
    clock += dt;
    fTarget = 18 + 10 * Math.sin(clock * 0.25);
    sTarget = 50 + 25 * Math.sin(clock * 0.17);
  }
  f = follow(f, fTarget, dt, 0.35);
  s = follow(s, sTarget, dt, 0.35);
  draw(time);
  return !still.matches || f !== fTarget || s !== sTarget;
});
const steer = (nf, ns) => { tour.touch(); fTarget = clamp(nf, ...RANGE.frequency); sTarget = clamp(ns, ...RANGE.spacing); runner.kick(); };
stage.addEventListener("pointermove", (event) => {
  const box = stage.getBoundingClientRect();
  const u = clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1), v = clamp(((event.clientY - box.top) / box.height - 0.15) / 0.7, 0, 1);
  steer(RANGE.frequency[0] + u * (RANGE.frequency[1] - RANGE.frequency[0]), RANGE.spacing[1] - v * (RANGE.spacing[1] - RANGE.spacing[0]));
});
stage.addEventListener("keydown", (event) => {
  const moves = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  steer(Math.round(fTarget) + move[0], Math.round(sTarget / 5) * 5 + move[1]);
});
draw(0);
`
  .replaceAll("M_RANGE", JSON.stringify(M.RANGE))
  .replaceAll("M_BEAT", String(M.BEAT))
  .replaceAll("START_SPACING", String(START.spacing))
  .replaceAll("START_F", String(START.frequency));

const cm = (mm) => (mm / 10).toFixed(1);
writeThreeFigure({
  dir: HERE,
  name: "ripple-tank-3d",
  scene,
  live,
  extra: model,
  width: 720,
  keys: [
    { mark: "lit", label: "The dippers: two balls on one vibrating bar" },
    { mark: "raised", label: "Water and its caustics on the paper, drawn by shaders from the same model" },
  ],
  caption: `A ripple tank seen by strobe light, as a three.js scene with two shader surfaces. Two dippers on one vibrating bar touch 6 mm of water in phase; the lamp flashes ${M.BEAT} times a second slower than they dip, so each wave seems to crawl outward at ${M.BEAT} Hz. Ripples this small are held flat by surface tension as well as gravity, ω² = (gk + σk³/ρ) tanh kh, so at 16 Hz the wavelength is ${(at16.lambdaMm / 10).toFixed(2)} cm. Dippers d apart draw 2⌊d/λ + ½⌋ nodal lines: ${at16.nodal} at 5 cm. The lamp is ${cm(LAMP[2] - Z.water)} cm above the water and the paper ${cm(Z.water - Z_PAPER)} cm below it, so the shadow is ${optics.magnification.toFixed(2)} times life size; each crest is a weak lens, and the paper sits ${at16.focus.toFixed(2)} of a crest's focal length down at 16 Hz, ${at28.focus.toFixed(2)} at 28 Hz.`,
  stage: { role: "slider", label: "Ripple tank: left and right arrows set the frequency, up and down the dipper spacing", attrs: { "aria-valuemin": M.RANGE.frequency[0], "aria-valuemax": M.RANGE.frequency[1], "aria-valuenow": START.frequency } },
});
