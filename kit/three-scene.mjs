// The scene contract for three.js figures: a plain-data description of every
// part, validated in Node before a page is built and read by kit/three-runtime.js
// in the browser. World units are about 1 px of the real thing, x and y on the
// floor and z up, exactly as in the SVG kit.

export const KINDS = {
  box: { need: ["size"] }, //        size [w, d, h], optional r (corner radius)
  cylinder: { need: ["r", "h"] }, // optional r2 (top radius), segments
  lathe: { need: ["profile"] }, //   profile [[radius, z], ...] turned about the part's z axis
  tube: { need: ["points", "r"] }, // points [[x, y, z], ...] in the parent's frame
  sphere: { need: ["r"] },
  torus: { need: ["r", "tube"] },
  ticks: { need: ["r", "count"] }, // radial ticks on a dial face: every (major), len [minor, major]
  rail: { need: ["from", "to", "step"] }, // straight ruler ticks along x: every, len [minor, major]
  disc: { need: ["r"] },
  extrude: { need: ["outline", "depth"] }, // outline [[a, b], ...] in plane "xy" (default, extruded up z) or "xz" (extruded along +y) // a flat disc in the part's xy plane, uv 0..1 across it (dial faces)
  instances: { need: ["shape", "items"] }, // one geometry drawn many times: shape box|cylinder|sphere, items [[x, y, z, rz?], ...]
  plane: { need: ["size"] }, // size [w, h] in the part's xy plane; optional screen: [px w, px h] for a canvas texture
  group: { need: [] },
};

/** Procedural textures (kit/three-looks.js TEXTURES) and the options each accepts. */
export const TEXTURE_KINDS = {
  brushed: ["color", "seed"], knurl: ["pitch"], dial: ["count", "every", "from", "step", "ring", "font", "reverse"],
  ruler: ["from", "to", "step", "every", "label"], label: ["title", "lines", "aspect"], pcb: ["seed"], paper: ["seed"], wood: ["seed", "color", "rings"], glyph: ["text", "ink", "font"],
};
const TEXTURE_COMMON = ["kind", "repeat", "project", "tile", "size"];
/** The shader library (kit/three-looks.js SHADERS), whether each is an effect (not a solid) and the uniforms it takes. */
export const SHADER_NAMES = {
  plume: { effect: true, uniforms: ["uTime", "uLevel", "uDiamonds", "uSpeed"] },
  ripple: { effect: false, uniforms: ["uTime", "uK", "uDecay", "uHalf", "uAmp", "uBeat", "uSource"] },
  caustics: { effect: false, uniforms: ["uTime", "uK", "uDecay", "uHalf", "uAmp", "uBeat", "uSource", "uLift", "uLamp", "uInside", "uFocus"] },
  crt: { effect: false, screen: true, uniforms: ["uTime", "uPower", "uWarm", "uVertical", "uLines", "uGlow", "uCurve", "uTint"] },
  glow: { effect: true, uniforms: ["uColor", "uLevel", "uPower"] },
};
export const RAMP_NAMES = ["heat", "stress", "depth", "temper", "tone"];
const MATERIAL_RANGES = { metal: [0, 1], rough: [0, 1], transmission: [0, 1], ior: [1, 2.5], thickness: [0, 500], clearcoat: [0, 1], clearcoatRough: [0, 1], sheen: [0, 1], iridescence: [0, 1], tintDistance: [0.1, 1e6] };
const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const isUniform = (value) => isNum(value) || isHex(value) || (Array.isArray(value) && (value.length === 2 || value.length === 3) && value.every(isNum));

/** True when a part is a visual effect (a plume, a glow) and so not a solid. */
export const isEffect = (part) => !!(part.shader && SHADER_NAMES[part.shader.name]?.effect);
const isSolid = (part) => !["group", "ticks", "rail", "plane", "disc"].includes(part.kind) && !isEffect(part);

