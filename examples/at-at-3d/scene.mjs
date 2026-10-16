// Fig 11: an all-terrain armoured walker, walking in place in snow, with a movable side section.
// An original procedural model after the AT-AT design (no film assets), proportioned from film stills and
// studio-miniature photos: a long hexagonal-section body high on four tall legs, a short ribbed neck low on
// the front face, a wedge head with chin lasers and cheek blaster pods, knees that bend forward on all legs.
// Units ~4 cm. Body frame: x forward (head +x), y to the walker's left, z up; ground z = 0.
import { assertScene } from "../../kit/three-scene.mjs";

export const L1 = 165, L2 = 104;            // thigh and shin (measured 1.6 : 1)
export const HZ = 326;                       // hip joint height, just under the belly
export const ANKLE = 75;                     // ankle joint above the ground in stance (cage + ridged foot)
export const LEGS = [["rr", -82, -42, 0], ["fr", 86, -42, 0.25], ["rl", -82, 42, 0.5], ["fl", 86, 42, 0.75]];
export const GAIT = { period: 5.2, duty: 0.75, stride: 132, lift: 32 };
export const speed = GAIT.stride / (GAIT.duty * GAIT.period);
export const GROUND = { w: 2400, d: 1600, grid: 220 };
export const SNOW = 900;
export const UNIT_M = 0.045;
export const BODY = { x: [-149, 149], z: [335, 498] };
const parts = [];
const ARMOR = (seed, tile = 150, panels = 5) => ({ kind: "armor", seed, panels, project: "box", tile, color: "#c6c9cc", grime: 0.9 });
const add = (p) => { const q = p.kind === "group" ? { ...p } : { cut: true, hatch: "#b4bcc6", ...p }; parts.push(q); return q; };
const plain = (p) => (parts.push(p), p);
const GREY = "#eceef0", GREY_D = "#c8ccd1", DARK = "#4a4f56", METAL = "#6d737a";
const hull = (seed, extra = {}) => ({ color: GREY, texture: ARMOR(seed), metal: 0.3, rough: 0.6, edges: false, ...extra });

// ---- ground and falling snow (not cut)
plain({ id: "snowfield", kind: "heightfield", size: [GROUND.w, GROUND.d], grid: GROUND.grid, at: [0, 0, 0], color: "#ffffff", rough: 0.9 });
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const flakes = []; for (let i = 0; i < SNOW; i++) flakes.push([(rnd() - 0.5) * GROUND.w, (rnd() - 0.5) * GROUND.d, rnd() * 640]);
plain({ id: "flakes", kind: "instances", shape: "sphere", r: 1.5, segments: 5, items: flakes, color: "#f4f8ff", rough: 0.6, edges: false });

plain({ id: "body", kind: "group", at: [0, 0, 0] });
// the hull is drawn at 330 long and squeezed to the measured 2 : 1 length to height (SX) as it is added
const SX = 0.9;
function squeeze(p) {
  const q = { ...p };
  if (q.at) q.at = [q.at[0] * SX, q.at[1], q.at[2]];
  if (q.kind === "box" && !q.rot?.[2]) q.size = [q.size[0] * SX, q.size[1], q.size[2]];
  if (q.kind === "extrude" && q.plane === "xz") q.outline = q.outline.map(([x, z]) => [x * SX, z]);
  if (q.kind === "extrude" && q.plane === "yz") q.depth *= SX;
  if (q.kind === "tube") q.points = q.points.map(([x, y, z]) => [x * SX, y, z]);
  if (q.kind === "instances") q.items = q.items.map(([x, ...r]) => [x * SX, ...r]);
  return q;
}
const B = (p) => add({ parent: "body", ...squeeze(p) });
const SNOWC = "#f2f6fb", snow = (p) => ({ color: SNOWC, rough: 0.95, metal: 0, hatch: "#e8eef5", ...p });

