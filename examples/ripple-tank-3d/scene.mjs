// The school ripple tank as a three.js scene. Units are millimetres, z up.
import * as M from "../ripple-tank/model.mjs";
import { collector, coilPoints, screw } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const Z = { rail: 193, bed: 202, floor: 206, water: 212, rim: 218, top: 223 };
export const LAMP = [0, 0, 612];
export const Z_PAPER = 0.6;
export const IN = { w: 300, d: 240 };
const OUT = { w: 318, d: 258 };
export const XS = -70;
export const START = { frequency: 16, spacing: 50 };
export const BALL_R = 2.6;
const BAR_Z = Z.top + 2, BAR_H = 5, BEAM_Z = Z.top + 28, BEAM_H = 6, SPRING_Y = 56;
export const optics = { magnification: M.magnificationOf(LAMP[2], Z_PAPER, Z.water), caustic: M.causticOf(LAMP[2], Z_PAPER, Z.water, Z.floor, Z.bed) };
const SHADOW = (LAMP[2] - Z_PAPER) / (LAMP[2] - Z.bed);
export const PAPER = { w: Math.ceil(OUT.w * SHADOW + 6), d: Math.ceil(OUT.d * SHADOW + 6) };

// Floor board, feet, paper with its clips.
const BASE = { w: PAPER.w + 110, d: PAPER.d + 52, x: -20 };
add({ id: "base", kind: "box", size: [BASE.w, BASE.d, 14], r: 12, at: [BASE.x, 0, -14], tone: "lo" });
for (const [i, sx] of [-1, 1].entries()) for (const [j, sy] of [-1, 1].entries())
  add({ id: `foot-${i}-${j}`, kind: "cylinder", r: 9, h: 7, at: [BASE.x + sx * (BASE.w / 2 - 24), sy * (BASE.d / 2 - 24), -21], tone: "lo" });
add({ id: "paper", kind: "plane", size: [PAPER.w, PAPER.d], at: [0, 0, Z_PAPER] });
add({ id: "paper-sheet", kind: "box", size: [PAPER.w + 2, PAPER.d + 2, 0.5], at: [0, 0, 0], tone: "hi", edges: false });
for (const [i, [x, y]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (PAPER.w / 2 - 6), b * (PAPER.d / 2 - 6)]).entries())
  add({ id: `clip-${i}`, kind: "box", size: [10, 10, 1.6], r: 2, at: [x, y, 0.6], tone: "mid" });

// Legs with levelling feet, frame rails, glass bed, walls, rim and foam beaches.
const LEG = [IN.w / 2 + 4.5, IN.d / 2 + 4.5];
for (const [i, [sx, sy]] of [[1, 1], [-1, 1], [1, -1], [-1, -1]].entries()) {
  const x = sx * LEG[0], y = sy * LEG[1];
  add({ id: `leg-foot-${i}`, kind: "cylinder", r: 7, h: 3, at: [x, y, 0.5], tone: "mid" });
  add({ id: `leg-screw-${i}`, kind: "cylinder", r: 2.4, h: 8, at: [x, y, 3.5], tone: "hi" });
  add({ id: `leg-${i}`, kind: "cylinder", r: 4.2, h: Z.rail - 6 - 11.5, at: [x, y, 11.5], tone: "mid" });
  add({ id: `leg-knob-${i}`, kind: "cylinder", r: 5.6, h: 3, at: [x, y, 34], tone: "mid" });
  add({ id: `leg-bracket-${i}`, kind: "box", size: [14, 14, 6], r: 2, at: [x, y, Z.rail - 6], tone: "mid" });
}
add({ id: "rail-front", kind: "box", size: [OUT.w, 9, Z.bed - Z.rail], r: 1.5, at: [0, -OUT.d / 2 + 4.5, Z.rail], tone: "mid" });
add({ id: "rail-back", kind: "box", size: [OUT.w, 9, Z.bed - Z.rail], r: 1.5, at: [0, OUT.d / 2 - 4.5, Z.rail], tone: "mid" });
add({ id: "rail-left", kind: "box", size: [9, OUT.d - 18, Z.bed - Z.rail], r: 1.5, at: [-OUT.w / 2 + 4.5, 0, Z.rail], tone: "mid" });
add({ id: "rail-right", kind: "box", size: [9, OUT.d - 18, Z.bed - Z.rail], r: 1.5, at: [OUT.w / 2 - 4.5, 0, Z.rail], tone: "mid" });
add({ id: "bed", kind: "box", size: [IN.w, IN.d, Z.floor - Z.bed], at: [0, 0, Z.bed], glass: true, color: "#9fb4b0", opacity: 0.35, edges: true });
const wall = (id, w, d, x, y) => add({ id, kind: "box", size: [w, d, Z.top - Z.bed], at: [x, y, Z.bed], tone: "mid" });
wall("wall-front", OUT.w, 9, 0, -OUT.d / 2 + 4.5);
wall("wall-back", OUT.w, 9, 0, OUT.d / 2 - 4.5);
wall("wall-left", 9, OUT.d - 18, -OUT.w / 2 + 4.5, 0);
wall("wall-right", 9, OUT.d - 18, OUT.w / 2 - 4.5, 0);
for (const [i, [w, d, x, y]] of [[IN.w, 8, 0, -IN.d / 2 + 4], [IN.w, 8, 0, IN.d / 2 - 4], [8, IN.d - 16, -IN.w / 2 + 4, 0], [8, IN.d - 16, IN.w / 2 - 4, 0]].entries())
  add({ id: `beach-${i}`, kind: "box", size: [w, d, Z.water - Z.floor + 1.5], at: [x, y, Z.floor], tone: "lo", edges: false });
