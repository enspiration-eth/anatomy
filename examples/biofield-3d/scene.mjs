// The body's measured electromagnetic fields, as a three.js scene. One world unit is 1 mm; the body stands at
// the origin facing -y. Field lines are drawn for the heart (magnetocardiography, MCG) and the brain
// (magnetoencephalography, MEG); the skin carries the heart's surface potential (the ECG); a nerve carries
// action potentials to an arm muscle (EMG); the Earth's field crosses the room for scale. Only measured physics.
import { collector } from "../../kit/three-parts.mjs";
import { BODY_SHAPES, HEART, OCCIPITAL, CHEST_FRONT, ARM_NERVE } from "./body.mjs";
export { HEART, OCCIPITAL, CHEST_FRONT, ARM_NERVE };

export const FACTS = {
  heartPt: [10, 100],          // [1] MCG peak about 10–100 pT near the chest
  heartPeakPtAt10mm: 100,      // [2] 100 pT peak with the sensor 10 mm from the chest
  falloff: { d: [20, 40, 60, 80], rel: [1, 0.7, 0.51, 0.38] }, // [3] KRISS 64-channel MCG: R-peak vs sensor distance
  brainFt: { cortical: 10, alpha: 1000 }, // [4] MEG: ~10 fT cortical activity, ~10³ fT alpha rhythm
  urbanFt: 1e8,                // [4] urban magnetic noise ~10⁸ fT (0.1 µT)
  earthUt: [25, 65],           // [5] Earth's surface field 25–65 µT
  fridgeUt: 10000,             // [5] a strong refrigerator magnet ~10,000 µT
  mriT: [1.5, 3],              // [6] clinical MRI 1.5 and 3 T
  squidFt: 3,                  // [7] SQUID noise ~3 fT/√Hz in a shielded room
  ecgMv: 1,                    // [8] the R wave is about 1 mV at the skin (0.1 mV per small box)
  emgMv: 10,                   // [9] surface EMG 0–10 mV peak-to-peak before amplification
  nerveMs: [50, 60],           // [10] nerve conduction velocity 50–60 m/s
};
export const SOURCES = [
  ["[1]", "Mahmoud et al., Harnessing the Heart's Magnetic Field for Advanced Diagnostic Techniques, Sensors 2024 (10–100 pT)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC11435997/"],
  ["[2]", "Uchiyama et al., Off-diagonal magnetoimpedance gradiometer for magnetocardiography, AIP Advances 2017 (100 pT at 10 mm)", "https://doi.org/10.1063/1.4975128"],
  ["[3]", "Kim et al., Signal amplitude ratio of magnetocardiogram between sensor assembly and chest surface, IEEE Trans. Magn. 2009", "https://doi.org/10.1109/tmag.2009.2018875"],
  ["[4]", "Wikipedia, Magnetoencephalography (10 fT cortical, 10³ fT alpha, urban noise 10⁸ fT)", "https://en.wikipedia.org/wiki/Magnetoencephalography"],
  ["[5]", "Wikipedia, Earth's magnetic field (25–65 µT; refrigerator magnet ~10 mT)", "https://en.wikipedia.org/wiki/Earth%27s_magnetic_field"],
  ["[6]", "Wikipedia, Magnetic resonance imaging (clinical 1.5 T and 3 T)", "https://en.wikipedia.org/wiki/Magnetic_resonance_imaging"],
  ["[7]", "Erné, Biomagnetism, Europhysics News 1984 (3 fT/√Hz SQUID noise in a shielded room)", "https://www.europhysicsnews.org/articles/epn/pdf/1984/07/epn19841507p11.pdf"],
  ["[8]", "Wikipedia, Electrocardiography (0.1 mV per small box)", "https://en.wikipedia.org/wiki/Electrocardiography"],
  ["[9]", "De Luca, The use of surface electromyography in biomechanics, J. Appl. Biomech. 1997", "https://doi.org/10.1123/jab.13.2.135"],
  ["[10]", "Wikipedia, Nerve conduction velocity (normally 50–60 m/s)", "https://en.wikipedia.org/wiki/Nerve_conduction_velocity"],
];
export const SIMPLIFIED = [
  "The heart is modelled as one current dipole that swings through the P wave, the QRS complex and the T wave. Its magnetic field lines are circles about the dipole axis (the Biot–Savart law), with the return currents in the torso left out.",
  "The skin potential map assumes the same dipole sitting in a uniform conductor. Real torsos have lungs and bone, so measured maps are less symmetric.",
  "Fall-off with distance uses a dipole curve fitted to the KRISS measurements (an effective source depth of 139 mm). It matches 70%, 51% and 38% at 40, 60 and 80 mm.",
  "The brain is one alpha-rhythm dipole in the visual cortex oscillating at 10 Hz. Real MEG sees many sources.",
  "Line brightness is on a display scale, not to scale between sources. The log chart gives the true ratios: the Earth's field is about a million times the heart's.",
  "The 1.75 m body is a smooth implicit surface (not an anatomical scan). The nerve path is schematic. Time is slowed so the beat, the alpha rhythm and the nerve impulse can be followed.",
  "No 'aura': everything drawn here has been measured with electrodes or magnetometers. The fields are far too weak to sense without instruments in a shielded room.",
];

