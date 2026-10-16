// A four-loop pressurized water reactor (PWR), one loop drawn, as a three.js scene. One world unit is 10 cm.
// The section plane is y = 0: the containment, reactor vessel, steam generator and pressurizer are cut there
// and hatched; the core is a clipped volume painted by power density. Everything outside the containment
// (turbine hall, condenser, cooling tower) is whole.
import { collector } from "../../kit/three-parts.mjs";

export const FACTS = {
  // [1] MIT 22.06 Engineering of Nuclear Systems, lecture 6a (Westinghouse 4-loop reference plant)
  mwt: 3411, mwe: 1150, eff: 34, mpa: 15.51, tIn: 292.7, rise: 33.4, assemblies: 193, rodsPer: 264, lattice: 17, rods: 50952, rccas: 53, absorbersPer: 24, rodOdMm: 9.5,
  // [2] Westinghouse, The Westinghouse Pressurized Water Reactor Nuclear Power Plant: 2250 psia, vessel outlet 618.5 °F
  psia: 2250, tOut: 325.8,
  // [3] US NRC, Reactor Concepts / for educators ch. 4: four loops, 4 steam generators, 4 pumps, 1 pressurizer; vessel ID 173 in
  loops: 4, vesselIdIn: 173,
};
export const SOURCES = [
  ["[1]", "MIT OCW 22.06 Engineering of Nuclear Systems (2010), lecture 6a: reference PWR data", "https://ocw.mit.edu/courses/22-06-engineering-of-nuclear-systems-fall-2010/121722cb9a63f6816e0117b239ffb13a_MIT22_06F10_lec06a.pdf"],
  ["[2]", "Westinghouse, The Westinghouse Pressurized Water Reactor Nuclear Power Plant (1984)", "https://www.xylenepower.com/the_westinghouse_pressurized_water_react.pdf"],
  ["[3]", "US NRC, Pressurized Water Reactor Systems (educators' reference, chapter 4)", "https://www.nrc.gov/reading-rm/basic-ref/students/for-educators/04.pdf"],
  ["[4]", "Wikipedia, Cherenkov radiation (the blue glow of a water-cooled core)", "https://en.wikipedia.org/wiki/Cherenkov_radiation"],
];
export const SIMPLIFIED = [
  "One of the four coolant loops is drawn; the other three (each with its own steam generator and pump) are left out.",
  "The containment is compressed and the turbine hall pulled close; the reactor vessel is drawn at true size (4.4 m inside), the steam generator shortened.",
  "Fuel rods are drawn about four times thicker and far fewer than the 50,952 real ones; one control-rod cluster stands for all 53.",
  "Power follows rod position through a smooth curve with a few seconds' lag. A real core's response depends on boron, xenon and temperature feedback, and operators don't run it on rods alone.",
  "Coolant flow is held constant, so the core temperature rise scales with power, with cold-leg temperature fixed at 292.7 °C. Real plants follow a temperature program.",
  "Electrical output is taken as proportional to thermal power. The turbine turns at constant synchronous speed whatever the load.",
  "Cherenkov light is only seen in open pools, such as a reactor during refuelling. A sealed, operating PWR vessel is dark inside. The glow here shows the physics.",
];

/** Steady-state plant numbers for relative power p (0..1). */
export function plantAt(p) {
  const tHot = FACTS.tIn + FACTS.rise * p;
  return { tHot, tCold: FACTS.tIn, mpa: FACTS.mpa, mwt: FACTS.mwt * p, mwe: FACTS.mwe * p };
}
/** Target relative power for rod insertion 0 (withdrawn) .. 1 (fully in). Never below decay-heat-ish 2%. */
export const powerFor = (ins) => Math.max(0.02, Math.cos((Math.min(1, Math.max(0, ins)) * Math.PI) / 2) ** 1.6);

const { parts, add } = collector();
export const V = { x: -70, r: 22, wall: 2.2, bottom: 20, top: 140 }; // vessel inside radius 2.2 m [3]
export const CORE = { r: 17, z0: 42, h: 37 }; // 3.66 m active height
export const SG = { x: 85, r: 18, z0: 40, h: 170 };
export const PZR = { x: 20, r: 9, z0: 70, h: 120 };
export const CONT = { r: 175, wall: 12, h: 230 };
export const ROD_TRAVEL = CORE.h + 2;

