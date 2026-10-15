// The dial indicator as a three.js scene description (see kit/three-scene.mjs).
export const BLOCKS = [18, 14, 10];
export const BLOCK_W = 15.6;
export const STEP = 16;
export const TIP_R = 2.6;
export const DIAL = [58, 0];
export const DIAL_R = 20;
export const DIAL_Z = 82;
export const DIAL_H = 10;
export const PER_TURN = 20;
export const BASE = 8; // carriage top
const CENTRE = -24 + BLOCK_W / 2;
export const STOPS = BLOCKS.map((_, i) => DIAL[0] - CENTRE - STEP * i);
export const REACH = [STOPS[STOPS.length - 1] - 6, STOPS[0] + 6];

const PLATE = { x: -128, y: -64, w: 262, d: 128 };
const PLATE_H = 12, FOOT_H = 5;
const POST = [-98, 0], POST_TOP = 122, CLAMP_Z = 100, MAG_H = 24;
const DIAL_TOP = DIAL_Z + DIAL_H;
const parts = [];
const add = (part) => (parts.push(part), part);
const cx = (p) => p.x + p.w / 2, cy = (p) => p.y + p.d / 2;

// Base: plate on four two-step feet, corner screws, a ruler strip.
add({ id: "plate", kind: "box", size: [PLATE.w, PLATE.d, PLATE_H], r: 8, at: [cx(PLATE), cy(PLATE), -PLATE_H], texture: { kind: "brushed", project: "box", tile: 90 }, metal: 0.7, rough: 0.42 });
const feet = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
feet.forEach(([sx, sy], i) => {
  const at = [cx(PLATE) + sx * (PLATE.w / 2 - 22), cy(PLATE) + sy * (PLATE.d / 2 - 22)];
  add({ id: `foot-${i}`, kind: "cylinder", r: 7, h: 1.6, at: [...at, -PLATE_H - FOOT_H], tone: "lo" });
  add({ id: `foot-body-${i}`, kind: "cylinder", r: 5.4, h: FOOT_H - 1.6, at: [...at, -PLATE_H - FOOT_H + 1.6], tone: "mid" });
  const screw = [cx(PLATE) + sx * (PLATE.w / 2 - 10), cy(PLATE) + sy * (PLATE.d / 2 - 10)];
  add({ id: `screw-${i}`, kind: "cylinder", r: 1.6, h: 0.5, at: [...screw, 0], tone: "lo", edges: false });
  add({ id: `screw-ring-${i}`, kind: "torus", r: 2.2, tube: 0.18, at: [...screw, 0.05], tone: "lo", edges: false });
});
const strip = { x: -110, y: PLATE.y + PLATE.d - 15, w: 230, d: 7 };
add({ id: "ruler-strip", kind: "box", size: [strip.w, strip.d, 0.6], at: [cx(strip), cy(strip), 0], tone: "lo" });
add({ id: "ruler-ticks", kind: "rail", from: strip.x + 4, to: strip.x + strip.w - 4, step: 4, every: 5, len: [2, 3.6], at: [0, strip.y + 0.8, 0.65], tone: "mid" });
add({ id: "ruler-pin-a", kind: "sphere", r: 0.6, at: [strip.x + 2, strip.y + 3.5, 0.6], tone: "hi", edges: false });
add({ id: "ruler-pin-b", kind: "sphere", r: 0.6, at: [strip.x + strip.w - 2, strip.y + 3.5, 0.6], tone: "hi", edges: false });

// Structure: two rails with end stops.
for (const [i, y] of [-20, 15].entries()) {
  add({ id: `rail-${i}`, kind: "box", size: [122, 5, 3], r: 1, at: [63, y + 2.5, 0], tone: "mid" });
  for (const [j, x] of [8, 118].entries()) add({ id: `rail-bolt-${i}-${j}`, kind: "sphere", r: 0.55, at: [x, y + 2.5, 3], tone: "hi", edges: false });
}
for (const [i, x] of [-3, 124].entries()) {
  add({ id: `end-stop-${i}`, kind: "box", size: [5, 46, 7], r: 1.2, at: [x + 2.5, 0, 0], tone: "mid" });
  add({ id: `end-stop-bolt-${i}`, kind: "sphere", r: 0.6, at: [x + 2.5, -18, 7], tone: "hi", edges: false });
}

