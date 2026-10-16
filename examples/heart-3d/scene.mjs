// The human heart in a four-chamber section, as a three.js scene. One world unit is 1 mm. The section plane
// is y = 0 (the classic four-chamber view): walls, blood and valve roots behind it are clipped there, walls
// hatched and blood filled. Great vessels and coronaries lie behind the plane, uncut.
import { collector } from "../../kit/three-parts.mjs";

/** Publicly reported facts the figure uses, with sources. */
export const FACTS = {
  // [1] Merck Manual, Normal Pressures in the Heart and Great Vessels (averages, mmHg)
  ra: 3, rv: [25, 4], pa: [25, 9], la: 8, lv: [130, 9], artery: [130, 70],
  // [2] MSD Manual: representative saturation right heart 75%, left heart 95%
  satRight: 75, satLeft: 95,
  // [3] conduction: SA node 60-100 /min at rest, AV delay so the PR interval is 0.12-0.20 s
  restBpm: [60, 100], pr: [0.12, 0.2],
  // [4] Weissler: left-ventricular ejection time falls with rate, LVET ≈ 413 − 1.7 × HR ms (men)
  lvet: [413, 1.7],
};
export const SOURCES = [
  ["[1]", "Merck Manual Professional, Normal Pressures in the Heart and Great Vessels", "https://www.merckmanuals.com/professional/multimedia/table/normal-pressures-in-the-heart-and-great-vessels"],
  ["[2]", "MSD Manual Professional, Normal circulation with representative pressures (O₂ saturation 75% right, 95% left)", "https://www.msdmanuals.com/professional/multimedia/table/normal-circulation-with-representative-right-and-left-cardiac-pressures-in-mm-hg"],
  ["[3]", "Wikipedia, Electrical conduction system of the heart (SA node, AV delay, His–Purkinje)", "https://en.wikipedia.org/wiki/Electrical_conduction_system_of_the_heart"],
  ["[4]", "Weissler et al., Systolic time intervals in heart failure in man, Circulation 1968 (LVET–rate regression)", "https://doi.org/10.1161/01.CIR.37.2.149"],
  ["[5]", "Wikipedia, Cardiac cycle (phases; Wiggers diagram)", "https://en.wikipedia.org/wiki/Cardiac_cycle"],
];
export const SIMPLIFIED = [
  "A four-chamber section with the ventricles' long axes straightened to vertical; the outflow roots (aortic, pulmonary) are drawn in the same plane, though they lie in front of it.",
  "Chamber sizes and wall thicknesses are typical adult values (LV wall ~11 mm, RV ~4 mm), rounded.",
  "Pressures follow the Merck averages through a smooth textbook Wiggers model, not a measured trace; right-heart pressures are the left's shape, scaled.",
  "Blood is coloured by oxygen saturation (dark red at 75%, bright red at 95%), not blue: venous blood is not blue.",
  "Conduction timing is schematic: the atria activate from the SA node, the AV node holds the wave, then the ventricles activate from apex to base.",
  "Only two leaflets or cusps of each valve lie in the section; the tricuspid and the semilunar valves have three.",
];

