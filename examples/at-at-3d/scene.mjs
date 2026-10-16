// Fig 11: an all-terrain armoured walker, walking in place in snow, with a movable side section.
// An original procedural model after the AT-AT design (no film assets), proportioned from film stills and
// studio-miniature photos: a long hexagonal-section body high on four tall legs, a short ribbed neck low on
// the front face, a wedge head with chin lasers and cheek blaster pods, knees that bend forward on all legs.
// Units ~4 cm. Body frame: x forward (head +x), y to the walker's left, z up; ground z = 0.
import { assertScene } from "../../kit/three-scene.mjs";

export const L1 = 205, L2 = 245;            // thigh and shin
export const HZ = 430;                       // hip joint height
export const ANKLE = 38;                     // ankle height in stance (pad pressed into the snow)
export const LEGS = [["rr", -150, -128, 0], ["fr", 150, -128, 0.25], ["rl", -150, 128, 0.5], ["fl", 150, 128, 0.75]];
export const GAIT = { period: 5.2, duty: 0.75, stride: 260, lift: 64 };
export const speed = GAIT.stride / (GAIT.duty * GAIT.period);
export const GROUND = { w: 1800, d: 1100, grid: 200 };
export const SNOW = 700;
export const BODY = { x: [-210, 210], z: [400, 590] };

const parts = [];
const ARMOR = (seed, tile = 170, panels = 5) => ({ kind: "armor", seed, panels, project: "box", tile, color: "#c3c7cc" });
const add = (p) => { const q = p.kind === "group" ? { ...p } : { cut: true, hatch: "#b4bcc6", ...p }; parts.push(q); return q; };
const plain = (p) => (parts.push(p), p);
const GREY = "#eceef0", GREY_D = "#c8ccd1", DARK = "#4a4f56", METAL = "#6d737a";
const hull = (seed, extra = {}) => ({ color: GREY, texture: ARMOR(seed), metal: 0.3, rough: 0.6, edges: false, ...extra });

// ---- ground and falling snow (not cut)
plain({ id: "snowfield", kind: "heightfield", size: [GROUND.w, GROUND.d], grid: GROUND.grid, at: [0, 0, 0], color: "#ffffff", rough: 0.9 });
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const flakes = []; for (let i = 0; i < SNOW; i++) flakes.push([(rnd() - 0.5) * GROUND.w, (rnd() - 0.5) * GROUND.d, rnd() * 820]);
plain({ id: "flakes", kind: "instances", shape: "sphere", r: 2.8, segments: 6, items: flakes, color: "#f4f8ff", rough: 0.6, edges: false });

plain({ id: "body", kind: "group", at: [0, 0, 0] });
const B = (p) => add({ parent: "body", ...p });