// Containment: a concrete cylinder and hemispherical dome on a basemat, cut and hatched.
const dome = Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * Math.PI / 2; return [Math.cos(a), Math.sin(a)]; });
add({ id: "containment", kind: "lathe", segments: 96, profile: [[CONT.r + CONT.wall, 0], [CONT.r + CONT.wall, CONT.h], ...dome.slice(1).map(([c, s]) => [(CONT.r + CONT.wall) * c, CONT.h + (CONT.r + CONT.wall) * s * 0.55]), ...[...dome].reverse().map(([c, s]) => [CONT.r * c, CONT.h + CONT.r * s * 0.55 - 0.01]), [CONT.r, 10], [0, 10]].filter((p, i, a) => i === 0 || !(p[0] === a[i - 1][0] && p[1] === a[i - 1][1])), texture: { kind: "concrete", seed: 5 }, rough: 0.9, cut: true, hatch: "#8a8a84" });
add({ id: "liner", kind: "lathe", segments: 96, profile: [[CONT.r - 0.1, 10], [CONT.r - 0.1, CONT.h], [CONT.r - 0.6, CONT.h], [CONT.r - 0.6, 10]], color: "#9aa0a6", metal: 0.8, rough: 0.4, cut: true });
add({ id: "basemat", kind: "cylinder", r: CONT.r + 40, h: 10, segments: 96, at: [0, 0, -5], texture: { kind: "concrete", seed: 9 }, rough: 0.95 });
add({ id: "polar-crane", kind: "box", size: [CONT.r * 1.8, 8, 8], at: [0, 40, CONT.h + 10], color: "#d9a730", metal: 0.4, rough: 0.5 });
add({ id: "crane-trolley", kind: "box", size: [18, 14, 8], at: [V.x, 40, CONT.h + 2], color: "#d9a730", metal: 0.4, rough: 0.5 });