/** One cardiac cycle at `bpm`: phase boundaries in seconds from the P wave. */
export function cycleOf(bpm) {
  const T = 60 / bpm, k = Math.sqrt(Math.min(1, T / 0.8));
  const pr = 0.16 * k, ivc = 0.05 * k, ej = (FACTS.lvet[0] - FACTS.lvet[1] * bpm) / 1000, ivr = 0.08 * k;
  const t = { T, atrialStart: 0.04 * k, atrialEnd: pr + 0.02, ivcStart: pr + 0.04 * k };
  t.ejStart = t.ivcStart + ivc; t.ejEnd = t.ejStart + ej; t.ivrEnd = t.ejEnd + ivr; t.rapidEnd = t.ivrEnd + Math.min(0.12, (T - t.ivrEnd) * 0.5);
  return t;
}
export const PHASES = ["Atrial systole", "Isovolumetric contraction", "Ejection", "Isovolumetric relaxation", "Rapid filling", "Diastasis"];
export function phaseAt(c, t) {
  if (t < c.atrialStart) return 5;
  if (t < c.ivcStart) return 0;
  if (t < c.ejStart) return 1;
  if (t < c.ejEnd) return 2;
  if (t < c.ivrEnd) return 3;
  if (t < c.rapidEnd) return 4;
  return 5;
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Pressures in mmHg at time t in the cycle (a smooth Wiggers model through the Merck averages). */
export function pressuresAt(c, t) {
  const [lvs, lvd] = FACTS.lv, adia = FACTS.artery[1];
  const kick = Math.sin(Math.PI * sm(c.atrialStart, c.atrialEnd, t)) * (t > c.atrialStart && t < c.atrialEnd + 0.03 ? 1 : 0);
  const ejx = (t - c.ejStart) / (c.ejEnd - c.ejStart);
  const aEnd = 100;
  let lv;
  if (t < c.ivcStart) lv = 5 + 4 * sm(0, c.atrialStart, t) + 4 * kick * 0 + (lvd - 5) * sm(c.atrialStart, c.atrialEnd, t);
  else if (t < c.ejStart) lv = lvd + (adia - lvd) * sm(c.ivcStart, c.ejStart, t);
  else if (t < c.ejEnd) lv = adia + (lvs - adia) * 1.1 * Math.sin(Math.PI * Math.min(1, ejx * 1.25) * 0.5) * (1 - 0.25 * sm(0.4, 1, ejx)) + (aEnd - lvs * 0.75) * sm(0.4, 1, ejx) * 0;
  else if (t < c.ivrEnd) lv = (aEnd - 2) * (1 - sm(c.ejEnd, c.ivrEnd, t)) + 5 * sm(c.ejEnd, c.ivrEnd, t);
  else lv = 5 - 2 * sm(c.ivrEnd, c.rapidEnd, t) + 2 * sm(c.rapidEnd, c.T, t);
  // The artery: follows the ventricle while the valve is open, then runs off exponentially to the diastolic value.
  const tau = (c.T - (c.ejEnd - c.ejStart)) / Math.log(aEnd / adia);
  const since = t >= c.ejEnd ? t - c.ejEnd : t + c.T - c.ejEnd;
  let ao = t >= c.ejStart && t < c.ejEnd ? Math.max(lv - 3 * Math.sin(Math.PI * ejx), adia) : Math.max(adia, aEnd * Math.exp(-since / tau)) - (t >= c.ejEnd && t < c.ejEnd + 0.03 ? 4 * Math.sin((Math.PI * (t - c.ejEnd)) / 0.03) : 0);
  if (t >= c.ejStart && t < c.ejEnd) ao = Math.max(ao, adia);
  const la = FACTS.la - 2 + 4 * kick + 3 * sm(c.ejStart, c.ejEnd, t) * (t < c.ivrEnd ? 1 : 0) - 2 * sm(c.ivrEnd, c.rapidEnd, t) * (t >= c.ivrEnd && t < c.rapidEnd ? 1 : 0);
  const r = FACTS.rv[0] / lvs;
  const rv = Math.max(FACTS.rv[1] * (lv / lvd) * (lv < 20 ? 1 : 0), lv * r) , pa = FACTS.pa[1] + (ao - adia) * ((FACTS.pa[0] - FACTS.pa[1]) / (lvs - adia));
  const ra = FACTS.ra - 1 + 3 * kick + 1.5 * sm(c.ejStart, c.ejEnd, t) * (t < c.ivrEnd ? 1 : 0);
  return { lv, ao, la, rv, pa, ra };
}

const { parts, add } = collector();
// Chamber geometry. Ventricles are semi-ellipsoid shells, apex down; atria are spherical shells open below.
export const LV = { x: 22, apex: 0, len: 90, r: 30, wall: 11 };
export const RV = { x: -30, apex: 15, len: 75, r: 24, wall: 4 };
export const PLATE_Z = 90, PLATE_H = 4;
export const RA = { x: -36, R: 24, open: 14, wall: 2.5 };
export const LA = { x: 28, R: 22, open: 14, wall: 2.5 };
export const VALVES = { tricuspid: { x: -34, r: 14 }, pulmonary: { x: -14, r: 9 }, aortic: { x: 6, r: 9 }, mitral: { x: 28, r: 14 } };
const sat = (s) => (s - 60) / 40; // saturation to t on the oxygen ramp
export const SAT_T = { right: sat(FACTS.satRight), left: sat(FACTS.satLeft) };

const N = 28;
const ventricleProfile = ({ len, r, wall }) => {
  const outer = Array.from({ length: N + 1 }, (_, i) => { const z = (i / N) * len; return [r * Math.sqrt(Math.max(0, 1 - ((len - z) / len) ** 2)), z]; });
  const ri = r - wall, li = len - wall;
  const inner = Array.from({ length: N + 1 }, (_, i) => { const z = len - (i / N) * li; return [ri * Math.sqrt(Math.max(0, 1 - ((len - z) / li) ** 2)), z]; });
  return { shell: [...outer, ...inner], cavity: [...[...inner].reverse().map(([a, z]) => [Math.max(0, a - 0.6), z]), [0, len - 0.4]].filter((p, i, a) => i === 0 || p[1] >= a[i - 1][1] - 1e-6) };
};
const atriumProfile = ({ R, open, wall }) => {
  const h = Math.sqrt(R * R - open * open), a0 = Math.atan2(-h, open);
  const arc = (rad, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((Math.PI / 2 - a0) * i) / n; return [Math.max(0, Math.cos(a) * rad), h + Math.sin(a) * rad]; });
  const outer = arc(R, 24), inner = arc(R - wall, 24).reverse();
  return { shell: [...outer, ...inner], cavity: [[0, h - Math.sqrt((R - wall) ** 2 - open * open) + 0.4], ...arc(R - wall - 0.6, 24).slice(1)].filter((p, i, a) => i === 0 || p[1] >= a[i - 1][1] - 1e-6), h };
};
const MUSCLE = (seed) => ({ texture: { kind: "fiber", seed, waves: 4 }, rough: 0.55, cut: true, hatch: "#b0484a" });

