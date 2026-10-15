// An upright arcade cabinet with its left side panel off, as a three.js scene.
// Units: 1 = 4 mm. x across the cabinet, y front (-) to back (+), z up.
import { collector, cornersOf, screw } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const MM = 0.25; // units per mm
export const CAB = { w: 160, d: 200, h: 445, wall: 4.5 };
const X0 = -CAB.w / 2, X1 = CAB.w / 2, Y0 = -CAB.d / 2, Y1 = CAB.d / 2;
const IX0 = X0 + CAB.wall, IX1 = X1 - CAB.wall;
export const PANEL_Z = 235;
export const COIN = { r: 24.26 / 2 * MM * 2.2, h: 1.75 * MM * 2.2 }; // shown 2.2x so it reads at this scale
const WOOD = { color: "#2a2b2e" };
const FIBRE = { color: "#3c3f45" };

// Carcass: plinth, right side (in three blocks for its profile), back, top, floor, front boards. The left side is off.
add({ id: "plinth", kind: "box", size: [CAB.w - 8, CAB.d - 20, 10], r: 2, at: [0, 6, 0], tone: "lo" });
for (const [i, [x, y]] of cornersOf(0, 6, CAB.w - 8, CAB.d - 20, 10).entries()) add({ id: `leveller-${i}`, kind: "cylinder", r: 5, h: 2, at: [x, y, -2], tone: "lo" });
add({ id: "side-low", kind: "box", size: [CAB.wall, CAB.d, PANEL_Z - 10], at: [X1 - CAB.wall / 2, 0, 10], tone: "mid" });
add({ id: "side-mid", kind: "box", size: [CAB.wall, CAB.d - 40, 120], at: [X1 - CAB.wall / 2, 20, PANEL_Z], tone: "mid" });
add({ id: "side-top", kind: "box", size: [CAB.wall, CAB.d - 20, CAB.h - PANEL_Z - 120], at: [X1 - CAB.wall / 2, 10, PANEL_Z + 120], tone: "mid" });
add({ id: "back", kind: "box", size: [CAB.w - CAB.wall, CAB.wall, CAB.h - 10], at: [-CAB.wall / 2, Y1 - CAB.wall / 2, 10], tone: "lo" });
add({ id: "top", kind: "box", size: [CAB.w - CAB.wall, CAB.d - 20, CAB.wall], at: [-CAB.wall / 2, 10, CAB.h - CAB.wall], tone: "mid" });
add({ id: "floor", kind: "box", size: [CAB.w - CAB.wall, CAB.d - CAB.wall, CAB.wall], at: [-CAB.wall / 2, -CAB.wall / 2, 10], tone: "lo" });
add({ id: "kick-board", kind: "box", size: [CAB.w - CAB.wall, CAB.wall, 50], at: [-CAB.wall / 2, Y0 + CAB.wall / 2, 10 + CAB.wall], tone: "mid" });
add({ id: "front-board", kind: "box", size: [CAB.w - CAB.wall, CAB.wall, PANEL_Z - 60 - 4.5 - 10], at: [-CAB.wall / 2, Y0 + CAB.wall / 2, 60 + 4.5], tone: "mid" });
add({ id: "left-rail-top", kind: "box", size: [6, CAB.d - 20, 6], r: 1.5, at: [X0 + 3, 10, CAB.h - 10], ...WOOD, tone: "mid" });
add({ id: "left-rail-low", kind: "box", size: [6, CAB.d, 6], r: 1.5, at: [X0 + 3, 0, 10], ...WOOD, tone: "mid" });

// Coin door with two slots, reject buttons, a lock.
export const DOOR = { x: -20, z: 90, w: 76, h: 90 };
add({ id: "coin-door", kind: "box", size: [DOOR.w, 3, DOOR.h], r: 4, at: [DOOR.x, Y0 - 1.5, DOOR.z], tone: "hi" });
export const SLOTS = [-36, -4].map((dx) => [DOOR.x + dx + 20, DOOR.z + 62]);
SLOTS.forEach(([x, z], i) => {
  add({ id: `slot-plate-${i}`, kind: "box", size: [22, 2, 26], r: 3, at: [x, Y0 - 4, z - 4], tone: "mid" });
  add({ id: `slot-${i}`, kind: "box", size: [2, 1, 12], at: [x, Y0 - 5.5, z], tone: "lo", edges: false });
  add({ id: `reject-${i}`, kind: "box", size: [10, 2, 6], r: 1.5, at: [x, Y0 - 5.6, z - 3], tone: "hi" });
  add({ id: `coin-lamp-${i}`, kind: "box", size: [8, 1, 4], r: 1, at: [x, Y0 - 5.5, z + 14], color: "#ff4d3a", emissive: "#ff2a1a", glow: 0.3 });
});
add({ id: "door-lock", kind: "cylinder", r: 4, h: 2.4, rot: [90, 0, 0], at: [DOOR.x + 26, Y0 - 3, DOOR.z + 22], tone: "mid" });

