// The combination dial with a robot hand, as a three.js scene: the dial turns with the hand on it,
// the index finger lifts on three hinges, and the pod on the wrist breaks off as a free body.
import { collector, cornersOf, screw } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const DOOR = { w: 320, d: 240, h: 16 };
export const PLATE = { w: 170, d: 170, h: 6 };
export const PLATE_TOP = DOOR.h + PLATE.h;
export const DIAL = { r: 52, h: 18, z: PLATE_TOP + 4 };
export const DIAL_TOP = DIAL.z + DIAL.h;
export const NUMBERS = 100;
// Real metals: high metalness needs something to reflect, so the scene sets env (a procedural studio).
const GOLD = { color: "#d4ad55", metal: 0.9, rough: 0.3 };
const CHROME = { color: "#d9dde2", metal: 0.95, rough: 0.12 };
const GUN = { color: "#4b4f55", metal: 0.4, rough: 0.45 };

// Door slab with bolts and a hinge leaf, the raised plate with screws and the fixed index.
add({ id: "door", kind: "box", size: [DOOR.w, DOOR.d, DOOR.h], r: 6, at: [0, 0, 0], texture: { kind: "brushed", project: "box", tile: 140 }, metal: 0.5, rough: 0.5 });
for (const [i, [x, y]] of cornersOf(0, 0, DOOR.w, DOOR.d, 12).entries()) screw(add, `door-bolt-${i}`, x, y, DOOR.h, { r: 2.4 });
for (let i = 0; i < 3; i++) add({ id: `hinge-knuckle-${i}`, kind: "cylinder", r: 6, h: 46, rot: [90, 0, 0], at: [-DOOR.w / 2 - 6, 90 - i * 70 + 23, 8], tone: "hi" });
add({ id: "plate", kind: "box", size: [PLATE.w, PLATE.d, PLATE.h], r: 10, at: [0, 0, DOOR.h], tone: "hi" });
for (const [i, [x, y]] of cornersOf(0, 0, PLATE.w, PLATE.d, 11).entries()) screw(add, `plate-screw-${i}`, x, y, PLATE_TOP, { r: 1.8 });
add({ id: "boss", kind: "cylinder", r: DIAL.r + 6, h: 4, segments: 72, at: [0, 0, PLATE_TOP], tone: "mid" });
add({ id: "index", kind: "box", size: [3, 9, 2.4], r: 1, at: [0, DIAL.r + 11, PLATE_TOP], tone: "lo" });
add({ id: "index-tip", kind: "cylinder", r: 2.6, r2: 0.2, h: 4, segments: 3, rot: [90, 0, 0], at: [0, DIAL.r + 10.5, PLATE_TOP + 1.2], tone: "lo", edges: false });
add({ id: "handle-boss", kind: "cylinder", r: 14, h: 5, at: [128, -88, DOOR.h], tone: "mid" });
add({ id: "handle", kind: "box", size: [12, 50, 8], r: 4, at: [128, -68, DOOR.h + 5], tone: "hi" });
add({ id: "handle-cap", kind: "sphere", r: 7, at: [128, -88, DOOR.h + 13], ...CHROME });

// The dial (turns about z): body, rim ribs, graduations.
add({ id: "dial", kind: "group", at: [0, 0, DIAL.z] });
add({ id: "dial-skirt", kind: "lathe", segments: 96, profile: [[0, 0], [DIAL.r + 3, 0], [DIAL.r + 3, 4], [DIAL.r, 5], [0, 5]], tone: "mid", parent: "dial" });
add({ id: "dial-graduations", kind: "ticks", r: DIAL.r + 2.8, count: NUMBERS, every: 10, len: [1.6, 3.2], at: [0, 0, 5.05], tone: "hi", parent: "dial" });
add({ id: "dial-body", kind: "lathe", segments: 96, profile: [[0, 5], [DIAL.r - 2, 5], [DIAL.r - 2, DIAL.h - 2], [DIAL.r - 4, DIAL.h], [0, DIAL.h]], tone: "hi", parent: "dial" });
for (let i = 0; i < 48; i++) {
  const a = (i / 48) * Math.PI * 2;
  add({ id: `rib-${i}`, kind: "box", size: [1.6, 2.2, DIAL.h - 9], at: [Math.cos(a) * (DIAL.r - 1.6), Math.sin(a) * (DIAL.r - 1.6), 6.5], rot: [0, 0, (a * 180) / Math.PI], tone: "mid", edges: false, parent: "dial" });
}
// The numbers, printed from NUMBERS: 0 to 90 by tens, rising anticlockwise as on a real lock dial.
add({ id: "dial-numbers", kind: "disc", r: DIAL.r - 4, segments: 96, at: [0, 0, DIAL.h + 0.03], texture: { kind: "dial", count: NUMBERS, every: 10, from: 0, step: 10, ring: 0.99, font: 0.075, reverse: true }, rough: 0.5, metal: 0, parent: "dial" });
add({ id: "dial-face-ring", kind: "torus", r: DIAL.r - 10, tube: 0.4, segments: 96, at: [0, 0, DIAL.h], tone: "lo", edges: false, parent: "dial" });
add({ id: "dial-hub", kind: "cylinder", r: 9, h: 2, segments: 48, at: [0, 0, DIAL.h], tone: "mid", parent: "dial" });

