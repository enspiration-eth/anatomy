// Raptor 2 hanging in a test stand, as a three.js scene. Units: cm, z up. The engine is 310 tall,
// its nozzle exit 1.3 m across at z = 172; it comes apart into eleven assemblies.
import { collector, cornersOf, screw } from "../../kit/three-parts.mjs";

const { parts, add } = collector();
export const Z_EXIT = 172, TOP = 310;
export const BEAM_Z = Z_EXIT + TOP + 23, BEAM_H = 28;
export const DECK = { w: 300, d: 300, h: 15 };
const COLUMN = 24;
export const COLUMNS = [[-124, 124], [124, -124]];
export const FTP_DEG = 205;
const DEG = Math.PI / 180;
const out = (deg, r, dz) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r, dz];
export const ASSEMBLIES = {
  gimbal: { name: "Gimbal and thrust puck", move: [0, 0, 0] },
  otp: { name: "Oxygen turbopump", move: [0, 0, -26] },
  orpb: { name: "Oxygen-rich preburner", move: [0, 0, -52] },
  lox: { name: "Oxygen duct and main valve", move: out(52, 60, -12) },
  chamber: { name: "Injector and main chamber", move: [0, 0, -80] },
  nozzle: { name: "Nozzle", move: [0, 0, -120] },
  ftp: { name: "Methane turbopump and fuel-rich preburner", move: out(FTP_DEG, 70, -46) },
  hotgas: { name: "Hot-gas manifold", move: out(FTP_DEG, 36, -62) },
  downcomer: { name: "Downcomer and main fuel valve", move: out(320, 66, -84) },
  controller: { name: "Engine controller and harness", move: out(110, 70, -28) },
  plumbing: { name: "Plumbing", move: [0, 0, -100] },
};
const s = (v) => Z_EXIT + v; // height above the nozzle exit
const METAL = { metal: 0.45, rough: 0.4 };
const COPPER = { color: "#b5764a", metal: 0.55, rough: 0.35 };
const STEEL = { color: "#ffffff", metal: 0.6, rough: 0.35, texture: { kind: "brushed", project: "box", tile: 40 } };
const DARK = { color: "#3d4045", metal: 0.4, rough: 0.5 };
for (const id of Object.keys(ASSEMBLIES)) add({ id, kind: "group", at: [0, 0, 0] });
const boltCircle = (parent, id, z, r, n, size = 1.4) => {
  for (let i = 0; i < n; i++) add({ id: `${id}-${i}`, kind: "sphere", r: size, at: [Math.cos((i / n) * 2 * Math.PI) * r, Math.sin((i / n) * 2 * Math.PI) * r, z], ...DARK, edges: false, parent });
};

// Stand: deck on feet, flame deflector, two columns, the beam and the thrust mount.
add({ id: "deck", kind: "box", size: [DECK.w, DECK.d, DECK.h], r: 10, at: [0, 0, -DECK.h], tone: "mid" });
for (const [i, [x, y]] of cornersOf(0, 0, DECK.w, DECK.d, 26).entries()) add({ id: `deck-foot-${i}`, kind: "box", size: [30, 30, 8], r: 3, at: [x, y, -DECK.h - 8], tone: "lo" });
for (const [i, [x, y]] of cornersOf(0, 0, DECK.w, DECK.d, 12).entries()) screw(add, `deck-bolt-${i}`, x, y, 0, { r: 2.6 });
add({ id: "deflector", kind: "cylinder", r: 96, r2: 90, h: 6, segments: 64, at: [0, 0, 0], tone: "lo" });
add({ id: "deflector-cone", kind: "cylinder", r: 30, r2: 2, h: 26, segments: 48, at: [0, 0, 6], tone: "lo" });
COLUMNS.forEach(([x, y], i) => {
  add({ id: `column-base-${i}`, kind: "box", size: [COLUMN + 16, COLUMN + 16, 6], r: 3, at: [x, y, 0], tone: "mid" });
  add({ id: `column-${i}`, kind: "box", size: [COLUMN, COLUMN, BEAM_Z - 6], r: 2, at: [x, y, 6], tone: "mid" });
  for (const z of [120, 260, 400]) add({ id: `column-band-${i}-${z}`, kind: "box", size: [COLUMN + 3, COLUMN + 3, 4], r: 2, at: [x, y, z], tone: "lo" });
});
const beamLen = Math.hypot(248, 248) + COLUMN * 1.2;
add({ id: "beam", kind: "box", size: [beamLen, 26, BEAM_H], r: 3, rot: [0, 0, -45], at: [0, 0, BEAM_Z], tone: "mid" });
add({ id: "mount", kind: "cylinder", r: 30, h: 23, segments: 48, at: [0, 0, s(TOP)], tone: "mid" });
boltCircle(undefined, "mount-bolt", s(TOP) + 23, 24, 8, 1.6);
parts.slice(-8).forEach((p) => delete p.parent);