// Fixture: magnetic base, knob, post, clamp, arm, thumb screw.
add({ id: "magnet", kind: "box", size: [44, 40, 11], r: 3, at: [-90, 0, 0], tone: "mid" });
add({ id: "magnet-cap", kind: "box", size: [42.4, 38.4, MAG_H - 11], r: 2.6, at: [-90, 0, 11], tone: "mid" });
add({ id: "magnet-knob", kind: "cylinder", r: 6, h: 4, segments: 36, at: [-80, 8, MAG_H], tone: "mid" });
add({ id: "magnet-knob-mark", kind: "box", size: [6, 0.6, 0.3], at: [-77, 8, MAG_H + 4], tone: "hi", edges: false });
add({ id: "post-boss", kind: "cylinder", r: 5, h: 4, at: [...POST, MAG_H], tone: "mid" });
add({ id: "post-low", kind: "cylinder", r: 3.2, h: CLAMP_Z - 4 - MAG_H - 4, at: [...POST, MAG_H + 4], tone: "mid" });
add({ id: "clamp", kind: "box", size: [14, 14, 12], r: 2.5, at: [...POST, CLAMP_Z - 4], tone: "mid" });
add({ id: "post-high", kind: "cylinder", r: 3.2, h: POST_TOP - CLAMP_Z - 8, at: [...POST, CLAMP_Z + 8], tone: "mid" });
add({ id: "post-cap", kind: "cylinder", r: 3.8, h: 2, at: [...POST, POST_TOP], tone: "mid" });
const armFrom = POST[0] + 7, armTo = DIAL[0] - DIAL_R + 2;
add({ id: "arm", kind: "box", size: [armTo - armFrom, 6, 4], r: 2, at: [(armFrom + armTo) / 2, 0, CLAMP_Z], tone: "mid" });
add({ id: "arm-bolt-a", kind: "sphere", r: 0.6, at: [armFrom + 4, 0, CLAMP_Z + 4], tone: "hi", edges: false });
add({ id: "arm-bolt-b", kind: "sphere", r: 0.6, at: [armTo - 5, 0, CLAMP_Z + 4], tone: "hi", edges: false });
add({ id: "thumb-stem", kind: "box", size: [2.8, 3, 4], r: 0.8, at: [POST[0], 8.5, CLAMP_Z + 1], tone: "mid" });
add({ id: "thumb-screw", kind: "cylinder", r: 2.6, h: 6, segments: 18, at: [POST[0], 11.4, CLAMP_Z], tone: "mid" });

// Mechanism: carriage with gauge blocks and handle (moves along x).
add({ id: "carriage", kind: "group", at: [STOPS[0], 0, 0] });
add({ id: "carriage-slab", kind: "box", size: [56, 48, BASE - 3], r: 3, at: [0, 0, 3], tone: "mid", parent: "carriage" });
for (const [i, x] of [-22, -8, 8, 22].entries()) add({ id: `carriage-screw-${i}`, kind: "sphere", r: 0.5, at: [x, 21.4, BASE], tone: "lo", edges: false, parent: "carriage" });
BLOCKS.forEach((h, i) => add({ id: `block-${i}`, kind: "box", size: [BLOCK_W, 24, h], r: 1, at: [-24 + STEP * i + BLOCK_W / 2, 0, BASE], tone: "hi", parent: "carriage" }));
add({ id: "handle-stem", kind: "box", size: [4, 4, 3], r: 1, at: [20, 25, 4], tone: "mid", parent: "carriage" });
add({ id: "handle", kind: "cylinder", r: 3, h: 5, segments: 18, at: [20, 28, 3], tone: "mid", parent: "carriage" });