// ---- hull: near-vertical sides, widest high up, tapering to the belly; a chamfered roof under an overhanging deck
const OUT = [[-44, 335], [44, 335], [56, 352], [60, 468], [50, 486], [-50, 486], [-60, 468], [-56, 352]];
const IN = [[-38, 342], [38, 342], [49, 356], [53, 464], [45, 479], [-45, 479], [-53, 464], [-49, 356]];
B({ id: "hull-shell", kind: "extrude", plane: "yz", outline: OUT, holes: [IN], depth: 300, bevel: 2, at: [-150, 0, 0], ...hull(31) });
B({ id: "hull-front", kind: "extrude", plane: "yz", outline: OUT, depth: 12, bevel: 2, at: [150, 0, 0], ...hull(32) });
B({ id: "hull-rear", kind: "extrude", plane: "yz", outline: OUT, depth: 12, bevel: 2, at: [-162, 0, 0], ...hull(33) });
// top deck: a slab overhanging the hull at the front, rear and both sides, chamfered at the ends
B({ id: "deck", kind: "extrude", plane: "xz", outline: [[-176, 484], [178, 484], [170, 497], [-168, 497]], depth: 126, bevel: 2, at: [0, -63, 0], ...hull(34) });
B({ id: "deck-snow", kind: "box", size: [320, 112, 2.5], r: 1.2, at: [-2, 0, 496.5], ...snow({}) });
B({ id: "deck-hatch", kind: "cylinder", r: 12, h: 3, segments: 32, at: [96, 18, 497], color: GREY_D, metal: 0.4 });
for (let k = 0; k < 6; k++) B({ id: `deck-vent-${k}`, kind: "box", size: [10, 30, 3], r: 1, at: [-120 + k * 15, -26, 497], color: DARK, rough: 0.8 });
for (let k = 0; k < 4; k++) B({ id: `deck-box-${k}`, kind: "box", size: [18 + k * 5, 12, 4], r: 1.5, at: [10 + k * 30, -34 + (k % 2) * 60, 497], color: GREY_D, texture: ARMOR(35 + k, 100), metal: 0.4 });
// front face: a recessed upper frame, a slatted chin block where the neck leaves, low on the face
B({ id: "front-frame", kind: "box", size: [6, 96, 58], r: 2, at: [165, 0, 418], color: GREY_D, texture: ARMOR(36, 100), metal: 0.35 });
B({ id: "front-recess", kind: "box", size: [3, 78, 44], r: 1, at: [169, 0, 425], color: "#5d636b", rough: 0.75 });
for (let k = 0; k < 4; k++) B({ id: `front-slat-${k}`, kind: "box", size: [4, 70, 4], at: [171, 0, 430 + k * 9], color: DARK });
B({ id: "front-block", kind: "box", size: [14, 76, 64], r: 3, at: [168, 0, 322], ...hull(37) });
// rear engine block, slanted, with vertical cooling ribs
B({ id: "rear-block", kind: "extrude", plane: "xz", outline: [[-176, 350], [-162, 344], [-162, 472], [-178, 462], [-186, 376]], depth: 96, bevel: 2, at: [0, -48, 0], ...hull(38) });
for (let k = 0; k < 9; k++) B({ id: `rear-rib-${k}`, kind: "box", size: [6, 5, 74], r: 1, at: [-187, -40 + k * 10, 382], rot: [0, -8, 0], color: GREY_D, metal: 0.4 });
B({ id: "rear-hatch", kind: "box", size: [3, 54, 28], r: 1.5, at: [-190, 0, 352], color: DARK, rough: 0.7 });