/** Heart field in pT at distance d (mm) from the chest: dipole fall-off fitted to [3], scaled to 100 pT at 10 mm [2]. */
export const DEPTH = 139;
export const heartPtAt = (d) => FACTS.heartPeakPtAt10mm * ((10 + DEPTH) / (DEPTH + Math.max(0, d))) ** 3;

/** The heart's current dipole over one beat (relative units, |p| = 1 at the R peak). Frontal axis +60°. */
export function heartDipole(t, T = 60 / 72) {
  const g = (m, w) => Math.exp(-((((t % T) - m) / w) ** 2));
  const dir = (deg, y = -0.15) => { const a = (deg * Math.PI) / 180; return [Math.cos(a), y, -Math.sin(a)]; };
  const parts = [[g(0.09, 0.035) * 0.12, dir(55)], [g(0.195, 0.008) * 0.12, dir(-150, 0.2)], [g(0.215, 0.012) * 1.0, dir(60)], [g(0.238, 0.01) * 0.25, dir(-100, 0.3)], [g(0.45, 0.055) * 0.3, dir(45)]];
  const p = [0, 0, 0];
  for (const [a, d] of parts) for (let i = 0; i < 3; i++) p[i] += a * d[i];
  return p;
}
/** Lead II (right arm to left leg) as the dipole's projection on its axis, +60° in the frontal plane. */
export const leadII = (p) => p[0] * 0.5 + -p[2] * 0.866;

const { parts, add } = collector();
add({ id: "body", kind: "implicit", shapes: BODY_SHAPES, cell: 4, blend: 20, relax: 2, color: "#e2bfa3", rough: 0.48, material: { sheen: 0.6, clearcoat: 0.06 }, edges: false });
add({ id: "plinth", kind: "cylinder", r: 430, h: 40, segments: 96, at: [0, 0, -52], texture: { kind: "brushed", seed: 7 }, metal: 0.7, rough: 0.4 });
add({ id: "plinth-rim", kind: "torus", r: 430, tube: 6, segments: 128, at: [0, 0, -12], color: "#9aa0a8", metal: 0.85, rough: 0.25 });