// Control panel (tilted), joystick on a boot, fire button, two start buttons.
add({ id: "panel", kind: "group", at: [0, Y0 + 6, PANEL_Z], rot: [-12, 0, 0] });
add({ id: "panel-box", kind: "box", size: [CAB.w - CAB.wall, 46, 26], r: 3, at: [-CAB.wall / 2, -10, -26], tone: "mid", parent: "panel" });
add({ id: "panel-overlay", kind: "box", size: [CAB.w - CAB.wall - 8, 38, 0.6], r: 2, at: [-CAB.wall / 2, -10, 0], tone: "lo", edges: false, parent: "panel" });
export const STICK = [-30, -12];
add({ id: "stick-plate", kind: "box", size: [18, 18, 1.2], r: 2, at: [...STICK, 0.6], tone: "mid", parent: "panel" });
add({ id: "stick", kind: "group", at: [...STICK, 1.8], parent: "panel" });
add({ id: "stick-shaft", kind: "cylinder", r: 1.4, h: 24, at: [0, 0, 0], tone: "hi", edges: false, parent: "stick" });
add({ id: "stick-ball", kind: "sphere", r: 5.6, at: [0, 0, 26], color: "#d23c32", lit: true, parent: "stick", edges: false });
add({ id: "stick-dust", kind: "cylinder", r: 5, h: 1.2, at: [0, 0, 0.2], tone: "lo", parent: "stick" });
add({ id: "stick-actuator", kind: "cylinder", r: 1.6, h: 22, at: [0, 0, -22], tone: "hi", edges: false, parent: "stick" });
export const SWITCHES = [];
for (const [i, sx] of [-1, 1].entries()) {
  const id = `microswitch-${i}`;
  SWITCHES.push(id);
  add({ id, kind: "box", size: [5, 10, 8], r: 1, at: [STICK[0] + sx * 6.5, STICK[1], -20], color: "#2b62c9", parent: "panel" });
}
add({ id: "fire", kind: "group", at: [12, -10, 1.6], parent: "panel" });
add({ id: "fire-bezel", kind: "cylinder", r: 6.4, h: 1.4, at: [12, -10, 0.6], tone: "hi", parent: "panel" });
add({ id: "fire-cap", kind: "cylinder", r: 5, h: 3.4, at: [0, 0, 0.4], color: "#d23c32", parent: "fire" });
for (const [i, x] of [34, 50].entries()) {
  add({ id: `start-${i}`, kind: "cylinder", r: 3.6, h: 2.4, at: [x, -2, 0.6], color: "#e8e3d6", parent: "panel" });
  add({ id: `start-ring-${i}`, kind: "torus", r: 4.2, tube: 0.5, at: [x, -2, 0.7], tone: "lo", edges: false, parent: "panel" });
}

// Monitor: a tilted bezel with the CRT behind it (the picture is a canvas, 224 x 288, vertical).
export const SCREEN = { w: 92, h: 118, px: [448, 576], z: PANEL_Z + 70, y: Y0 + 40, tilt: -22 };
add({ id: "monitor", kind: "group", at: [-CAB.wall / 2, SCREEN.y, SCREEN.z], rot: [SCREEN.tilt, 0, 0] });
add({ id: "bezel", kind: "box", size: [CAB.w - CAB.wall - 2, 3, 150], r: 2, at: [0, 0, -75], tone: "lo", parent: "monitor" });
add({ id: "screen", kind: "plane", size: [SCREEN.w, SCREEN.h], screen: SCREEN.px, rot: [90, 0, 0], at: [0, -1.7, 0], parent: "monitor" });
add({ id: "tube-face", kind: "box", size: [SCREEN.w + 10, 8, SCREEN.h + 10], r: 8, at: [0, 5.5, -(SCREEN.h + 10) / 2], tone: "lo", parent: "monitor" });
add({ id: "tube-cone", kind: "lathe", segments: 4, profile: [[0.1, 0], [62, 0], [52, 22], [18, 50], [9, 54], [9, 84], [0.1, 84]], rot: [-90, 0, 45], at: [0, 9.5, 0], tone: "mid", parent: "monitor" });
add({ id: "chassis", kind: "box", size: [120, 70, 4], r: 2, at: [0, 60, -72], tone: "mid", parent: "monitor" });
add({ id: "flyback", kind: "box", size: [14, 14, 18], r: 2, at: [34, 64, -68], color: "#20232a", parent: "monitor" });
add({ id: "yoke", kind: "torus", r: 12, tube: 3, rot: [90, 0, 0], at: [0, 70, 0], color: "#a8642e", edges: false, parent: "monitor" });
add({ id: "glass", kind: "box", size: [CAB.w - CAB.wall - 6, 1, SCREEN.h + 26], at: [0, -4.2, -(SCREEN.h + 26) / 2], glass: true, color: "#cfd8e0", opacity: 0.12, parent: "monitor" });