// The hand, lying on the dial and turning with it. Palm, wrist, pod, thumb and four fingers of three hinged links.
const H = DIAL.h; // dial-local top
export const HAND = { at: [-18, 4], scale: 1.4 };
add({ id: "hand", kind: "group", at: [...HAND.at, H], scale: HAND.scale, parent: "dial" });
add({ id: "palm", kind: "box", size: [34, 30, 7], r: 5, at: [0, 0, 0.6], ...GOLD, parent: "hand" });
add({ id: "palm-plate", kind: "box", size: [24, 20, 1.2], r: 3, at: [0, 0, 7.6], ...CHROME, parent: "hand" });
for (const [i, [x, y]] of cornersOf(0, 0, 24, 20, 3).entries()) add({ id: `palm-rivet-${i}`, kind: "sphere", r: 0.7, at: [x, y, 8.8], ...GUN, edges: false, parent: "hand" });
add({ id: "wrist", kind: "cylinder", r: 7, h: 16, rot: [0, -90, 0], at: [-17, 0, 7.2], ...CHROME, parent: "hand" });
add({ id: "wrist-band", kind: "torus", r: 7.2, tube: 1, rot: [0, 90, 0], at: [-26, 0, 7.2], ...GUN, edges: false, parent: "hand" });
export const POD_AT = [-25, 0, 14.2];
add({ id: "pod", kind: "group", at: POD_AT, parent: "hand" });
add({ id: "pod-shell", kind: "lathe", profile: [[0, 0], [4.6, 0], [5.4, 1.6], [5, 5], [3, 7], [0.1, 7.6]], ...GUN, parent: "pod" });
add({ id: "pod-lens", kind: "sphere", r: 1.6, at: [0, 0, 7.4], color: "#ff8a3d", emissive: "#ff6a1a", glow: 0.8, edges: false, parent: "pod" });
export const FINGERS = [];
const LINKS = [11, 8, 6];
[-10.5, -3.5, 3.5, 10.5].forEach((y, f) => {
  const scale = [0.86, 1, 0.96, 0.8][f];
  let parent = "hand";
  let x = 17;
  LINKS.forEach((len, j) => {
    const id = `finger-${f}-${j}`;
    const l = len * scale;
    add({ id, kind: "group", at: [x, j === 0 ? y : 0, j === 0 ? 3.4 : 0], parent });
    add({ id: `${id}-knuckle`, kind: "cylinder", r: 2.8 - j * 0.3, h: 5.6 - j * 0.4, rot: [90, 0, 0], at: [0, (5.6 - j * 0.4) / 2, 0], ...GUN, parent: id });
    add({ id: `${id}-link`, kind: "cylinder", r: 2.2 - j * 0.3, h: l - 2.8, rot: [0, 90, 0], at: [1.4, 0, 0], ...GOLD, parent: id });
    if (j === 2) add({ id: `${id}-tip`, kind: "sphere", r: 2 - j * 0.3 + 0.3, at: [l - 1.2, 0, 0], ...CHROME, edges: false, parent: id });
    parent = id;
    x = l;
  });
  FINGERS.push([0, 1, 2].map((j) => `finger-${f}-${j}`));
});
add({ id: "thumb", kind: "group", at: [6, -15, 3.4], rot: [0, 0, -50], parent: "hand" });
add({ id: "thumb-knuckle", kind: "cylinder", r: 3, h: 5.6, rot: [90, 0, 0], at: [0, 2.8, 0], ...GUN, parent: "thumb" });
add({ id: "thumb-link", kind: "cylinder", r: 2.4, h: 10, rot: [0, 90, 0], at: [1.4, 0, 0], ...GOLD, parent: "thumb" });
add({ id: "thumb-tip", kind: "sphere", r: 2.4, at: [11.6, 0, 0], ...CHROME, edges: false, parent: "thumb" });
// The LED under the index fingertip, on the dial face.
add({ id: "led", kind: "cylinder", r: 2.2, h: 1, at: [HAND.at[0] + HAND.scale * (17 + 11 + 8 + 6 - 1.2), HAND.at[1] - HAND.scale * 3.5, H], lit: true, edges: false, parent: "dial" });
add({ id: "led-glow", kind: "sphere", r: 6, at: [HAND.at[0] + HAND.scale * (17 + 11 + 8 + 6 - 1.2), HAND.at[1] - HAND.scale * 3.5, H + 0.5], edges: false, parent: "dial", shader: { name: "glow", uniforms: { uColor: "#3cff8a", uLevel: 0, uPower: 2 } } });

export const scene = {
  fig: "Fig 3D",
  title: "Turning dial",
  hint: "Drag the dial · arrow keys · B breaks the pod",
  readout: "dial 0 · 0.0°",
  size: "hero",
  width: 620,
  height: 430,
  pad: 0.03,
  camera: { azimuth: 45, elevation: 34 },
  env: { intensity: 1 },
  parts,
};