// Ventricles: muscle shells and their blood.
for (const [id, v, side] of [["lv", LV, "left"], ["rv", RV, "right"]]) {
  const p = ventricleProfile(v);
  add({ id, kind: "group", at: [v.x, 0, v.apex] });
  add({ id: `${id}-wall`, kind: "lathe", segments: 64, profile: p.shell, ...MUSCLE(id === "lv" ? 13 : 29), parent: id });
  add({ id: `${id}-blood`, kind: "lathe", segments: 64, profile: p.cavity, colors: { ramp: "oxygen", axis: "z", range: [-80, v.len + 80] }, rough: 0.35, cut: "solid", parent: id });
}
// Atria.
for (const [id, a] of [["ra", RA], ["la", LA]]) {
  const p = atriumProfile(a);
  add({ id, kind: "group", at: [a.x, 0, PLATE_Z + PLATE_H - (p.h - Math.sqrt(a.R * a.R - a.open * a.open)) - 0.5] });
  add({ id: `${id}-wall`, kind: "lathe", segments: 64, profile: p.shell, ...MUSCLE(id === "ra" ? 41 : 53), parent: id });
  add({ id: `${id}-blood`, kind: "lathe", segments: 64, profile: p.cavity, colors: { ramp: "oxygen", axis: "z", range: [-60, 120] }, rough: 0.35, cut: "solid", parent: id });
}
// The fibrous skeleton: the plate between atria and ventricles with the four valve rings.
const ring = (x, r, n = 28) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);
const plate = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return [-2 + Math.cos(a) * 54, Math.sin(a) * 26]; });
add({ id: "fibrous-skeleton", kind: "extrude", outline: plate, holes: Object.values(VALVES).map((v) => ring(v.x, v.r)), depth: PLATE_H, at: [0, 0, PLATE_Z], color: "#efe2c8", rough: 0.5, cut: true, hatch: "#d9c7a0" });
// Outflow roots (aortic, pulmonary): short shells with sinuses above the plate.
for (const [id, v] of [["aortic-root", VALVES.aortic], ["pulmonary-root", VALVES.pulmonary]]) {
  add({ id, kind: "lathe", segments: 48, profile: [[v.r, 0], [v.r + 3, 6], [v.r + 2, 16], [v.r, 22], [v.r - 1.5, 22], [v.r - 0.5, 16], [v.r + 1, 6], [v.r - 1.5, 0]], at: [v.x, 0, PLATE_Z + PLATE_H], color: "#d9b0a0", rough: 0.5, cut: true, hatch: "#c08070" });
}
// Valves: two leaflets or cusps in the section per valve, each on a hinge group at its ring.
export const LEAFLETS = [];
for (const [name, v] of Object.entries(VALVES)) {
  const av = name === "tricuspid" || name === "mitral";
  for (const side of [-1, 1]) {
    const id = `${name}-${side < 0 ? "a" : "b"}`;
    const hz = av ? PLATE_Z + 0.5 : PLATE_Z + PLATE_H + 1;
    add({ id, kind: "group", at: [v.x + side * (v.r - 0.6), 0.5, hz] });
    const len = av ? v.r + 3 : v.r - 0.8;
    add({ id: `${id}-leaf`, kind: "box", size: [len, av ? 12 : 9, av ? 1.4 : 1.1], r: 0.5, at: [(-side * len) / 2, av ? 6 : 4.5, -0.7], color: "#f0d8c8", rough: 0.6, parent: id });
    LEAFLETS.push({ id, valve: name, side, av });
  }
}
// Papillary muscles and trabeculae inside the ventricles (behind the section).
for (const [i, [x, z, h, r]] of [[LV.x - 12, 18, 24, 5], [LV.x + 12, 22, 22, 5], [RV.x - 8, 30, 18, 3.5], [RV.x + 8, 32, 16, 3.5]].entries())
  add({ id: `papillary-${i}`, kind: "cylinder", r, r2: 1.5, h, at: [x, 10, z], color: "#9a3a3a", rough: 0.6 });