// ---- hull: a hexagonal section (flat sides, sloped roof shoulders, chamfered belly) extruded along x as a shell
const OUT = [[-80, 400], [80, 400], [96, 418], [96, 522], [64, 590], [-64, 590], [-96, 522], [-96, 418]];
const IN = [[-72, 411], [72, 411], [84, 423], [84, 518], [57, 578], [-57, 578], [-84, 518], [-84, 423]];
B({ id: "hull-shell", kind: "extrude", plane: "yz", outline: OUT, holes: [IN], depth: 396, bevel: 3, at: [-198, 0, 0], ...hull(31) });
B({ id: "hull-front", kind: "extrude", plane: "yz", outline: OUT, depth: 14, bevel: 3, at: [198, 0, 0], ...hull(32) });
B({ id: "hull-rear", kind: "extrude", plane: "yz", outline: OUT, depth: 14, bevel: 3, at: [-212, 0, 0], ...hull(33) });
// rear ribs and the aft ramp
for (let k = 0; k < 7; k++) B({ id: `rear-rib-${k}`, kind: "box", size: [10, 12, 150], r: 2, at: [-218, -66 + k * 22, 420], color: GREY_D, texture: ARMOR(40 + k, 120), metal: 0.35 });
B({ id: "rear-ramp", kind: "box", size: [6, 120, 70], r: 2, at: [-216, 0, 404], color: DARK, rough: 0.7 });
// roof: a raised spine with hatch, vents and greebles; shoulder strakes along the slopes
B({ id: "roof-spine", kind: "extrude", plane: "yz", outline: [[-40, 588], [40, 588], [34, 602], [-34, 602]], depth: 340, bevel: 2, at: [-180, 0, 0], ...hull(34) });
B({ id: "roof-hatch", kind: "cylinder", r: 18, h: 5, segments: 32, at: [100, 0, 602], color: GREY_D, metal: 0.4, edges: true });
for (let k = 0; k < 8; k++) B({ id: `roof-vent-${k}`, kind: "box", size: [14, 50, 5], r: 1, at: [-150 + k * 22, 0, 602], color: DARK, rough: 0.8 });
for (const s of [-1, 1]) {
  const n = s < 0 ? "s" : "p";
  B({ id: `strake-${n}`, kind: "box", size: [380, 6, 8], r: 1.5, at: [-10, s * 81, 556], rot: [-s * 44.5, 0, 0], color: GREY_D, metal: 0.4 });
  for (let k = 0; k < 5; k++) B({ id: `greeble-${n}-${k}`, kind: "box", size: [18 + (k % 3) * 8, 10, 8], r: 1.5, at: [-160 + k * 70, s * 70, 571], rot: [-s * 44.5, 0, 0], color: k % 2 ? DARK : GREY_D, metal: 0.4 });
  // side: a central troop hatch with frame, a lower skirt rib band, panel strips
  B({ id: `hatch-frame-${n}`, kind: "box", size: [104, 4, 84], r: 4, at: [60, s * 97, 445], color: GREY_D, texture: ARMOR(50, 120), metal: 0.35, edges: true });
  B({ id: `hatch-door-${n}`, kind: "box", size: [88, 4, 68], r: 3, at: [60, s * 99.5, 453], color: GREY, texture: ARMOR(51, 120), metal: 0.35, edges: true });
  B({ id: `hatch-handle-${n}`, kind: "box", size: [26, 3, 5], r: 1, at: [60, s * 102, 480], color: DARK });
  B({ id: `skirt-${n}`, kind: "box", size: [400, 5, 12], r: 1.5, at: [0, s * 97.5, 404], color: GREY_D, metal: 0.4 });
  B({ id: `side-band-${n}`, kind: "box", size: [400, 3, 6], at: [0, s * 97, 514], color: DARK });
  for (let k = 0; k < 9; k++) if (k < 3 || k > 5) B({ id: `side-rib-${n}-${k}`, kind: "box", size: [6, 4, 70], r: 1, at: [-190 + k * 44, s * 97.5, 430], color: GREY_D });
  // hips: a drum on each corner of the belly, with a cap and bolt ring
  for (const hx of [-150, 150]) {
    const h = `${n}-${hx < 0 ? "r" : "f"}`;
    B({ id: `hip-drum-${h}`, kind: "cylinder", r: 50, h: 24, segments: 48, at: [hx, s < 0 ? -96 : 120, HZ], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(60, 90), metal: 0.4, edges: true });
    B({ id: `hip-cap-${h}`, kind: "cylinder", r: 34, h: 6, segments: 40, at: [hx, s < 0 ? -120 : 126, HZ], rot: [90, 0, 0], color: METAL, metal: 0.6, rough: 0.4, edges: true });
    B({ id: `hip-hub-${h}`, kind: "cylinder", r: 14, h: 6, segments: 24, at: [hx, s < 0 ? -126 : 132, HZ], rot: [90, 0, 0], color: DARK, metal: 0.6 });
    B({ id: `hip-bolts-${h}`, kind: "instances", shape: "sphere", r: 2.4, segments: 8, items: Array.from({ length: 10 }, (_, i) => [hx + Math.cos(i * 0.628) * 26, s * 126.5, HZ + Math.sin(i * 0.628) * 26]), color: DARK, metal: 0.6 });
  }
}
// snow buildup: drifts on the roof shoulders and spine
for (const s of [-1, 1]) B({ id: `snow-roof-${s < 0 ? "s" : "p"}`, kind: "box", size: [300, 18, 3], r: 1.4, at: [-30, s * 62, 588], rot: [-s * 44.5, 0, 0], color: "#f4f7fb", rough: 0.95 });
B({ id: "snow-spine", kind: "box", size: [300, 60, 2.5], r: 1.2, at: [-20, 0, 602], color: "#f4f7fb", rough: 0.95 });