// Marquee with its lamp, a speaker grille.
add({ id: "marquee-box", kind: "box", size: [CAB.w - CAB.wall, 36, 48], at: [-CAB.wall / 2, Y0 + 28, CAB.h - 52], tone: "lo" });
add({ id: "marquee", kind: "plane", size: [CAB.w - CAB.wall - 12, 38], screen: [512, 128], rot: [90, 0, 0], at: [-CAB.wall / 2, Y0 + 9.9, CAB.h - 28] });
add({ id: "marquee-tube", kind: "cylinder", r: 2.4, h: CAB.w - 30, rot: [0, 90, 0], at: [-CAB.w / 2 + 12, Y0 + 26, CAB.h - 28], color: "#fbf6e8", emissive: "#fff3c9", glow: 0.05, edges: false });
add({ id: "speaker-board", kind: "box", size: [CAB.w - CAB.wall, 4, 13], at: [-CAB.wall / 2, Y0 + 12, CAB.h - 65], tone: "lo" });
for (let i = 0; i < 3; i++) add({ id: `grille-${i}`, kind: "box", size: [60, 1, 1.2], r: 0.5, at: [-CAB.wall / 2, Y0 + 9.6, CAB.h - 62 + i * 3.4], tone: "mid", edges: false });

// Coin path behind the door: mech, chute, switch wire, meter, cash box.
export const MECH = { x: SLOTS[0][0], y: Y0 + 22, z: SLOTS[0][1] - 10 };
add({ id: "mech", kind: "box", size: [18, 30, 34], r: 2, at: [MECH.x, MECH.y, MECH.z - 14], tone: "hi" });
add({ id: "mech-2", kind: "box", size: [18, 30, 34], r: 2, at: [SLOTS[1][0], MECH.y, MECH.z - 14], tone: "hi" });
export const CHUTE = { from: [MECH.x, MECH.y + 15, MECH.z - 16], to: [MECH.x, MECH.y + 15 + 40, MECH.z - 16 - 40 * Math.tan(Math.PI / 6)] };
const chuteLen = Math.hypot(CHUTE.to[1] - CHUTE.from[1], CHUTE.to[2] - CHUTE.from[2]);
add({ id: "chute", kind: "box", size: [8, chuteLen, 2], at: [MECH.x, (CHUTE.from[1] + CHUTE.to[1]) / 2, (CHUTE.from[2] + CHUTE.to[2]) / 2 - 1 - COIN.r], rot: [-30, 0, 0], tone: "mid" });
for (const [i, sx] of [-1, 1].entries()) add({ id: `chute-wall-${i}`, kind: "box", size: [1, chuteLen, 8], at: [MECH.x + sx * 4.5, (CHUTE.from[1] + CHUTE.to[1]) / 2, (CHUTE.from[2] + CHUTE.to[2]) / 2 - 1 - COIN.r], rot: [-30, 0, 0], tone: "mid" });
export const CASH = { x: MECH.x, y: CHUTE.to[1] + 4, z: 15 };
export const SWITCH_Z = CHUTE.to[2] - 20;
add({ id: "switch-body", kind: "box", size: [6, 8, 8], r: 1, at: [MECH.x + 12, CHUTE.to[1] + 4, SWITCH_Z - 4], color: "#2b62c9" });
add({ id: "switch-wire", kind: "group", at: [MECH.x + 9, CHUTE.to[1] + 4, SWITCH_Z] });
add({ id: "switch-wire-rod", kind: "cylinder", r: 0.4, h: 13, rot: [0, -90, 0], at: [0, 0, 0], tone: "hi", edges: false, parent: "switch-wire" });
add({ id: "cash-box", kind: "box", size: [40, 40, 2], r: 2, at: [CASH.x, CASH.y, CASH.z], tone: "mid" });
for (const [i, [w, d, x, y]] of [[40, 2, 0, -19], [40, 2, 0, 19], [2, 36, -19, 0], [2, 36, 19, 0]].entries()) add({ id: `cash-wall-${i}`, kind: "box", size: [w, d, 22], at: [CASH.x + x, CASH.y + y, CASH.z + 2], tone: "mid" });
add({ id: "meter", kind: "box", size: [10, 8, 12], r: 1.5, at: [MECH.x - 22, MECH.y + 2, MECH.z - 36], color: "#20232a" });
add({ id: "meter-window", kind: "plane", size: [6, 3], rot: [0, -90, 0], at: [MECH.x - 27.1, MECH.y + 2, MECH.z - 28], screen: [64, 32] });