add({ id: "water", kind: "plane", size: [IN.w - 16, IN.d - 16], at: [0, 0, Z.water] });
for (const [i, [x, y]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (OUT.w / 2 - 4.5), b * (OUT.d / 2 - 4.5)]).entries()) screw(add, `rim-screw-${i}`, x, y, Z.top, { r: 1.6 });

// Vibrator: a beam across the rim, a bar hung on two springs, a motor with an eccentric, two dippers.
add({ id: "beam-block-front", kind: "box", size: [16, 10, BEAM_Z - Z.top], r: 2, at: [XS, -OUT.d / 2 + 5, Z.top], tone: "mid" });
add({ id: "beam-block-back", kind: "box", size: [16, 10, BEAM_Z - Z.top], r: 2, at: [XS, OUT.d / 2 - 5, Z.top], tone: "mid" });
add({ id: "beam", kind: "box", size: [12, OUT.d + 8, BEAM_H], r: 1.2, at: [XS, 0, BEAM_Z], tone: "mid" });
add({ id: "bar", kind: "group", at: [XS, 0, BAR_Z] });
add({ id: "bar-body", kind: "box", size: [8, 132, BAR_H], r: 1, at: [0, 0, 0], tone: "hi", parent: "bar" });
for (const [i, y] of [-SPRING_Y, SPRING_Y].entries()) {
  add({ id: `spring-${i}`, kind: "tube", points: coilPoints(XS, y, 3, BAR_Z + BAR_H, BEAM_Z, 6), r: 0.5, tone: "hi", edges: false });
  add({ id: `spring-cap-${i}`, kind: "cylinder", r: 4, h: 1.2, at: [XS, y, BEAM_Z - 1.2], tone: "mid" });
}
add({ id: "motor-mount", kind: "box", size: [18, 10, 1.6], at: [0, 0, BAR_H], tone: "mid", parent: "bar" });
add({ id: "motor", kind: "cylinder", r: 6, h: 18, rot: [0, 90, 0], at: [-9, 0, BAR_H + 7.6], tone: "mid", parent: "bar" });
add({ id: "eccentric", kind: "group", at: [11, 0, BAR_H + 7.6], parent: "bar" });
add({ id: "eccentric-disc", kind: "cylinder", r: 4, h: 3, rot: [0, 90, 0], at: [0, 1.4, 0], tone: "hi", parent: "eccentric" });
export const DIPPERS = ["dipper-a", "dipper-b"];
for (const [i, id] of DIPPERS.entries()) {
  const y = (i ? 1 : -1) * START.spacing / 2;
  add({ id, kind: "group", at: [0, y, 0], parent: "bar" });
  add({ id: `${id}-clamp`, kind: "box", size: [10, 6, 7], r: 1.2, at: [0, 0, 0.5 - 1], tone: "mid", parent: id });
  add({ id: `${id}-rod`, kind: "cylinder", r: 0.9, h: BAR_Z - Z.water - BALL_R * 2 + 0.9 + 0.5, at: [0, 0, -(BAR_Z - Z.water - BALL_R * 2 + 0.9)], tone: "hi", parent: id, edges: false });
  add({ id: `${id}-ball`, kind: "sphere", r: BALL_R, at: [0, 0, -(BAR_Z - Z.water - BALL_R + 0.9)], lit: i === 0, tone: "hi", parent: id, edges: false });
}
// Second ball shares the lit look but only one part may carry `lit`.
parts.find((p) => p.id === "dipper-b-ball").color = "#ffffff";

