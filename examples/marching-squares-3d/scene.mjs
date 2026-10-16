// Fig 10: marching squares, as a contour-survey bench.
// A relief tank holds the scalar field as terrain (metaball sources are the knobs that raise it). The water level
// is the iso-value: land above water is "inside". A survey pin stands at every grid corner. A gantry carries a
// four-probe head cell by cell: each probe reads one corner (its lamp is a bit), the centre bob reads the mean
// (it settles the saddle cases), the 4-bit case selects one of 16 stencils from a printer's type case, and a pen
// plotter draws that stencil on the drafting sheet, stretched to where the water crosses each edge.
import { assertScene } from "../../kit/three-scene.mjs";

export const TOP = 40;                  // bench top
export const TANK = { x: -210, y: 20, size: 480 }; // the field's square, centred here
export const FLOOR = TOP + 10.5;        // tank floor (terrain base)
export const HMAX = 150;                // terrain height scale
export const GANTRY_Z = 300;            // underside of the head
export const RES = [8, 16, 32];         // grid cells per side
export const MAX_SOURCES = 5;
export const CASE_TRAY = { x: 335, y: -222, pitch: 82 };
export const BOARD = { x: 390, y: 215, paper: 330 };
export const INSPECT = { x: 640, y: -205 };
/** Terrain height of field value f: monotone, so the waterline at g(iso) is exactly the iso contour. */
export const heightOf = (f) => HMAX * (1 - Math.exp(-f / 1.4));
export const SOURCES0 = [[-95, -60, 72], [85, 50, 58], [-40, 140, 40]];

const parts = [];
const add = (p) => (parts.push(p), p);
const S = TANK.size, half = S / 2;

// ---- bench
add({ id: "bench", kind: "box", size: [1250, 790, 22], r: 8, at: [150, 0, 18], tone: "lo", texture: { kind: "wood", project: "top", tile: 260, color: "#3e2c22" }, rough: 0.75 });
[[-450, -370], [750, -370], [-450, 370], [750, 370]].forEach(([x, y], i) => add({ id: `foot-${i}`, kind: "cylinder", r: 22, r2: 18, h: 18, at: [x, y, 0], tone: "lo" }));
add({ id: "bench-strip", kind: "box", size: [1250, 6, 6], at: [150, -398, 22], tone: "mid", metal: 0.6, rough: 0.35 });
add({ id: "bench-rule", kind: "rail", from: -470, to: 770, step: 10, every: 5, len: [3, 6], at: [0, -401, 28.2], tone: "lo" });

// ---- relief tank
add({ id: "tank-floor", kind: "box", size: [S + 40, S + 40, 10.5], r: 3, at: [TANK.x, TANK.y, TOP], tone: "mid", texture: { kind: "brushed", project: "box", tile: 90 }, metal: 0.55, rough: 0.4 });
add({ id: "terrain", kind: "heightfield", size: [S, S], grid: 120, at: [TANK.x, TANK.y, FLOOR], color: "#ffffff", rough: 0.62, material: { clearcoat: 0.15 } });
add({ id: "water", kind: "box", size: [S - 2, S - 2, 1], at: [TANK.x, TANK.y, FLOOR], color: "#3d86b8", opacity: 0.3, rough: 0.08, edges: false });
add({ id: "contour", kind: "ribbon", width: 6, at: [TANK.x, TANK.y, FLOOR], shader: { name: "contour", uniforms: { uColor: "#ffd27a", uDash: 2.5, uSpeed: 0.5 } } });
const WALL_H = 205, T = 7;
[["front", [0, -half - T / 2], [S + 2 * T, T]], ["back", [0, half + T / 2], [S + 2 * T, T]], ["left", [-half - T / 2, 0], [T, S]], ["right", [half + T / 2, 0], [T, S]]].forEach(([n, [dx, dy], [w, d]]) =>
  add({ id: `glass-${n}`, kind: "box", size: [w, d, WALL_H], at: [TANK.x + dx, TANK.y + dy, FLOOR], glass: true, color: "#cfe3ee", opacity: 0.12, edges: true }));
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
  const x = TANK.x + sx * (half + T + 6), y = TANK.y + sy * (half + T + 6);
  add({ id: `post-${i}`, kind: "box", size: [14, 14, WALL_H + 4], r: 2, at: [x, y, TOP + 10.5], tone: "mid", metal: 0.7, rough: 0.35 });
  add({ id: `post-cap-${i}`, kind: "cylinder", r: 6, h: 3, at: [x, y, TOP + 10.5 + WALL_H + 4], tone: "lo", metal: 0.6 });
  add({ id: `tank-screw-${i}`, kind: "sphere", r: 3, at: [TANK.x + sx * (half + 12), TANK.y + sy * (half + 12) - sy * 0, TOP + 10.5], tone: "lo", edges: false });
});
[["rim-front", [0, -half - T - 6], [S + 2 * T + 26, 10]], ["rim-back", [0, half + T + 6], [S + 2 * T + 26, 10]], ["rim-left", [-half - T - 6, 0], [10, S + 2 * T]], ["rim-right", [half + T + 6, 0], [10, S + 2 * T]]].forEach(([n, [dx, dy], [w, d]]) =>
  add({ id: n, kind: "box", size: [w, d, 7], r: 1.5, at: [TANK.x + dx, TANK.y + dy, FLOOR + WALL_H], tone: "mid", metal: 0.65, rough: 0.35 }));