// Reactor vessel, head, internals, core.
const vprof = [[0, V.bottom - V.wall - 10], [V.r * 0.7, V.bottom - V.wall - 7], [V.r + V.wall, V.bottom], [V.r + V.wall, V.top], [V.r - 0.01, V.top], [V.r, V.bottom + 1], [V.r * 0.7, V.bottom - 7], [0, V.bottom - 10]];
add({ id: "vessel", kind: "lathe", segments: 96, profile: vprof, texture: { kind: "brushed", seed: 3 }, color: "#7f868e", metal: 0.85, rough: 0.35, cut: true, hatch: "#c9ced4" });
add({ id: "vessel-head", kind: "lathe", segments: 96, profile: [[V.r + V.wall + 4, V.top], [V.r + V.wall + 4, V.top + 5], [V.r, V.top + 9], [V.r * 0.6, V.top + 15], [0, V.top + 16], [0, V.top + 14], [V.r * 0.58, V.top + 13], [V.r - 2, V.top + 6.5], [V.r - 2, V.top]], color: "#7f868e", texture: { kind: "brushed", seed: 4 }, metal: 0.85, rough: 0.35, cut: true, hatch: "#c9ced4" });
add({ id: "core-barrel", kind: "lathe", segments: 96, profile: [[CORE.r + 2.6, 30], [CORE.r + 2.6, V.top - 8], [CORE.r + 1.8, V.top - 8], [CORE.r + 1.8, 30]], color: "#b8bec4", metal: 0.8, rough: 0.3, cut: true });
const coreProf = Array.from({ length: 41 }, (_, i) => [CORE.r, CORE.z0 + (i / 40) * CORE.h]);
add({ id: "core", kind: "lathe", segments: 96, profile: [[0, CORE.z0], ...coreProf, [0, CORE.z0 + CORE.h]], colors: { ramp: "heat", axis: "z", range: [CORE.z0, CORE.z0 + CORE.h] }, rough: 0.5, cut: "solid" });
add({ id: "lower-plate", kind: "cylinder", r: CORE.r + 1.6, h: 2, segments: 64, at: [V.x, 0, CORE.z0 - 2], color: "#b8bec4", metal: 0.8, rough: 0.3 });
add({ id: "upper-plate", kind: "cylinder", r: CORE.r + 1.6, h: 2, segments: 64, at: [V.x, 0, CORE.z0 + CORE.h + 2], color: "#b8bec4", metal: 0.8, rough: 0.3 });
// Lathe parts are drawn about their own origin, so the vessel family sits at V.x.
for (const p of parts.filter((q) => ["vessel", "vessel-head", "core-barrel", "core"].includes(q.id))) p.at = [V.x, 0, 0];
// Fuel rods: a row standing in the clipped core, drawn thicker than true.
export const RODS = Array.from({ length: 27 }, (_, i) => -CORE.r + 0.9 + i * ((2 * CORE.r - 1.8) / 26));
add({ id: "fuel-rods", kind: "instances", shape: "cylinder", r: 0.32, h: CORE.h, items: RODS.flatMap((x, i) => [[V.x + x, 1.2, CORE.z0 + CORE.h / 2], [V.x + x + 0.6, 6 + (i % 3), CORE.z0 + CORE.h / 2]]), color: "#a9b0b8", metal: 0.6, rough: 0.35 });
add({ id: "grid-spacers", kind: "instances", shape: "box", size: [2 * CORE.r - 1, 0.6, 0.7], items: Array.from({ length: 7 }, (_, i) => [V.x, 1.4, CORE.z0 + 3 + i * 5.2]), color: "#d0b070", metal: 0.7, rough: 0.35 });
// Cherenkov glow filling the water around and through the core (effect).
add({ id: "cherenkov", kind: "cylinder", r: CORE.r + 1.5, h: CORE.h + 6, segments: 64, at: [V.x, 0, CORE.z0 + CORE.h / 2], shader: { name: "cherenkov", uniforms: { uLevel: 1, uColor: "#3aa8ff" } } });
// The control-rod cluster: absorber rods hanging from a spider, driven through the head. Dragged in z.
export const ABSORBERS = [-13.5, -10.1, -6.7, -3.4, 0.3, 3.7, 7.1, 10.4, 13.8];
add({ id: "rcca", kind: "group", at: [V.x, 0, 0] });
for (const [i, x] of ABSORBERS.entries()) add({ id: `absorber-${i}`, kind: "cylinder", r: 0.42, h: CORE.h, at: [x, 2.6, CORE.z0 + CORE.h / 2], color: "#3b3f45", metal: 0.6, rough: 0.4, parent: "rcca" });
add({ id: "spider", kind: "box", size: [2 * CORE.r - 4, 2, 1.5], r: 0.5, at: [0, 2.6, CORE.z0 + CORE.h + 0.8], color: "#c8ccd2", metal: 0.85, rough: 0.25, parent: "rcca" });
add({ id: "drive-shaft", kind: "cylinder", r: 0.8, h: 120, at: [0, 2.6, CORE.z0 + CORE.h + 61], color: "#c8ccd2", metal: 0.85, rough: 0.25, parent: "rcca" });
add({ id: "drive-handle", kind: "sphere", r: 4, at: [0, 2.6, CORE.z0 + CORE.h + 121], color: "#e0b020", emissive: "#e0b020", glow: 0.25, lit: true, parent: "rcca" });
for (let i = 0; i < 7; i++) add({ id: `crdm-${i}`, kind: "cylinder", r: 1.6, h: 32, at: [V.x - 15 + i * 5, 8, V.top + 30], color: "#9aa0a6", metal: 0.8, rough: 0.35 });
add({ id: "crdm-shroud", kind: "cylinder", r: 20, h: 3, segments: 64, at: [V.x, 8, V.top + 48], color: "#7f868e", metal: 0.7, rough: 0.4 });