// ---- interior (colour-coded departments)
const DECK = 411;
B({ id: "troop-bulkhead", kind: "box", size: [8, 166, 160], at: [-48, 0, DECK], color: "#6d747c" });
const troopers = [];
for (const s of [-1, 1]) {
  B({ id: `troop-bench-${s < 0 ? "s" : "p"}`, kind: "box", size: [230, 20, 26], r: 2, at: [74, s * 62, DECK], color: "#5a6f8a" });
  B({ id: `troop-rack-${s < 0 ? "s" : "p"}`, kind: "box", size: [230, 6, 10], at: [74, s * 76, DECK + 100], color: "#4a5d75" });
  for (let k = 0; k < 10; k++) troopers.push([-30 + k * 23, s * 60, DECK + 26]);
}
B({ id: "troop-bodies", kind: "instances", shape: "cylinder", r: 7.5, h: 42, items: troopers, color: "#e9edf2", rough: 0.5 });
B({ id: "troop-helmets", kind: "instances", shape: "sphere", r: 8.5, segments: 14, items: troopers.map(([x, y, z]) => [x, y, z + 50]), color: "#f4f6f8", rough: 0.35 });
B({ id: "troop-light", kind: "box", size: [220, 8, 4], at: [74, 0, 572], color: "#cfe3ff", emissive: "#9cc2ff", glow: 0.6 });
B({ id: "bay-deck", kind: "box", size: [146, 166, 8], at: [-124, 0, 492], color: "#6d747c" });
for (let k = 0; k < 5; k++) {
  const x = -186 + k * 30;
  B({ id: `bike-${k}-body`, kind: "box", size: [14, 58, 13], r: 4, at: [x, 8, DECK + 30], color: "#8a7350" });
  B({ id: `bike-${k}-vanes`, kind: "box", size: [20, 5, 18], r: 1, at: [x, -38, DECK + 28], color: "#6d5c40" });
  B({ id: `bike-${k}-cradle`, kind: "box", size: [18, 66, 30], at: [x, 4, DECK], color: "#4d535a" });
}
B({ id: "generator-core", kind: "cylinder", r: 28, h: 140, segments: 40, at: [-124, 70, 535], rot: [90, 0, 0], color: "#c46a2a", metal: 0.4, emissive: "#ff7a1a", glow: 0.35 });
for (let k = 0; k < 5; k++) B({ id: `generator-ring-${k}`, kind: "cylinder", r: 32, h: 7, segments: 40, at: [-124, 62 - k * 31, 535], rot: [90, 0, 0], color: "#5a3a26", metal: 0.6 });
B({ id: "generator-mount", kind: "box", size: [70, 160, 14], at: [-124, 0, 500], color: "#4d535a" });
B({ id: "conduit-main", kind: "tube", points: [[-90, 0, 555], [-40, 0, 566], [120, 0, 566], [190, 0, 500], [215, 0, 462]], r: 5.5, color: "#d08a3a" });
B({ id: "conduit-legs", kind: "tube", points: [[-150, -50, 515], [-150, -70, 450], [150, -70, 450], [150, 70, 450], [-150, 70, 450], [-150, 50, 515]], r: 4, color: "#d08a3a" });

// ---- neck: a corrugated bellows low on the front face, round a crew corridor
plain({ id: "neck", kind: "group", at: [212, 0, 462], parent: "body" });
const bellows = [[0, 0]]; for (let k = 0; k <= 12; k++) bellows.push([k % 2 ? 40 : 34, k * 6.5]); bellows.push([30, 78], [0, 78]);
add({ id: "neck-bellows", kind: "lathe", profile: bellows.map(([r, z]) => [r, z]), segments: 48, at: [0, 0, 0], rot: [0, 90, 0], color: "#8f949a", metal: 0.3, rough: 0.7, parent: "neck", edges: true });
add({ id: "neck-collar", kind: "cylinder", r: 46, h: 10, segments: 48, at: [-4, 0, 0], rot: [0, 90, 0], color: GREY_D, texture: ARMOR(70, 90), metal: 0.4, parent: "neck", edges: true });
add({ id: "neck-corridor", kind: "cylinder", r: 22, h: 80, segments: 32, at: [-2, 0, 0], rot: [0, 90, 0], color: "#55606b", open: true, parent: "neck" });

