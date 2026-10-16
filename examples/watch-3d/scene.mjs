// A Swiss-lever mechanical watch movement seen from the caseback, as a three.js scene. One world unit is
// 0.1 mm (a 25.6 mm movement is 256 units across). The bridges are skeletonised so the going train and the
// escapement can be seen; the automatic rotor is removed.
import { collector } from "../../kit/three-parts.mjs";

export const FACTS = {
  // [1] Balance wheel: modern watches beat 6, 8 or 10 times a second; 28,800 beats an hour is 8 (4 Hz)
  bph: 28800,
  // [2] Lever escapement: escape wheel usually 15 teeth, 24° apart; each beat drops half a tooth; two impulses per cycle
  escapeTeeth: 15,
  // [3] Wheel train: centre wheel turns once an hour (minute hand); fourth wheel once a minute (seconds)
  centreRevH: 1, fourthRevMin: 1,
  // [4] Mainspring: a one-day movement runs 36–40 hours on a full wind
  reserveH: [36, 40],
  // [5] ETA 2824-2 class calibre: 25.6 mm across
  diameterMm: 25.6,
};
export const SOURCES = [
  ["[1]", "Wikipedia, Balance wheel (beat rates: 18,000, 21,600, 28,800, 36,000 BPH)", "https://en.wikipedia.org/wiki/Balance_wheel"],
  ["[2]", "Wikipedia, Lever escapement (locking, impulse, drop, draw; 15-tooth escape wheel)", "https://en.wikipedia.org/wiki/Lever_escapement"],
  ["[3]", "Wikipedia, Wheel train (centre wheel once an hour, fourth wheel once a minute)", "https://en.wikipedia.org/wiki/Wheel_train"],
  ["[4]", "Wikipedia, Mainspring (one-day movements run 36–40 hours)", "https://en.wikipedia.org/wiki/Mainspring"],
  ["[5]", "Swatch Group / ETA, calibre 2824-2 (25.6 mm, 28,800 A/h)", "https://www.eta.ch/"],
];
export const SIMPLIFIED = [
  "The bridges are cut back (skeletonised) and the automatic rotor and keyless works are left out so the train can be seen.",
  "Tooth counts are chosen so the ratios are exact (centre 1/h, fourth 1/min, escape wheel 16 rpm at 4 Hz); real calibres use similar but not identical counts.",
  "Gear teeth are trapezoids, not involute or cycloidal profiles; the escape teeth and pallet stones are simplified clubs and blocks.",
  "The balance swing is a sine with a set amplitude; in a real watch amplitude falls as the mainspring runs down, and the impulse is a brief push near the centre.",
  "Motion is slowed (default 1/8) so the escapement can be followed; the readout gives real-time rates.",
];

// The going train: arbor centres, tooth counts and modules, placed so each wheel meshes with the next pinion.
const deg = Math.PI / 180, dir = (a) => [Math.cos(a * deg), Math.sin(a * deg)];
const r = (N, m) => (N * m) / 2;
export const TRAIN = [];
const place = (id, from, wheelR, pinionR, angle) => { const [dx, dy] = dir(angle); return [from[0] + (wheelR + pinionR) * dx, from[1] + (wheelR + pinionR) * dy]; };
export const W = {
  barrel: { N: 80, m: 1.4, pN: 0 },
  centre: { N: 80, m: 0.9, pN: 12, pm: 1.4 },
  third: { N: 75, m: 0.7, pN: 10, pm: 0.9 },
  fourth: { N: 96, m: 0.4, pN: 10, pm: 0.7 },
  escape: { N: 15, m: 0, pN: 6, pm: 0.4 },
};
W.centre.at = [0, 0];
W.barrel.at = place("barrel", W.centre.at, r(W.centre.pN, W.centre.pm), r(W.barrel.N, W.barrel.m), 150);
W.third.at = place("third", W.centre.at, r(W.centre.N, W.centre.m), r(W.third.pN, W.third.pm), 10);
W.fourth.at = place("fourth", W.third.at, r(W.third.N, W.third.m), r(W.fourth.pN, W.fourth.pm), -40);
W.escape.at = place("escape", W.fourth.at, r(W.fourth.N, W.fourth.m), r(W.escape.pN, W.escape.pm), -150);
export const ESC_R = 20;
export const PALLET = { at: place("pallet", W.escape.at, ESC_R, 9, -118), arm: 12.1, fork: 30, stoneA: 0.61 };
export const BAL = { at: place("bal", PALLET.at, PALLET.fork, 7, -118), r: 34, amp: 290, roller: 7 };
export const BARREL_DIR = 150; // the barrel lies on this bearing from the centre wheel