// iso gauge: a sight glass with a float, ruled, on the front-right post
const GX = TANK.x + half + 40, GY = TANK.y - half - 30;
add({ id: "gauge-back", kind: "box", size: [26, 8, WALL_H - 10], r: 2, at: [GX, GY + 8, FLOOR], tone: "lo" });
add({ id: "gauge-tube", kind: "cylinder", r: 6, h: WALL_H - 20, at: [GX, GY, FLOOR + 5], glass: true, color: "#d8eaf2", opacity: 0.18 });
add({ id: "gauge-water", kind: "cylinder", r: 5, h: 1, at: [GX, GY, FLOOR + 5], color: "#3d86b8", opacity: 0.55, edges: false });
add({ id: "gauge-float", kind: "cylinder", r: 5.6, h: 6, at: [GX, GY, FLOOR + 5], color: "#e39a34", rough: 0.4, edges: false });
add({ id: "gauge-ticks", kind: "rail", from: 0, to: HMAX, step: HMAX / 15, every: 5, len: [4, 8], at: [GX - 6, GY - 8, FLOOR + 5], rot: [0, -90, 0], tone: "mid" });
add({ id: "gauge-foot", kind: "box", size: [34, 26, 6], r: 2, at: [GX, GY + 4, TOP], tone: "mid" });

// survey pins at every grid corner (the samples): stems and caps, coloured by inside/outside
const N1 = RES[RES.length - 1] + 1, items = [];
for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) items.push([-half + (i * S) / (N1 - 1), -half + (j * S) / (N1 - 1), 0]);
add({ id: "pin-stems", kind: "instances", shape: "cylinder", r: 1.1, h: 12, items, at: [TANK.x, TANK.y, FLOOR], tone: "lo", edges: false });
add({ id: "pin-caps", kind: "instances", shape: "sphere", r: 3.6, segments: 12, items, itemColors: ["#3c4a5c"], at: [TANK.x, TANK.y, FLOOR], color: "#ffffff", rough: 0.35, edges: false });
// metaball sources: knurled knobs on rods standing on the tank floor (drag them)
for (let k = 0; k < MAX_SOURCES; k++) {
  add({ id: `src-${k}`, kind: "group", at: [TANK.x, TANK.y, FLOOR] });
  add({ id: `src-rod-${k}`, kind: "cylinder", r: 2.6, h: HMAX + 25, at: [0, 0, 0], tone: "mid", metal: 0.8, rough: 0.3, edges: false, parent: `src-${k}` });
  add({ id: `src-collar-${k}`, kind: "cylinder", r: 6, h: 5, at: [0, 0, HMAX + 25], tone: "lo", metal: 0.6, parent: `src-${k}` });
  add({ id: `src-knob-${k}`, kind: "cylinder", r: 13, h: 15, segments: 40, at: [0, 0, HMAX + 30], color: "#b08a4a", metal: 0.85, rough: 0.35, texture: { kind: "knurl", pitch: 12 }, parent: `src-${k}` });
  add({ id: `src-top-${k}`, kind: "cylinder", r: 11, h: 1.5, at: [0, 0, HMAX + 45], color: "#cfa865", metal: 0.85, rough: 0.25, edges: false, parent: `src-${k}` });
}