// Primary loop: hot leg to the steam generator, U-tubes, cold leg through the pump back to the vessel.
const flow = (id, points, r, a, b, extra = {}) => add({ id, kind: "tube", points, r, shader: { name: "flow", uniforms: { uA: a, uB: b, uSpeed: 0.8, uStripes: 14, uLevel: 1, ...extra } } });
export const HOT = "#e05a2a", COLD = "#d8a040";
flow("hot-leg", [[V.x + V.r + V.wall, 14, 112], [0, 16, 108], [SG.x - 12, 16, SG.z0 + 4], [SG.x - 8, 12, SG.z0 + 6]], 4.2, HOT, HOT);
flow("cold-leg", [[SG.x + 8, 14, SG.z0 + 6], [SG.x + 10, 30, 22], [40, 34, 20], [PZR.x - 30, 30, 30]], 3.8, COLD, COLD);
flow("pump-discharge", [[PZR.x - 30, 30, 30], [V.x + 40, 20, 100], [V.x + V.r + V.wall, 14, 104]], 3.8, COLD, COLD);
flow("surge-line", [[0, 16, 108], [PZR.x, 14, 80], [PZR.x, 6, PZR.z0 + 1]], 1.4, HOT, HOT);
export const UTUBES = [5, 9, 13];
for (const [i, w] of UTUBES.entries()) flow(`u-tube-${i}`, [[SG.x - w, 3 + i, SG.z0 + 12], [SG.x - w, 3 + i, SG.z0 + 80 + w * 2], [SG.x, 3 + i, SG.z0 + 82 + w * 3.4], [SG.x + w, 3 + i, SG.z0 + 80 + w * 2], [SG.x + w, 3 + i, SG.z0 + 12]], 1.1, HOT, COLD, { uStripes: 22 });
add({ id: "pump", kind: "cylinder", r: 9, h: 22, segments: 48, at: [PZR.x - 30, 30, 34], color: "#5a7a9a", metal: 0.6, rough: 0.4 });
add({ id: "pump-motor", kind: "cylinder", r: 7, h: 20, segments: 48, at: [PZR.x - 30, 30, 55], color: "#3e5872", metal: 0.5, rough: 0.45 });
add({ id: "pump-flywheel", kind: "cylinder", r: 8.5, h: 3, segments: 48, at: [PZR.x - 30, 30, 67], color: "#8a9098", metal: 0.85, rough: 0.3 });
// Steam generator shell, tube sheet, separators and dryers; cut and hatched.
add({ id: "sg-shell", kind: "lathe", segments: 96, profile: [[0, SG.z0 - 6], [SG.r * 0.8, SG.z0 - 4], [SG.r, SG.z0 + 2], [SG.r, SG.z0 + 105], [SG.r + 8, SG.z0 + 125], [SG.r + 8, SG.z0 + SG.h - 12], [SG.r * 0.6, SG.z0 + SG.h], [0, SG.z0 + SG.h + 1], [0, SG.z0 + SG.h - 1], [SG.r * 0.58, SG.z0 + SG.h - 2.5], [SG.r + 6.5, SG.z0 + SG.h - 13], [SG.r + 6.5, SG.z0 + 125.5], [SG.r - 1.5, SG.z0 + 106], [SG.r - 1.5, SG.z0 + 2.5], [SG.r * 0.78, SG.z0 - 2.5], [0, SG.z0 - 4.5]], at: [SG.x, 0, 0], color: "#8a9198", texture: { kind: "brushed", seed: 6 }, metal: 0.8, rough: 0.35, cut: true, hatch: "#c9ced4" });
add({ id: "tube-sheet", kind: "cylinder", r: SG.r - 1.5, h: 5, segments: 64, at: [SG.x, 0, SG.z0 + 9], color: "#b0b6bc", metal: 0.8, rough: 0.3, cut: true });
add({ id: "divider-plate", kind: "box", size: [1, 2 * SG.r - 6, 9], at: [SG.x, 0, SG.z0 + 2], color: "#b0b6bc", metal: 0.8, rough: 0.3 });
for (let i = 0; i < 5; i++) add({ id: `separator-${i}`, kind: "cylinder", r: 2.6, h: 18, at: [SG.x - 16 + i * 8, 6, SG.z0 + 132], color: "#a0a6ac", metal: 0.7, rough: 0.35 });
add({ id: "dryer", kind: "box", size: [40, 16, 6], r: 1, at: [SG.x, 8, SG.z0 + 150], color: "#8a9096", metal: 0.6, rough: 0.5 });
add({ id: "sg-water", kind: "cylinder", r: SG.r - 2, h: 95, segments: 64, at: [SG.x, 0, SG.z0 + 59], color: "#4a86b8", rough: 0.15, opacity: 0.35, cut: "solid" });
// Pressurizer with its heaters and spray, cut.
add({ id: "pressurizer", kind: "lathe", segments: 64, profile: [[0, PZR.z0 - 4], [PZR.r, PZR.z0], [PZR.r, PZR.z0 + PZR.h], [0, PZR.z0 + PZR.h + 4], [0, PZR.z0 + PZR.h + 2.8], [PZR.r - 1.2, PZR.z0 + PZR.h - 0.2], [PZR.r - 1.2, PZR.z0 + 0.4], [0, PZR.z0 - 2.8]], at: [PZR.x, 0, 0], color: "#8a9198", metal: 0.8, rough: 0.35, texture: { kind: "brushed", seed: 8 }, cut: true, hatch: "#c9ced4" });
add({ id: "pzr-water", kind: "cylinder", r: PZR.r - 1.4, h: PZR.h * 0.55, segments: 48, at: [PZR.x, 0, PZR.z0 + PZR.h * 0.275], color: "#e07040", rough: 0.15, opacity: 0.55, cut: "solid" });
add({ id: "pzr-heaters", kind: "instances", shape: "cylinder", r: 0.4, h: 18, items: [-4, -2, 0, 2, 4].map((x) => [PZR.x + x, 2, PZR.z0 + 9]), color: "#c06030", emissive: "#ff5020", glow: 0.4 });
add({ id: "pzr-steam", kind: "cylinder", r: PZR.r - 2, h: PZR.h * 0.38, open: true, segments: 48, at: [PZR.x, 0, PZR.z0 + PZR.h * 0.76], shader: { name: "steam", uniforms: { uLevel: 0.5, uRise: 0.15 } } });