/** Angular speeds in revolutions per second for each arbor at beat rate bph (centre once an hour). */
export function trainRates(bph = FACTS.bph) {
  const escRps = bph / 3600 / 2 / FACTS.escapeTeeth; // one tooth per two beats
  const fourth = (escRps * W.escape.pN) / W.fourth.N;
  const third = (fourth * W.fourth.pN) / W.third.N;
  const centre = (third * W.third.pN) / W.centre.N;
  const barrel = (centre * W.centre.pN) / W.barrel.N;
  return { escape: escRps, fourth, third, centre, barrel, hz: bph / 7200 };
}
export const MAINSPRING_TURNS = 5.8;
export const reserveHours = () => MAINSPRING_TURNS / (trainRates().barrel * 3600);

const { parts, add } = collector();
const GOLD = { color: "#d6ac5e", metal: 0.95, rough: 0.28 };
const STEEL = { color: "#c9ced6", metal: 0.95, rough: 0.18 };
const BLUED = { color: "#24357a", metal: 0.85, rough: 0.25, material: { clearcoat: 0.6, iridescence: 0.4 } };
const RUBY = { color: "#d0103a", glass: true, material: { transmission: 0.55, ior: 1.76, thickness: 6, rough: 0.05 } };

/** A gear outline (trapezoid teeth) in its own xy plane: pitch radius from N and module m. */
export function gearOutline(N, m) {
  const R = r(N, m), ro = R + m, rr = R - 1.25 * m, pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, s = Math.PI / N;
    for (const [rad, f] of [[rr, -0.5], [ro, -0.22], [ro, 0.22], [rr, 0.5]]) pts.push([rad * Math.cos(a + f * s * 1.6), rad * Math.sin(a + f * s * 1.6)]);
  }
  return pts;
}
const spokes = (rIn, rOut, n, open = 0.62) => Array.from({ length: n }, (_, k) => {
  const a0 = (k / n) * Math.PI * 2 + 0.25, a1 = a0 + ((Math.PI * 2) / n) * open, seg = 10;
  return [...Array.from({ length: seg + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / seg; return [rOut * Math.cos(a), rOut * Math.sin(a)]; }), ...Array.from({ length: seg + 1 }, (_, i) => { const a = a1 - ((a1 - a0) * i) / seg; return [rIn * Math.cos(a), rIn * Math.sin(a)]; })];
});

