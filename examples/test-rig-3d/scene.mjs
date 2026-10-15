// The press-and-pull test rig as a three.js scene.
import { collector, cornersOf, screw } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const HALF = [60, 16];
export const BUTTON_H = 10;
export const SWELL = 0.08; // a pressed button swells 8% across
export const GIVE = 14; // the most the button's top can lean, px
export const CARRY = 0.15; // the carriage takes 15% of the pull against its springs
export const PULL_MOST = 80;
export const RODS = { y: [-30, 30], z: 22, r: 3, end: 140 };
export const CARRIAGE = { w: 170, d: 72, z: 14, h: 14 };
export const SPRING = { r: 5.2, wire: 0.7, turns: 9 };
export const TOP = CARRIAGE.z + CARRIAGE.h; // carriage top
export const BUTTON_Z = TOP + 2;
export const FINGER = { rest: 78, travel: 0 };
FINGER.travel = FINGER.rest - (BUTTON_Z + BUTTON_H);
export const GANTRY = { y: 70, z: 128 };

// Base.
add({ id: "base", kind: "box", size: [330, 190, 12], r: 8, at: [0, 10, -12], tone: "mid" });
for (const [i, [x, y]] of cornersOf(0, 10, 330, 190, 24).entries()) {
  add({ id: `foot-${i}`, kind: "cylinder", r: 7, h: 5, at: [x, y, -17], tone: "lo" });
  screw(add, `base-screw-${i}`, x + Math.sign(x) * 12, y + Math.sign(y - 10) * 12, 0);
}
add({ id: "ruler", kind: "box", size: [260, 7, 0.6], at: [0, -76, 0], tone: "lo" });
add({ id: "ruler-ticks", kind: "rail", from: -126, to: 126, step: 4, every: 5, len: [2, 3.6], at: [0, -79, 0.65], tone: "mid" });

// Guide rods on end blocks.
for (const [i, sx] of [-1, 1].entries()) {
  add({ id: `end-block-${i}`, kind: "box", size: [12, 84, 32], r: 2, at: [sx * (RODS.end + 6), 0, 0], tone: "mid" });
  for (const [j, y] of RODS.y.entries()) add({ id: `end-cap-${i}-${j}`, kind: "cylinder", r: 4.4, h: 2, rot: [0, sx * 90, 0], at: [sx * (RODS.end + 12), y, RODS.z], tone: "hi" });
  screw(add, `end-screw-${i}`, sx * (RODS.end + 6), 0, 32, { r: 1.6 });
}
for (const [j, y] of RODS.y.entries()) add({ id: `rod-${j}`, kind: "cylinder", r: RODS.r, h: RODS.end * 2, rot: [0, 90, 0], at: [-RODS.end, y, RODS.z], tone: "hi", edges: false });

// Carriage (moves along x) with bushings, the rubber pad and the glass button, and the dial gauge that rides on it.
add({ id: "carriage", kind: "group", at: [0, 0, 0] });
add({ id: "carriage-body", kind: "box", size: [CARRIAGE.w, CARRIAGE.d, CARRIAGE.h], r: 4, at: [0, 0, CARRIAGE.z], tone: "mid", parent: "carriage" });
for (const [i, sx] of [-1, 1].entries()) for (const [j, y] of RODS.y.entries())
  add({ id: `bushing-${i}-${j}`, kind: "cylinder", r: 5.6, h: 6, rot: [0, sx * 90, 0], at: [sx * CARRIAGE.w / 2, y, RODS.z], tone: "hi", parent: "carriage" });