// ---- head: a wedge shell (side profile extruded across y), turning on the neck
plain({ id: "head", kind: "group", at: [290, 0, 462], parent: "body" });
const HEAD = [[0, -46], [148, -46], [178, -28], [188, -4], [168, 22], [118, 44], [14, 48], [0, 38]];
const HW = 58, HT = 8;
// inward offset of a convex polygon (counter-clockwise in x, z)
function inset(poly, t) {
  const n = poly.length, lines = poly.map((p, i) => { const q = poly[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l; return [p[0] + nx * t, p[1] + nz * t, dx, dz]; });
  return lines.map((L, i) => { const M = lines[(i - 1 + n) % n]; const det = M[2] * L[3] - M[3] * L[2]; const u = ((L[0] - M[0]) * L[3] - (L[1] - M[1]) * L[2]) / det; return [M[0] + M[2] * u, M[1] + M[3] * u]; });
}
const HEAD_IN = inset(HEAD, HT);
const H = (p) => add({ parent: "head", ...p });
for (const s of [-1, 1]) H({ id: `head-side-${s < 0 ? "s" : "p"}`, kind: "extrude", plane: "xz", outline: HEAD, depth: HT, bevel: 1.5, at: [0, s < 0 ? -HW : HW - HT, 0], ...hull(80 + s) });
HEAD.forEach((p, i) => { const q = HEAD[(i + 1) % HEAD.length], pi = HEAD_IN[i], qi = HEAD_IN[(i + 1) % HEAD.length];
  H({ id: `head-plate-${i}`, kind: "extrude", plane: "xz", outline: [p, q, qi, pi], depth: 2 * HW - 2 * HT, at: [0, -HW + HT, 0], ...hull(90 + i) }); });
// viewports: two slits on the sloped face, a brow, a top hatch, cheek pods with blasters, chin lasers
const face = [HEAD[3], HEAD[4]], fa = Math.atan2(face[1][1] - face[0][1], face[1][0] - face[0][0]);
for (const s of [-1, 1]) {
  const n = s < 0 ? "s" : "p";
  H({ id: `viewport-${n}`, kind: "extrude", plane: "xz", outline: [[184, 2], [180, 9], [173, 15], [177, 8]].map(([x, z]) => [x + 1.8 * Math.sin(-fa), z + 1.8 * Math.cos(fa)]), depth: 30, at: [0, s < 0 ? -40 : 10, 0], color: "#151a1f", emissive: "#ff5a2a", glow: 0.3, rough: 0.2 });
  H({ id: `cheek-pod-${n}`, kind: "box", size: [64, 16, 28], r: 4, at: [118, s * (HW + 8), -30], color: GREY_D, texture: ARMOR(100, 90), metal: 0.4, edges: true });
  H({ id: `cheek-blaster-${n}`, kind: "cylinder", r: 4.5, h: 60, segments: 20, at: [148, s * (HW + 8), -16], rot: [0, 90, 0], color: METAL, metal: 0.7, rough: 0.35 });
  H({ id: `cheek-tip-${n}`, kind: "cylinder", r: 6.5, h: 8, segments: 20, at: [204, s * (HW + 8), -16], rot: [0, 90, 0], color: DARK, metal: 0.6 });
  H({ id: `chin-laser-${n}`, kind: "cylinder", r: 6.5, h: 104, segments: 24, at: [150, s * 22, -40], rot: [0, 90, 0], color: METAL, metal: 0.7, rough: 0.35 });
  H({ id: `chin-shroud-${n}`, kind: "cylinder", r: 11, h: 34, segments: 24, at: [146, s * 22, -40], rot: [0, 90, 0], color: GREY_D, metal: 0.5, edges: true });
  H({ id: `chin-muzzle-${n}`, kind: "cylinder", r: 9, h: 12, segments: 24, at: [252, s * 22, -40], rot: [0, 90, 0], color: DARK, metal: 0.6 });
  H({ id: `head-ear-${n}`, kind: "box", size: [42, 6, 30], r: 3, at: [40, s * (HW + 3), -12], color: GREY_D, texture: ARMOR(110, 90), edges: true });
}
H({ id: "chin-mount", kind: "box", size: [44, 70, 14], r: 4, at: [150, 0, -60], color: GREY_D, edges: true });
H({ id: "head-hatch", kind: "cylinder", r: 15, h: 4, segments: 28, at: [70, 0, 47], color: GREY_D, edges: true });
H({ id: "head-antenna", kind: "cylinder", r: 1.4, h: 30, at: [36, -30, 47], color: DARK });
H({ id: "snow-head", kind: "box", size: [90, 90, 2.5], r: 1.2, at: [60, 0, 47], color: "#f4f7fb", rough: 0.95 });
// crew
[["pilot", 140, -22], ["gunner", 140, 22], ["commander", 84, 0]].forEach(([n, x, y]) => {
  H({ id: `seat-${n}`, kind: "box", size: [24, 24, 20], r: 3, at: [x, y, -38], color: "#6a5040" });
  H({ id: `seat-back-${n}`, kind: "box", size: [6, 24, 28], r: 2, at: [x - 12, y, -18], color: "#6a5040" });
  H({ id: `crew-${n}`, kind: "sphere", r: 8, at: [x, y, -6], color: "#3d4248" });
});
H({ id: "console", kind: "box", size: [20, 80, 22], r: 3, at: [164, 0, -38], color: "#2f353b" });
H({ id: "console-glow", kind: "box", size: [2, 70, 7], at: [153.5, 0, -22], color: "#ffb35a", emissive: "#ff9a2a", glow: 0.9 });

// ---- legs: hip -> thigh plate -> knee flywheel -> shin -> ankle disc -> ribbed foot pad
for (const [n, hx, hy] of LEGS) {
  const s = Math.sign(hy), T = `thigh-${n}`;
  add({ id: T, kind: "group", at: [hx, hy, HZ], parent: "body" });
  add({ id: `thigh-plate-${n}`, kind: "extrude", plane: "xz", outline: [[-44, 30], [44, 30], [50, 0], [32, -L1 + 18], [-26, -L1 + 18], [-40, 0]], depth: 30, bevel: 3, at: [0, -15, 0], ...hull(120 + hx / 10), parent: T });
  add({ id: `thigh-rib-${n}`, kind: "box", size: [56, 4, 120], r: 2, at: [6, s * 16.5, -150], color: GREY_D, parent: T, edges: true });
  add({ id: `thigh-piston-${n}`, kind: "cylinder", r: 6, h: 120, at: [-36, s * 4, -L1 + 30], rot: [0, -10, 0], color: "#80868d", metal: 0.85, rough: 0.25, parent: T });
  add({ id: `thigh-gland-${n}`, kind: "cylinder", r: 10, h: 34, at: [-45, s * 4, -96], rot: [0, -10, 0], color: DARK, metal: 0.5, parent: T });
  add({ id: `knee-${n}`, kind: "cylinder", r: 30, h: 46, segments: 44, at: [0, s > 0 ? 23 : 23, -L1], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(130, 80), metal: 0.4, parent: T, edges: true });
  add({ id: `knee-wheel-${n}`, kind: "cylinder", r: 36, h: 8, segments: 48, at: [0, s > 0 ? 31 : -23, -L1], rot: [90, 0, 0], color: METAL, metal: 0.6, rough: 0.4, parent: T, edges: true });
  add({ id: `knee-spokes-${n}`, kind: "instances", shape: "box", size: [6, 3, 26], items: Array.from({ length: 6 }, (_, i) => [0, s * 32, -L1, i * 60]), tilt: [90, 0, 0], color: DARK, metal: 0.5, parent: T });
  const SH = `shin-${n}`;
  add({ id: SH, kind: "group", at: [0, 0, -L1], parent: T });
  add({ id: `shin-plate-${n}`, kind: "extrude", plane: "xz", outline: [[-30, -6], [30, -6], [24, -L2 + 26], [-22, -L2 + 26]], depth: 32, bevel: 3, at: [0, -16, 0], ...hull(140 + hx / 10), parent: SH });
  add({ id: `shin-armour-${n}`, kind: "box", size: [8, 40, 130], r: 2, at: [28, 0, -170], color: GREY_D, parent: SH, edges: true });
  for (const k of [-1, 1]) add({ id: `shin-piston-${n}-${k < 0 ? "a" : "b"}`, kind: "cylinder", r: 4.5, h: 140, at: [-30, k * 9, -L2 + 46], color: "#80868d", metal: 0.85, rough: 0.25, parent: SH });
  add({ id: `ankle-${n}`, kind: "cylinder", r: 30, h: 44, segments: 44, at: [0, 22, -L2], rot: [90, 0, 0], color: GREY_D, texture: ARMOR(150, 80), metal: 0.4, parent: SH, edges: true });
  add({ id: `ankle-cap-${n}`, kind: "cylinder", r: 20, h: 4, segments: 32, at: [0, s > 0 ? 26 : -22, -L2], rot: [90, 0, 0], color: METAL, metal: 0.6, parent: SH });
  const F = `foot-${n}`;
  add({ id: F, kind: "group", at: [0, 0, -L2], parent: SH });
  add({ id: `foot-dome-${n}`, kind: "lathe", profile: [[0, 6], [18, 4], [36, -6], [52, -18], [58, -24], [0, -24]], segments: 56, at: [0, 0, 0], color: GREY_D, texture: ARMOR(160, 90), metal: 0.4, parent: F, edges: true });
  add({ id: `foot-pad-${n}`, kind: "cylinder", r: 64, r2: 60, h: 14, segments: 56, at: [0, 0, -ANKLE], color: GREY, texture: ARMOR(170, 90), metal: 0.35, parent: F, edges: true });
  add({ id: `foot-ribs-${n}`, kind: "instances", shape: "box", size: [14, 30, 8], items: Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 54, Math.sin(i * Math.PI / 4) * 54, -ANKLE + 13, i * 45 + 90]), color: DARK, metal: 0.4, parent: F });
  add({ id: `foot-snow-${n}`, kind: "cylinder", r: 50, r2: 44, h: 3, segments: 48, at: [0, 0, -ANKLE + 14], color: "#f4f7fb", rough: 0.95, parent: F });
}