// Mainplate with perlage-like circular grain, and the skeletonised bridges.
export const Z = { plate: 0, plateH: 10, wheel: 14, bridge: 34 };
const circle = (R, n = 96, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + R * Math.cos((i / n) * Math.PI * 2), cy + R * Math.sin((i / n) * Math.PI * 2)]);
add({ id: "mainplate", kind: "extrude", outline: circle(128), holes: [circle(BAL.r + 6, 64, ...BAL.at)], depth: Z.plateH, at: [0, 0, Z.plate], texture: { kind: "brushed", seed: 21, project: "box", tile: 30, color: "#b9bec6" }, color: "#c8ccd2", metal: 0.85, rough: 0.35 });
add({ id: "case-ring", kind: "torus", r: 131, tube: 4, segments: 128, at: [0, 0, Z.plateH / 2], ...STEEL });
add({ id: "balance-recess", kind: "cylinder", r: BAL.r + 6, h: 2, segments: 64, at: [...BAL.at, 1], color: "#8a9098", metal: 0.8, rough: 0.5 });
// Wheels: each a gear extrude with crossings (spokes cut as holes), a pinion and an arbor, all in an arbor group.
export const ARBORS = ["barrel", "centre", "third", "fourth", "escape"];
for (const id of ARBORS) {
  const w = W[id], z = { barrel: 11, centre: 23, third: 26, fourth: 29, escape: 23 }[id];
  add({ id, kind: "group", at: [...w.at, 0] });
  if (id !== "escape") {
    const R = r(w.N, w.m);
    add({ id: `${id}-wheel`, kind: "extrude", outline: gearOutline(w.N, w.m), holes: spokes(R * 0.28, R - 2.2 * w.m - 1.5, id === "barrel" ? 0 : 4), depth: id === "barrel" ? 3 : 1.6, at: [0, 0, z], ...GOLD, parent: id });
  }
  if (w.pN) add({ id: `${id}-pinion`, kind: "extrude", outline: gearOutline(w.pN, w.pm), depth: id === "escape" ? 9 : 13, at: [0, 0, id === "escape" ? z + 1.4 : z - 13], ...STEEL, parent: id });
  add({ id: `${id}-arbor`, kind: "cylinder", r: 1.6, h: Z.bridge - Z.plate + 2, at: [0, 0, (Z.bridge + Z.plate) / 2], ...STEEL, parent: id });
}
// Barrel: a drum with windows on the mainspring, the spring itself, the ratchet wheel on top.
const BR = r(W.barrel.N, W.barrel.m) - 2.5;
add({ id: "barrel-drum", kind: "extrude", outline: circle(BR), holes: spokes(14, BR - 4, 3, 0.7), depth: 8, at: [0, 0, Z.plateH + 4], ...GOLD, parent: "barrel" });
export const SPRING = { turns: 9, r0: 7, r1: BR - 6, z: Z.plateH + 9 };
add({ id: "spring-pivot", kind: "group", at: [...W.barrel.at, 0] });
add({ id: "mainspring", kind: "tube", r: 0.9, segments: 900, points: Array.from({ length: 361 }, (_, i) => { const f = i / 360, a = f * SPRING.turns * Math.PI * 2, rad = SPRING.r0 + (SPRING.r1 - SPRING.r0) * f; return [rad * Math.cos(a), rad * Math.sin(a), SPRING.z]; }), ...BLUED, edges: false, parent: "spring-pivot" });
add({ id: "ratchet", kind: "extrude", outline: gearOutline(48, 1.6), holes: spokes(10, 26, 5, 0.6), depth: 2.4, at: [...W.barrel.at, Z.bridge + 2], ...STEEL, texture: { kind: "brushed", seed: 31, color: "#d4d8de" } });
add({ id: "click", kind: "box", size: [14, 4, 2], r: 1, rot: [0, 0, 30], at: [W.barrel.at[0] + 30, W.barrel.at[1] - 24, Z.bridge + 3], ...STEEL });
// Escape wheel: 15 club teeth.
const escOutline = [];
for (let i = 0; i < FACTS.escapeTeeth; i++) {
  const a = (i / FACTS.escapeTeeth) * Math.PI * 2, s = (Math.PI * 2) / FACTS.escapeTeeth;
  for (const [rad, f] of [[ESC_R - 6, 0], [ESC_R, 0.18], [ESC_R + 0.3, 0.32], [ESC_R - 2, 0.42], [ESC_R - 6, 0.55]]) escOutline.push([rad * Math.cos(a + f * s), rad * Math.sin(a + f * s)]);
}
add({ id: "escape-wheel", kind: "extrude", outline: escOutline, holes: spokes(4, ESC_R - 8, 5, 0.55), depth: 1.4, at: [0, 0, Z.wheel + 9], ...STEEL, color: "#dfe3ea", parent: "escape" });
// Pallet fork with its two ruby stones, on its own arbor; banking pins either side of the fork.
add({ id: "pallet", kind: "group", at: [...PALLET.at, 0] });
const toB = Math.atan2(BAL.at[1] - PALLET.at[1], BAL.at[0] - PALLET.at[0]), toE = toB + Math.PI;
export const FORK_ANGLE = toB / deg;
const local = (a, d) => [d * Math.cos(a), d * Math.sin(a)];
const forkOutline = [local(toE + 0.78, PALLET.arm - 1), local(toE + 0.5, PALLET.arm + 0.5), local(toE, 4), local(toE - 0.5, PALLET.arm + 0.5), local(toE - 0.78, PALLET.arm - 1), local(toE - 0.4, 3), local(toB - 0.12, PALLET.fork - 4), local(toB - 0.2, PALLET.fork + 1), local(toB - 0.06, PALLET.fork + 1), local(toB - 0.05, PALLET.fork - 2.5), local(toB + 0.05, PALLET.fork - 2.5), local(toB + 0.06, PALLET.fork + 1), local(toB + 0.2, PALLET.fork + 1), local(toB + 0.12, PALLET.fork - 4), local(toE + 0.4, 3)];
add({ id: "pallet-fork", kind: "extrude", outline: forkOutline, depth: 1.4, at: [0, 0, Z.wheel + 9], ...STEEL, color: "#dfe3ea", parent: "pallet" });
for (const [i, s] of [-1, 1].entries()) {
  const [x, y] = local(toE + s * PALLET.stoneA, PALLET.arm);
  add({ id: `pallet-stone-${i}`, kind: "box", size: [2.2, 4.6, 1.6], rot: [0, 0, (toE + s * PALLET.stoneA) / deg], at: [x, y, Z.wheel + 9.7], ...RUBY, parent: "pallet" });
}
add({ id: "pallet-arbor", kind: "cylinder", r: 1.2, h: Z.bridge - Z.plate, at: [0, 0, Z.bridge / 2], ...STEEL, parent: "pallet" });
for (const [i, s] of [-1, 1].entries()) { const [x, y] = local(toB + s * 0.32, 14); add({ id: `banking-pin-${i}`, kind: "cylinder", r: 1, h: 8, at: [PALLET.at[0] + x, PALLET.at[1] + y, Z.wheel + 6], ...STEEL }); }
// Balance: rim, three arms, timing screws, roller with the impulse jewel, the hairspring (breathes), the cock.
add({ id: "balance", kind: "group", at: [...BAL.at, 0] });
const BZ = Z.wheel + 12;
add({ id: "balance-rim", kind: "torus", r: BAL.r, tube: 2.4, segments: 128, at: [0, 0, BZ], ...GOLD, parent: "balance" });
for (let i = 0; i < 3; i++) add({ id: `balance-arm-${i}`, kind: "box", size: [BAL.r * 2 - 2, 2.6, 1.6], rot: [0, 0, i * 60], at: [0, 0, BZ], ...GOLD, parent: "balance" });
for (let i = 0; i < 12; i++) { const [x, y] = local((i / 12) * Math.PI * 2 + 0.26, BAL.r + 2.6); add({ id: `timing-screw-${i}`, kind: "cylinder", r: 1.7, h: 2.4, rot: [0, 90, (i / 12) * 360 + 15], at: [x, y, BZ], ...(i % 3 ? GOLD : BLUED), parent: "balance" }); }
add({ id: "roller", kind: "cylinder", r: BAL.roller, h: 1.6, segments: 48, at: [0, 0, Z.wheel + 9.7], ...STEEL, parent: "balance" });
add({ id: "impulse-jewel", kind: "cylinder", r: 0.9, h: 3.4, at: [...local(toE, BAL.roller - 1.2), Z.wheel + 9.5], ...RUBY, parent: "balance" });
add({ id: "balance-staff", kind: "cylinder", r: 1.1, h: 30, at: [0, 0, BZ + 1], ...STEEL, parent: "balance" });
export const HAIR = { turns: 13, r0: 3.2, r1: 22, z: BZ + 6 };
add({ id: "hairspring-pivot", kind: "group", at: [...BAL.at, 0] });
add({ id: "hairspring", kind: "tube", r: 0.32, segments: 1400, points: Array.from({ length: 521 }, (_, i) => { const f = i / 520, a = f * HAIR.turns * Math.PI * 2, rad = HAIR.r0 + (HAIR.r1 - HAIR.r0) * f; return [rad * Math.cos(a), rad * Math.sin(a), HAIR.z]; }), ...BLUED, edges: false, parent: "hairspring-pivot" });
// Bridges: barrel bridge, train bridge (skeleton arms), pallet bridge, balance cock. Côtes-de-Genève brushed.
const arm = (pts, w) => { const out = []; const L = pts.length; for (let i = 0; i < L; i++) { const [x, y] = pts[i], [nx, ny] = pts[Math.min(L - 1, i + 1)], [px, py] = pts[Math.max(0, i - 1)]; const dx = nx - px, dy = ny - py, d = Math.hypot(dx, dy) || 1; out.push([x - (dy / d) * w, y + (dx / d) * w]); } for (let i = L - 1; i >= 0; i--) { const [x, y] = pts[i], [nx, ny] = pts[Math.min(L - 1, i + 1)], [px, py] = pts[Math.max(0, i - 1)]; const dx = nx - px, dy = ny - py, d = Math.hypot(dx, dy) || 1; out.push([x + (dy / d) * w, y - (dx / d) * w]); } return out; };
const BRIDGE = { texture: { kind: "brushed", seed: 41, project: "box", tile: 14, color: "#d4d8de" }, color: "#d9dde3", metal: 0.9, rough: 0.22 };
const edgeFoot = (a, R = 122) => [R * Math.cos(a * deg), R * Math.sin(a * deg)];
add({ id: "barrel-bridge", kind: "extrude", outline: arm([edgeFoot(110), W.barrel.at, edgeFoot(200)], 7), depth: 4, at: [0, 0, Z.bridge - 2], ...BRIDGE });
add({ id: "train-bridge", kind: "extrude", outline: arm([edgeFoot(60), W.third.at, W.fourth.at, edgeFoot(5)], 5), depth: 4, at: [0, 0, Z.bridge - 2], ...BRIDGE });
add({ id: "centre-bridge", kind: "extrude", outline: arm([W.centre.at, edgeFoot(250)], 5), depth: 4, at: [0, 0, Z.bridge - 2], ...BRIDGE });
add({ id: "pallet-bridge", kind: "extrude", outline: arm([PALLET.at, edgeFoot(-62)], 3.2), depth: 3, at: [0, 0, Z.bridge - 2], ...BRIDGE });
add({ id: "escape-cock", kind: "extrude", outline: arm([W.escape.at, edgeFoot(-20)], 3.6), depth: 3, at: [0, 0, Z.bridge - 2], ...BRIDGE });
add({ id: "balance-cock", kind: "extrude", outline: arm([edgeFoot(-150), [BAL.at[0] - 10, BAL.at[1] + 6], BAL.at], 6), depth: 4, at: [0, 0, BZ + 9], ...BRIDGE });
add({ id: "cock-foot", kind: "cylinder", r: 7, h: BZ + 9 - Z.plateH, segments: 32, at: [...edgeFoot(-150, 116), (BZ + 9 + Z.plateH) / 2], ...BRIDGE });
add({ id: "regulator", kind: "box", size: [28, 2.4, 1.2], r: 0.6, rot: [0, 0, 70], at: [BAL.at[0] - 6, BAL.at[1] + 10, BZ + 13.4], ...STEEL });
// Jewels in chatons on every pivot, and blued screws on the bridges.
const JEWELS = [W.centre.at, W.third.at, W.fourth.at, W.escape.at, PALLET.at, BAL.at];
JEWELS.forEach((p, i) => { const z = i === 5 ? BZ + 13.2 : Z.bridge + 2.2; add({ id: `chaton-${i}`, kind: "cylinder", r: i === 5 ? 4.2 : 3.6, h: 1, segments: 32, at: [...p, z - 0.2], ...GOLD }); add({ id: `jewel-${i}`, kind: "cylinder", r: i === 5 ? 2.8 : 2.4, h: 1.2, segments: 32, at: [...p, z + 0.5], ...RUBY }); });
add({ id: "cap-jewel", kind: "sphere", r: 1.6, at: [...BAL.at, BZ + 14.6], ...RUBY });
for (const [i, a] of [110, 200, 60, 5, 250, -62, -150, -20].entries()) { const [x, y] = edgeFoot(a, 116); add({ id: `screw-${i}`, kind: "cylinder", r: 3.4, h: 1.6, segments: 32, at: [x, y, Z.bridge + 2.8], ...BLUED }); add({ id: `screw-slot-${i}`, kind: "box", size: [6, 0.8, 0.6], rot: [0, 0, a + 40], at: [x, y, Z.bridge + 3.7], color: "#101828" }); }
// Energy path glows (effects): the travelling impulse along barrel → centre → third → fourth → escape → balance.
export const PATH = [W.barrel.at, W.centre.at, W.third.at, W.fourth.at, W.escape.at, PALLET.at, BAL.at];
add({ id: "energy", kind: "sphere", r: 8, at: [...W.barrel.at, Z.bridge + 6], edges: false, shader: { name: "glow", uniforms: { uColor: "#ffcf6a", uLevel: 0, uPower: 1.6 } } });
add({ id: "impulse-glow", kind: "sphere", r: 6, at: [...PALLET.at, Z.wheel + 10], edges: false, shader: { name: "glow", uniforms: { uColor: "#ff4060", uLevel: 0, uPower: 1.4 } } });
add({ id: "seconds-marker", kind: "box", size: [30, 1.2, 0.8], at: [15, 0, 30.8], color: "#e0b020", emissive: "#e0b020", glow: 0.3, lit: true, parent: "fourth" });

export const scene = {
  fig: "Fig 8",
  title: "Mechanical watch movement, Swiss lever",
  hint: "1–4 follow the power · ← → slow motion · Space pauses",
  readout: "Escapement · 4 Hz · 0° · beat 0 · 38.0 h",
  size: "hero",
  width: 820,
  height: 640,
  pad: 0.04,
  camera: { azimuth: 25, elevation: 58 },
  env: { intensity: 1.1 },
  parts,
};
