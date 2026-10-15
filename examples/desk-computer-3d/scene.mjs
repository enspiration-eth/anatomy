// An all-in-one desk computer as a three.js scene.
import { collector, coilAlong, cornersOf } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const CASE = { w: 160, d: 150, h: 164, z: 10 };
const FRONT = -CASE.d / 2; // y of the case front
export const SCREEN = { w: 100, h: 76, z: 112, px: [512, 390] };
export const KEY = { size: 8.6, pitch: 10.4, h: 3.6, travel: 2.4 };
export const BOARD = { w: 150, d: 64, h: 8, y: -130 };
export const ROWS = ["1234567890-=", "QWERTYUIOP[]", "ASDFGHJKL;'", "ZXCVBNM,./"];

// Desk feet, plinth, case.
for (const [i, [x, y]] of cornersOf(0, 0, CASE.w + 8, CASE.d + 8, 14).entries()) add({ id: `foot-${i}`, kind: "cylinder", r: 6, h: 4, at: [x, y, 0], tone: "lo" });
add({ id: "plinth", kind: "box", size: [CASE.w + 8, CASE.d + 8, 6], r: 4, at: [0, 0, 4], tone: "lo" });
add({ id: "case", kind: "box", size: [CASE.w, CASE.d, CASE.h], r: 6, at: [0, 0, CASE.z], tone: "mid" });
add({ id: "case-lid-seam", kind: "box", size: [CASE.w + 0.6, CASE.d + 0.6, 1.2], r: 6, at: [0, 0, CASE.z + 122], tone: "lo", edges: false });
add({ id: "handle-recess", kind: "box", size: [60, 8, 1], r: 3, at: [0, CASE.d / 2 - 14, CASE.z + CASE.h], tone: "lo" });

// CRT bezel, screen and its frame.
add({ id: "bezel", kind: "box", size: [124, 4, 100], r: 5, rot: [0, 0, 0], at: [0, FRONT - 2, SCREEN.z - 50], tone: "hi" });
add({ id: "screen", kind: "plane", size: [SCREEN.w, SCREEN.h], screen: SCREEN.px, rot: [90, 0, 0], at: [0, FRONT - 4.3, SCREEN.z],
  // The CRT shader owns everything the tube does to the picture: curvature, scan lines, mask, glow, power collapse.
  shader: { name: "crt", uniforms: { uLines: SCREEN.px[1] / 4, uGlow: 0.55, uCurve: 0.16, uTint: [0.92, 1.0, 0.95] } } });
for (const [i, [w, h, x, z]] of [[SCREEN.w + 6, 3, 0, SCREEN.z + SCREEN.h / 2 + 1.5], [SCREEN.w + 6, 3, 0, SCREEN.z - SCREEN.h / 2 - 4.5], [3, SCREEN.h, -SCREEN.w / 2 - 1.5, SCREEN.z - SCREEN.h / 2], [3, SCREEN.h, SCREEN.w / 2 + 1.5, SCREEN.z - SCREEN.h / 2]].entries())
  add({ id: `screen-frame-${i}`, kind: "box", size: [w, 1.2, h], at: [x, FRONT - 4.6, z], tone: "lo" });
add({ id: "brightness-knob", kind: "cylinder", r: 2.4, h: 2, rot: [90, 0, 0], at: [54, FRONT - 4, SCREEN.z - 46], tone: "mid" });
add({ id: "contrast-knob", kind: "cylinder", r: 2.4, h: 2, rot: [90, 0, 0], at: [46, FRONT - 4, SCREEN.z - 46], tone: "mid" });
add({ id: "power-led", kind: "sphere", r: 1.3, at: [-54, FRONT - 4.2, SCREEN.z - 46], lit: true, edges: false });
add({ id: "power-led-glow", kind: "sphere", r: 3.6, at: [-54, FRONT - 4.2, SCREEN.z - 46], edges: false, shader: { name: "glow", uniforms: { uColor: "#5cff8a", uLevel: 1, uPower: 2.6 } } });

