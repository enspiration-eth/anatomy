// Fig 11: an all-terrain armoured walker, walking in place in snow, with a movable side section.
// An original procedural model after the AT-AT design (no film assets), proportioned from film stills and
// studio-miniature photos: a long hexagonal-section body high on four tall legs, a short ribbed neck low on
// the front face, a wedge head with chin lasers and cheek blaster pods, knees that bend forward on all legs.
// Units ~4 cm. Body frame: x forward (head +x), y to the walker's left, z up; ground z = 0.
import { assertScene } from "../../kit/three-scene.mjs";

export const L1 = 165, L2 = 104;            // thigh and shin (measured 1.6 : 1)
export const HZ = 326;                       // hip joint height, just under the belly
export const ANKLE = 75;                     // ankle joint above the ground in stance (cage + ridged foot)
export const LEGS = [["rr", -74, -42, 0], ["fr", 100, -42, 0.25], ["rl", -74, 42, 0.5], ["fl", 100, 42, 0.75]];
export const GAIT = { period: 5.2, duty: 0.75, stride: 132, lift: 32 };
export const speed = GAIT.stride / (GAIT.duty * GAIT.period);
export const GROUND = { w: 2400, d: 2800, grid: 220 };
export const SNOW = 900;
export const UNIT_M = 0.045;
export const HIP_R = -74, HIP_F = 100;     // hips: rear module and front module (measured 26 % and 16 % in from the ends)
export const BODY = { x: [-152, 159], z: [326, 498] };
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
// SX squeezes hull parts along x as they are added (1: drawn at the measured size)
const SX = 1;
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