// Electrode placement: find the skin along a ray using the same field the mesher uses.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
import { shapeDistance } from "../../kit/three-looks.js";
export const skinDistance = (x, y, z) => BODY_SHAPES.reduce((d, s) => smin(d, shapeDistance(s, x, y, z), s[0] === "ellipsoid" ? s[3] ?? 20 : s[5] ?? 20), 1e9);
export function onSkin(from, dir) {
  const l = Math.hypot(...dir), u = dir.map((v) => v / l);
  let t = 0;
  for (let i = 0; i < 200; i++) { const d = skinDistance(from[0] + u[0] * t, from[1] + u[1] * t, from[2] + u[2] * t); if (d < 0.2) break; t += Math.max(0.5, d * 0.8); }
  return [from[0] + u[0] * t, from[1] + u[1] * t, from[2] + u[2] * t];
}
// A pad facing outward along the horizontal direction (dx, dy): group turned about z, pad turned to face -y.
let padN = 0;
function pad(id, at, dx, dy, r, color) {
  const az = (Math.atan2(dx, -dy) * 180) / Math.PI;
  add({ id: `${id}-mount`, kind: "group", at, rot: [0, 0, az] });
  add({ id, kind: "cylinder", r, h: 3, segments: 32, rot: [90, 0, 0], at: [0, -0.5, 0], color, rough: 0.5, parent: `${id}-mount` });
  padN++;
}
// The ten ECG electrodes: limbs (RA, LA, RL, LL) and the six chest leads V1–V6.
export const ECG_SITES = {
  RA: [[-300, 200, 905], [0, -1, 0]], LA: [[300, 200, 905], [0, -1, 0]], RL: [[-90, 200, 150], [0, -1, 0]], LL: [[90, 200, 150], [0, -1, 0]],
  V1: [[-22, 0, 1268], [0, -1, 0]], V2: [[22, 0, 1268], [0, -1, 0]], V3: [[52, 0, 1240], [0, -1, 0]], V4: [[78, 0, 1215], [0.1, -1, 0]], V5: [[118, 0, 1215], [0.6, -1, 0]], V6: [[150, 0, 1215], [1, -0.2, 0]],
};
for (const [name, [p, d]] of Object.entries(ECG_SITES)) {
  const from = name.length === 2 && name[0] === "V" ? [p[0], -400, p[2]] : [p[0], -400, p[2]];
  const ray = name === "V6" ? [[400, p[1] + 10, p[2]], [-1, 0.2, 0]] : name === "V5" ? [[p[0] + 200, -340, p[2]], [-0.6, 1, 0]] : [from, [0, 1, 0]];
  const s = onSkin(ray[0], ray[1]);
  pad(`ecg-${name.toLowerCase()}`, s, -ray[1][0], -ray[1][1], 11, "#f4f4ee");
}
// EMG: a bipolar pair and a reference on the right forearm, over the flexors.
for (const [i, z] of [1060, 1010, 940].entries()) { const s = onSkin([-290, -300, z], [0, 1, 0]); pad(`emg-${i}`, s, 0, -1, i === 2 ? 9 : 8, i === 2 ? "#d8d8d0" : "#c8b28a"); }