for (const [i, x] of [-70, -24, 24, 70].entries()) add({ id: `carriage-screw-${i}`, kind: "sphere", r: 0.6, at: [x, -CARRIAGE.d / 2 + 4, TOP], tone: "lo", edges: false, parent: "carriage" });
add({ id: "pad", kind: "box", size: [HALF[0] * 2 + 6, HALF[1] * 2 + 6, 2], r: 3, at: [0, 0, TOP], tone: "lo", parent: "carriage" });
add({ id: "button", kind: "box", size: [HALF[0] * 2, HALF[1] * 2, BUTTON_H], r: 8, at: [0, 0, BUTTON_Z], glass: true, color: "#cfe3ff", opacity: 0.55, parent: "carriage" });
// Gauge: a post behind the button, an arm, the dial, a plunger whose feeler touches the button's top end.
export const GAUGE = { x: 104, z: 54, r: 14, post: [84, 22] };
add({ id: "gauge-post", kind: "cylinder", r: 3, h: GAUGE.z - TOP, at: [...GAUGE.post, TOP], tone: "mid", parent: "carriage" });
add({ id: "gauge-arm", kind: "box", size: [GAUGE.x - GAUGE.post[0] + 3, 5, 5], r: 1.2, at: [(GAUGE.x + GAUGE.post[0]) / 2, GAUGE.post[1], GAUGE.z - 2.5], tone: "mid", parent: "carriage" });
add({ id: "gauge-back", kind: "cylinder", r: 4, h: GAUGE.post[1] - 4.5, rot: [90, 0, 0], at: [GAUGE.x, GAUGE.post[1], GAUGE.z], tone: "mid", parent: "carriage" });
add({ id: "gauge-body", kind: "lathe", segments: 64, profile: [[0, 0], [GAUGE.r - 0.8, 0], [GAUGE.r, 0.8], [GAUGE.r, 7.2], [GAUGE.r - 0.8, 8], [0, 8]], rot: [90, 0, 0], at: [GAUGE.x, 4.5, GAUGE.z], tone: "hi", parent: "carriage" });
add({ id: "gauge-ticks", kind: "ticks", r: GAUGE.r - 2.2, count: 50, every: 5, len: [1, 2.2], rot: [90, 0, 0], at: [GAUGE.x, -3.6, GAUGE.z], tone: "lo", parent: "carriage" });
add({ id: "gauge-crown", kind: "cylinder", r: 2.6, h: 3, at: [GAUGE.x, 0, GAUGE.z + GAUGE.r], tone: "mid", parent: "carriage" });
add({ id: "gauge-needle", kind: "group", rot: [90, 0, 0], at: [GAUGE.x, -3.8, GAUGE.z], parent: "carriage" });
add({ id: "gauge-blade", kind: "box", size: [0.7, GAUGE.r - 3, 0.3], at: [0, (GAUGE.r - 3) / 2 - 2, 0], tone: "hi", edges: false, parent: "gauge-needle" });
add({ id: "gauge-sleeve", kind: "cylinder", r: 2.2, h: 4, rot: [0, -90, 0], at: [GAUGE.x - GAUGE.r, 0, GAUGE.z], tone: "mid", parent: "carriage" });
add({ id: "plunger", kind: "group", at: [HALF[0], 0, 0], parent: "carriage" });
add({ id: "plunger-rod", kind: "cylinder", r: 1.2, h: GAUGE.x - GAUGE.r - HALF[0] - 4 + 4, rot: [0, 90, 0], at: [1.4, 0, GAUGE.z], tone: "hi", edges: false, parent: "plunger" });
add({ id: "feeler", kind: "box", size: [2.4, 4, GAUGE.z - (BUTTON_Z + BUTTON_H - 4) + 1.2], r: 0.8, at: [1.2 + 0.1, 0, BUTTON_Z + BUTTON_H - 4], tone: "hi", parent: "plunger" });

// Springs: four coils on the rods between the end blocks and the bushings (geometry rebuilt by the live code).
for (const [i, sx] of [-1, 1].entries()) for (const [j, y] of RODS.y.entries())
  add({ id: `spring-${i}-${j}`, kind: "tube", points: [[sx * RODS.end, y, RODS.z + SPRING.r], [sx * (CARRIAGE.w / 2 + 6), y, RODS.z + SPRING.r]], r: SPRING.wire, tone: "hi", edges: false });

// Gantry behind: two posts, a beam, a slider with an arm and the finger probe (the lit part).
for (const [i, sx] of [-1, 1].entries()) {
  add({ id: `gantry-foot-${i}`, kind: "box", size: [20, 20, 4], r: 3, at: [sx * 150, GANTRY.y, 0], tone: "mid" });
  add({ id: `gantry-post-${i}`, kind: "cylinder", r: 5, h: GANTRY.z - 4, at: [sx * 150, GANTRY.y, 4], tone: "mid" });
}
add({ id: "beam", kind: "box", size: [312, 10, 10], r: 2, at: [0, GANTRY.y, GANTRY.z], tone: "mid" });
add({ id: "beam-rail", kind: "box", size: [290, 2, 3], at: [0, GANTRY.y - 6, GANTRY.z + 3.5], tone: "hi" });
add({ id: "probe", kind: "group", at: [0, 0, 0] });
add({ id: "slider", kind: "box", size: [22, 16, 18], r: 2.5, at: [0, GANTRY.y - 12, GANTRY.z - 4], tone: "mid", parent: "probe" });
add({ id: "probe-arm", kind: "box", size: [10, GANTRY.y - 18, 8], r: 2, at: [0, (GANTRY.y - 20) / 2 + 2, GANTRY.z + 2], tone: "mid", parent: "probe" });
add({ id: "finger", kind: "group", at: [0, 0, 0], parent: "probe" });
add({ id: "finger-sleeve", kind: "cylinder", r: 6, h: 14, at: [0, 0, GANTRY.z - 12], tone: "mid", parent: "probe" });
add({ id: "finger-rod", kind: "cylinder", r: 3.4, h: GANTRY.z - 12 - FINGER.rest - 4 + 12 + FINGER.travel, at: [0, 0, FINGER.rest + 4], tone: "hi", edges: false, parent: "finger" });
add({ id: "finger-tip", kind: "lathe", profile: [[0, 0], [2.6, 0.4], [4.4, 2], [4.6, 4], [3.4, 4.2]], at: [0, 0, FINGER.rest], lit: true, parent: "finger" });

export const scene = {
  fig: "Fig 1",
  title: "Press and pull",
  hint: "Press, then pull ← →",
  readout: "120.0 × 32.0 · lean 0.0 px",
  size: "figure",
  width: 600,
  height: 400,
  pad: 0.03,
  camera: { azimuth: 36, elevation: 30 },
  parts,
};