for (let i = 0; i < 12; i++) {
  const lv = i < 7, v = lv ? LV : RV, a = (lv ? 0.3 : 0.4) + (i % 7) * 0.33, z = v.apex + 14 + (i % 4) * 12;
  const zz = z - v.apex, rr = (v.r - v.wall) * Math.sqrt(Math.max(0, 1 - ((v.len - zz) / (v.len - v.wall)) ** 2)) - 1;
  add({ id: `trabecula-${i}`, kind: "cylinder", r: 1.3, h: 7, rot: [0, 90 - (a * 180) / Math.PI, 0], at: [v.x + Math.cos(a) * rr * 0.98, Math.sin(a) * rr * 0.98, z], color: "#8a2e2e", rough: 0.6, edges: false });
}
add({ id: "moderator-band", kind: "tube", points: [[RV.x + 14, 8, 40], [RV.x, 10, 36], [RV.x - 14, 8, 38]], r: 1.6, color: "#8a2e2e", rough: 0.6 });

// Great vessels with flow shaders, coloured by saturation along their length.
export const OXY = { venous: "#6a1a34", arterial: "#c8282b" };
const vessel = (id, points, r, a, b, speed = 0.6) => add({ id, kind: "tube", points, r, shader: { name: "flow", uniforms: { uA: a, uB: b, uSpeed: speed, uStripes: 10, uLevel: 0.5 } } });
const [AX, PX] = [VALVES.aortic.x, VALVES.pulmonary.x], TOP = PLATE_Z + PLATE_H + 22;
vessel("aorta", [[AX, 6, TOP - 2], [AX + 2, 14, TOP + 24], [AX - 4, 30, TOP + 46], [AX - 26, 42, TOP + 50], [AX - 40, 52, TOP + 26], [AX - 42, 58, 20]], 11, OXY.arterial, OXY.arterial, 0.9);
vessel("pulmonary-trunk", [[PX, 6, TOP - 2], [PX - 6, 16, TOP + 16], [PX - 10, 28, TOP + 26]], 10, OXY.venous, OXY.venous, 0.9);
vessel("pulmonary-left", [[PX - 10, 28, TOP + 26], [PX + 20, 40, TOP + 30], [PX + 60, 50, TOP + 24]], 6.5, OXY.venous, OXY.venous, 0.9);
vessel("pulmonary-right", [[PX - 10, 28, TOP + 26], [PX - 40, 34, TOP + 24], [PX - 76, 40, TOP + 14]], 6.5, OXY.venous, OXY.venous, 0.9);
vessel("svc", [[RA.x - 4, 34, 230], [RA.x - 4, 20, 175], [RA.x + 2, 8, 140]], 9, OXY.venous, OXY.venous);
vessel("ivc", [[RA.x - 24, 26, 20], [RA.x - 26, 16, 70], [RA.x - 18, 8, 112]], 11, OXY.venous, OXY.venous);
for (const [i, [z, y]] of [[126, 10], [112, 20], [124, 26], [110, 34]].entries())
  vessel(`pulmonary-vein-${i}`, [[LA.x + 64, y + 6, z + 4], [LA.x + 40, y + 2, z], [LA.x + 14, y, z - 4]], 5, OXY.arterial, OXY.arterial, 0.5);
