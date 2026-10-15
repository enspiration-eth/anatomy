// The spot plate and its feeler fan as a three.js scene (numbers from examples/spot-plate/rig.ts).
import { collector, cornersOf, screw } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const RADII = [30, 22];
export const [RA, RB] = RADII;
export const GAPS = [4, 10, 16, 24, 32, 44];
export const MERGE = 20, MERGE_LEAST = 0, MERGE_MOST = 48;
export const ROWS = GAPS.length;
const MARGIN = 6, PITCH = 84, BORDER = 14, COLS = 3, ROW_RIM = 16;
export const WELL_HALF = RA + MARGIN;
export const BIG_Y = MARGIN + RA;
export const DATUM_Y = BIG_Y + RA;
const WELL_D = DATUM_Y + GAPS[ROWS - 1] + 2 * RB + MARGIN;
export const rowX = (row) => (row % COLS) * PITCH;
export const rowY = (row) => Math.floor(row / COLS) * (WELL_D + ROW_RIM);
export const TRAY_H = 13;
export const INLAY = 0.4;
export const GLASS_H = 8;
export const reachOf = (merge) => merge * 2;
export const joinedAt = (merge) => GAPS.filter((gap) => gap < merge);
export const listOf = (items) => (items.length < 2 ? `${items[0]}` : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
export const readoutOf = (merge) => `merge ${Math.round(merge)} px · ${joinedAt(Math.round(merge)).length} of ${ROWS} joined`;
export const thicknessOf = (gap) => 0.45 + gap / 20;
export const SWEEP = 180;
export const angleOf = (merge) => (Math.min(Math.max(merge, MERGE_LEAST), MERGE_MOST) / MERGE_MOST) * SWEEP;

const TRAY = { x: -WELL_HALF - BORDER, y: -BORDER, w: rowX(COLS - 1) + (WELL_HALF + BORDER) * 2, d: rowY(ROWS - 1) + WELL_D + BORDER * 2 };
const cx = (p) => p.x + p.w / 2, cy = (p) => p.y + p.d / 2;

// Bench mat, tray, wells (inlays), row numbers as engraved dots, corner screws.
add({ id: "mat", kind: "box", size: [TRAY.w + 230, TRAY.d + 40, 3], r: 10, at: [cx(TRAY) + 95, cy(TRAY), -3], tone: "lo" });
add({ id: "tray", kind: "box", size: [TRAY.w, TRAY.d, TRAY_H], r: 10, at: [cx(TRAY), cy(TRAY), 0], tone: "mid" });
for (const [i, [x, y]] of cornersOf(cx(TRAY), cy(TRAY), TRAY.w, TRAY.d, 7).entries()) screw(add, `tray-screw-${i}`, x, y, TRAY_H, { r: 1.5 });
GAPS.forEach((gap, row) => {
  add({ id: `well-${row}`, kind: "box", size: [WELL_HALF * 2, WELL_D, INLAY], r: WELL_HALF - 0.5, at: [rowX(row), rowY(row) + WELL_D / 2, TRAY_H], tone: "lo", edges: false });
  for (let k = 0; k <= row; k++) add({ id: `well-mark-${row}-${k}`, kind: "sphere", r: 0.9, at: [rowX(row) - WELL_HALF + 4 + k * 3.4, rowY(row) + WELL_D + 5, TRAY_H], tone: "hi", edges: false });
  add({ id: `datum-${row}`, kind: "box", size: [WELL_HALF * 2 - 8, 0.8, 0.3], at: [rowX(row), rowY(row) + DATUM_Y, TRAY_H + INLAY], tone: "faint", edges: false });
  add({ id: `drops-${row}`, kind: "plane", size: [WELL_HALF * 2 - 2, WELL_D - 2], at: [rowX(row), rowY(row) + WELL_D / 2, TRAY_H + INLAY], glass: true, color: "#ffffff", material: { transmission: 0.9, ior: 1.5, thickness: 3, rough: 0.04, iridescence: 0.25 }, edges: false });
});

// The deck with the feeler fan: pivot stack, six blades (one per gap) and a lead blade, a stop pin per gap and a scale.
export const DECK = { x: TRAY.x + TRAY.w + 10, y: TRAY.y, w: 172, d: TRAY.d };
export const DECK_H = 6;
export const PIVOT = [DECK.x + 22, DECK.y + DECK.d / 2 + 6];
export const BLADE_LONG = 104, LEAD_LONG = 113, STOP_R = 111, SCALE_R = 120;
add({ id: "deck", kind: "box", size: [DECK.w, DECK.d, DECK_H], r: 12, at: [cx(DECK), cy(DECK), 0], tone: "mid" });
for (const [i, [x, y]] of cornersOf(cx(DECK), cy(DECK), DECK.w, DECK.d, 9).entries()) screw(add, `deck-screw-${i}`, x, y, DECK_H, { r: 1.5 });
add({ id: "scale", kind: "ticks", r: SCALE_R, count: MERGE_MOST + 1, every: 4, sweep: SWEEP, start: 0, len: [3, 6], at: [...PIVOT, DECK_H + 0.05], rot: [180, 0, 0], tone: "mid" });
add({ id: "washer", kind: "cylinder", r: 9, h: 0.8, at: [...PIVOT, DECK_H], tone: "hi" });
let z = DECK_H + 0.8;
export const BLADES = [];
GAPS.forEach((gap, i) => {
  const h = thicknessOf(gap);
  const id = `blade-${i}`;
  BLADES.push({ id, gap });
  add({ id, kind: "group", at: [...PIVOT, z] });
  add({ id: `${id}-leaf`, kind: "box", size: [BLADE_LONG, 10 - i * 0.6, h], r: Math.min(2.4, (10 - i * 0.6) / 2 - 0.1), at: [BLADE_LONG / 2 - 4, 0, 0], tone: i % 2 ? "mid" : "hi", parent: id });
  add({ id: `${id}-eye`, kind: "cylinder", r: 6, h, at: [0, 0, 0], tone: "mid", parent: id, edges: false });
  const a = (angleOf(gap) * Math.PI) / 180;
  add({ id: `stop-${i}`, kind: "cylinder", r: 1.8, h: 4, at: [PIVOT[0] + Math.sin(a) * STOP_R, PIVOT[1] - Math.cos(a) * STOP_R, DECK_H], tone: "hi" });
  z += h + 0.15;
});
add({ id: "lead", kind: "group", at: [...PIVOT, z] });
add({ id: "lead-leaf", kind: "box", size: [LEAD_LONG, 7, 1.1], r: 2, at: [LEAD_LONG / 2 - 4, 0, 0], parent: "lead", lit: true });
add({ id: "lead-grip", kind: "box", size: [8, 10, 4], r: 2, at: [LEAD_LONG - 6, 0, 1.1], tone: "mid", parent: "lead" });
add({ id: "pivot-nut", kind: "cylinder", r: 5, h: 3, segments: 6, at: [...PIVOT, z + 1.1], tone: "hi" });
add({ id: "pivot-pin", kind: "sphere", r: 1.6, at: [...PIVOT, z + 4.1], tone: "hi", edges: false });

// A dropper bottle in its foot on the deck.
const BOTTLE = [DECK.x + DECK.w - 33, DECK.y + 35];
add({ id: "bottle-foot", kind: "cylinder", r: 17, h: 2, at: [...BOTTLE, DECK_H], tone: "lo" });
add({ id: "bottle", kind: "lathe", segments: 48, profile: [[0, 0], [14, 0], [15, 1.5], [15, 40], [12, 46], [6, 50], [6, 52], [0, 52]], at: [...BOTTLE, DECK_H + 2], glass: true, color: "#c9b48c", opacity: 0.5 });
add({ id: "bottle-cap", kind: "cylinder", r: 7, h: 6, segments: 32, at: [...BOTTLE, DECK_H + 54], tone: "mid" });
add({ id: "bulb", kind: "lathe", profile: [[0, 0], [5, 0], [6, 4], [5, 10], [0.1, 12]], at: [...BOTTLE, DECK_H + 60], tone: "lo" });

export const scene = {
  fig: "Fig 2",
  title: "Spot plate",
  hint: "Slide across to open the fan",
  readout: readoutOf(MERGE),
  size: "figure",
  width: 600,
  height: 400,
  pad: 0.03,
  camera: { azimuth: 50, elevation: 34 },
  env: { intensity: 1 },
  parts,
};