// Gimbal and thrust puck (stays on the stand).
add({ id: "puck", kind: "lathe", profile: [[0, 0], [12, 0], [18, 10], [26, 22], [26, 35], [0, 35]], at: [0, 0, s(TOP - 35)], ...STEEL, parent: "gimbal" });
add({ id: "gimbal-block", kind: "box", size: [30, 30, 10], r: 3, at: [0, 0, s(TOP - 30)], ...DARK, parent: "gimbal" });
for (const [i, a] of [45, 225].entries()) add({ id: `actuator-${i}`, kind: "tube", points: [[Math.cos(a * DEG) * 28, Math.sin(a * DEG) * 28, s(TOP - 4)], [Math.cos(a * DEG) * 36, Math.sin(a * DEG) * 36, s(TOP - 40)], [Math.cos(a * DEG) * 30, Math.sin(a * DEG) * 30, s(TOP - 70)]], r: 4, ...STEEL, edges: false, parent: "gimbal" });

// Oxygen turbopump: housing, volute, inlet.
add({ id: "otp-housing", kind: "lathe", segments: 48, profile: [[0, 0], [20, 0], [24, 8], [24, 30], [16, 40], [10, 40], [0, 40]], at: [0, 0, s(235)], ...METAL, color: "#8b9096", parent: "otp" });
add({ id: "otp-volute", kind: "torus", r: 26, tube: 6, segments: 48, at: [0, 0, s(248)], ...STEEL, parent: "otp" });
add({ id: "otp-flange", kind: "cylinder", r: 27, h: 3, segments: 48, at: [0, 0, s(235)], ...DARK, parent: "otp" });
boltCircle("otp", "otp-bolt", s(238), 25, 10);

// Oxygen-rich preburner.
add({ id: "orpb-body", kind: "cylinder", r: 18, h: 42, segments: 48, at: [0, 0, s(193)], ...STEEL, parent: "orpb" });
add({ id: "orpb-flange", kind: "cylinder", r: 22, h: 3, segments: 48, at: [0, 0, s(193)], ...DARK, parent: "orpb" });
add({ id: "orpb-dome", kind: "cylinder", r: 21, r2: 18, h: 4, segments: 48, at: [0, 0, s(231)], ...DARK, parent: "orpb" });
boltCircle("orpb", "orpb-bolt", s(196), 20, 8);

// Injector and main chamber.
add({ id: "injector", kind: "lathe", segments: 48, profile: [[0, 0], [28, 0], [28, 6], [22, 14], [0, 18]], at: [0, 0, s(175)], ...STEEL, parent: "chamber" });
add({ id: "chamber-body", kind: "cylinder", r: 24, h: 50, segments: 48, at: [0, 0, s(125)], ...COPPER, parent: "chamber" });
for (const [i, z] of [135, 150, 165].entries()) add({ id: `chamber-band-${i}`, kind: "torus", r: 24.6, tube: 1.2, segments: 48, at: [0, 0, s(z)], ...DARK, edges: false, parent: "chamber" });
boltCircle("chamber", "injector-bolt", s(178), 27, 12);

// Nozzle: the regeneratively cooled bell, its stiffening bands and the fuel inlet manifold at the top.
const bell = [];
for (let i = 0; i <= 24; i++) { const t = i / 24; bell.push([18 + 47 * Math.pow(1 - t, 1.6), 125 * t]); }
add({ id: "bell", kind: "lathe", segments: 72, profile: [[64, -1], ...bell, [17, 126]], at: [0, 0, s(0)], ...COPPER, parent: "nozzle", edgeAngle: 50 });
for (const [i, t] of [0.04, 0.2, 0.38, 0.56, 0.74].entries()) add({ id: `bell-band-${i}`, kind: "torus", r: 18 + 47 * Math.pow(1 - t, 1.6) + 0.6, tube: 1.3, segments: 72, at: [0, 0, s(125 * t)], ...DARK, edges: false, parent: "nozzle" });
add({ id: "exit-ring", kind: "torus", r: 65, tube: 1.8, segments: 72, at: [0, 0, s(0)], ...STEEL, lit: true, edges: false, parent: "nozzle" });
add({ id: "nozzle-manifold", kind: "torus", r: 22, tube: 4, segments: 48, at: [0, 0, s(112)], ...STEEL, parent: "nozzle" });