for (const [i, dx] of [-26, -38, -50].entries()) vessel(`arch-branch-${i}`, [[AX + dx + 18, 40 + i * 5, TOP + 50], [AX + dx + 16, 42 + i * 5, TOP + 80], [AX + dx + 14, 44 + i * 5, TOP + 104]], 4.5 - i * 0.3, OXY.arterial, OXY.arterial, 0.9);

// Coronary arteries (arterial) and cardiac veins on the back surfaces, following the ventricle shapes.
const onVentricle = (v, pts, lift = 2) => pts.map(([phi, z]) => { const zz = z - v.apex, rr = v.r * Math.sqrt(Math.max(0, 1 - ((v.len - zz) / v.len) ** 2)) + lift; return [v.x + Math.cos(phi) * rr, Math.sin(phi) * rr, z]; });
const coronary = (id, points, r, color) => add({ id, kind: "tube", points, r, shader: { name: "flow", uniforms: { uA: color, uB: color, uSpeed: 0.4, uStripes: 8, uLevel: 0.5 } } });
coronary("circumflex", onVentricle(LV, [[0.15, 86], [0.8, 86], [1.5, 85], [2.2, 84]]), 1.8, OXY.arterial);
coronary("obtuse-marginal", onVentricle(LV, [[0.8, 86], [0.75, 60], [0.65, 35]]), 1.2, OXY.arterial);
coronary("posterior-descending", onVentricle(LV, [[2.7, 84], [2.75, 60], [2.6, 34], [2.2, 14]]), 1.5, OXY.arterial);
coronary("right-coronary", onVentricle(RV, [[0.4, 88], [1.2, 88], [2.0, 87], [2.6, 86]]), 1.8, OXY.arterial);
coronary("acute-marginal", onVentricle(RV, [[2.0, 87], [2.3, 64], [2.4, 40]]), 1.2, OXY.arterial);
coronary("great-cardiac-vein", onVentricle(LV, [[0.35, 82], [1.2, 81], [2.0, 80]], 3.2), 1.6, OXY.venous);
coronary("middle-cardiac-vein", onVentricle(LV, [[2.9, 80], [2.95, 55], [2.85, 28]], 3.2), 1.4, OXY.venous);