// sides: four big armour plates per side with recessed inner panels, a troop door, vent slats, a belt ledge with snow
const PANELS = [[-150, -86], [-82, -8], [-4, 72], [76, 150]];
for (const s of [-1, 1]) {
  const n = s < 0 ? "s" : "p";
  PANELS.forEach(([x0, x1], k) => {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    B({ id: `side-plate-${n}-${k}`, kind: "box", size: [w, 4, 112], r: 1.5, at: [cx, s * 61, 356], ...hull(40 + k + (s > 0 ? 10 : 0), { color: k % 2 ? GREY : "#e2e5e8" }) });
    if (k !== 2) B({ id: `side-recess-${n}-${k}`, kind: "box", size: [w - 22, 1.2, 50], r: 1, at: [cx + (k % 2 ? 4 : -4), s * 63.4, 372 + (k % 2) * 30], color: "#d3d7db", texture: ARMOR(60 + k, 90), metal: 0.3 });
    B({ id: `side-snow-${n}-${k}`, kind: "box", size: [w - 2, 3.5, 1.8], r: 0.8, at: [cx, s * 61.5, 468], ...snow({}) });
  });
  B({ id: `hatch-frame-${n}`, kind: "box", size: [52, 2, 64], r: 3, at: [34, s * 63.5, 362], color: "#b9bec4", metal: 0.35 });
  B({ id: `hatch-door-${n}`, kind: "box", size: [44, 2, 56], r: 2, at: [34, s * 64.5, 366], color: GREY, texture: ARMOR(51, 90), metal: 0.35 });
  B({ id: `hatch-handle-${n}`, kind: "box", size: [16, 2, 4], r: 1, at: [34, s * 66, 398], color: DARK });
  for (let k = 0; k < 8; k++) B({ id: `side-vent-${n}-${k}`, kind: "box", size: [18, 2, 3], at: [-60, s * 63.6, 380 + k * 7], color: DARK });
  B({ id: `belt-${n}`, kind: "box", size: [330, 4, 4], r: 1, at: [0, s * 61, 466], color: "#c3c8ce", metal: 0.4 });
  B({ id: `skirt-${n}`, kind: "box", size: [300, 3, 8], r: 1, at: [0, s * 57.5, 340], color: GREY_D, metal: 0.4 });
  for (let k = 0; k < 6; k++) B({ id: `belly-rib-${n}-${k}`, kind: "box", size: [6, 22, 4], at: [-60 + k * 24, s * 30, 331], color: DARK, metal: 0.4 });
}
// belly: hip drums across the body over each pair of legs, with end caps
for (const hx of [-82 / SX, 86 / SX]) {
  const h = hx < 0 ? "r" : "f";
  B({ id: `hip-drum-${h}`, kind: "cylinder", r: 24, h: 60, segments: 48, at: [hx, 30, HZ + 2], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(62, 80), metal: 0.45 });
  for (let k = 0; k < 5; k++) B({ id: `hip-ring-${h}-${k}`, kind: "cylinder", r: 25.5, h: 2.5, segments: 48, at: [hx, 22 - k * 11, HZ + 2], rot: [90, 0, 0], color: METAL, metal: 0.6 });
  B({ id: `hip-mount-${h}`, kind: "box", size: [62, 60, 8], r: 2, at: [hx, 0, 327], color: "#8e949b", metal: 0.4 });
}

// ---- interior (colour-coded departments)
const DECK = 342;
B({ id: "troop-bulkhead", kind: "box", size: [6, 96, 134], at: [-26, 0, DECK], color: "#6d747c" });
const troopers = [];
for (const s of [-1, 1]) {
  B({ id: `troop-bench-${s < 0 ? "s" : "p"}`, kind: "box", size: [160, 14, 20], r: 2, at: [64, s * 38, DECK], color: "#5a6f8a" });
  B({ id: `troop-rack-${s < 0 ? "s" : "p"}`, kind: "box", size: [160, 5, 8], at: [64, s * 46, DECK + 78], color: "#4a5d75" });
  for (let k = 0; k < 7; k++) troopers.push([0 + k * 21, s * 36, DECK + 20]);
}
B({ id: "troop-bodies", kind: "instances", shape: "cylinder", r: 6, h: 32, items: troopers, color: "#e9edf2", rough: 0.5 });
B({ id: "troop-helmets", kind: "instances", shape: "sphere", r: 6.8, segments: 14, items: troopers.map(([x, y, z]) => [x, y, z + 38]), color: "#f4f6f8", rough: 0.35 });
B({ id: "troop-light", kind: "box", size: [150, 6, 3], at: [64, 0, 476], color: "#cfe3ff", emissive: "#9cc2ff", glow: 0.6 });
B({ id: "bay-deck", kind: "box", size: [120, 96, 6], at: [-90, 0, 408], color: "#6d747c" });
for (let k = 0; k < 5; k++) {
  const x = -140 + k * 22;
  B({ id: `bike-${k}-body`, kind: "box", size: [10, 40, 10], r: 3, at: [x, 6, DECK + 24], color: "#8a7350" });
  B({ id: `bike-${k}-vanes`, kind: "box", size: [14, 4, 14], r: 1, at: [x, -26, DECK + 22], color: "#6d5c40" });
  B({ id: `bike-${k}-cradle`, kind: "box", size: [12, 46, 24], at: [x, 3, DECK], color: "#4d535a" });
}
B({ id: "generator-core", kind: "cylinder", r: 20, h: 84, segments: 40, at: [-90, 42, 444], rot: [90, 0, 0], color: "#c46a2a", metal: 0.4, emissive: "#ff7a1a", glow: 0.35 });
for (let k = 0; k < 4; k++) B({ id: `generator-ring-${k}`, kind: "cylinder", r: 23, h: 5, segments: 40, at: [-90, 36 - k * 22, 444], rot: [90, 0, 0], color: "#5a3a26", metal: 0.6 });
B({ id: "generator-mount", kind: "box", size: [50, 90, 10], at: [-90, 0, 414], color: "#4d535a" });
B({ id: "conduit-main", kind: "tube", points: [[-66, 0, 462], [-30, 0, 470], [110, 0, 470], [150, 0, 420], [166, 0, 378]], r: 4, color: "#d08a3a" });
B({ id: "conduit-legs", kind: "tube", points: [[-91, -30, 420], [-91, -40, 352], [96, -40, 352], [96, 40, 352], [-91, 40, 352], [-91, 30, 420]], r: 3, color: "#d08a3a" });