/** Departments: what each does, which parts it is, and where its card points (body frame). Fiction, after canon. */
export const DEPTS = [
  { id: "cockpit", name: "Command cockpit", match: /^(head-(side|plate)|viewport|seat|crew|console)/, anchor: [430, 0, 455],
    fn: "The head is the command cab. A pilot and a gunner sit side by side behind the viewports, with the commander behind them. The head turns on the neck to aim the guns and to look for targets.",
    canon: "Canon describes a cockpit crew of three: pilot, gunner and commander." },
  { id: "guns", name: "Heavy lasers and blasters", match: /^(chin-|cheek-)/, anchor: [530, 0, 422],
    fn: "Two heavy laser cannons sit under the chin and two medium blasters in pods on the cheeks. They aim with the head, so the neck is the turret.",
    canon: "Wookieepedia lists two chin-mounted heavy laser cannons and two medium blasters on the head." },
  { id: "neck", name: "Neck and crew corridor", match: /^neck-/, anchor: [250, 0, 462],
    fn: "A ribbed bellows lets the head swing while a corridor inside joins the cockpit to the body. Power and control lines run through it.",
    canon: "The neck is often described as the walker's weak point. This corridor layout is illustrative." },
  { id: "troops", name: "Troop bay", match: /^troop-/, anchor: [74, 0, 480],
    fn: "Infantry ride on benches along both walls. They leave by the side hatches or the rear ramp once the walker kneels.",
    canon: "Canon gives a capacity of about 40 troopers. Twenty are shown here." },
  { id: "speeders", name: "Speeder bike bay", match: /^bike-|^bay-/, anchor: [-124, 0, 450],
    fn: "Speeder bikes are stowed in cradles on the lower aft deck for scouts to deploy on the ground.",
    canon: "Canon sources say an AT-AT carried up to five speeder bikes." },
  { id: "power", name: "Power generator", match: /^(generator-|conduit-)/, anchor: [-124, 0, 545],
    fn: "The generator in the upper aft compartment feeds the leg drives, the guns and the systems in the head through armoured conduits.",
    canon: "Its exact place inside differs between sources. This placement is illustrative." },
  { id: "legs", name: "Leg drives", match: /^(thigh-|knee-|shin-|ankle-|foot-|hip-)/, anchor: [150, -128, 250],
    fn: "Hip drums and pistons lift and swing each leg, and the knee wheels drive the lower legs. Only one foot is in the air at a time, so three feet always carry the weight. The wide ribbed pads spread the load on snow.",
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
  camera: { azimuth: 30, elevation: 16 }, pad: 0.04, env: { intensity: 0.9 },
  section: { axis: "y", at: -2000 },
  parts,
};
assertScene(scene);