// MCG: a SQUID dewar in front of the chest on a stand, moved by the distance slider. 25 pick-up coils at its tip.
export const DEWAR = { r: 90, len: 360 };
add({ id: "mcg", kind: "group", at: [CHEST_FRONT[0], CHEST_FRONT[1] - 10, CHEST_FRONT[2]] });
add({ id: "dewar", kind: "cylinder", r: DEWAR.r, h: DEWAR.len, segments: 96, rot: [90, 0, 0], at: [0, -12, 0], color: "#e8eaee", metal: 0.2, rough: 0.35, parent: "mcg" });
add({ id: "dewar-tip", kind: "cylinder", r: DEWAR.r - 6, h: 10, segments: 96, rot: [90, 0, 0], at: [0, -1, 0], color: "#b9c2cc", metal: 0.6, rough: 0.3, parent: "mcg" });
add({ id: "dewar-cap", kind: "cylinder", r: DEWAR.r + 8, h: 30, segments: 96, rot: [90, 0, 0], at: [0, -12 - DEWAR.len, 0], color: "#6e7680", metal: 0.8, rough: 0.3, parent: "mcg" });
add({ id: "dewar-post", kind: "cylinder", r: 18, h: CHEST_FRONT[2] - 100 + 52, at: [0, -260, -CHEST_FRONT[2] - 52 + 100], color: "#9aa0a8", metal: 0.85, rough: 0.25, parent: "mcg" });
add({ id: "dewar-base", kind: "box", size: [260, 300, 26], r: 6, at: [0, -260, -CHEST_FRONT[2] - 52 + 100 - 13 + 13], color: "#5a626c", metal: 0.6, rough: 0.4, parent: "mcg" });
add({ id: "dewar-arm", kind: "box", size: [40, 230, 40], r: 8, at: [0, -150, 0], color: "#9aa0a8", metal: 0.85, rough: 0.25, parent: "mcg" });
export const COILS = [];
for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = (i - 2) * 30, z = (j - 2) * 30; COILS.push([x, z]); add({ id: `coil-${i}-${j}`, kind: "torus", r: 9, tube: 2.2, segments: 32, rot: [90, 0, 0], at: [x, -7, z], color: "#c87a3a", metal: 0.9, rough: 0.3, parent: "mcg" }); }
// MEG: a helmet of sensors round the head.
export const HEAD = [0, 4, 1640], HELMET_R = 150;
add({ id: "meg-helmet", kind: "sphere", r: HELMET_R, segments: 96, at: HEAD, color: "#dfe6ee", opacity: 0.16, edges: false });
export const MEG_SENSORS = [];
for (const [el, n] of [[18, 12], [48, 10], [78, 4]]) for (let k = 0; k < n; k++) MEG_SENSORS.push([el, (k / n) * 360 + (el === 48 ? 18 : 0)]);
MEG_SENSORS.forEach(([el, az], i) => {
  add({ id: `meg-az-${i}`, kind: "group", at: HEAD, rot: [0, 0, az] });
  add({ id: `meg-el-${i}`, kind: "group", rot: [0, 90 - el, 0], parent: `meg-az-${i}` });
  add({ id: `meg-sensor-${i}`, kind: "cylinder", r: 9, h: 26, segments: 24, at: [0, 0, HELMET_R], color: "#c87a3a", metal: 0.8, rough: 0.35, parent: `meg-el-${i}` });
});
// A compass on the plinth: the Earth's field is what turns it.
add({ id: "compass", kind: "cylinder", r: 46, h: 14, segments: 64, at: [260, -230, -12], color: "#2c3036", metal: 0.6, rough: 0.35 });
add({ id: "compass-card", kind: "cylinder", r: 40, h: 2, segments: 64, at: [260, -230, 2], color: "#f2efe6", rough: 0.6 });
add({ id: "compass-needle", kind: "box", size: [6, 70, 3], r: 1.5, at: [260, -230, 5], color: "#c8322a", metal: 0.4, rough: 0.4 });
// The monitor with the log-scale chart and the ECG/EMG traces.
export const MONITOR = { x: -680, z: 1080, w: 520, h: 640 };
add({ id: "monitor", kind: "box", size: [MONITOR.w + 30, 20, MONITOR.h + 30], r: 10, at: [MONITOR.x, 30, MONITOR.z - (MONITOR.h + 30) / 2], color: "#23262b", rough: 0.4 });
add({ id: "monitor-post", kind: "cylinder", r: 16, h: MONITOR.z - MONITOR.h / 2 + 52, at: [MONITOR.x, 44, -52], color: "#23262b", metal: 0.5, rough: 0.4 });
add({ id: "monitor-foot", kind: "box", size: [220, 160, 16], r: 6, at: [MONITOR.x, 44, -44], color: "#23262b", metal: 0.5, rough: 0.4 });
add({ id: "monitor-screen", kind: "plane", size: [MONITOR.w, MONITOR.h], screen: [520, 640], rot: [90, 0, 0], at: [MONITOR.x, 19, MONITOR.z] });