// Methane turbopump with its fuel-rich preburner (off axis).
const F = out(FTP_DEG, 52, 0);
add({ id: "ftp-preburner", kind: "cylinder", r: 12, h: 34, segments: 40, at: [F[0], F[1], s(160)], ...STEEL, parent: "ftp" });
add({ id: "ftp-housing", kind: "lathe", segments: 40, profile: [[0, 0], [14, 0], [17, 6], [17, 24], [10, 32], [0, 32]], at: [F[0], F[1], s(194)], color: "#8b9096", ...METAL, parent: "ftp" });
add({ id: "ftp-volute", kind: "torus", r: 18, tube: 4.5, segments: 40, at: [F[0], F[1], s(204)], ...STEEL, parent: "ftp" });
add({ id: "ftp-inlet", kind: "cylinder", r: 6, h: 18, at: [F[0], F[1], s(226)], ...DARK, parent: "ftp" });
add({ id: "ftp-flange", kind: "cylinder", r: 15, h: 2.4, at: [F[0], F[1], s(160)], ...DARK, parent: "ftp" });

// Hot-gas manifold: a ring round the injector and its duct from the methane turbopump.
add({ id: "hotgas-ring", kind: "torus", r: 32, tube: 5, segments: 56, at: [0, 0, s(186)], ...STEEL, parent: "hotgas" });
add({ id: "hotgas-duct", kind: "tube", points: [[F[0] * 0.98, F[1] * 0.98, s(170)], [F[0] * 0.8, F[1] * 0.8, s(180)], [Math.cos(FTP_DEG * DEG) * 36, Math.sin(FTP_DEG * DEG) * 36, s(186)]], r: 5, ...STEEL, edges: false, parent: "hotgas" });

// Oxygen duct and main valve: from the turbopump volute down to the preburner.
const L = (a, r, z) => [Math.cos(a * DEG) * r, Math.sin(a * DEG) * r, s(z)];
add({ id: "lox-duct", kind: "tube", points: [L(52, 31, 248), L(52, 44, 240), L(52, 46, 222), L(52, 19, 210)], r: 5, ...STEEL, edges: false, parent: "lox" });
add({ id: "lox-valve", kind: "sphere", r: 8, at: L(52, 46, 230), ...DARK, parent: "lox" });
add({ id: "lox-actuator", kind: "cylinder", r: 4, h: 12, rot: [0, 90, 52], at: L(52, 52, 230), ...STEEL, parent: "lox" });

// Downcomer and main fuel valve: methane from the pump down to the nozzle manifold.
add({ id: "downcomer-pipe", kind: "tube", points: [[F[0] * 1.15, F[1] * 1.15, s(214)], L(260, 70, 200), L(320, 64, 160), L(320, 40, 118), L(320, 26, 112)], r: 4.5, ...STEEL, edges: false, parent: "downcomer" });
add({ id: "fuel-valve", kind: "sphere", r: 7.5, at: L(320, 64, 160), ...DARK, parent: "downcomer" });
add({ id: "fuel-actuator", kind: "cylinder", r: 3.6, h: 12, rot: [0, 90, 320], at: L(320, 70, 160), ...STEEL, parent: "downcomer" });

// Engine controller and harness.
const C = L(110, 46, 228);
add({ id: "controller-box", kind: "box", size: [22, 14, 26], r: 3, rot: [0, 0, 20], at: C, ...DARK, parent: "controller" });
for (const [i, [a, z, r]] of [[80, 180, 29.5], [140, 210, 19.5], [100, 150, 25]].entries())
  add({ id: `harness-${i}`, kind: "tube", points: [[C[0], C[1], C[2]], L(a, 40, z + 30), L(a, r, z)], r: 1.4, color: "#202020", edges: false, parent: "controller" });

// Plumbing: purge and pressurant lines along the chamber.
for (const [i, a] of [20, 160, 280].entries())
  add({ id: `purge-${i}`, kind: "tube", points: [L(a, 26, 170), L(a, 27.5, 150), L(a, 26, 130)], r: 1.2, color: "#7d838a", edges: false, parent: "plumbing" });
add({ id: "plume", kind: "group", at: [0, 0, s(0)] });
// The plume is a library shader on an open cone from the exit (uv.y = 1) down to the deck; an effect, not a solid.
export const PLUME_H = Z_EXIT - 6;
add({ id: "plume-jet", kind: "cylinder", open: true, r: 120, r2: 64, h: PLUME_H, segments: 64, at: [0, 0, -PLUME_H], edges: false, parent: "plume", shader: { name: "plume", uniforms: { uDiamonds: 4, uSpeed: 6 } } });

export const scene = {
  fig: "Fig 1",
  title: "Raptor 2 · test stand",
  hint: "Hover the engine to take it apart",
  readout: "1,630 kg · cold",
  size: "hero",
  width: 700,
  height: 680,
  pad: 0.02,
  camera: { azimuth: 38, elevation: 27 },
  env: { intensity: 0.7 },
  parts,
};