function lookProblems(part, bad, name) {
  const t = part.texture;
  if (t !== undefined) {
    if (!t || !TEXTURE_KINDS[t.kind]) bad(`${name}: texture.kind must be one of ${Object.keys(TEXTURE_KINDS).join(", ")}`);
    else {
      for (const key of Object.keys(t)) if (!TEXTURE_COMMON.includes(key) && !TEXTURE_KINDS[t.kind].includes(key)) bad(`${name}: texture ${t.kind} does not take "${key}"`);
      if (t.repeat !== undefined && !(isVec(t.repeat, 2) && t.repeat.every((v) => v > 0))) bad(`${name}: texture.repeat must be [u, v] > 0`);
      if (t.project !== undefined && !["box", "top"].includes(t.project)) bad(`${name}: texture.project must be "box" or "top"`);
      if (t.project !== undefined && !(isNum(t.tile ?? 20) && (t.tile ?? 20) > 0)) bad(`${name}: texture.tile must be positive (world units per repeat)`);
      if (t.project && t.repeat) bad(`${name}: use texture.project with tile, or repeat, not both`);
      if (["dial", "ruler", "label", "glyph"].includes(t.kind) && (t.project || t.repeat)) bad(`${name}: a ${t.kind} texture is a picture, not a pattern: it must not repeat or be projected`);
      if (t.kind === "dial" && !["disc", "plane"].includes(part.kind)) bad(`${name}: a dial texture belongs on a disc or plane (their uv spans the face)`);
      if (t.kind === "dial" && isNum(t.count) && isNum(t.every) && t.count % t.every !== 0) bad(`${name}: dial count must be a multiple of every`);
      if (t.kind === "label" && t.lines !== undefined && !(Array.isArray(t.lines) && t.lines.every((l) => typeof l === "string"))) bad(`${name}: label lines must be strings`);
      if (t.kind === "glyph" && !(typeof t.text === "string" && t.text.length >= 1 && t.text.length <= 4)) bad(`${name}: a glyph is 1 to 4 characters of text`);
      if (t.kind === "glyph" && part.kind !== "plane") bad(`${name}: a glyph goes on a plane laid on the face it labels`);
      if (t.kind === "glyph" && t.ink !== undefined && !isHex(t.ink)) bad(`${name}: glyph ink must be #rrggbb`);
      if (t.kind === "brushed" || t.kind === "wood") if (t.color !== undefined && !isHex(t.color)) bad(`${name}: texture.color must be #rrggbb`);
      if (t.size !== undefined && !(isNum(t.size) && t.size >= 64 && t.size <= 2048)) bad(`${name}: texture.size must be 64-2048 px`);
    }
  }
  const sh = part.shader;
  if (sh !== undefined) {
    const known = sh && SHADER_NAMES[sh.name];
    if (!known) bad(`${name}: shader.name must be one of ${Object.keys(SHADER_NAMES).join(", ")}`);
    else {
      for (const [key, value] of Object.entries(sh.uniforms ?? {})) {
        if (!known.uniforms.includes(key)) bad(`${name}: shader ${sh.name} has no uniform ${key}`);
        else if (!isUniform(value)) bad(`${name}: uniform ${key} must be a number, [x, y(, z)] or #rrggbb`);
      }
      if (known.screen && !part.screen) bad(`${name}: shader ${sh.name} draws a screen: give the plane screen: [w, h]`);
      if (part.texture || part.material || part.colors) bad(`${name}: a shader part takes no texture, material or colors (the shader is the look)`);
      if (sh.name === "plume" && !(part.kind === "cylinder" && part.open)) bad(`${name}: a plume needs an open cylinder (open: true), uv.y along the flow`);
      if (sh.name === "glow" && part.kind !== "sphere") bad(`${name}: a glow is a sphere round its light`);
      if ((sh.name === "ripple" || sh.name === "caustics") && part.kind !== "plane") bad(`${name}: a ${sh.name} shader goes on a plane`);
    }
  }
  const c = part.colors;
  if (c !== undefined) {
    if (!c || (c.ramp === undefined) === (c.stops === undefined)) bad(`${name}: colors needs exactly one of ramp or stops`);
    else {
      if (c.ramp !== undefined && !RAMP_NAMES.includes(c.ramp)) bad(`${name}: colors.ramp must be one of ${RAMP_NAMES.join(", ")}`);
      if (c.stops !== undefined && !(Array.isArray(c.stops) && c.stops.length >= 2 && c.stops.every((st, i) => Array.isArray(st) && isNum(st[0]) && st[0] >= 0 && st[0] <= 1 && isHex(st[1]) && (i === 0 || st[0] >= c.stops[i - 1][0])))) bad(`${name}: colors.stops must be [t, "#rrggbb"] pairs, t rising from 0 to 1`);
      if (c.axis !== undefined && !["x", "y", "z", "r"].includes(c.axis)) bad(`${name}: colors.axis must be x, y, z or r`);
      if (!(isVec(c.range, 2) && c.range[1] > c.range[0])) bad(`${name}: colors.range must be [low, high] with high > low`);
      if (["ticks", "rail", "group", "instances"].includes(part.kind)) bad(`${name}: ${part.kind} has no vertices to colour`);
      if (part.kind === "box" && !part.r) bad(`${name}: a sharp box has 24 vertices, too few for a gradient; give it r or use another kind`);
    }
  }
  const m = part.material;
  if (m !== undefined) {
    if (!m || typeof m !== "object") bad(`${name}: material must be an object`);
    else {
      for (const [key, value] of Object.entries(m)) {
        if (MATERIAL_RANGES[key]) { const [lo, hi] = MATERIAL_RANGES[key]; if (!(isNum(value) && value >= lo && value <= hi)) bad(`${name}: material.${key} must be in [${lo}, ${hi}]`); }
        else if (key === "tint" || key === "sheenColor") { if (!isHex(value)) bad(`${name}: material.${key} must be #rrggbb`); }
        else bad(`${name}: material has no field ${key}`);
      }
      if (m.metal !== undefined && part.metal !== undefined) bad(`${name}: set metal once (material.metal or metal)`);
      if (m.transmission && part.opacity !== undefined) bad(`${name}: a transmissive part is not also faded (drop opacity)`);
      if (m.transmission && m.metal > 0.1) bad(`${name}: metal does not transmit light (transmission with metal > 0.1)`);
    }
  }
  if (part.kind === "instances") {
    if (!["box", "cylinder", "sphere"].includes(part.shape)) bad(`${name}: instances shape must be box, cylinder or sphere`);
    if (part.shape === "box" && !(isVec(part.size, 3) && part.size.every((v) => v > 0))) bad(`${name}: box instances need size [w, d, h]`);
    if (part.shape === "cylinder" && !(isNum(part.r) && isNum(part.h))) bad(`${name}: cylinder instances need r and h`);
    if (part.shape === "sphere" && !isNum(part.r)) bad(`${name}: sphere instances need r`);
    if (!(Array.isArray(part.items) && part.items.length >= 2 && part.items.every((p) => isVec(p, 3) || isVec(p, 4)))) bad(`${name}: items must be at least two [x, y, z] or [x, y, z, rz] (one copy is a part, not instances)`);
    if (part.itemColors !== undefined && !(Array.isArray(part.itemColors) && part.itemColors.every(isHex))) bad(`${name}: itemColors must be #rrggbb strings`);
  }
  if (part.kind === "extrude") {
    if (!(Array.isArray(part.outline) && part.outline.length >= 3 && part.outline.every((p) => isVec(p, 2)))) bad(`${name}: outline must be at least three [a, b] points`);
    if (!(isNum(part.depth) && part.depth > 0)) bad(`${name}: depth must be positive`);
    if (part.plane !== undefined && !["xy", "xz"].includes(part.plane)) bad(`${name}: plane must be "xy" or "xz"`);
  }
  if (part.cut !== undefined && part.cut !== true) bad(`${name}: cut is true or absent`);
  if (part.open !== undefined && part.kind !== "cylinder") bad(`${name}: open applies to cylinders`);
}