// The lit subject: plunger (rides on the block) and needle.
add({ id: "plunger", kind: "group", at: [DIAL[0], DIAL[1], BASE + BLOCKS[0]] });
add({ id: "plunger-tip", kind: "lathe", profile: [[0, 0], [TIP_R * 0.7, 0.3], [TIP_R, 1.2], [TIP_R, 2.4], [1.4, 2.4]], at: [0, 0, 0], lit: true, parent: "plunger" });
add({ id: "plunger-rod", kind: "cylinder", r: 1.4, h: 50, segments: 16, at: [0, 0, 2.4], tone: "hi", parent: "plunger", edges: false });

// The dial: stem, body, bezel, face ticks, lug, crown.
add({ id: "dial-stem", kind: "cylinder", r: 2.9, h: DIAL_Z - 54, at: [...DIAL, 54], tone: "mid" });
add({ id: "dial-arm-lug", kind: "box", size: [8, 8, CLAMP_Z - DIAL_Z - 2], r: 1.5, at: [DIAL[0] - DIAL_R - 2, 0, DIAL_Z + 2], tone: "mid" });
add({ id: "dial-body", kind: "lathe", segments: 64, profile: [[0, 0], [DIAL_R - 0.8, 0], [DIAL_R, 0.8], [DIAL_R, DIAL_H - 3.4], [DIAL_R + 0.4, DIAL_H - 3.2], [DIAL_R + 0.4, DIAL_H - 0.4], [DIAL_R, DIAL_H], [0, DIAL_H]], at: [...DIAL, DIAL_Z], color: "#c9ced4", metal: 0.85, rough: 0.22 });
add({ id: "dial-bezel", kind: "torus", r: DIAL_R - 2.2, tube: 0.35, segments: 64, at: [...DIAL, DIAL_TOP], tone: "lo", edges: false });
// The printed face: fifty graduations, numerals on every fifth, drawn into a texture from these same numbers.
add({ id: "dial-face", kind: "disc", r: DIAL_R - 2.4, segments: 64, at: [...DIAL, DIAL_TOP + 0.05], texture: { kind: "dial", count: 50, every: 5, from: 0, step: 10, ring: 0.95, font: 0.1 }, rough: 0.6, metal: 0 });
// The crystal: a faint clear-coated glass, not transmission, which would blur the printed face at this size.
add({ id: "dial-crystal", kind: "cylinder", r: DIAL_R - 2.2, h: 0.5, segments: 64, at: [...DIAL, DIAL_TOP + 1.1], glass: true, color: "#ffffff", opacity: 0.1, edges: false });
add({ id: "dial-crown-neck", kind: "box", size: [5, 4.8, 5], r: 1.2, at: [DIAL[0] + DIAL_R + 1.5, 0, DIAL_Z + 2], tone: "mid" });
add({ id: "dial-crown", kind: "cylinder", r: 3.2, h: 2.6, segments: 24, rot: [0, 90, 0], at: [DIAL[0] + DIAL_R + 4.9, 0, DIAL_Z + 5.5], tone: "mid" });
add({ id: "dial-hub", kind: "cylinder", r: 1.6, h: 0.6, at: [...DIAL, DIAL_TOP], tone: "mid", edges: false });
add({ id: "needle", kind: "group", at: [...DIAL, DIAL_TOP + 0.3] });
add({ id: "needle-blade", kind: "box", size: [0.8, DIAL_R + 0.6, 0.3], at: [0, (DIAL_R - 4 - 3.4) / 2, 0], tone: "hi", parent: "needle", edges: false });

export const scene = {
  fig: "Fig 1",
  title: "Dial indicator",
  hint: "Hover to slide the carriage",
  readout: `block 1 · reads ${BLOCKS[0].toFixed(1)} px`,
  size: "figure",
  width: 600,
  height: 380,
  camera: { azimuth: 42, elevation: 30 },
  env: { intensity: 0.9 },
  pad: 0.04,
  parts,
};
