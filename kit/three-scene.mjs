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
  plane: { need: ["size"] }, // size [w, h] in the part's xy plane; optional screen: [px w, px h] for a canvas texture
  group: { need: [] },
};

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
    if (!["group", "ticks", "rail", "plane"].includes(part.kind)) solids++;
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
export const solidCount = (spec) => spec.parts.filter((p) => !["group", "ticks", "rail", "plane"].includes(p.kind)).length;
