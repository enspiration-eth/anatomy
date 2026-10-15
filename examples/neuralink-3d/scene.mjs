// The Neuralink N1 implant in a cutaway of scalp, skull, meninges and cortex, as a three.js scene.
// One world unit is 0.1 mm. The section plane is y = 0: tissue lies behind it (y > 0), and the implant,
// bone flap and vessels are clipped there and drawn with hatched caps. Threads, needle and neurons are
// drawn on the section face (y < 0), and are drawn far thicker than they are (see SIMPLIFIED).
import { collector } from "../../kit/three-parts.mjs";

/** Publicly reported facts the figure uses, with their sources (cited in the caption and notes). */
export const FACTS = {
  electrodes: 1024, threads: 64, perThread: 16,          // [1], [2]: "1024 electrodes distributed across 64 threads"
  implantMm: [23, 8],                                     // [3]: 23 mm across, 8 mm tall
  needleUm: 24, needleStockUm: 40, pincherUm: 50,         // [4]: tungsten-rhenium needle etched to 24 µm; 50 µm pincher
  threadUm: [5, 50], threadThickUm: [4, 6], threadMm: 20, // [4]: threads 5–50 µm wide, 4–6 µm thick, ~20 mm long
  threadsPerMin: 6,                                       // [4]: autoinsertion of up to six threads per minute
  bandHz: [500, 5000], spikeUv: 20, powerMw: 32,          // [5]: 500 Hz–5 kHz band-pass, spikes under 20 µV, 32 mW system power
};
export const SOURCES = [
  ["[1]", "Neuralink, PRIME Study brochure", "https://neuralink.com/pdfs/PRIME-Study-Brochure.pdf"],
  ["[2]", "Neuralink, Technology (inductive charging; custom low-power chips; wireless to the app)", "https://neuralink.com/technology/"],
  ["[3]", "DongA Science, “One year after Neuralink brain implant” (23 mm × 8 mm)", "https://www.dongascience.com/en/news/70728"],
  ["[4]", "Musk & Neuralink, An Integrated Brain-Machine Interface Platform With Thousands of Channels, JMIR 2019", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6914248/"],
  ["[5]", "Neuralink Show and Tell, Fall 2022 (on-chip spike detection, 32 mW)", "https://www.youtube.com/watch?v=YreDYmXTYi4"],
  ["[6]", "The Innovation 2024, Fully implantable wireless BCI for humans (Bluetooth)", "https://www.cell.com/the-innovation/fulltext/S2666-6758(24)00033-X"],
  ["[7]", "ClinicalTrials.gov NCT06429735, PRIME", "https://www.clinicaltrials.gov/study/NCT06429735"],
];
export const SIMPLIFIED = [
  "Tissue layer thicknesses are typical adult values (scalp ~5 mm, skull ~7 mm, dura ~1 mm, cortex ~3 mm), not a patient's.",
  "16 of the 64 threads are drawn, each as one line with one recording neuron; real threads carry 16 electrodes each.",
  "Threads, needle and neurons are drawn about 10–40× thicker than they are; a 24 µm needle would be invisible at this scale.",
  "The implant's inside (battery, coil, board, chips) is a schematic layout; Neuralink has not published one.",
  "Thread depth and routing are schematic. The cursor decoder is a textbook population-vector sketch, not Neuralink's decoder.",
  "Spikes are slowed for visibility.",
];

const { parts, add } = collector();
export const W = 700, D = 260; // block across (x) and behind the cut (y)
export const Z = { white: 0, grey: 70, csf: 102, dura: 114, skull: 124, scalp: 194, top: 248 };
export const CHIP = { r: (FACTS.implantMm[0] / 2) * 10, h: FACTS.implantMm[1] * 10 };
export const SEAT = Z.skull + 2; // the implant's base, on the dura
export const FLAP_R = 175;

// A plan outline (xy) of a slab from y = 0 back to D with a half-round notch of radius r at x = 0.
const notched = (r) => {
  const arc = Array.from({ length: 25 }, (_, i) => { const a = Math.PI - (i / 24) * Math.PI; return [Math.cos(a) * r, Math.sin(a) * r]; });
  return [[-W / 2, 0], ...arc, [W / 2, 0], [W / 2, D], [-W / 2, D]];
};
// The cortex in section (xz): a gyral surface with two sulci, extruded back along y.
const surface = (x) => Z.csf - 4 + 3 * Math.sin(x / 70) - 70 * Math.exp(-(((x + 270) / 26) ** 2)) - 60 * Math.exp(-(((x - 285) / 24) ** 2));
const xs = Array.from({ length: 91 }, (_, i) => -W / 2 + (i * W) / 90);
const greyOutline = [...xs.map((x) => [x, surface(x)]), ...[...xs].reverse().map((x) => [x, Z.grey + 6 * Math.sin(x / 55) - 0.6 * (Z.csf - surface(x))])];
const whiteOutline = [[-W / 2, 0], [W / 2, 0], ...[...xs].reverse().map((x) => [x, Z.grey + 6 * Math.sin(x / 55) - 0.6 * (Z.csf - surface(x)) + 1])];

// White matter, grey matter (vertex colours: deeper is paler), CSF, dura.
add({ id: "white-matter", kind: "extrude", plane: "xz", outline: whiteOutline, depth: D, color: "#e8dccb", rough: 0.8, edges: false });
add({ id: "grey-matter", kind: "extrude", plane: "xz", outline: greyOutline, depth: D, colors: { stops: [[0, "#cf9f93"], [1, "#a8686a"]], axis: "z", range: [Z.grey - 30, Z.csf] }, rough: 0.75, edges: false });
add({ id: "csf", kind: "box", size: [W, D, Z.dura - Z.csf + 4], at: [0, D / 2, Z.csf - 4], color: "#bfe0ef", opacity: 0.28, edges: false });
add({ id: "dura", kind: "box", size: [W, D, Z.skull - Z.dura], at: [0, D / 2, Z.dura], color: "#d9c6a6", rough: 0.6 });
// Skull: inner table, diploë (spongy bone), outer table, each with the craniectomy notch; scalp with the flap notch.
add({ id: "skull-inner", kind: "extrude", outline: notched(CHIP.r + 4), depth: 16, at: [0, 0, Z.skull], color: "#efe6d2", rough: 0.6 });
add({ id: "skull-diploe", kind: "extrude", outline: notched(CHIP.r + 4), depth: 38, at: [0, 0, Z.skull + 16], color: "#d8bf8e", rough: 0.9 });
add({ id: "skull-outer", kind: "extrude", outline: notched(CHIP.r + 4), depth: 16, at: [0, 0, Z.skull + 54], color: "#f2ead8", rough: 0.55 });
add({ id: "scalp", kind: "extrude", outline: notched(FLAP_R), depth: Z.top - Z.scalp, at: [0, 0, Z.scalp], color: "#d7a58a", rough: 0.7 });

// Vessels on the cortical surface, running back from the cut: open tubes, so the lumen shows in section.
export const VESSELS = [[-262, 9, "#a83232"], [-150, 7, "#4a5aa8"], [-58, 10, "#a83232"], [52, 8, "#4a5aa8"], [148, 11, "#a83232"], [246, 7, "#4a5aa8"], [-318, 6, "#a83232"], [322, 6, "#4a5aa8"]];
VESSELS.forEach(([x, r, color], i) => add({ id: `vessel-${i}`, kind: "tube", points: [[x, 0, surface(x) + r], [x + 6, D / 2, surface(x + 6) + r], [x - 4, D, surface(x - 4) + r]], r, color, rough: 0.4, cut: true }));

// The bone flap (cut out in step 1) and the scalp flap on its hinge (folded back in steps 1-3).
add({ id: "bone-flap", kind: "cylinder", r: CHIP.r + 3, h: Z.scalp - Z.skull, segments: 64, at: [0, 0, Z.skull], color: "#eadfc6", rough: 0.6, cut: true });
add({ id: "scalp-hinge", kind: "group", at: [-FLAP_R, 0, Z.top] });
add({ id: "scalp-flap", kind: "cylinder", r: FLAP_R - 1, h: Z.top - Z.scalp, segments: 64, at: [FLAP_R, 0, -(Z.top - Z.scalp)], color: "#d7a58a", rough: 0.7, cut: true, parent: "scalp-hinge" });
// Sutures along the incision, shown once the skin is closed.
for (let i = 0; i < 6; i++) { const a = Math.PI * (0.12 + (i / 5) * 0.76); add({ id: `suture-${i}`, kind: "torus", r: 6, tube: 1.2, rot: [90, 0, (a * 180) / Math.PI], at: [Math.cos(a) * FLAP_R, Math.sin(a) * FLAP_R, Z.top + 1], color: "#2a3a8a", edges: false }); }

// The N1 implant (group, lowered in step 2): enclosure, cap, battery, charging coil, board and chips, thread exit.
add({ id: "implant", kind: "group", at: [0, 0, SEAT] });
add({ id: "n1-case", kind: "cylinder", r: CHIP.r, h: CHIP.h, segments: 72, color: "#c9ced4", metal: 0.85, rough: 0.25, cut: true, parent: "implant" });
add({ id: "n1-cap", kind: "cylinder", r: CHIP.r - 6, h: 4, segments: 72, at: [0, 0, CHIP.h], color: "#3c4148", rough: 0.4, cut: true, parent: "implant" });
add({ id: "n1-battery", kind: "cylinder", r: 72, h: 26, segments: 48, at: [0, 0, 36], color: "#6f7b88", metal: 0.5, rough: 0.4, cut: true, parent: "implant" });
add({ id: "n1-coil", kind: "torus", r: 96, tube: 4, segments: 72, at: [0, 0, 68], color: "#b5764a", metal: 0.8, rough: 0.3, cut: true, parent: "implant" });
add({ id: "n1-board", kind: "cylinder", r: 100, h: 4, segments: 64, at: [0, 0, 22], texture: { kind: "pcb", seed: 3 }, cut: true, parent: "implant" });
add({ id: "n1-asic", kind: "box", size: [44, 34, 8], r: 2, at: [-30, 18, 26], color: "#1c1e22", emissive: "#2a8cff", glow: 0, parent: "implant", lit: true });
add({ id: "n1-radio", kind: "box", size: [24, 18, 6], r: 2, at: [44, 30, 26], color: "#1c1e22", parent: "implant" });
add({ id: "n1-exit", kind: "box", size: [60, 24, 10], r: 3, at: [0, 30, -8], color: "#8a7a5a", parent: "implant" });

// Threads (16 of 64 drawn) and the neuron each one records, on the section face. Sites avoid the vessels.
// Insertion sites lie inside the craniectomy and keep clear of the vessels (checked in the tests).
export const SITES = [-104, -95, -86, -77, -38, -29, -20, -11, -2, 7, 16, 25, 71, 80, 89, 98];
const surfaceAt = SITES.map(surface);
export const THREADS = SITES.map((x, i) => {
  const x0 = x * 0.8, run = Z.csf + 6;
  const tip = surfaceAt[i] - 14 - (i % 3) * 4;
  return { id: `thread-${i}`, x, tip, points: [[x0, -2, SEAT - 4], [x0 + (x - x0) * 0.5, -2, run + 4], [x, -2, run], [x, -2, surfaceAt[i] + 1], [x, -2, tip]] };
});
THREADS.forEach((t) => add({ id: t.id, kind: "tube", points: t.points, r: 1.6, color: "#e0b84a", rough: 0.4, edges: false }));
export const NEURONS = THREADS.map((t, i) => ({ id: `neuron-${i}`, at: [t.x + (i % 2 ? 11 : -11), -3, t.tip + 4], dir: (i / THREADS.length) * Math.PI * 2 }));
NEURONS.forEach((n) => {
  add({ id: n.id, kind: "sphere", r: 4.5, at: n.at, color: "#7b3f86", rough: 0.5, edges: false });
  add({ id: `${n.id}-glow`, kind: "sphere", r: 14, at: n.at, edges: false, shader: { name: "glow", uniforms: { uColor: "#9ad8ff", uLevel: 0, uPower: 1.6 } } });
});
// Signal pulses that run up the threads (effects, moved by the live code).
THREADS.forEach((t, i) => add({ id: `pulse-${i}`, kind: "sphere", r: 6, at: t.points[4], edges: false, shader: { name: "glow", uniforms: { uColor: "#9ad8ff", uLevel: 0, uPower: 1.2 } } }));

// The R1 robot's inserter head on a gantry (step 3): beam, carriage, head, optics with six light modules, needle and pincher.
export const HEAD_Z = 400, NEEDLE_H = 140;
add({ id: "r1-post-left", kind: "cylinder", r: 12, h: 570, at: [-W / 2 - 30, 80, 0], color: "#e8e8e6", rough: 0.4 });
add({ id: "r1-post-right", kind: "cylinder", r: 12, h: 570, at: [W / 2 + 30, 80, 0], color: "#e8e8e6", rough: 0.4 });
add({ id: "r1-beam", kind: "box", size: [W + 90, 30, 24], r: 4, at: [0, 80, 570], color: "#e8e8e6", rough: 0.4 });
add({ id: "r1", kind: "group", at: [0, 0, 0] });
add({ id: "r1-carriage", kind: "box", size: [70, 40, 30], r: 4, at: [0, 70, 540], color: "#d0d0cc", parent: "r1" });
add({ id: "r1-arm", kind: "box", size: [24, 90, 20], r: 3, at: [0, 22, 546], color: "#d0d0cc", parent: "r1" });
add({ id: "r1-head", kind: "box", size: [80, 50, 140], r: 8, at: [0, -24, HEAD_Z], color: "#f4f4f2", rough: 0.35, parent: "r1" });
add({ id: "r1-lens", kind: "cylinder", r: 14, h: 18, at: [26, -24, HEAD_Z - 18], color: "#1a1d22", metal: 0.6, rough: 0.2, parent: "r1" });
for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add({ id: `r1-light-${i}`, kind: "box", size: [6, 6, 5], r: 1, at: [26 + Math.cos(a) * 22, -24 + Math.sin(a) * 22, HEAD_Z - 6], color: "#2a2a30", emissive: "#88aaff", glow: 0.6, edges: false, parent: "r1" }); }
add({ id: "r1-needle", kind: "group", at: [0, -2, 0], parent: "r1" });
add({ id: "r1-needle-wire", kind: "cylinder", r: 1.2, h: NEEDLE_H, at: [0, 0, HEAD_Z - NEEDLE_H], color: "#9aa0a6", metal: 0.9, rough: 0.2, edges: false, parent: "r1-needle" });
add({ id: "r1-needle-mount", kind: "box", size: [14, 14, 30], r: 2, at: [0, 0, HEAD_Z - 30], color: "#9aa0a6", metal: 0.8, rough: 0.3, parent: "r1-needle" });
add({ id: "r1-pincher", kind: "cylinder", r: 2, h: 110, rot: [0, 8, 0], at: [-14, -2, HEAD_Z - 110], color: "#7a7f86", metal: 0.9, rough: 0.3, edges: false, parent: "r1" });
add({ id: "r1-cable", kind: "tube", points: [[30, 70, 555], [120, 70, 590], [300, 80, 582]], r: 4, color: "#333336", edges: false, parent: "r1" });