export const TONES = ["lo", "mid", "hi", "faint"];
export const SIZES = { figure: [40, 80], hero: [80, 150], epic: [150, Infinity] };

const isNum = (value) => typeof value === "number" && Number.isFinite(value);
const isVec = (value, length) => Array.isArray(value) && value.length === length && value.every(isNum);

/** Returns a list of problems; an empty list means the scene is valid. */
export function validateScene(spec) {
  const problems = [];
  const bad = (message) => problems.push(message);
  if (!spec || typeof spec !== "object") return ["scene must be an object"];
  for (const key of ["fig", "title", "hint", "readout"]) if (typeof spec[key] !== "string" || !spec[key]) bad(`${key} must be a non-empty string`);
  const camera = spec.camera ?? {};
  if (!isNum(camera.azimuth) || camera.azimuth < 0 || camera.azimuth > 90) bad("camera.azimuth must be a number from 0 to 90");
  if (!isNum(camera.elevation) || camera.elevation < 10 || camera.elevation > 80) bad("camera.elevation must be a number from 10 to 80");
  if (!Array.isArray(spec.parts) || spec.parts.length === 0) return [...problems, "parts must be a non-empty array"];
  const ids = new Map();
  let solids = 0;
  let lit = 0;
  spec.parts.forEach((part, index) => {
    const name = part?.id ? `part "${part.id}"` : `part #${index}`;
    if (!part || typeof part.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(part.id)) return bad(`${name}: id must be kebab-case`);
    if (ids.has(part.id)) bad(`${name}: duplicate id`);
    ids.set(part.id, part);
    const kind = KINDS[part.kind];
    if (!kind) return bad(`${name}: unknown kind "${part.kind}" (use ${Object.keys(KINDS).join(", ")})`);
    for (const key of kind.need) if (part[key] === undefined) bad(`${name}: ${part.kind} needs ${key}`);
    if (part.at !== undefined && !isVec(part.at, 3)) bad(`${name}: at must be [x, y, z]`);
    if (part.rot !== undefined && !isVec(part.rot, 3)) bad(`${name}: rot must be [rx, ry, rz] in degrees`);
    if (part.scale !== undefined && !(isNum(part.scale) && part.scale > 0)) bad(`${name}: scale must be a positive number`);
    if (part.tone !== undefined && !TONES.includes(part.tone)) bad(`${name}: tone must be one of ${TONES.join(", ")}`);
    if (part.lit) lit++;
    if (part.kind === "box" && !(isVec(part.size, 3) && part.size.every((v) => v > 0))) bad(`${name}: size must be three positive numbers`);
    if (part.kind === "plane" && !(isVec(part.size, 2) && part.size.every((v) => v > 0))) bad(`${name}: size must be two positive numbers`);
    if (part.screen !== undefined && !(part.kind === "plane" && isVec(part.screen, 2) && part.screen.every((v) => v >= 16 && v <= 2048))) bad(`${name}: screen must be [w, h] pixels (16-2048) on a plane`);
    for (const key of ["color", "emissive"]) if (part[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(part[key])) bad(`${name}: ${key} must be a #rrggbb colour`);
    if (part.opacity !== undefined && !(isNum(part.opacity) && part.opacity > 0 && part.opacity <= 1)) bad(`${name}: opacity must be in (0, 1]`);
    if (part.metal !== undefined && !(isNum(part.metal) && part.metal >= 0 && part.metal <= 1)) bad(`${name}: metal must be in [0, 1]`);
    for (const key of ["r", "h", "tube"]) if (part[key] !== undefined && !(isNum(part[key]) && part[key] > 0)) bad(`${name}: ${key} must be positive`);
    if (part.kind === "lathe" && !(Array.isArray(part.profile) && part.profile.length >= 2 && part.profile.every((p) => isVec(p, 2) && p[0] >= 0))) bad(`${name}: profile must be at least two [radius >= 0, z] points`);
    if (part.kind === "tube" && !(Array.isArray(part.points) && part.points.length >= 2 && part.points.every((p) => isVec(p, 3)))) bad(`${name}: points must be at least two [x, y, z] points`);
    if (part.kind === "box" && part.r !== undefined && isVec(part.size, 3) && part.r * 2 >= [...part.size].sort((a, b) => a - b)[1]) bad(`${name}: corner radius too large for its size`);
    lookProblems(part, bad, name);
    if (isSolid(part)) solids++;
  });
  for (const part of spec.parts) {
    if (!part?.parent) continue;
    if (!ids.has(part.parent)) { bad(`part "${part.id}": parent "${part.parent}" does not exist`); continue; }
    const seen = new Set([part.id]);
    for (let at = ids.get(part.parent); at; at = at.parent ? ids.get(at.parent) : null) {
      if (seen.has(at.id)) { bad(`part "${part.id}": parent chain loops`); break; }
      seen.add(at.id);
    }
  }
  if (spec.section !== undefined && !(spec.section && ["x", "y", "z"].includes(spec.section.axis) && isNum(spec.section.at))) bad('section must be { axis: "x" | "y" | "z", at }');
  const cuts = spec.parts.filter((p) => p.cut);
  if (cuts.length && !spec.section) bad(`parts are cut (${cuts.slice(0, 3).map((p) => p.id).join(", ")}) but the scene has no section`);
  for (const p of cuts) if (p.shader || ["plane", "disc", "ticks", "rail", "group", "instances"].includes(p.kind)) bad(`part "${p.id}": only solid, non-shader parts can be cut`);
  if (spec.env !== undefined && !(spec.env === true || (spec.env && typeof spec.env === "object" && (spec.env.intensity === undefined || (isNum(spec.env.intensity) && spec.env.intensity >= 0 && spec.env.intensity <= 3))))) bad("env must be true or { intensity: 0-3 }");
  const reflective = spec.parts.filter((p) => (p.material?.metal ?? p.metal ?? 0) >= 0.7 || p.material?.transmission);
  if (reflective.length && !spec.env) bad(`metal (>= 0.7) and transmissive parts reflect their surroundings: set env (found ${reflective.map((p) => p.id).slice(0, 3).join(", ")})`);
  for (const light of spec.lights ?? []) if (!isVec(light?.at, 3)) bad("each light needs at: [x, y, z]");
  if (lit > 1) bad(`exactly one part may be lit, found ${lit}`);
  const size = spec.size ?? "figure";
  if (!SIZES[size]) bad(`size must be one of ${Object.keys(SIZES).join(", ")}`);
  else if (solids < SIZES[size][0]) bad(`a ${size} needs at least ${SIZES[size][0]} solid parts, found ${solids}`);
  return problems;
}

export function assertScene(spec) {
  const problems = validateScene(spec);
  if (problems.length) throw new Error(`scene is invalid:\n  ${problems.join("\n  ")}`);
  return spec;
}

/** Counts solid parts, for the readout of a build script. */
export const solidCount = (spec) => spec.parts.filter(isSolid).length;