// ---- gantry: two rails along x, a bridge along y, a carriage, the four-probe head
const RY = half + 52, RX0 = TANK.x - half - 40, RX1 = TANK.x + half + 40;
for (const sy of [-1, 1]) {
  const y = TANK.y + sy * RY, n = sy < 0 ? "front" : "back";
  for (const [x, e] of [[RX0, "l"], [RX1, "r"]]) {
    add({ id: `gantry-post-${n}-${e}`, kind: "box", size: [22, 22, GANTRY_Z + 36 - TOP], r: 2, at: [x, y, TOP], tone: "mid", metal: 0.6, rough: 0.4, texture: { kind: "brushed", project: "box", tile: 80 } });
    add({ id: `gantry-foot-${n}-${e}`, kind: "box", size: [44, 44, 6], r: 3, at: [x, y, TOP], tone: "lo" });
  }
  add({ id: `rail-${n}`, kind: "box", size: [RX1 - RX0 + 22, 18, 14], r: 2, at: [(RX0 + RX1) / 2, y, GANTRY_Z + 36], tone: "mid", metal: 0.75, rough: 0.3, texture: { kind: "brushed", project: "box", tile: 80 } });
  add({ id: `rail-ticks-${n}`, kind: "rail", from: -half, to: half, step: S / 32, every: 4, len: [3, 6], at: [TANK.x, y - sy * 9.2 - (sy < 0 ? 0 : 0), GANTRY_Z + 50.2], tone: "lo" });
}
add({ id: "bridge", kind: "group", at: [TANK.x, TANK.y, GANTRY_Z] });
add({ id: "bridge-beam", kind: "box", size: [30, 2 * RY + 30, 18], r: 2.5, at: [0, 0, 50], tone: "mid", metal: 0.65, rough: 0.35, texture: { kind: "brushed", project: "box", tile: 80 }, parent: "bridge" });
for (const sy of [-1, 1]) {
  add({ id: `truck-${sy < 0 ? "front" : "back"}`, kind: "box", size: [48, 30, 22], r: 3, at: [0, sy * RY, 44], tone: "lo", parent: "bridge" });
  add({ id: `truck-wheel-${sy < 0 ? "front" : "back"}`, kind: "cylinder", r: 7, h: 6, at: [0, sy * (RY + 18), 52], rot: [90, 0, 0], tone: "mid", metal: 0.7, parent: "bridge" });
}
add({ id: "carriage", kind: "group", at: [0, 0, 0], parent: "bridge" });
add({ id: "carriage-block", kind: "box", size: [54, 46, 26], r: 3, at: [0, 0, 26], tone: "mid", metal: 0.5, rough: 0.4, parent: "carriage" });
add({ id: "head", kind: "box", size: [74, 74, 22], r: 4, at: [0, 0, 0], tone: "hi", metal: 0.3, rough: 0.45, parent: "carriage" });
add({ id: "head-plate", kind: "box", size: [80, 80, 4], r: 2, at: [0, 0, 22], tone: "lo", metal: 0.6, parent: "carriage" });
// four corner lamps on the head (bits), in the corners they read: TL, TR, BR, BL
[["tl", -1, 1], ["tr", 1, 1], ["br", 1, -1], ["bl", -1, -1]].forEach(([n, sx, sy]) => {
  add({ id: `lamp-seat-${n}`, kind: "cylinder", r: 9, h: 3, at: [sx * 26, sy * 26, 22], tone: "lo", parent: "carriage" });
  add({ id: `lamp-${n}`, kind: "sphere", r: 7, at: [sx * 26, sy * 26, 28], color: "#3c4a5c", rough: 0.3, edges: false, parent: "carriage" });
  // probes: groups placed at the corner each frame; the rod's length is its scale.z (head underside to the pin cap)
  add({ id: `probe-${n}`, kind: "group", at: [sx * 30, sy * 30, 0], parent: "carriage" });
  add({ id: `probe-rod-${n}`, kind: "cylinder", r: 1.4, h: 1, at: [0, 0, 0], tone: "mid", metal: 0.85, rough: 0.25, edges: false, parent: `probe-${n}` });
  add({ id: `probe-tip-${n}`, kind: "cylinder", r: 0.7, r2: 2.6, h: 7, at: [0, 0, 0], tone: "hi", metal: 0.6, edges: false, parent: `probe-${n}` });
  add({ id: `probe-sleeve-${n}`, kind: "cylinder", r: 3.2, h: 10, at: [0, 0, 100], tone: "lo", metal: 0.6, edges: false, parent: `probe-${n}` });
});
// register: four bit flags on the head's front face, 8 4 2 1
[8, 4, 2, 1].forEach((b, k) => {
  add({ id: `bit-${b}`, kind: "box", size: [12, 4, 12], r: 1, at: [-24 + k * 16, -39, 5], color: "#3c4a5c", rough: 0.4, parent: "carriage" });
  add({ id: `bit-mark-${b}`, kind: "plane", size: [10, 10], at: [-24 + k * 16, -41.15, 11], rot: [90, 0, 0], texture: { kind: "glyph", text: String(b), ink: "#f4efe2" }, parent: "carriage" });
});
// the centre probe: a plumb line to a bob at the mean of the four corners (it decides the saddles); the lit part
add({ id: "centre-line", kind: "cylinder", r: 0.6, h: 1, at: [0, 0, 0], tone: "hi", edges: false, parent: "carriage" });
add({ id: "centre-bob", kind: "sphere", r: 5.5, at: [0, 0, -100], lit: true, edges: false, parent: "carriage" });
add({ id: "head-cable", kind: "tube", points: [[0, 23, 30], [0, 60, 52], [0, 140, 70], [0, RY - 10, 70]], r: 2.2, tone: "lo", parent: "bridge" });