// Secondary loop: main steam out through the containment to the turbine, condensate back.
export const TURB = { x: 290, z: 60, hp: 22, lp: [360, 430] };
const steamCol = "#e8eef4", feedCol = "#5a9ad0";
flow("main-steam", [[SG.x, 4, SG.z0 + SG.h + 1], [SG.x + 10, 10, SG.z0 + SG.h + 14], [CONT.r + 40, 10, 200], [TURB.x - 40, 10, TURB.z + 30], [TURB.x - 22, 10, TURB.z + 6]], 4, steamCol, steamCol, { uSpeed: 1.4 });
flow("feedwater", [[TURB.x + 120, 30, 6], [CONT.r + 40, 30, 10], [SG.x + 30, 26, SG.z0 + 100], [SG.x + SG.r + 7, 8, SG.z0 + 116]], 3, feedCol, feedCol);
add({ id: "turbine-hall", kind: "box", size: [380, 100, 4], at: [TURB.x + 90, 30, 2], texture: { kind: "concrete", seed: 13 }, rough: 0.9 });
add({ id: "rotor", kind: "group", at: [0, 0, TURB.z] });
add({ id: "shaft", kind: "cylinder", r: 2.5, h: 260, rot: [0, 90, 0], at: [TURB.x + 120, 0, 0], color: "#c8ccd2", metal: 0.9, rough: 0.2, parent: "rotor" });
for (let i = 0; i < 6; i++) add({ id: `hp-stage-${i}`, kind: "cylinder", r: 9 + i * 1.2, h: 2.2, segments: 48, rot: [0, 90, 0], at: [TURB.x - 14 + i * 5, 0, 0], color: "#b8a070", metal: 0.85, rough: 0.3, parent: "rotor" });
for (const [j, cx] of TURB.lp.entries()) for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add({ id: `lp${j}-stage-${s < 0 ? "a" : "b"}${i}`, kind: "cylinder", r: 13 + i * 3.2, h: 2.2, segments: 48, rot: [0, 90, 0], at: [cx + s * (4 + i * 5), 0, 0], color: "#b8a070", metal: 0.85, rough: 0.3, parent: "rotor" });
add({ id: "hp-casing", kind: "cylinder", r: 18, r2: 12, h: 40, segments: 48, rot: [0, -90, 0], at: [TURB.x, 0, TURB.z], color: "#5c6874", metal: 0.6, rough: 0.4, cut: true, hatch: "#9aa4ae" });
for (const [j, cx] of TURB.lp.entries()) add({ id: `lp-casing-${j}`, kind: "box", size: [66, 66, 62], r: 6, at: [cx, 0, TURB.z], color: "#5c6874", metal: 0.6, rough: 0.4, cut: true, hatch: "#9aa4ae" });
add({ id: "crossover", kind: "tube", points: [[TURB.x + 18, 8, TURB.z + 14], [TURB.x + 30, 12, TURB.z + 46], [TURB.lp[1], 12, TURB.z + 46], [TURB.lp[1], 8, TURB.z + 31]], r: 4.5, shader: { name: "flow", uniforms: { uA: steamCol, uB: steamCol, uSpeed: 1.2, uStripes: 18, uLevel: 1 } } });
add({ id: "generator", kind: "cylinder", r: 24, h: 60, segments: 64, rot: [0, 90, 0], at: [500, 0, TURB.z], color: "#2f6a3a", metal: 0.5, rough: 0.35 });
add({ id: "exciter", kind: "cylinder", r: 12, h: 18, segments: 48, rot: [0, 90, 0], at: [542, 0, TURB.z], color: "#2f6a3a", metal: 0.5, rough: 0.35 });
add({ id: "generator-pedestal", kind: "box", size: [90, 40, TURB.z - 28], r: 2, at: [510, 0, (TURB.z - 28) / 2 + 4], texture: { kind: "concrete", seed: 17 }, rough: 0.9 });
add({ id: "turbine-pedestal", kind: "box", size: [210, 40, 22], r: 2, at: [TURB.x + 98, 30, 15], texture: { kind: "concrete", seed: 19 }, rough: 0.9 });
add({ id: "condenser", kind: "box", size: [140, 50, 22], r: 3, at: [TURB.x + 105, -2, 15], color: "#4f6070", metal: 0.6, rough: 0.45, cut: true, hatch: "#9aa4ae" });
add({ id: "condenser-tubes", kind: "instances", shape: "box", size: [130, 1.6, 1.6], items: Array.from({ length: 12 }, (_, i) => [TURB.x + 105, 2 + (i % 4) * 4, 9 + Math.floor(i / 4) * 5]), color: "#5aa0d8", metal: 0.6, rough: 0.3 });
add({ id: "feed-pump", kind: "cylinder", r: 6, h: 14, segments: 32, at: [TURB.x + 120, 30, 13], color: "#5a7a9a", metal: 0.6, rough: 0.4 });
// Circulating water to the cooling tower, and the tower's plume.
export const TOWER = { x: 610, y: 150 };
flow("circ-out", [[TURB.x + 175, 4, 10], [540, 60, 8], [TOWER.x - 40, TOWER.y - 30, 14]], 5, "#7ab0d8", "#c8705a", { uSpeed: 0.5 });
flow("circ-back", [[TOWER.x - 60, TOWER.y - 50, 4], [530, 80, 3], [TURB.x + 175, 18, 6]], 5, "#5a90c8", "#5a90c8", { uSpeed: 0.5 });
const hyp = Array.from({ length: 13 }, (_, i) => { const z = (i / 12) * 220; return [55 * Math.sqrt(1 + ((z - 150) / 120) ** 2) * 0.82, z]; });
add({ id: "cooling-tower", kind: "lathe", segments: 96, profile: [...hyp, ...[...hyp].reverse().map(([r, z]) => [r - 2, z + (z === 0 ? 0.01 : 0)])], at: [TOWER.x, TOWER.y, 0], texture: { kind: "concrete", seed: 23 }, rough: 0.9 });
add({ id: "tower-plume", kind: "cylinder", r: 80, r2: 47, h: 150, open: true, segments: 64, rot: [180, 0, 0], at: [TOWER.x, TOWER.y, 295], edges: false, shader: { name: "steam", uniforms: { uLevel: 1, uRise: 0.3 } } });
add({ id: "transformer", kind: "box", size: [30, 22, 26], r: 2, at: [500, -50, 13], color: "#6a7480", metal: 0.4, rough: 0.5 });

export const scene = {
  fig: "Fig 7",
  title: "Pressurized water reactor, one loop of four",
  hint: "Drag the yellow handle or use ↑ ↓ to move the control rods",
  readout: "100% · Thot 326.1 °C · Tcold 292.7 °C · 15.5 MPa · 1150 MWe",
  size: "hero",
  width: 900,
  height: 600,
  pad: 0.02,
  camera: { azimuth: 8, elevation: 14 },
  section: { axis: "y", at: 0 },
  env: { intensity: 0.8 },
  parts,
};