// Field lines (effects). Heart: rings about the dipole axis in a group the live code turns with the dipole.
const ring = (rad, h, n = 72) => Array.from({ length: n + 1 }, (_, i) => [rad * Math.cos((i / n) * Math.PI * 2), rad * Math.sin((i / n) * Math.PI * 2), h]);
export const HEART_RINGS = [];
add({ id: "heart-field", kind: "group", at: HEART });
for (const h of [-90, -30, 30, 90]) for (const rad of [60, 110, 170, 240, 320]) {
  const id = `hf-${h}-${rad}`, s = rad / (rad * rad + h * h) ** 1.5;
  HEART_RINGS.push({ id, s });
  add({ id, kind: "tube", points: ring(rad, h), r: 6, edges: false, shader: { name: "fieldline", uniforms: { uColor: "#ff6a3a", uLevel: 0.6, uSpeed: 0.6, uDash: Math.round(rad / 22) } }, parent: "heart-field" });
}
const smax = Math.max(...HEART_RINGS.map((r) => r.s));
HEART_RINGS.forEach((r) => (r.s = Math.min(1, 0.25 + 0.75 * Math.pow(r.s / smax, 0.3))));
export const BRAIN_RINGS = [];
add({ id: "brain-field", kind: "group", at: OCCIPITAL, rot: [90, 0, 0] });
for (const h of [-14, 14]) for (const rad of [26, 50, 80, 115]) { const id = `bf-${h}-${rad}`; BRAIN_RINGS.push({ id, s: Math.min(1, Math.pow(26 / rad, 0.6)) }); add({ id, kind: "tube", points: ring(rad, h, 48), r: 3, edges: false, shader: { name: "fieldline", uniforms: { uColor: "#7ad0ff", uLevel: 0.5, uSpeed: 0.8, uDash: Math.round(rad / 14) } }, parent: "brain-field" }); }
// Earth: parallel lines dipping at about 70° (mid-latitude, northern hemisphere), across the room.
const dip = (70 * Math.PI) / 180;
export const EARTH_LINES = [-480, -240, 0, 240, 480].map((x, i) => `earth-${i}`);
[-480, -240, 0, 240, 480].forEach((x, i) => add({ id: `earth-${i}`, kind: "tube", points: [[x, 260, 1820], [x, 260 + 1880 / Math.tan(dip), -10]], r: 5, edges: false, shader: { name: "fieldline", uniforms: { uColor: "#8fe08a", uLevel: 0.5, uSpeed: 0.25, uDash: 14 } } }));
// Nerve and EMG: the right median nerve (schematic) carries impulses to the forearm flexors.
add({ id: "nerve", kind: "tube", points: ARM_NERVE, r: 2.2, edges: false, shader: { name: "fieldline", uniforms: { uColor: "#ffe07a", uLevel: 0.35, uSpeed: 1.2, uDash: 18 } } });
for (let i = 0; i < 3; i++) add({ id: `impulse-${i}`, kind: "sphere", r: 14, at: ARM_NERVE[0], edges: false, shader: { name: "glow", uniforms: { uColor: "#ffe07a", uLevel: 0, uPower: 1.4 } } });
add({ id: "muscle-glow", kind: "sphere", r: 60, at: [-284, -4, 1030], edges: false, shader: { name: "glow", uniforms: { uColor: "#ffd060", uLevel: 0, uPower: 2 } } });
add({ id: "heart-glow", kind: "sphere", r: 48, at: HEART, edges: false, shader: { name: "glow", uniforms: { uColor: "#ff5a3a", uLevel: 0, uPower: 1.6 } } });
add({ id: "probe-mark", kind: "sphere", r: 7, at: [CHEST_FRONT[0], CHEST_FRONT[1] - 10, CHEST_FRONT[2]], color: "#ffcf4a", emissive: "#ffb020", glow: 0.6, lit: true });

export const scene = {
  fig: "Fig 9",
  title: "The body's electromagnetic fields, measured",
  hint: "1–5 toggle sources · ← → move the sensor · Space pauses",
  readout: "Heart 100 pT at 10 mm · Earth 50 µT is 500,000× stronger",
  size: "hero",
  width: 880,
  height: 720,
  pad: 0.03,
  camera: { azimuth: 28, elevation: 10 },
  env: { intensity: 0.9 },
  parts,
};