// Floppy drive: faceplate, slot, latch, busy light; speaker grille.
add({ id: "drive-plate", kind: "box", size: [72, 2, 20], r: 2, at: [-22, FRONT - 1, 26], tone: "hi" });
add({ id: "drive-slot", kind: "box", size: [52, 1, 2.6], at: [-22, FRONT - 1.3, 37], tone: "lo", edges: false });
add({ id: "drive-latch", kind: "box", size: [12, 2.4, 5], r: 1, at: [-22, FRONT - 2.2, 28], tone: "mid" });
add({ id: "drive-light", kind: "box", size: [4, 1, 1.6], at: [6, FRONT - 1.3, 30], tone: "lo", edges: false });
for (let i = 0; i < 7; i++) add({ id: `grille-${i}`, kind: "box", size: [34, 1, 1.4], r: 0.6, at: [46, FRONT - 0.5, 22 + i * 3.4], tone: "lo", edges: false });

// Side: vents, rocker switch, keyboard port.
const SIDE = -CASE.w / 2;
// Nine identical slots: one geometry, drawn nine times.
add({ id: "vents", kind: "instances", shape: "box", size: [1, 46, 1.8], items: Array.from({ length: 9 }, (_, i) => [SIDE - 0.5, 18, 128 + i * 4]), tone: "lo" });
add({ id: "switch-housing", kind: "box", size: [3, 14, 20], r: 1.5, at: [SIDE - 1.5, 46, 34], tone: "lo" });
add({ id: "rocker", kind: "group", at: [SIDE - 4.2, 46, 44] });
add({ id: "rocker-cap", kind: "box", size: [2.4, 10, 16], r: 1, at: [0, 0, -8], tone: "hi", parent: "rocker" });
add({ id: "port", kind: "box", size: [3, 10, 8], r: 1, at: [SIDE - 1.5, -40, 26], tone: "lo" });
add({ id: "plug", kind: "box", size: [5, 8, 6], r: 1, at: [SIDE - 5, -40, 27], tone: "mid" });

// Keyboard: board, bezel, 58 keys (8 function keys, four rows, space).
add({ id: "keyboard", kind: "box", size: [BOARD.w, BOARD.d, BOARD.h], r: 3, at: [0, BOARD.y, 0], tone: "mid" });
add({ id: "keyboard-well", kind: "box", size: [BOARD.w - 10, BOARD.d - 8, 0.6], r: 2, at: [0, BOARD.y - 1, BOARD.h], tone: "lo", edges: false });
export const KEYS = [];
const key = (id, label, x, y, w = KEY.size) => {
  KEYS.push({ id, label });
  add({ id, kind: "box", size: [w, KEY.size, KEY.h], r: 1, at: [x, y, BOARD.h + 0.6], tone: "hi" });
  // The legend, printed on the cap: a glyph plane that rides with the key.
  const text = { "\n": "RET", " ": "" }[label] ?? label;
  if (text) add({ id: `${id}-legend`, kind: "plane", size: [KEY.size - 2, KEY.size - 2], at: [0, 0, KEY.h + 0.04], texture: { kind: "glyph", text }, parent: id });
};
for (let i = 0; i < 8; i++) key(`key-f${i + 1}`, `F${i + 1}`, -60 + i * KEY.pitch * 1.2, BOARD.y + 26);
ROWS.forEach((row, r) => [...row].forEach((ch, c) => key(`key-${r}-${c}`, ch, -58 + r * 3 + c * KEY.pitch, BOARD.y + 15 - r * KEY.pitch)));
key("key-return", "\n", 64, BOARD.y + 15 - 2 * KEY.pitch, KEY.size + 6);
key("key-space", " ", 0, BOARD.y - 27, 70);

// Coiled cord from the keyboard's back-left corner to the side port, round the plinth.
const cord = coilAlong([[-72, BOARD.y + BOARD.d / 2 + 4, 3], [-96, BOARD.y + BOARD.d / 2 + 4, 3], [-96, -40, 3], [-96, -40, 27], [SIDE - 7.5, -40, 27]], 2.4, 3.2);
add({ id: "cord", kind: "tube", points: cord, r: 0.8, tone: "lo", edges: false });
add({ id: "cord-boot", kind: "box", size: [6, 5, 4], r: 1, at: [-72, BOARD.y + BOARD.d / 2 + 2, 1], tone: "mid" });

export const scene = {
  fig: "Fig 2",
  title: "Desk computer",
  hint: "Type on it · click it to switch",
  readout: "on · 0 chars",
  size: "hero",
  width: 600,
  height: 460,
  pad: 0.04,
  camera: { azimuth: 38, elevation: 28 },
  parts,
};