// The wireless charger puck (step 6) and the tablet the decoded cursor appears on.
add({ id: "charger", kind: "group", at: [0, 0, 0] });
add({ id: "charger-puck", kind: "cylinder", r: 140, h: 28, segments: 64, at: [0, 0, Z.top + 40], color: "#f2f2f0", rough: 0.4, parent: "charger" });
add({ id: "charger-coil", kind: "torus", r: 100, tube: 5, segments: 64, at: [0, 0, Z.top + 40 - 2], color: "#b5764a", metal: 0.8, rough: 0.3, parent: "charger" });
add({ id: "charger-cable", kind: "tube", points: [[130, 0, Z.top + 54], [260, -10, Z.top + 90], [420, -20, Z.top + 60]], r: 4, color: "#e2e2e0", edges: false, parent: "charger" });
for (let i = 0; i < 3; i++) add({ id: `field-${i}`, kind: "torus", r: 100 - i * 18, tube: 1.6, segments: 64, at: [0, 0, Z.top + 26 - i * 24], color: "#7fd0ff", emissive: "#7fd0ff", glow: 1, opacity: 0.5, edges: false });
export const TABLET = { x: 520, y: -30, z: 0, w: 260, h: 180 };
add({ id: "tablet-stand", kind: "box", size: [80, 60, 6], r: 3, at: [TABLET.x, TABLET.y + 20, 0], color: "#3a3d42" });
add({ id: "tablet-prop", kind: "box", size: [20, 12, 70], r: 3, rot: [-18, 0, 0], at: [TABLET.x, TABLET.y + 40, 4], color: "#3a3d42" });
add({ id: "tablet", kind: "box", size: [TABLET.w, 10, TABLET.h], r: 10, rot: [-12, 0, 0], at: [TABLET.x, TABLET.y, 6], color: "#2a2d32", metal: 0.3, rough: 0.4 });
add({ id: "tablet-screen", kind: "plane", size: [TABLET.w - 20, TABLET.h - 20], screen: [520, 360], rot: [78, 0, 0], at: [TABLET.x, TABLET.y - 5.2 - Math.sin((12 * Math.PI) / 180) * (TABLET.h / 2), 6 + Math.cos((12 * Math.PI) / 180) * (TABLET.h / 2)] });
// Radio packets from the implant to the tablet (effects).
for (let i = 0; i < 4; i++) add({ id: `packet-${i}`, kind: "sphere", r: 9, at: [0, -4, Z.top], edges: false, shader: { name: "glow", uniforms: { uColor: "#ffd27a", uLevel: 0, uPower: 1.4 } } });

export const STEPS = [
  { name: "Intact", text: "scalp · skull 7 mm · dura · cortex 3 mm" },
  { name: "Craniectomy", text: "scalp flap back · a 23 mm disc of bone out" },
  { name: "Threads inserted", text: "R1 needle 24 µm · 64 threads · vessels avoided" },
  { name: "Implant seated", text: "N1 in the opening · 23 × 8 mm" },
  { name: "Closed", text: "skin closed over it · invisible from outside" },
  { name: "Recording", text: "1024 electrodes · spikes found on chip · Bluetooth" },
  { name: "Charging", text: "inductive charger over the scalp" },
];

export const scene = {
  fig: "Fig 5",
  title: "Neuralink N1, in section",
  hint: "← → or 1–7 for the steps",
  readout: "1/7 · Intact · scalp · skull 7 mm · dura · cortex 3 mm",
  size: "hero",
  width: 820,
  height: 560,
  pad: 0.02,
  camera: { azimuth: 18, elevation: 22 },
  section: { axis: "y", at: 0 },
  env: { intensity: 0.7 },
  parts,
};