// Lamp: a post on the base, an arm, a shade and the bulb above the centre.
const POST = [186, -BASE.d / 2 + 22];
const ARM_Z = LAMP[2] + 30;
add({ id: "post-foot", kind: "cylinder", r: 12, h: 4, at: [...POST, 0], tone: "mid" });
add({ id: "post", kind: "cylinder", r: 4.5, h: ARM_Z + 16 - 4, at: [...POST, 4], tone: "mid" });
add({ id: "post-cap", kind: "cylinder", r: 5.2, h: 3, at: [...POST, ARM_Z + 12], tone: "mid" });
add({ id: "arm-clamp", kind: "box", size: [14, 14, 12], r: 2.5, at: [...POST, ARM_Z - 6], tone: "mid" });
add({ id: "arm", kind: "tube", points: [[POST[0] - 7, POST[1], ARM_Z], [POST[0] * 0.5, POST[1] * 0.5, ARM_Z], [LAMP[0] + 8, LAMP[1], ARM_Z]], r: 2.4, tone: "mid", edges: false });
add({ id: "shade", kind: "lathe", segments: 48, profile: [[0.1, 30], [8, 30], [10, 22], [26, 4], [28, 0], [27, 0]], at: [LAMP[0], LAMP[1], LAMP[2] - 2], tone: "mid" });
add({ id: "shade-neck", kind: "cylinder", r: 4, h: ARM_Z - LAMP[2] - 26, at: [LAMP[0], LAMP[1], LAMP[2] + 28], tone: "mid" });
add({ id: "bulb", kind: "sphere", r: 6, at: [LAMP[0], LAMP[1], LAMP[2] + 6], color: "#fff4d6", emissive: "#fff1c4", glow: 1.2, edges: false });

add({ id: "leg-terminal", kind: "box", size: [6, 10, 12], r: 1.5, at: [-LEG[0] - 7.2, LEG[1], 52], tone: "mid" });

// Control box with a frequency knob and meter on the base.
const BOX = [BASE.x - BASE.w / 2 + 30, 86];
add({ id: "control-box", kind: "box", size: [44, 80, 24], r: 4, at: [...BOX, 0], tone: "mid" });
add({ id: "knob", kind: "group", at: [BOX[0] + 1, BOX[1] + 16, 24] });
add({ id: "knob-body", kind: "cylinder", r: 7, h: 6, segments: 36, at: [0, 0, 0], tone: "hi", parent: "knob" });
add({ id: "knob-mark", kind: "box", size: [1, 6, 0.4], at: [0, 3.2, 6], tone: "lo", parent: "knob", edges: false });
add({ id: "meter", kind: "box", size: [26, 22, 1], r: 2, at: [BOX[0], BOX[1] - 18, 24], tone: "lo" });
add({ id: "meter-needle", kind: "group", at: [BOX[0], BOX[1] - 27, 25] });
add({ id: "meter-blade", kind: "box", size: [0.6, 14, 0.4], at: [0, 7, 0], tone: "hi", parent: "meter-needle", edges: false });
add({ id: "box-cable", kind: "tube", points: [[BOX[0] + 22, BOX[1] + 30, 8], [BOX[0] + 60, BOX[1] + 40, 3], [-LEG[0] - 14, LEG[1] + 14, 3], [-LEG[0] - 9, LEG[1], 6], [-LEG[0] - 9, LEG[1], 52]], r: 1.6, tone: "lo", edges: false });

export const scene = {
  fig: "Fig 3",
  title: "Ripple tank",
  hint: "Move across for f · up and down for spacing",
  readout: M.readoutOf(M.stateOf(START.frequency, START.spacing, optics)),
  size: "figure",
  width: 600,
  height: 560,
  pad: 0.02,
  camera: { azimuth: 40, elevation: 44 },
  parts,
};