// ---- the type case: 16 stencils, one per case
add({ id: "case-tray", kind: "box", size: [4 * CASE_TRAY.pitch + 26, 4 * CASE_TRAY.pitch + 26, 22], r: 4, at: [CASE_TRAY.x, CASE_TRAY.y, TOP], texture: { kind: "wood", project: "box", tile: 140, color: "#6a4a32" }, rough: 0.7 });
for (let k = 1; k < 4; k++) {
  const o = (k - 2) * CASE_TRAY.pitch;
  add({ id: `divider-x-${k}`, kind: "box", size: [4, 4 * CASE_TRAY.pitch, 10], at: [CASE_TRAY.x + o, CASE_TRAY.y, TOP + 22], texture: { kind: "wood", project: "box", tile: 140, color: "#7a5638" }, rough: 0.7 });
  add({ id: `divider-y-${k}`, kind: "box", size: [4 * CASE_TRAY.pitch, 4, 10], at: [CASE_TRAY.x, CASE_TRAY.y + o, TOP + 22], texture: { kind: "wood", project: "box", tile: 140, color: "#7a5638" }, rough: 0.7 });
}
export const caseSpot = (k) => [CASE_TRAY.x + ((k % 4) - 1.5) * CASE_TRAY.pitch, CASE_TRAY.y + (1.5 - Math.floor(k / 4)) * CASE_TRAY.pitch];
for (let k = 0; k < 16; k++) {
  const [x, y] = caseSpot(k);
  add({ id: `tile-${k}`, kind: "group", at: [x, y, TOP + 22] });
  add({ id: `tile-block-${k}`, kind: "box", size: [70, 70, 9], r: 2, at: [0, 0, 0], color: "#d9d2c0", rough: 0.6, parent: `tile-${k}` });
  add({ id: `tile-face-${k}`, kind: "plane", size: [66, 66], screen: [256, 256], at: [0, 0, 9.15], parent: `tile-${k}` });
}
add({ id: "case-label", kind: "box", size: [120, 3, 18], r: 1, at: [CASE_TRAY.x, CASE_TRAY.y - 2 * CASE_TRAY.pitch - 15, TOP + 2], tone: "mid", texture: { kind: "label", title: "CASES 0-15", lines: ["4-BIT INDEX", "TL8 TR4 BR2 BL1"], aspect: 0.15 } });
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => add({ id: `case-screw-${i}`, kind: "sphere", r: 2.2, at: [CASE_TRAY.x + sx * (2 * CASE_TRAY.pitch + 7), CASE_TRAY.y + sy * (2 * CASE_TRAY.pitch + 7), TOP + 22], tone: "lo", edges: false }));