// The conduction system: SA node, internodal paths, AV node, His bundle, bundle branches, Purkinje fibres.
export const SA = [RA.x + 10, 4, 134], AV = [-10, 3, PLATE_Z + 2];
add({ id: "sa-node", kind: "sphere", r: 3, at: SA, color: "#f2d36b", emissive: "#f2b83b", glow: 0.2, lit: true, edges: false });
add({ id: "av-node", kind: "sphere", r: 2.6, at: AV, color: "#f2d36b", emissive: "#f2b83b", glow: 0.2, edges: false });
export const PATHS = {
  internodal: [SA, [RA.x + 14, 3, 118], [-14, 3, 104], AV],
  bachmann: [SA, [-6, 3, 128], [LA.x - 8, 3, 124]],
  his: [AV, [-7, 2.5, 80], [-7, 2.5, 64]],
  left: [[-7, 2.5, 64], [0, 3, 40], [12, 3, 16], [22, 3, 10]],
  right: [[-7, 2.5, 64], [-14, 3, 40], [-24, 3, 24], [-30, 3, 20]],
};
for (const [id, pts] of Object.entries(PATHS)) add({ id: `conduction-${id}`, kind: "tube", points: pts, r: 1.1, color: "#f2d36b", rough: 0.4, edges: false });
for (let i = 0; i < 8; i++) {
  const lv = i < 5, v = lv ? LV : RV, a = lv ? -0.6 + i * 0.6 : 2.6 + (i - 5) * 0.4, z = v.apex + 10 + (i % 3) * 9;
  const zz = z - v.apex, rr = (v.r - v.wall) * Math.sqrt(Math.max(0, 1 - ((v.len - zz) / (v.len - v.wall)) ** 2)) - 0.5;
  add({ id: `purkinje-${i}`, kind: "tube", points: [[v.x, 3, v.apex + 9], [v.x + Math.cos(a) * rr * 0.6, 3 + Math.abs(Math.sin(a)) * rr * 0.4, z - 2], [v.x + Math.cos(a) * rr, 3 + Math.abs(Math.sin(a)) * rr * 0.7, z]], r: 0.6, color: "#f2d36b", edges: false });
}
// The electrical wave: a glow that travels the paths (effect).
add({ id: "wave", kind: "sphere", r: 9, at: SA, edges: false, shader: { name: "glow", uniforms: { uColor: "#ffd36a", uLevel: 0, uPower: 1.5 } } });
add({ id: "sa-glow", kind: "sphere", r: 10, at: SA, edges: false, shader: { name: "glow", uniforms: { uColor: "#ffd36a", uLevel: 0, uPower: 1.5 } } });
add({ id: "av-glow", kind: "sphere", r: 9, at: AV, edges: false, shader: { name: "glow", uniforms: { uColor: "#ffd36a", uLevel: 0, uPower: 1.5 } } });

// Epicardial fat in the grooves, the display stand, and the monitor with the Wiggers diagram.
add({ id: "fat-av-groove", kind: "torus", r: 50, tube: 3.5, segments: 64, at: [-4, 0, PLATE_Z + 1], rot: [0, 0, 0], color: "#e9cf86", rough: 0.7, cut: true, hatch: "#d8b860" });
add({ id: "fat-apex", kind: "sphere", r: 6, at: [LV.x - 22, 18, 22], color: "#e9cf86", rough: 0.7 });
add({ id: "stand-base", kind: "cylinder", r: 46, h: 8, segments: 64, at: [-4, 40, -60], texture: { kind: "brushed", project: "box", tile: 40 }, metal: 0.8, rough: 0.35 });
add({ id: "stand-rod", kind: "cylinder", r: 3, h: 52, at: [-4, 40, -30], color: "#c9ced4", metal: 0.9, rough: 0.2 });
add({ id: "stand-cradle", kind: "box", size: [26, 8, 4], r: 1.5, at: [6, 4, -4], color: "#c9ced4", metal: 0.9, rough: 0.2 });
add({ id: "stand-arm", kind: "box", size: [4, 40, 4], r: 1, at: [-4, 22, -4], color: "#c9ced4", metal: 0.9, rough: 0.2 });
export const MONITOR = { x: 140, z: 40, w: 120, h: 84 };
add({ id: "monitor", kind: "box", size: [MONITOR.w + 10, 6, MONITOR.h + 10], r: 4, at: [MONITOR.x, 8, MONITOR.z - 5], color: "#24272c", rough: 0.4 });
add({ id: "monitor-foot", kind: "box", size: [50, 30, 4], r: 2, at: [MONITOR.x, 10, -60], color: "#24272c" });
add({ id: "monitor-neck", kind: "box", size: [8, 6, MONITOR.z - 5 + 56], r: 2, at: [MONITOR.x, 14, -56], color: "#24272c" });
add({ id: "monitor-screen", kind: "plane", size: [MONITOR.w, MONITOR.h], screen: [600, 420], rot: [90, 0, 0], at: [MONITOR.x, 4.8, MONITOR.z + MONITOR.h / 2] });

export const scene = {
  fig: "Fig 6",
  title: "Human heart, four-chamber section",
  hint: "Space plays · ← → steps the phases · ↑ ↓ heart rate",
  readout: "Ejection · LV 130 / Ao 125 · 72 bpm",
  size: "hero",
  width: 820,
  height: 620,
  pad: 0.03,
  camera: { azimuth: 14, elevation: 16 },
  section: { axis: "y", at: 0 },
  env: { intensity: 0.8 },
  parts,
};