// Logic board on the inside of the right side, power supply on the floor, harness.
export const BOARD = { x: IX1 - 1.5, y: 30, z: 120 };
add({ id: "board", kind: "box", size: [2, 90, 70], at: [BOARD.x, BOARD.y, BOARD.z], color: "#1f5a3a" });
for (let i = 0; i < 18; i++) add({ id: `chip-${i}`, kind: "box", size: [1.6, 12, 4.4], at: [BOARD.x - 1.8, BOARD.y - 36 + (i % 6) * 14, BOARD.z + 12 + Math.floor(i / 6) * 18], color: "#16181b", edges: false });
add({ id: "edge-connector", kind: "box", size: [4, 60, 6], r: 1, at: [BOARD.x - 2, BOARD.y, BOARD.z - 6], color: "#16181b" });
add({ id: "psu", kind: "box", size: [40, 50, 26], r: 2, at: [IX1 - 26, Y1 - 40, 10 + CAB.wall], tone: "mid" });
add({ id: "transformer", kind: "box", size: [22, 22, 22], r: 2, at: [IX1 - 26, Y1 - 82, 10 + CAB.wall], color: "#5b4a3a" });
const harness = (id, points, color) => add({ id, kind: "tube", points, r: 1.4, color, edges: false });
harness("cable-stick", [[STICK[0], Y0 + 6 + 2, PANEL_Z - 24], [STICK[0], Y0 + 30, PANEL_Z - 40], [IX1 - 4, Y0 + 50, PANEL_Z - 50], [BOARD.x - 4, BOARD.y - 20, BOARD.z - 4]], "#c9b23a");
harness("cable-fire", [[12, Y0 + 2, PANEL_Z - 24], [12, Y0 + 30, PANEL_Z - 44], [IX1 - 6, Y0 + 56, PANEL_Z - 56], [BOARD.x - 4, BOARD.y, BOARD.z - 4]], "#d23c32");
harness("cable-coin", [[MECH.x + 15, CHUTE.to[1] + 4, SWITCH_Z - 4], [MECH.x + 40, CHUTE.to[1] + 10, SWITCH_Z + 4], [IX1 - 6, BOARD.y + 10, BOARD.z - 10], [BOARD.x - 4, BOARD.y + 20, BOARD.z - 4]], "#3a8ad2");
harness("cable-power", [[IX1 - 26, Y1 - 40, 10 + CAB.wall + 26], [IX1 - 8, Y1 - 30, 80], [BOARD.x - 4, BOARD.y + 26, BOARD.z - 4]], "#202020");
harness("cable-video", [[BOARD.x - 2, BOARD.y - 30, BOARD.z + 70], [IX1 - 10, 40, PANEL_Z + 40], [10, Y0 + 100, PANEL_Z + 30]], "#e8e3d6");

export const scene = {
  fig: "Fig 4",
  title: "Upright cabinet, side off",
  hint: "C or click the quarters · ← → · space",
  readout: "off · 0 credits",
  size: "hero",
  width: 600,
  height: 700,
  pad: 0.03,
  camera: { azimuth: 52, elevation: 24 },
  lights: [{ at: [-60, -20, 320], intensity: 0.9, distance: 600, decay: 0 }, { at: [-60, 10, 120], intensity: 0.6, distance: 400, decay: 0 }],
  parts,
};