// ---- drafting board and pen plotter
const BW = BOARD.paper + 70;
add({ id: "board", kind: "box", size: [BW, BW, 16], r: 4, at: [BOARD.x, BOARD.y, TOP + 8], tone: "mid", texture: { kind: "wood", project: "box", tile: 160, color: "#5b4130" }, rough: 0.7 });
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
  add({ id: `board-foot-${i}`, kind: "cylinder", r: 9, h: 8, at: [BOARD.x + sx * (BW / 2 - 20), BOARD.y + sy * (BW / 2 - 20), TOP], tone: "lo" });
  add({ id: `paper-clip-${i}`, kind: "box", size: [16, 16, 3], r: 1.5, at: [BOARD.x + sx * (BOARD.paper / 2 + 2), BOARD.y + sy * (BOARD.paper / 2 + 2), TOP + 24.2], tone: "lo", metal: 0.7 });
});
add({ id: "paper", kind: "plane", size: [BOARD.paper, BOARD.paper], screen: [1024, 1024], at: [BOARD.x, BOARD.y, TOP + 24.15] });
const PX0 = BOARD.x - BW / 2 + 12, PX1 = BOARD.x + BW / 2 - 12, PZ = TOP + 24;
for (const [x, n] of [[PX0, "l"], [PX1, "r"]]) add({ id: `plot-rail-${n}`, kind: "box", size: [10, BW - 10, 12], r: 2, at: [x, BOARD.y, PZ], tone: "mid", metal: 0.75, rough: 0.3 });
add({ id: "plot-bridge", kind: "group", at: [BOARD.x, BOARD.y, PZ + 12] });
add({ id: "plot-beam", kind: "box", size: [PX1 - PX0 + 10, 14, 10], r: 2, at: [0, 0, 18], tone: "mid", metal: 0.7, rough: 0.3, parent: "plot-bridge" });
for (const [x, n] of [[PX0 - BOARD.x, "l"], [PX1 - BOARD.x, "r"]]) add({ id: `plot-truck-${n}`, kind: "box", size: [18, 26, 18], r: 2, at: [x, 0, 0], tone: "lo", parent: "plot-bridge" });
add({ id: "pen-carriage", kind: "group", at: [0, 0, 0], parent: "plot-bridge" });
add({ id: "pen-block", kind: "box", size: [26, 24, 22], r: 2.5, at: [0, 0, 14], tone: "hi", parent: "pen-carriage" });
add({ id: "pen", kind: "cylinder", r: 3.2, r2: 4, h: 34, at: [0, -16, 0], color: "#1d1d1d", rough: 0.4, parent: "pen-carriage" });
add({ id: "pen-tip", kind: "cylinder", r: 0.6, r2: 3.2, h: 6, at: [0, -16, -6], tone: "lo", metal: 0.8, edges: false, parent: "pen-carriage" });
add({ id: "pen-clamp", kind: "box", size: [12, 10, 10], r: 1.5, at: [0, -12, 16], tone: "lo", metal: 0.6, parent: "pen-carriage" });

// ---- cell inspector: a small screen on a stand that shows the arithmetic for the current cell
add({ id: "inspect-foot", kind: "box", size: [110, 70, 8], r: 4, at: [INSPECT.x, INSPECT.y + 20, TOP], tone: "lo" });
add({ id: "inspect-post", kind: "cylinder", r: 7, h: 70, at: [INSPECT.x, INSPECT.y + 30, TOP + 8], tone: "mid", metal: 0.6 });
add({ id: "inspect", kind: "group", at: [INSPECT.x, INSPECT.y + 30, TOP + 100], rot: [60, 0, 0] });
add({ id: "inspect-case", kind: "box", size: [262, 196, 12], r: 6, at: [0, 0, -12], tone: "lo", parent: "inspect" });
add({ id: "inspect-screen", kind: "plane", size: [244, 176], screen: [732, 528], at: [0, 0, 0.3], parent: "inspect" });
add({ id: "inspect-hinge", kind: "cylinder", r: 6, h: 30, at: [-15, -2, -18], rot: [0, 90, 0], tone: "mid", metal: 0.7, parent: "inspect" });
add({ id: "bench-label", kind: "box", size: [170, 3, 26], r: 1, at: [TANK.x, -398, 22], tone: "mid", texture: { kind: "label", title: "CONTOUR BENCH", lines: ["MARCHING SQUARES", "ISO = WATER LEVEL", "GRID 8 / 16 / 32"], aspect: 0.15 } });

export const scene = {
  fig: "Fig 10", title: "Marching squares, on a contour bench",
  hint: "Drag knobs · → step · I interp · R grid",
  readout: "cell 0,0 · 0000 → case 0",
  size: "hero", width: 960, height: 540,
  camera: { azimuth: 34, elevation: 36 }, pad: 0.04, fit: "parts", env: { intensity: 0.85 },
  parts,
};
assertScene(scene);