// ---- neck: a segmented accordion low on the front face, cables alongside, round a crew corridor
plain({ id: "neck", kind: "group", at: [158, 0, 352], parent: "body" });
const bellows = [[0, 0]]; for (let k = 0; k <= 14; k++) bellows.push([k % 2 ? 33 : 28.5, k * 3]); bellows.push([28, 44], [0, 44]);
add({ id: "neck-bellows", kind: "lathe", profile: bellows, segments: 48, at: [0, 0, 0], rot: [0, 90, 0], color: "#80868d", metal: 0.35, rough: 0.65, parent: "neck" });
add({ id: "neck-collar", kind: "cylinder", r: 37, h: 6, segments: 48, at: [-2, 0, 0], rot: [0, 90, 0], color: GREY_D, texture: ARMOR(70, 80), metal: 0.4, parent: "neck" });
add({ id: "neck-corridor", kind: "cylinder", r: 14, h: 46, segments: 32, at: [-1, 0, 0], rot: [0, 90, 0], color: "#55606b", open: true, parent: "neck" });
for (const s of [-1, 1]) for (const k of [0, 1]) add({ id: `neck-cable-${s < 0 ? "s" : "p"}-${k}`, kind: "tube", points: [[-2, s * (30 + k * 5), 18 - k * 30], [16, s * (37 + k * 4), 12 - k * 34], [40, s * (32 + k * 5), 16 - k * 30]], r: 2.2, color: "#3e4349", metal: 0.4, parent: "neck" });