// ---- hull: three articulated modules, as on the studio miniature (measured from the side, rear-quarter and front views):
// a short, lower, narrower FRONT module with a steeply raked upper face; the tallest CENTRE module under an overhanging
// deck; a REAR module whose roof chamfers down to the tail under an overhanging brow. Each is a faceted lofted shell
// (outer skin + inner lining, so the slice shows the walls), and dark seams separate them.
// inward offset of a convex polygon (counter-clockwise)
function inset(poly, t) {
  const n = poly.length, lines = poly.map((p, i) => { const q = poly[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l; return [p[0] + nx * t, p[1] + nz * t, dx, dz]; });
  return lines.map((L, i) => { const M = lines[(i - 1 + n) % n]; const det = M[2] * L[3] - M[3] * L[2]; const u = ((L[0] - M[0]) * L[3] - (L[1] - M[1]) * L[2]) / det; return [M[0] + M[2] * u, M[1] + M[3] * u]; });
}
// a module section: belly half-width, wall half-width at the lower chamfer and at the roof chamfer (the walls lean in
// toward the roof: the measured front and rear views are trapezoids, wider at the belly), roof half-width; heights
const sec = (wb, wlo, whi, wt, z0, z1, z2, z3) => [[-wb, z0], [wb, z0], [wlo, z1], [whi, z2], [wt, z3], [-wt, z3], [-whi, z2], [-wlo, z1]];
const F_SEC = (z2, z3) => sec(42, 51, 51 - (z2 - 346) * 0.075, 51 - (z2 - 346) * 0.075 - 6, 334, 346, z2, z3);
export const MODULES = {
  front: { x: [88, 150], wall: [51, 346, 44.2, 436], st: [[88, F_SEC(436, 446)], [120, F_SEC(436, 446)], [150, F_SEC(402, 412)]] },
  centre: { x: [-42, 81], wall: [62, 348, 52, 478], st: [[-42, sec(50, 62, 52, 46, 334, 348, 478, 490)], [81, sec(50, 62, 52, 46, 334, 348, 478, 490)]] },
  rear: { x: [-150, -49], wall: [59, 349, 50, 472], st: [[-150, sec(46, 59, 53.5, 46, 338, 349, 422, 432)], [-104, sec(48, 59, 50, 44, 336, 349, 472, 484)], [-49, sec(48, 59, 50, 44, 336, 349, 472, 484)]] },
};
// the wall's half-width at height z, and its lean from vertical (degrees), for parts mounted on a module's side
const wallY = (m, z) => { const [a, za, b, zb] = MODULES[m].wall; return a + ((b - a) * (z - za)) / (zb - za); };
const lean = (m) => { const [a, za, b, zb] = MODULES[m].wall; return (Math.atan2(a - b, zb - za) * 180) / Math.PI; };
// a part on the side s of module m, its bottom at z: pushed out to the wall (plus d) and leant with it
const onSide = (m, s, z, d, p) => B({ ...p, at: [p.at[0], s * (wallY(m, z) + d), z], rot: [s * lean(m), 0, 0] });
Object.entries(MODULES).forEach(([name, m], k) => {
  const last = m.st.length - 1;
  B({ id: `${name}-shell`, kind: "loft", sections: m.st, ...hull(31 + k * 7) });
  B({ id: `${name}-lining`, kind: "loft", sections: m.st.map(([x, p], i) => [i === 0 ? x + 6 : i === last ? x - 6 : x, inset(p, 6)]), inside: true, color: "#7d848c", rough: 0.7 });
});
// seams: recessed dark collars in the gaps between modules
B({ id: "seam-front", kind: "box", size: [7, 90, 100], r: 1, at: [84.5, 0, 331], color: "#2d3137", rough: 0.8 });
B({ id: "seam-rear", kind: "box", size: [7, 104, 140], r: 1, at: [-45.5, 0, 331], color: "#2d3137", rough: 0.8 });

// centre: a deck with a lip, hatch, vents and boxes; two big side plates, a troop door, a louvre at the front edge
B({ id: "deck", kind: "extrude", plane: "xz", outline: [[-46, 488], [85, 488], [82, 496], [-43, 496]], depth: 100, bevel: 2, at: [0, -50, 0], ...hull(34) });
B({ id: "deck-snow", kind: "box", size: [120, 88, 2.5], r: 1.2, at: [20, 0, 495.5], ...snow({}) });
B({ id: "deck-hatch", kind: "cylinder", r: 11, h: 3, segments: 32, at: [56, 16, 496], color: GREY_D, metal: 0.4 });
for (let k = 0; k < 5; k++) B({ id: `deck-vent-${k}`, kind: "box", size: [9, 26, 3], r: 1, at: [-30 + k * 13, -24, 496], color: DARK, rough: 0.8 });
for (let k = 0; k < 3; k++) B({ id: `deck-box-${k}`, kind: "box", size: [16 + k * 4, 11, 4], r: 1.5, at: [-20 + k * 34, 26 - (k % 2) * 4, 496], color: GREY_D, texture: ARMOR(35 + k, 100), metal: 0.4 });
for (const s of [-1, 1]) {
  const n = s < 0 ? "s" : "p";
  [[-38, 18], [22, 78]].forEach(([x0, x1], k) => onSide("centre", s, 354, 1.5, { id: `centre-plate-${n}-${k}`, kind: "box", size: [x1 - x0, 3, 118], r: 1.5, at: [(x0 + x1) / 2], ...hull(40 + k + (s > 0 ? 10 : 0), { color: k ? GREY : "#e2e5e8" }) }));
  onSide("centre", s, 410, 3.3, { id: `centre-recess-${n}`, kind: "box", size: [40, 1.2, 46], r: 1, at: [-10], color: "#d3d7db", texture: ARMOR(60, 90), metal: 0.3 });
  onSide("centre", s, 362, 3.2, { id: `hatch-frame-${n}`, kind: "box", size: [44, 2, 62], r: 3, at: [46], color: "#b9bec4", metal: 0.35 });
  onSide("centre", s, 366, 4.2, { id: `hatch-door-${n}`, kind: "box", size: [37, 2, 54], r: 2, at: [46], color: GREY, texture: ARMOR(51, 90), metal: 0.35 });
  onSide("centre", s, 396, 5.6, { id: `hatch-handle-${n}`, kind: "box", size: [14, 2, 4], r: 1, at: [46], color: DARK });
  for (let k = 0; k < 12; k++) onSide("centre", s, 360 + k * 6.5, 1.6, { id: `louvre-${n}-${k}`, kind: "box", size: [5, 2.4, 2.6], at: [76.5], color: DARK });
  onSide("centre", s, 472, 1.8, { id: `centre-ledge-${n}`, kind: "box", size: [120, 4, 1.8], r: 0.8, at: [20], ...snow({}) });
  onSide("centre", s, 336, -5, { id: `centre-skirt-${n}`, kind: "box", size: [120, 3, 8], r: 1, at: [20], color: GREY_D, metal: 0.4 });
  // front: one side plate with a panel line, a ribbed skirt along its lower edge
  onSide("front", s, 352, 1.5, { id: `front-plate-${n}`, kind: "box", size: [28, 3, 80], r: 1.5, at: [106], ...hull(70 + (s > 0 ? 1 : 0), { color: "#e2e5e8" }) });
  for (let k = 0; k < 5; k++) onSide("front", s, 336, -0.5, { id: `front-skirt-rib-${n}-${k}`, kind: "box", size: [3, 3, 12], at: [94 + k * 12], color: DARK });
  onSide("front", s, 434, 1.2, { id: `front-ledge-${n}`, kind: "box", size: [30, 3.5, 1.6], r: 0.7, at: [104], ...snow({}) });
  // rear: a side plate with a recessed panel and a vent block near the seam
  onSide("rear", s, 354, 1.5, { id: `rear-plate-${n}`, kind: "box", size: [72, 3, 110], r: 1.5, at: [-86], ...hull(80 + (s > 0 ? 1 : 0), { color: GREY }) });
  onSide("rear", s, 372, 3.3, { id: `rear-recess-${n}`, kind: "box", size: [34, 1.2, 40], r: 1, at: [-94], color: "#d3d7db", texture: ARMOR(64, 90) });
  for (let k = 0; k < 6; k++) onSide("rear", s, 420 + k * 7, 1.6, { id: `rear-vent-${n}-${k}`, kind: "box", size: [14, 2, 3], at: [-62], color: DARK });
  onSide("rear", s, 466, 1.5, { id: `rear-ledge-${n}`, kind: "box", size: [60, 3.5, 1.6], r: 0.7, at: [-78], ...snow({}) });
}
// front face: a recessed window frame on the raked upper face, a slatted chin block where the neck leaves
B({ id: "front-frame", kind: "box", size: [30, 62, 1.6], r: 1, at: [135, 0, 428], rot: [0, 49, 0], color: "#b9bec4", metal: 0.35 });
B({ id: "front-recess", kind: "box", size: [22, 52, 2.2], r: 0.8, at: [135.4, 0, 428.4], rot: [0, 49, 0], color: "#40464d", rough: 0.75 });
for (let k = 0; k < 4; k++) B({ id: `front-slat-${k}`, kind: "box", size: [2.6, 50, 1.4], at: [129 + k * 3.6, 0, 434 - k * 4.2], rot: [0, 49, 0], color: DARK });
B({ id: "front-block", kind: "box", size: [10, 74, 76], r: 3, at: [154, 0, 326], ...hull(37) });
// rear face: an overhanging brow over the roof chamfer, a recessed lower hatch with ribs, greebles on the chamfer
B({ id: "rear-brow", kind: "box", size: [14, 96, 7], r: 2, at: [-152, 0, 426], ...hull(38) });
B({ id: "rear-hatch", kind: "box", size: [4, 48, 66], r: 12, at: [-151.5, 0, 352], color: "#40464d", rough: 0.7 });
for (let k = 0; k < 7; k++) B({ id: `rear-rib-${k}`, kind: "box", size: [4, 4, 60], r: 1, at: [-152, -30 + k * 10, 356], color: GREY_D, metal: 0.4 });
for (let k = 0; k < 3; k++) B({ id: `rear-greeble-${k}`, kind: "box", size: [18, 16 + k * 6, 5], r: 1.5, at: [-127, -24 + k * 24, 455], rot: [0, -48, 0], color: k % 2 ? DARK : GREY_D, metal: 0.4 });
B({ id: "rear-snow", kind: "box", size: [52, 84, 2.2], r: 1, at: [-77, 0, 484], ...snow({}) });
B({ id: "front-snow", kind: "box", size: [30, 74, 2.2], r: 1, at: [104, 0, 446], ...snow({}) });
// ---- belly (studio-miniature underside photos: kg 168-180, 203-218 looking up, 133-146 the lower front):
// over each pair of legs a transverse hip axle with flanged collars, and under it a shield-shaped drive housing that
// hangs below the belly and runs on, toward the middle, as a ribbed barrel; between the two barrels a round boss with a
// grille on a keel; panelled belly plates on each module, dark gaps between modules, pipe runs along the lower edges.
// a six-sided (y, z) section: half-width w, bottom zb, top zt, chamfer c (counter-clockwise, like the hull sections)
const hex6 = (w, zb, zt, c) => [[-w + c, zb], [w - c, zb], [w, zb + c], [w, zt], [-w, zt], [-w, zb + c]];
const BELLY = { front: [92, 146, 42], centre: [-38, 77, 50], rear: [-146, -53, 48] };
const UNDER = "#b3b8be";
for (const hx of [HIP_R, HIP_F]) {
  const h = hx < 0 ? "r" : "f", dir = hx < 0 ? 1 : -1;   // dir: toward the middle of the body
  B({ id: `hip-axle-${h}`, kind: "cylinder", r: 13, h: 70, segments: 40, at: [hx, 35, HZ], rot: [90, 0, 0], color: METAL, metal: 0.65, rough: 0.35 });
  for (const s of [-1, 1]) {
    B({ id: `hip-collar-${h}-${s < 0 ? "s" : "p"}`, kind: "cylinder", r: 21, h: 7, segments: 48, at: [hx, s > 0 ? 35 : -28, HZ], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(161 + s, 60), metal: 0.45 });
    B({ id: `hip-bolts-${h}-${s < 0 ? "s" : "p"}`, kind: "instances", shape: "sphere", r: 1.8, segments: 8, items: Array.from({ length: 6 }, (_, i) => [hx + Math.cos(i * 1.047) * 15, s * 35.5, HZ + Math.sin(i * 1.047) * 15]), color: DARK, metal: 0.6 });
  }
  // the shield housing: broad and deep under the axle on the side toward the module end, narrowing toward the
  // middle where the drive barrel leaves it
  const xs = [hx - dir * 30, hx - dir * 16, hx + dir * 6, hx + dir * 20], shape = [hex6(22, 314, 333, 7), hex6(30, 293, 333, 11), hex6(28, 295, 333, 11), hex6(20, 304, 333, 8)];
  const secs = xs.map((x, i) => [x, shape[i]]).sort((p, q) => p[0] - q[0]);
  B({ id: `hip-shield-${h}`, kind: "loft", sections: secs, color: GREY_D, texture: ARMOR(170 + (dir > 0 ? 1 : 0), 70, 3), metal: 0.4, rough: 0.6 });
  B({ id: `hip-shield-lip-${h}`, kind: "box", size: [24, 50, 3], r: 1.2, at: [hx - dir * 8, 0, 291.5], color: "#a9afb6", texture: ARMOR(172, 60, 2), metal: 0.4 });
  for (const s of [-1, 1]) B({ id: `hip-shield-rib-${h}-${s < 0 ? "s" : "p"}`, kind: "box", size: [34, 3, 26], r: 1, at: [hx - dir * 10, s * 27, 302], rot: [s * -12, 0, 0], color: "#9ea4ab", metal: 0.4 });
  B({ id: `hip-shadow-${h}`, kind: "box", size: [62, 66, 1], r: 0.4, at: [hx - dir * 6, 0, 332.5], color: "#2f3338", rough: 0.95 });
  // the ribbed drive barrel, leaving the shield toward the middle of the body and tilting down
  const th = dir * 112, ax = [Math.sin((th * Math.PI) / 180), 0, Math.cos((th * Math.PI) / 180)], P = (t, z0 = 312) => [hx + dir * 10 + ax[0] * t, 0, z0 + ax[2] * t];
  B({ id: `hip-barrel-${h}`, kind: "cylinder", r: 18, h: 54, segments: 40, at: P(0), rot: [0, th, 0], color: "#a7adb4", texture: ARMOR(175, 60, 2), metal: 0.5, rough: 0.5 });
  for (let k = 0; k < 4; k++) B({ id: `hip-barrel-ring-${h}-${k}`, kind: "cylinder", r: 18.6, h: 2.8, segments: 40, at: P(12 + k * 10), rot: [0, th, 0], color: METAL, metal: 0.65, rough: 0.35 });
  B({ id: `hip-barrel-cap-${h}`, kind: "cylinder", r: 12, h: 5, segments: 32, at: P(54), rot: [0, th, 0], color: DARK, metal: 0.6 });
  B({ id: `hip-barrel-plate-${h}`, kind: "box", size: [8, 1.2, 5], r: 0.5, at: P(30, 312 + 0), rot: [0, th - 90, 0], color: "#2e3237" });
  // a grille on the belly on the outer side of the housing, between the axle collars
  B({ id: `hip-grille-${h}`, kind: "box", size: [12, 26, 1.6], r: 0.7, at: [hx - dir * 38, 0, 331], color: "#3a3f45", rough: 0.8 });
  for (let k = 0; k < 7; k++) B({ id: `hip-grille-slat-${h}-${k}`, kind: "box", size: [1.1, 24, 1.2], at: [hx - dir * 38 - 5 + k * 1.6, 0, 330.4], color: METAL, metal: 0.6 });
  for (const s of [-1, 1]) B({ id: `hip-pipe-${h}-${s < 0 ? "s" : "p"}`, kind: "tube", points: [[hx + dir * 24, s * 24, 304], [hx + dir * 32, s * 28, 320], [hx + dir * 46, s * 30, 331]], r: 2.4, color: "#5b6168", metal: 0.5 });
}
// keel between the barrels: a spine plate, a round boss with a grille, small tanks either side
B({ id: "belly-keel", kind: "box", size: [64, 22, 6], r: 2, at: [12, 0, 327], color: "#9ea4ab", texture: ARMOR(180, 60, 3), metal: 0.45 });
B({ id: "belly-boss", kind: "cylinder", r: 13, h: 7, segments: 40, at: [12, 0, 321], color: GREY_D, metal: 0.5 });
B({ id: "belly-boss-cap", kind: "cylinder", r: 7, h: 2, segments: 32, at: [12, 0, 319.5], color: DARK, metal: 0.6 });
for (let k = 0; k < 7; k++) B({ id: `belly-grille-${k}`, kind: "box", size: [1.4, 16, 2], at: [-10 + k * 2.6, 0, 324], color: "#33383e" });
for (const s of [-1, 1]) B({ id: `belly-tank-${s < 0 ? "s" : "p"}`, kind: "cylinder", r: 5, h: 30, segments: 24, at: [36, s * 18, 326], rot: [0, 90, 0], color: METAL, metal: 0.6, rough: 0.4 });
// belly plating per module: a slightly proud plate with recessed panel lines, a dark rim where the lower chamfer meets it
for (const [m, [x0, x1, w]] of Object.entries(BELLY)) {
  const z0 = m === "rear" ? 336 : 334;
  B({ id: `belly-plate-${m}`, kind: "box", size: [x1 - x0, 2 * w - 12, 2], r: 0.9, at: [(x0 + x1) / 2, 0, z0 - 2], color: UNDER, texture: ARMOR(190 + x0, 90, 4), metal: 0.35, rough: 0.7 });
  const n = Math.max(2, Math.round((x1 - x0) / 26));
  for (let k = 1; k < n; k++) B({ id: `belly-line-${m}-${k}`, kind: "box", size: [1.6, 2 * w - 16, 0.8], at: [x0 + ((x1 - x0) * k) / n, 0, z0 - 2.6], color: "#4b5057" });
  for (const s of [-1, 1]) {
    B({ id: `belly-rim-${m}-${s < 0 ? "s" : "p"}`, kind: "box", size: [x1 - x0 + 2, 3, 2.6], r: 1, at: [(x0 + x1) / 2, s * (w - 5), z0 - 2.4], color: "#5e646b", metal: 0.4 });
    // greebled lower edge band: small boxes and recessed panels on the lower chamfer
    for (let k = 0; k < Math.floor((x1 - x0) / 22); k++) onSide(m, s, z0 + 1.5, 0.4, { id: `low-greeble-${m}-${s < 0 ? "s" : "p"}-${k}`, kind: "box", size: [8 + (k % 3) * 4, 2.4, 5 + (k % 2) * 3], r: 0.8, at: [x0 + 10 + k * 22], color: k % 3 ? GREY_D : DARK, metal: 0.4 });
  }
}
// belly hatches: a hinged access hatch under the troop bay (with a loop handle) and a rear ventral hatch
B({ id: "belly-hatch-frame", kind: "box", size: [40, 34, 2], r: 6, at: [52, 0, 330.4], color: "#7e858c", metal: 0.4 });
B({ id: "belly-hatch-door", kind: "box", size: [33, 27, 2], r: 4, at: [52, 0, 329.6], color: GREY_D, texture: ARMOR(196, 60, 2), metal: 0.35 });
B({ id: "belly-hatch-handle", kind: "tube", points: [[44, -8, 329.8], [41, -8, 325], [41, 8, 325], [44, 8, 329.8]], r: 1.3, color: DARK, metal: 0.6 });
B({ id: "belly-hatch-rear", kind: "box", size: [30, 40, 2], r: 4, at: [-120, 0, 332.4], color: "#6b7178", metal: 0.4 });
// pipe runs along each lower edge, ducking up into the hips
for (const s of [-1, 1]) B({ id: `belly-pipe-${s < 0 ? "s" : "p"}`, kind: "tube", points: [[-140, s * 40, 333], [HIP_R - 30, s * 40, 331], [HIP_R - 12, s * 30, 322], [HIP_R + 30, s * 34, 329], [HIP_F - 30, s * 34, 329], [HIP_F - 12, s * 30, 322], [HIP_F + 22, s * 36, 331], [144, s * 36, 333]], r: 2.2, color: "#5b6168", metal: 0.5, rough: 0.5 });
// the front module's belly (kg 135-140): two proud plates split by a notch where the neck trunk runs, a wedge spine,
// a mesh grille at the front, and dark cavities with machinery along both lower edges
B({ id: "fbelly-plate", kind: "extrude", plane: "xy", outline: [[96, -32], [146, -32], [146, -10], [126, -10], [118, 0], [126, 10], [146, 10], [146, 32], [96, 32]], depth: 3, bevel: 1, at: [0, 0, 328.6], color: "#c3c8cd", texture: ARMOR(201, 70, 3), metal: 0.35, rough: 0.65 });
B({ id: "fbelly-spine", kind: "extrude", plane: "xy", outline: [[146, -8], [146, 8], [106, 0]], depth: 4, bevel: 1, at: [0, 0, 326], color: "#a9afb6", texture: ARMOR(202, 60, 2), metal: 0.4 });
B({ id: "fbelly-mesh", kind: "box", size: [10, 16, 1.6], r: 0.7, at: [138, 0, 324.6], color: "#33383e", rough: 0.85 });
for (let k = 0; k < 6; k++) B({ id: `fbelly-mesh-bar-${k}`, kind: "box", size: [9, 1, 1], at: [138, -6.5 + k * 2.6, 324], color: METAL, metal: 0.6 });
for (const s of [-1, 1]) {
  B({ id: `fbelly-cavity-${s < 0 ? "s" : "p"}`, kind: "box", size: [46, 7, 3], r: 1, at: [120, s * 37, 330.2], color: "#2c3035", rough: 0.9 });
  for (let k = 0; k < 3; k++) B({ id: `fbelly-gear-${s < 0 ? "s" : "p"}-${k}`, kind: "cylinder", r: 2.8, h: 5, segments: 16, at: [104 + k * 15, s * 37, 326], color: "#7a8087", metal: 0.6 });
}
// the lower front under the neck: an oval collar round the neck socket, mesh grilles either side, an angled chin plate
B({ id: "socket-ring", kind: "torus", r: 38, tube: 4, segments: 48, at: [155, 0, 362], rot: [0, 90, 0], color: GREY_D, metal: 0.45 });
for (const s of [-1, 1]) {
  B({ id: `socket-mesh-${s < 0 ? "s" : "p"}`, kind: "box", size: [2, 14, 34], r: 0.8, at: [153.5, s * 30, 336], color: "#363b41", rough: 0.85 });
  for (let k = 0; k < 5; k++) B({ id: `socket-mesh-bar-${s < 0 ? "s" : "p"}-${k}`, kind: "box", size: [1, 13, 1], at: [154.6, s * 30, 340 + k * 6], color: METAL, metal: 0.6 });
  B({ id: `chin-plate-${s < 0 ? "s" : "p"}`, kind: "box", size: [3, 28, 34], r: 1, at: [149, s * 24, 326], rot: [s * 18, -14, 0], ...hull(198 + s) });
}

// ---- interior (colour-coded departments): troops in the centre module, speeder bikes low and the generator high in
// the rear module, the hatchway to the neck corridor in the front module
const DECK = 340;
const troopers = [];
for (const s of [-1, 1]) {
  B({ id: `troop-bench-${s < 0 ? "s" : "p"}`, kind: "box", size: [108, 13, 20], r: 2, at: [20, s * 38, DECK], color: "#5a6f8a" });
  B({ id: `troop-rack-${s < 0 ? "s" : "p"}`, kind: "box", size: [108, 5, 8], at: [20, s * 44, DECK + 82], color: "#4a5d75" });
  for (let k = 0; k < 5; k++) troopers.push([-22 + k * 21, s * 36, DECK + 20]);
}
B({ id: "troop-bodies", kind: "instances", shape: "cylinder", r: 6, h: 32, items: troopers, color: "#e9edf2", rough: 0.5 });
B({ id: "troop-helmets", kind: "instances", shape: "sphere", r: 6.8, segments: 14, items: troopers.map(([x, y, z]) => [x, y, z + 38]), color: "#f4f6f8", rough: 0.35 });
B({ id: "troop-light", kind: "box", size: [100, 6, 3], at: [20, 0, 478], color: "#cfe3ff", emissive: "#9cc2ff", glow: 0.6 });
B({ id: "bay-deck", kind: "box", size: [88, 92, 5], at: [-97, 0, 404], color: "#6d747c" });
for (let k = 0; k < 5; k++) {
  const x = -134 + k * 18;
  B({ id: `bike-${k}-body`, kind: "box", size: [9, 40, 10], r: 3, at: [x, 6, DECK + 24], color: "#8a7350" });
  B({ id: `bike-${k}-vanes`, kind: "box", size: [12, 4, 14], r: 1, at: [x, -26, DECK + 22], color: "#6d5c40" });
  B({ id: `bike-${k}-cradle`, kind: "box", size: [10, 46, 24], at: [x, 3, DECK], color: "#4d535a" });
}
B({ id: "generator-core", kind: "cylinder", r: 18, h: 80, segments: 40, at: [-97, 40, 438], rot: [90, 0, 0], color: "#c46a2a", metal: 0.4, emissive: "#ff7a1a", glow: 0.35 });
for (let k = 0; k < 4; k++) B({ id: `generator-ring-${k}`, kind: "cylinder", r: 21, h: 5, segments: 40, at: [-97, 34 - k * 21, 438], rot: [90, 0, 0], color: "#5a3a26", metal: 0.6 });
B({ id: "generator-mount", kind: "box", size: [44, 84, 9], at: [-97, 0, 409], color: "#4d535a" });
B({ id: "neck-hatchway", kind: "box", size: [40, 44, 56], r: 4, at: [126, 0, 340], color: "#55606b", rough: 0.7 });
B({ id: "conduit-main", kind: "tube", points: [[-80, 0, 458], [-40, 0, 472], [76, 0, 472], [80, 0, 428], [128, 0, 412], [150, 0, 372]], r: 4, color: "#d08a3a" });
B({ id: "conduit-legs", kind: "tube", points: [[HIP_R, -30, 410], [HIP_R, -40, 350], [HIP_F, -40, 350], [HIP_F, 40, 350], [HIP_R, 40, 350], [HIP_R, 30, 410]], r: 3, color: "#d08a3a" });

// ---- neck: a segmented accordion low on the front face, cables alongside, round a crew corridor
plain({ id: "neck", kind: "group", at: [159, 0, 362], parent: "body" });
const bellows = [[0, 0]]; for (let k = 0; k <= 14; k++) bellows.push([k % 2 ? 33 : 28.5, k * 3]); bellows.push([28, 44], [0, 44]);
add({ id: "neck-bellows", kind: "lathe", profile: bellows, segments: 48, at: [0, 0, 0], rot: [0, 90, 0], color: "#80868d", metal: 0.35, rough: 0.65, parent: "neck" });
add({ id: "neck-collar", kind: "cylinder", r: 37, h: 6, segments: 48, at: [-2, 0, 0], rot: [0, 90, 0], color: GREY_D, texture: ARMOR(70, 80), metal: 0.4, parent: "neck" });
add({ id: "neck-corridor", kind: "cylinder", r: 14, h: 46, segments: 32, at: [-1, 0, 0], rot: [0, 90, 0], color: "#55606b", open: true, parent: "neck" });
for (const s of [-1, 1]) for (const k of [0, 1]) add({ id: `neck-cable-${s < 0 ? "s" : "p"}-${k}`, kind: "tube", points: [[-2, s * (30 + k * 5), 18 - k * 30], [16, s * (37 + k * 4), 12 - k * 34], [40, s * (32 + k * 5), 16 - k * 30]], r: 2.2, color: "#3e4349", metal: 0.4, parent: "neck" });

// ---- head: a faceted wedge cab lofted through measured cross-sections (narrow, low front; chamfered top and belly
// facets), a hollow shell so the slice opens the cockpit; round cheek discs carry the temple guns, chin guns on a gimbal
plain({ id: "head", kind: "group", at: [203, 0, 360], scale: 1.24, parent: "body" });
// a head section: bottom, side and top half-widths; bottom, lower-chamfer, upper-chamfer and top heights
const hsec = (wb, w, wt, z0, z1, z2, z3) => [[-wb, z0], [wb, z0], [w, z1], [w, z2], [wt, z3], [-wt, z3], [-w, z2], [-w, z1]];
const HEADS = [[0, hsec(30, 40, 30, -32, -20, 18, 34)], [58, hsec(31, 42, 28, -34, -22, 16, 33)], [92, hsec(27, 40, 22, -34, -22, 8, 21)],
  [112, hsec(26, 37, 21, -31, -20, 2, 11)], [124, hsec(22, 31, 17, -26, -16, -3, 5)]];
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
  { id: "cockpit", name: "Command cockpit", match: /^(head-|viewport|seat|crew|console)/, anchor: [268, 0, 372],
    fn: "The head is the command cab. A pilot and a gunner sit side by side behind the viewports, with the commander behind them. The head turns on the neck to aim the guns and to look for targets.",
    canon: "Canon describes a cockpit crew of three: pilot, gunner and commander." },
  { id: "guns", name: "Heavy lasers and blasters", match: /^(chin-|temple-)/, anchor: [350, 0, 318],
    fn: "Two heavy laser cannons hang under the chin on a gimbal, and two medium blasters sit at the temples. They aim with the head, so the neck is the turret.",
    canon: "Wookieepedia lists two chin-mounted heavy laser cannons and two medium blasters on the head." },
  { id: "neck", name: "Neck and crew corridor", match: /^neck-/, anchor: [181, 0, 362],
    fn: "A segmented bellows lets the head swing while a corridor inside joins the cockpit to a hatchway in the front module. Power and control lines run through it.",
    canon: "The neck is often described as the walker's weak point. This corridor layout is illustrative." },
  { id: "troops", name: "Troop bay", match: /^troop-/, anchor: [20, 0, 392],
    fn: "Infantry ride in the centre module, the tallest of the three, on benches along both walls. They leave by the side hatches or the rear ramp once the walker kneels.",
    canon: "Canon gives a capacity of about 40 troopers. Ten are shown here." },
  { id: "speeders", name: "Speeder bike bay", match: /^bike-|^bay-/, anchor: [-97, 0, 368],
    fn: "Speeder bikes are stowed in cradles on the lower deck of the rear module for scouts to deploy on the ground.",
    canon: "Canon sources say an AT-AT carried up to five speeder bikes." },
  { id: "power", name: "Power generator", match: /^(generator-|conduit-)/, anchor: [-97, 0, 438],
    fn: "The generator in the upper rear module, under its sloping roof, feeds the leg drives, the guns and the systems in the head through armoured conduits.",
    canon: "Its exact place inside differs between sources. This placement is illustrative." },
  { id: "legs", name: "Leg drives", match: /^(thigh-|knee-|shin-|ankle-|foot-|hip-)/, anchor: [100, -42, 200],
    fn: "Under the belly, a transverse axle carries each pair of legs, driven from a shield-shaped housing and a ribbed barrel; exposed hydraulic struts drive the knees and ankles. Only one foot is in the air at a time, so three feet always carry the weight. The round, ridged feet spread the load on snow.",
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