// ---- head: a faceted wedge cab lofted through measured cross-sections (narrow, low front; chamfered top and belly
// facets), a hollow shell so the slice opens the cockpit; round cheek discs carry the temple guns, chin guns on a gimbal
plain({ id: "head", kind: "group", at: [200, 0, 350], scale: 1.24, parent: "body" });
// inward offset of a convex polygon (counter-clockwise)
function inset(poly, t) {
  const n = poly.length, lines = poly.map((p, i) => { const q = poly[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l; return [p[0] + nx * t, p[1] + nz * t, dx, dz]; });
  return lines.map((L, i) => { const M = lines[(i - 1 + n) % n]; const det = M[2] * L[3] - M[3] * L[2]; const u = ((L[0] - M[0]) * L[3] - (L[1] - M[1]) * L[2]) / det; return [M[0] + M[2] * u, M[1] + M[3] * u]; });
}
// a head section: bottom half-width, side half-width, top half-width; bottom, lower-chamfer, upper-chamfer and top heights
const sec = (wb, w, wt, z0, z1, z2, z3) => [[-wb, z0], [wb, z0], [w, z1], [w, z2], [wt, z3], [-wt, z3], [-w, z2], [-w, z1]];
const HEADS = [[0, sec(30, 40, 30, -32, -20, 18, 34)], [58, sec(31, 42, 28, -34, -22, 16, 33)], [92, sec(27, 40, 22, -34, -22, 8, 21)],
  [112, sec(26, 37, 21, -31, -20, 2, 11)], [124, sec(22, 31, 17, -26, -16, -3, 5)]];
const HEADS_IN = HEADS.map(([x, p], i) => [i === 0 ? 5 : i === HEADS.length - 1 ? 118 : x, inset(p, 5)]);
const H = (p) => add({ parent: "head", ...p });
H({ id: "head-shell", kind: "loft", sections: HEADS, ...hull(80) });
H({ id: "head-lining", kind: "loft", sections: HEADS_IN, inside: true, color: "#7d848c", rough: 0.7 });
// viewport: a recessed red slit across the upper front facet, under a brow
H({ id: "viewport", kind: "box", size: [3, 46, 4.5], r: 0.8, at: [119.5, 0, 3], rot: [0, 35, 0], color: "#2a0d08", emissive: "#ff3b1a", glow: 0.55, rough: 0.15 });
H({ id: "viewport-brow", kind: "box", size: [4, 50, 2.5], r: 0.8, at: [115.5, 0, 9.5], rot: [0, 35, 0], color: GREY_D, metal: 0.4 });
H({ id: "head-chin-plate", kind: "box", size: [40, 50, 4], r: 1.5, at: [76, 0, -38], color: GREY_D, texture: ARMOR(102, 70), metal: 0.4 });
for (const s of [-1, 1]) {
  const n = s < 0 ? "s" : "p";
  // cheek disc: a round recessed plate with radial ribs and a hub on each side of the cab
  H({ id: `head-cheek-${n}`, kind: "cylinder", r: 23, h: 3, segments: 48, at: [50, s > 0 ? 44.5 : -41.5, -2], rot: [90, 0, 0], color: "#c9cdd2", texture: ARMOR(100 + s, 70), metal: 0.4 });
  H({ id: `head-cheek-${n}-rim`, kind: "torus", r: 23, tube: 1.8, at: [50, s * 44, -2], rot: [90, 0, 0], color: GREY_D, metal: 0.45 });
  for (let k = 0; k < 4; k++) H({ id: `head-cheek-${n}-rib-${k}`, kind: "box", size: [40, 1.6, 2.4], at: [50, s * 44.8, -3.2], rot: [0, k * 45, 0], color: "#9aa0a7", metal: 0.5 });
  H({ id: `head-cheek-${n}-hub`, kind: "cylinder", r: 6, h: 3, segments: 24, at: [50, s > 0 ? 47.5 : -44.5, -2], rot: [90, 0, 0], color: DARK, metal: 0.6 });
  for (let k = 0; k < 4; k++) H({ id: `head-side-slot-${n}-${k}`, kind: "box", size: [3, 1.5, 12], at: [84 + k * 6, s * 40.6, -16], color: DARK });
  // temple guns: medium blasters on the cheek discs
  H({ id: `temple-housing-${n}`, kind: "box", size: [30, 9, 10], r: 2.5, at: [62, s * 49, 8], color: GREY_D, texture: ARMOR(110, 60), metal: 0.45 });
  H({ id: `temple-barrel-${n}`, kind: "cylinder", r: 2.2, h: 58, segments: 16, at: [76, s * 49, 13], rot: [0, 90, 0], color: METAL, metal: 0.75, rough: 0.3 });
  H({ id: `temple-tip-${n}`, kind: "cylinder", r: 3.4, h: 6, segments: 16, at: [128, s * 49, 13], rot: [0, 90, 0], color: DARK, metal: 0.6 });
  // chin guns: heavy lasers on a gimbal under the chin, with forked muzzles
  H({ id: `chin-shroud-${n}`, kind: "cylinder", r: 6, h: 30, segments: 24, at: [90, s * 12, -44], rot: [0, 90, 0], color: GREY_D, metal: 0.5 });
  H({ id: `chin-barrel-${n}`, kind: "cylinder", r: 3.2, h: 76, segments: 20, at: [112, s * 12, -44], rot: [0, 90, 0], color: METAL, metal: 0.75, rough: 0.3 });
  for (const f of [-1, 1]) H({ id: `chin-muzzle-${n}-${f < 0 ? "a" : "b"}`, kind: "box", size: [12, 2, 3], at: [192, s * 12 + f * 3, -45.5], color: DARK, metal: 0.6 });
}
H({ id: "chin-gimbal", kind: "sphere", r: 12, segments: 32, at: [86, 0, -40], color: "#8e949b", metal: 0.55, rough: 0.4 });
H({ id: "chin-yoke", kind: "box", size: [20, 36, 9], r: 3, at: [88, 0, -48], color: GREY_D, metal: 0.45 });
H({ id: "head-hatch", kind: "cylinder", r: 10, h: 3, segments: 28, at: [30, 0, 33.5], color: GREY_D });
H({ id: "head-antenna", kind: "cylinder", r: 1, h: 24, at: [16, -20, 33.5], color: DARK });
H({ id: "head-snow", kind: "box", size: [54, 52, 2], r: 1, at: [32, 0, 33.2], ...snow({}) });
[["pilot", 84, -12], ["gunner", 84, 12], ["commander", 48, 0]].forEach(([n, x, y]) => {
  H({ id: `seat-${n}`, kind: "box", size: [16, 16, 14], r: 2, at: [x, y, -28], color: "#6a5040" });
  H({ id: `seat-back-${n}`, kind: "box", size: [4, 16, 20], r: 1.5, at: [x - 8, y, -14], color: "#6a5040" });
  H({ id: `crew-${n}`, kind: "sphere", r: 6, at: [x, y, -4], color: "#3d4248" });
});
H({ id: "console", kind: "box", size: [10, 44, 14], r: 2, at: [102, 0, -28], color: "#2f353b" });
H({ id: "console-glow", kind: "box", size: [1.5, 38, 4], at: [96.5, 0, -17], color: "#ffb35a", emissive: "#ff9a2a", glow: 0.9 });

// ---- legs: hip housing -> thigh with exposed struts -> cylindrical knee -> ribbed shin -> ankle cage -> ridged round foot
for (const [n, hx, hy] of LEGS) {
  const s = Math.sign(hy), T = `thigh-${n}`;
  add({ id: T, kind: "group", at: [hx, hy, HZ], parent: "body" });
  add({ id: `thigh-plate-${n}`, kind: "extrude", plane: "xz", outline: [[-26, 22], [26, 22], [30, 0], [22, -L1 + 14], [-19, -L1 + 14], [-28, 0]], depth: 20, bevel: 2.5, at: [0, -10, 0], ...hull(120 + hx / 10), parent: T });
  add({ id: `thigh-hub-${n}`, kind: "cylinder", r: 28, h: 6, segments: 48, at: [0, s > 0 ? 16 : -10, 0], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(124, 70), metal: 0.45, parent: T });
  add({ id: `thigh-hubcap-${n}`, kind: "cylinder", r: 19, h: 3, segments: 40, at: [0, s > 0 ? 19 : -16, 0], rot: [90, 0, 0], color: "#9aa0a7", metal: 0.55, parent: T });
  add({ id: `thigh-slot-${n}`, kind: "box", size: [22, 1.5, 6], at: [0, s * 19.6, -3], color: DARK, parent: T });
  add({ id: `thigh-panel-${n}`, kind: "box", size: [30, 1.4, 70], r: 1, at: [2, s * 10.6, -L1 + 50], color: "#a9afb6", texture: ARMOR(126, 70), parent: T });
  for (const k of [0, 1]) add({ id: `thigh-groove-${n}-${k}`, kind: "box", size: [2.5, 1.2, 60], at: [-12 + k * 26, s * 10.8, -L1 + 30], color: DARK, parent: T });
  // exposed hydraulic struts on the front and rear edges
  for (const [xx, k] of [[27, "f"], [-25, "r"]]) {
    add({ id: `thigh-strut-${n}-${k}`, kind: "cylinder", r: 2.6, h: 110, segments: 16, at: [xx, 0, -L1 + 26], color: "#8a9097", metal: 0.85, rough: 0.22, parent: T });
    add({ id: `thigh-sleeve-${n}-${k}`, kind: "cylinder", r: 4.2, h: 44, segments: 16, at: [xx, 0, -48], color: DARK, metal: 0.5, parent: T });
  }
  add({ id: `knee-${n}`, kind: "cylinder", r: 21, h: 32, segments: 48, at: [0, 16, -L1], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(130, 70), metal: 0.45, parent: T });
  add({ id: `knee-cap-${n}`, kind: "cylinder", r: 23, h: 4, segments: 48, at: [0, s > 0 ? 20 : -16, -L1], rot: [90, 0, 0], color: "#9aa0a7", metal: 0.55, parent: T });
  add({ id: `knee-hub-${n}`, kind: "cylinder", r: 8, h: 3, segments: 24, at: [0, s > 0 ? 23 : -20, -L1], rot: [90, 0, 0], color: DARK, metal: 0.6, parent: T });
  add({ id: `knee-bolts-${n}`, kind: "instances", shape: "sphere", r: 1.6, segments: 8, items: Array.from({ length: 8 }, (_, i) => [Math.cos(i * 0.785) * 15, s * 20.5, -L1 + Math.sin(i * 0.785) * 15]), color: DARK, metal: 0.6, parent: T });
  const SH = `shin-${n}`;
  add({ id: SH, kind: "group", at: [0, 0, -L1], parent: T });
  add({ id: `shin-plate-${n}`, kind: "extrude", plane: "xz", outline: [[-19, 2], [19, 2], [17, -L2 + 8], [-16, -L2 + 8]], depth: 22, bevel: 2.5, at: [0, -11, 0], ...hull(140 + hx / 10), parent: SH });
  add({ id: `shin-armour-${n}`, kind: "box", size: [6, 26, 70], r: 1.5, at: [19, 0, -L2 + 18], color: GREY_D, texture: ARMOR(142, 60), parent: SH });
  for (let k = 0; k < 3; k++) add({ id: `shin-rib-${n}-${k}`, kind: "box", size: [3, 1.5, 62], r: 0.6, at: [-8 + k * 8, s * 11.6, -L2 + 22], color: "#8e949b", metal: 0.4, parent: SH });
  for (const k of [-1, 1]) add({ id: `shin-strut-${n}-${k < 0 ? "a" : "b"}`, kind: "cylinder", r: 2.2, h: 80, segments: 14, at: [-19, k * 6, -L2 + 16], color: "#8a9097", metal: 0.85, rough: 0.22, parent: SH });
  add({ id: `ankle-${n}`, kind: "cylinder", r: 13, h: 28, segments: 36, at: [0, 14, -L2], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(150, 60), metal: 0.45, parent: SH });
  add({ id: `ankle-cap-${n}`, kind: "cylinder", r: 9, h: 3, segments: 28, at: [0, s > 0 ? 17 : -14, -L2], rot: [90, 0, 0], color: METAL, metal: 0.6, parent: SH });
  const F = `foot-${n}`;
  add({ id: F, kind: "group", at: [0, 0, -L2], parent: SH });
  add({ id: `foot-block-${n}`, kind: "box", size: [26, 24, 20], r: 3, at: [0, 0, -26], color: GREY_D, texture: ARMOR(155, 60), metal: 0.4, parent: F });
  add({ id: `foot-piston-${n}`, kind: "cylinder", r: 4, h: 30, segments: 16, at: [0, 0, -52], color: "#8a9097", metal: 0.85, rough: 0.22, parent: F });
  // ankle cage: four curved struts from the ankle block out and down onto the foot's shoulder
  for (const [ux, uy, k] of [[1, 0, "f"], [-1, 0, "r"], [0, 1, "l"], [0, -1, "o"]]) add({ id: `foot-cage-${n}-${k}`, kind: "tube", points: [[ux * 10, uy * 10, -12], [ux * 26, uy * 26, -20], [ux * 33, uy * 33, -36], [ux * 29, uy * 29, -50]], r: 2.4, color: "#9aa0a7", metal: 0.55, parent: F });
  add({ id: `foot-dome-${n}`, kind: "lathe", profile: [[0, -75], [42, -75], [42, -63], [38.5, -61], [37, -58], [31, -55.5], [29, -53], [17, -49], [15, -46], [0, -46]], segments: 64, at: [0, 0, 0], color: "#d9dce0", metal: 0.35, rough: 0.55, parent: F });
  add({ id: `foot-ridges-${n}`, kind: "instances", shape: "box", size: [6, 3, 9], items: Array.from({ length: 12 }, (_, i) => [Math.cos(i * Math.PI / 6) * 41.5, Math.sin(i * Math.PI / 6) * 41.5, -72, i * 30 + 90]), color: "#b9bec4", metal: 0.4, parent: F });
  add({ id: `foot-toes-${n}`, kind: "instances", shape: "box", size: [18, 11, 4], items: Array.from({ length: 4 }, (_, i) => [Math.cos(i * Math.PI / 2 + Math.PI / 4) * 45, Math.sin(i * Math.PI / 2 + Math.PI / 4) * 45, -75, i * 90 + 45]), color: GREY_D, metal: 0.4, parent: F });
  add({ id: `foot-snow-${n}`, kind: "cylinder", r: 36, r2: 30, h: 2, segments: 48, at: [0, 0, -57.5], ...snow({}), parent: F });
}

/** Departments: what each does, which parts it is, and where its card points (body frame). Fiction, after canon. */
export const DEPTS = [
  { id: "cockpit", name: "Command cockpit", match: /^(head-|viewport|seat|crew|console)/, anchor: [270, 0, 372],
    fn: "The head is the command cab. A pilot and a gunner sit side by side behind the viewports, with the commander behind them. The head turns on the neck to aim the guns and to look for targets.",
    canon: "Canon describes a cockpit crew of three: pilot, gunner and commander." },
  { id: "guns", name: "Heavy lasers and blasters", match: /^(chin-|temple-)/, anchor: [360, 0, 310],
    fn: "Two heavy laser cannons hang under the chin on a gimbal, and two medium blasters sit at the temples. They aim with the head, so the neck is the turret.",
    canon: "Wookieepedia lists two chin-mounted heavy laser cannons and two medium blasters on the head." },
  { id: "neck", name: "Neck and crew corridor", match: /^neck-/, anchor: [180, 0, 352],
    fn: "A segmented bellows lets the head swing while a corridor inside joins the cockpit to the body. Power and control lines run through it.",
    canon: "The neck is often described as the walker's weak point. This corridor layout is illustrative." },
  { id: "troops", name: "Troop bay", match: /^troop-/, anchor: [58, 0, 390],
    fn: "Infantry ride on benches along both walls. They leave by the side hatches or the rear ramp once the walker kneels.",
    canon: "Canon gives a capacity of about 40 troopers. Fourteen are shown here." },
  { id: "speeders", name: "Speeder bike bay", match: /^bike-|^bay-/, anchor: [-90, 0, 370],
    fn: "Speeder bikes are stowed in cradles on the lower aft deck for scouts to deploy on the ground.",
    canon: "Canon sources say an AT-AT carried up to five speeder bikes." },
  { id: "power", name: "Power generator", match: /^(generator-|conduit-)/, anchor: [-81, 0, 444],
    fn: "The generator in the upper aft compartment feeds the leg drives, the guns and the systems in the head through armoured conduits.",
    canon: "Its exact place inside differs between sources. This placement is illustrative." },
  { id: "legs", name: "Leg drives", match: /^(thigh-|knee-|shin-|ankle-|foot-|hip-)/, anchor: [86, -42, 200],
    fn: "Hip drums swing each leg and exposed hydraulic struts drive the knees and ankles. Only one foot is in the air at a time, so three feet always carry the weight. The round, ridged feet spread the load on snow.",
    canon: "On screen, AT-AT knees bend forward on all four legs. The gait timing here is a physical guess." },
];
export const SOURCES = [
  ["[1]", "All Terrain Armored Transport, Wookieepedia", "https://starwars.fandom.com/wiki/All_Terrain_Armored_Transport"],
  ["[2]", "AT-AT Walker, StarWars.com Databank", "https://www.starwars.com/databank/at-at-walker"],
];
export const FACTS = { heightM: 22.5, troops: 40, bikes: 5, crew: 3, topKmh: 60 };

export const scene = {
  fig: "Fig 11", title: "All-terrain walker, in section",
  hint: "Drag orbits · [ ] slice · click a department",
  readout: "walking · slice off",
  size: "hero", width: 960, height: 620,
  camera: { azimuth: 34, elevation: 10, fov: 30 }, pad: 0.04, env: { intensity: 0.9 },
  section: { axis: "y", at: -2000 },
  parts,
};
assertScene(scene);
