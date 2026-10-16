// Fig 11: an all-terrain armoured walker, walking in place in snow, with a movable side section.
// An original, procedurally built model inspired by the AT-AT design (no film assets). Units ~4 cm.
// Body frame: x forward (head at +x), y to the walker's left, z up; ground at z = 0.
import { assertScene } from "../../kit/three-scene.mjs";

export const L1 = 220, L2 = 240;           // thigh and shin
export const HZ = 455;                      // hip joint height
export const ANKLE = 35;                    // ankle height in stance (foot pressed 5 into the snow)
export const LEGS = [                       // name, hip x, side y, gait phase (lateral-sequence walk)
  ["rr", -170, -160, 0], ["fr", 170, -160, 0.25], ["rl", -170, 160, 0.5], ["fl", 170, 160, 0.75],
];
export const GAIT = { period: 4.8, duty: 0.75, stride: 280, lift: 70 };
export const speed = GAIT.stride / (GAIT.duty * GAIT.period); // ground speed under the feet, units/s
export const GROUND = { w: 1800, d: 1100, grid: 200 };
export const SNOW = 700;

const parts = [];
const add = (p) => { const q = p.kind === "group" ? { ...p } : { cut: true, hatch: "#b4bcc6", ...p }; if (q.kind === "group") { delete q.cut; delete q.hatch; } parts.push(q); return q; };
const plain = (p) => (parts.push(p), p);
const HULL = "#9ea4ab", HULL_D = "#7f868e", DARK = "#3b4047";

// ---- ground (not cut) and snow
plain({ id: "snowfield", kind: "heightfield", size: [GROUND.w, GROUND.d], grid: GROUND.grid, at: [0, 0, 0], color: "#ffffff", rough: 0.9 });
const flakes = [];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < SNOW; i++) flakes.push([(rnd() - 0.5) * GROUND.w, (rnd() - 0.5) * GROUND.d, rnd() * 820]);
plain({ id: "flakes", kind: "instances", shape: "sphere", r: 2.8, segments: 6, items: flakes, color: "#f4f8ff", rough: 0.6, edges: false });

// ---- the body: a group that bobs and sways
plain({ id: "body", kind: "group", at: [0, 0, 0] });
// Hull as thick plates so a section shows the wall thickness, and the inside faces read as rooms.
function shell(id, [x0, x1], [y0, y1], [z0, z1], t, color, extra = {}) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, d = y1 - y0;
  add({ id: `${id}-floor`, kind: "box", size: [w, d, t], at: [cx, cy, z0], color, parent: "body", ...extra });
  add({ id: `${id}-roof`, kind: "box", size: [w, d, t], at: [cx, cy, z1 - t], color, parent: "body", ...extra });
  add({ id: `${id}-port`, kind: "box", size: [w, t, z1 - z0 - 2 * t], at: [cx, y1 - t / 2, z0 + t], color, parent: "body", ...extra });
  add({ id: `${id}-starboard`, kind: "box", size: [w, t, z1 - z0 - 2 * t], at: [cx, y0 + t / 2, z0 + t], color, parent: "body", ...extra });
  add({ id: `${id}-fore`, kind: "box", size: [t, d - 2 * t, z1 - z0 - 2 * t], at: [x1 - t / 2, cy, z0 + t], color, parent: "body", ...extra });
  add({ id: `${id}-aft`, kind: "box", size: [t, d - 2 * t, z1 - z0 - 2 * t], at: [x0 + t / 2, cy, z0 + t], color, parent: "body", ...extra });
}
export const BODY = { x: [-250, 250], y: [-100, 100], z: [420, 590], t: 12 };
shell("hull", BODY.x, BODY.y, BODY.z, BODY.t, HULL);
// roof armour: sloped shoulders and a spine
for (const s of [-1, 1]) {
  add({ id: `roof-slope-${s < 0 ? "s" : "p"}`, kind: "box", size: [500, 70, 14], r: 2, at: [0, s * 66, 588], rot: [s * 24, 0, 0], color: HULL_D, parent: "body" });
  add({ id: `skirt-${s < 0 ? "s" : "p"}`, kind: "box", size: [470, 10, 40], r: 2, at: [0, s * 105, 430], color: HULL_D, parent: "body" });
  // side armour panels with seams
  for (let k = 0; k < 4; k++) add({ id: `side-panel-${s < 0 ? "s" : "p"}-${k}`, kind: "box", size: [108, 5, 92], r: 2, at: [-180 + k * 120, s * 102.5, 470], color: k === 1 ? HULL_D : HULL, parent: "body" });
  add({ id: `troop-door-${s < 0 ? "s" : "p"}`, kind: "box", size: [80, 6, 70], r: 3, at: [90, s * 105.5, 470], color: HULL_D, parent: "body" });
  add({ id: `door-rail-${s < 0 ? "s" : "p"}`, kind: "box", size: [100, 4, 5], at: [90, s * 108.5, 545], color: DARK, parent: "body" });
  for (const hx of [-170, 170]) {
    add({ id: `hip-drum-${s < 0 ? "s" : "p"}-${hx < 0 ? "r" : "f"}`, kind: "cylinder", r: 46, h: 40, segments: 40, at: [hx, s < 0 ? -100 : 140, HZ], rot: [90, 0, 0], color: HULL_D, metal: 0.4, parent: "body" });
    add({ id: `hip-cap-${s < 0 ? "s" : "p"}-${hx < 0 ? "r" : "f"}`, kind: "cylinder", r: 30, h: 6, segments: 32, at: [hx, s < 0 ? -140 : 146, HZ], rot: [90, 0, 0], color: DARK, metal: 0.5, parent: "body" });
  }
}
add({ id: "spine", kind: "box", size: [440, 34, 16], r: 3, at: [-10, 0, 590], color: HULL_D, parent: "body" });
for (let k = 0; k < 6; k++) add({ id: `vent-${k}`, kind: "box", size: [26, 40, 6], r: 1, at: [-200 + k * 30, 0, 606], color: DARK, parent: "body" });
add({ id: "rear-plate", kind: "box", size: [10, 160, 120], r: 4, at: [-256, 0, 445], color: HULL_D, parent: "body" });
add({ id: "belly-hatch", kind: "box", size: [120, 70, 6], r: 3, at: [-150, 0, 414], color: DARK, parent: "body" });

// ---- interior departments (colour-coded, all cut)
const DECK = BODY.z[0] + BODY.t;
// troop bay: x -60..238
add({ id: "troop-bulkhead", kind: "box", size: [10, 176, 146], at: [-65, 0, DECK], color: "#6d747c", parent: "body" });
const troopers = [];
for (const s of [-1, 1]) {
  add({ id: `troop-bench-${s < 0 ? "s" : "p"}`, kind: "box", size: [270, 22, 26], r: 2, at: [90, s * 74, DECK], color: "#5a6f8a", parent: "body" });
  add({ id: `troop-rack-${s < 0 ? "s" : "p"}`, kind: "box", size: [270, 6, 10], at: [90, s * 84, DECK + 110], color: "#4a5d75", parent: "body" });
  for (let k = 0; k < 10; k++) troopers.push([-30 + k * 26, s * 70, DECK + 26]);
}
add({ id: "troop-bodies", kind: "instances", shape: "cylinder", r: 8, h: 44, items: troopers, color: "#e9edf2", rough: 0.5, parent: "body" });
add({ id: "troop-helmets", kind: "instances", shape: "sphere", r: 9, segments: 14, items: troopers.map(([x, y, z]) => [x, y, z + 52]), color: "#f4f6f8", rough: 0.35, parent: "body" });
add({ id: "troop-deck-light", kind: "box", size: [260, 10, 4], at: [90, 0, BODY.z[1] - BODY.t - 4], color: "#cfe3ff", emissive: "#9cc2ff", glow: 0.6, parent: "body" });
// speeder bay: lower aft x -238..-70
add({ id: "bay-deck", kind: "box", size: [168, 176, 8], at: [-154, 0, 505], color: "#6d747c", parent: "body" });
for (let k = 0; k < 5; k++) {
  const x = -224 + k * 34, y = 0;
  add({ id: `bike-${k}-body`, kind: "box", size: [16, 60, 14], r: 4, at: [x, y + 10, DECK + 30], color: "#8a7350", parent: "body" });
  add({ id: `bike-${k}-vanes`, kind: "box", size: [22, 6, 20], r: 1, at: [x, y - 40, DECK + 28], color: "#6d5c40", parent: "body" });
  add({ id: `bike-${k}-cradle`, kind: "box", size: [20, 70, 30], at: [x, y + 5, DECK], color: "#4d535a", parent: "body" });
}
// power: upper aft, a generator drum along y with conduits
add({ id: "generator-core", kind: "cylinder", r: 30, h: 150, segments: 40, at: [-160, 75, 545], rot: [90, 0, 0], color: "#c46a2a", metal: 0.4, emissive: "#ff7a1a", glow: 0.35, parent: "body" });
for (let k = 0; k < 5; k++) add({ id: `generator-ring-${k}`, kind: "cylinder", r: 34, h: 8, segments: 40, at: [-160, 66 - k * 33, 545], rot: [90, 0, 0], color: "#5a3a26", metal: 0.6, parent: "body" });
add({ id: "generator-mount", kind: "box", size: [80, 170, 20], at: [-160, 0, 513], color: "#4d535a", parent: "body" });
add({ id: "conduit-main", kind: "tube", points: [[-120, 0, 560], [-60, 0, 572], [120, 0, 572], [250, 0, 520], [330, 0, 470]], r: 6, color: "#d08a3a", parent: "body" });
add({ id: "conduit-legs", kind: "tube", points: [[-170, -60, 520], [-170, -80, 470], [170, -80, 470], [170, 80, 470], [-170, 80, 470], [-170, 60, 520]], r: 4, color: "#d08a3a", parent: "body" });

// ---- neck: armoured rings round a crew corridor
for (let k = 0; k < 5; k++) add({ id: `neck-ring-${k}`, kind: "cylinder", r: 44 - k * 2, h: 12, segments: 40, at: [250 + k * 16, 0, 478], rot: [0, 90, 0], color: k % 2 ? HULL_D : HULL, parent: "neck" });
add({ id: "neck-corridor", kind: "cylinder", r: 26, h: 90, segments: 32, at: [248, 0, 478], rot: [0, 90, 0], color: "#55606b", open: true, parent: "neck" });
parts.splice(parts.findIndex((p) => p.id === "neck-ring-0"), 0, { id: "neck", kind: "group", at: [0, 0, 0], parent: "body" });

// ---- head (a group that turns on the neck)
plain({ id: "head", kind: "group", at: [330, 0, 478], parent: "body" });
const H = (p) => add({ ...p, parent: p.parent ?? "head" });
function headShell([x0, x1], [y0, y1], [z0, z1], t) {
  const cx = (x0 + x1) / 2, w = x1 - x0, d = y1 - y0;
  H({ id: "head-floor", kind: "box", size: [w, d, t], at: [cx, 0, z0], color: HULL });
  H({ id: "head-roof", kind: "box", size: [w, d, t], at: [cx, 0, z1 - t], color: HULL });
  H({ id: "head-port", kind: "box", size: [w, t, z1 - z0 - 2 * t], at: [cx, y1 - t / 2, z0 + t], color: HULL });
  H({ id: "head-starboard", kind: "box", size: [w, t, z1 - z0 - 2 * t], at: [cx, y0 + t / 2, z0 + t], color: HULL });
  H({ id: "head-aft", kind: "box", size: [t, d - 2 * t, z1 - z0 - 2 * t], at: [x0 + t / 2, 0, z0 + t], color: HULL });
}
headShell([0, 140], [-60, 60], [-55, 40], 8);
H({ id: "head-brow", kind: "box", size: [60, 120, 30], r: 4, at: [125, 0, 10], rot: [0, 18, 0], color: HULL_D });
H({ id: "head-snout", kind: "box", size: [50, 104, 60], r: 4, at: [150, 0, -55], color: HULL });
H({ id: "viewport", kind: "box", size: [6, 90, 12], r: 2, at: [178, 0, -10], color: "#1a1f24", emissive: "#ff5a2a", glow: 0.25 });
H({ id: "head-cheek-p", kind: "box", size: [120, 8, 50], r: 3, at: [70, 63, -40], color: HULL_D });
H({ id: "head-cheek-s", kind: "box", size: [120, 8, 50], r: 3, at: [70, -63, -40], color: HULL_D });
// crew: pilot, gunner, commander
[["pilot", 110, -24], ["gunner", 110, 24], ["commander", 60, 0]].forEach(([n, x, y]) => {
  H({ id: `seat-${n}`, kind: "box", size: [26, 26, 22], r: 3, at: [x, y, -47], color: "#6a5040" });
  H({ id: `seat-back-${n}`, kind: "box", size: [6, 26, 30], r: 2, at: [x - 13, y, -25], color: "#6a5040" });
  H({ id: `crew-${n}`, kind: "sphere", r: 9, at: [x, y, -10], color: "#3d4248" });
});
H({ id: "console", kind: "box", size: [26, 90, 24], r: 3, at: [140, 0, -47], color: "#2f353b" });
H({ id: "console-glow", kind: "box", size: [2, 80, 8], at: [127.5, 0, -30], color: "#ffb35a", emissive: "#ff9a2a", glow: 0.9 });
// weapons: chin heavy lasers and temple blasters
for (const s of [-1, 1]) {
  H({ id: `chin-cannon-${s < 0 ? "s" : "p"}`, kind: "cylinder", r: 9, h: 110, segments: 24, at: [170, s * 30, -48], rot: [0, 90, 0], color: "#4a5058", metal: 0.6 });
  H({ id: `chin-muzzle-${s < 0 ? "s" : "p"}`, kind: "cylinder", r: 12, h: 14, segments: 24, at: [270, s * 30, -48], rot: [0, 90, 0], color: "#2c3036", metal: 0.6 });
  H({ id: `chin-mount-${s < 0 ? "s" : "p"}`, kind: "box", size: [40, 26, 24], r: 3, at: [168, s * 30, -60], color: HULL_D });
  H({ id: `temple-blaster-${s < 0 ? "s" : "p"}`, kind: "cylinder", r: 6, h: 70, segments: 20, at: [100, s * 72, 14], rot: [0, 90, 0], color: "#4a5058", metal: 0.6 });
  H({ id: `temple-pod-${s < 0 ? "s" : "p"}`, kind: "box", size: [50, 16, 22], r: 4, at: [90, s * 72, 3], color: HULL_D });
}

// ---- legs: hip -> thigh -> knee -> shin -> ankle -> foot; groups the live code turns by inverse kinematics
for (const [n, hx, hy] of LEGS) {
  const side = hy < 0 ? -1 : 1;
  add({ id: `thigh-${n}`, kind: "group", at: [hx, hy, HZ], parent: "body" });
  add({ id: `thigh-housing-${n}`, kind: "box", size: [86, 50, 96], r: 6, at: [0, 0, -96], color: HULL, parent: `thigh-${n}` });
  add({ id: `thigh-strut-${n}`, kind: "box", size: [40, 36, L1 - 70], r: 3, at: [0, 0, -L1 + 20], color: HULL_D, parent: `thigh-${n}` });
  add({ id: `thigh-piston-${n}`, kind: "cylinder", r: 7, h: 130, at: [30, 0, -L1 + 30], color: "#6a7078", metal: 0.7, rough: 0.3, parent: `thigh-${n}` });
  add({ id: `thigh-gland-${n}`, kind: "cylinder", r: 11, h: 40, at: [30, 0, -110], color: DARK, metal: 0.5, parent: `thigh-${n}` });
  add({ id: `knee-${n}`, kind: "cylinder", r: 32, h: 56, segments: 36, at: [0, 28, -L1], rot: [90, 0, 0], color: HULL_D, metal: 0.4, parent: `thigh-${n}` });
  add({ id: `knee-cap-${n}`, kind: "cylinder", r: 18, h: 4, segments: 28, at: [0, side * 30 + (side > 0 ? 4 : 0), -L1], rot: [90, 0, 0], color: DARK, parent: `thigh-${n}` });
  add({ id: `shin-${n}`, kind: "group", at: [0, 0, -L1], parent: `thigh-${n}` });
  add({ id: `shin-strut-${n}`, kind: "box", size: [44, 38, L2 - 40], r: 3, at: [0, 0, -L2 + 14], color: HULL, parent: `shin-${n}` });
  add({ id: `shin-armour-${n}`, kind: "box", size: [12, 48, 150], r: 3, at: [26, 0, -190], color: HULL_D, parent: `shin-${n}` });
  add({ id: `shin-piston-${n}`, kind: "cylinder", r: 6, h: 120, at: [-28, 0, -L2 + 40], color: "#6a7078", metal: 0.7, rough: 0.3, parent: `shin-${n}` });
  add({ id: `ankle-${n}`, kind: "cylinder", r: 22, h: 44, segments: 32, at: [0, 22, -L2], rot: [90, 0, 0], color: HULL_D, parent: `shin-${n}` });
  add({ id: `foot-${n}`, kind: "group", at: [0, 0, -L2], parent: `shin-${n}` });
  add({ id: `ankle-cone-${n}`, kind: "lathe", profile: [[0, -22], [40, -22], [30, -6], [16, 6], [0, 6]], segments: 40, at: [0, 0, 0], color: HULL_D, parent: `foot-${n}` });
  add({ id: `foot-pad-${n}`, kind: "cylinder", r: 58, r2: 52, h: 18, segments: 48, at: [0, 0, -ANKLE], color: HULL, parent: `foot-${n}` });
  for (let k = 0; k < 4; k++) add({ id: `toe-${n}-${k}`, kind: "box", size: [24, 16, 10], r: 2, at: [Math.cos(k * Math.PI / 2 + Math.PI / 4) * 54, Math.sin(k * Math.PI / 2 + Math.PI / 4) * 54, -ANKLE], rot: [0, 0, k * 90 + 45], color: DARK, parent: `foot-${n}` });
}

/** Departments: what each does, which parts it is, and where its card points (body frame). Fiction, after canon. */
export const DEPTS = [
  { id: "cockpit", name: "Command cockpit", match: /^(head-|viewport|seat|crew|console)/, anchor: [450, 0, 460],
    fn: "The head is the command cab. A pilot and a gunner sit side by side behind the viewport, with the commander behind them. The head turns on the neck to aim the guns and to look for targets.",
    canon: "Canon describes a cockpit crew of three: pilot, gunner and commander." },
  { id: "guns", name: "Heavy lasers and blasters", match: /^(chin-|temple-)/, anchor: [560, 0, 430],
    fn: "Two heavy laser cannons sit under the chin and two medium blasters on the temples. They aim with the head, so the neck is the turret.",
    canon: "Wookieepedia lists two chin-mounted heavy laser cannons and two temple-mounted medium blasters." },
  { id: "neck", name: "Neck and crew corridor", match: /^neck-/, anchor: [290, 0, 478],
    fn: "Armoured rings let the head swing while a corridor inside joins the cockpit to the body. Power and control lines run through it.",
    canon: "The neck is often described as the walker's weak point. This corridor layout is illustrative." },
  { id: "troops", name: "Troop bay", match: /^troop-/, anchor: [90, 0, 500],
    fn: "Infantry ride on benches along both walls and leave by the side doors or ramps once the walker has stopped.",
    canon: "Canon gives a capacity of about 40 troopers. Twenty are shown here." },
  { id: "speeders", name: "Speeder bike bay", match: /^bike-|^bay-/, anchor: [-154, 0, 465],
    fn: "Speeder bikes are stowed in cradles on the lower aft deck for scouts to deploy on the ground.",
    canon: "Canon sources say an AT-AT carried up to five speeder bikes." },
  { id: "power", name: "Power generator", match: /^(generator-|conduit-)/, anchor: [-160, 0, 560],
    fn: "The generator in the upper aft compartment feeds the leg drives, the guns and the systems in the head through armoured conduits.",
    canon: "Its exact place inside differs between sources. This placement is illustrative." },
  { id: "legs", name: "Leg drives", match: /^(thigh-|knee-|shin-|ankle-|foot-|toe-|hip-)/, anchor: [170, -160, 300],
    fn: "Hip drums and pistons lift and swing each leg. Only one foot is in the air at a time (a lateral-sequence walk), so three feet always carry the weight. The wide pads spread the load on snow.",
    canon: "The gait timing here is a physical guess. Films show a slow, deliberate walk." },
];
export const SOURCES = [
  ["[1]", "All Terrain Armored Transport, Wookieepedia", "https://starwars.fandom.com/wiki/All_Terrain_Armored_Transport"],
  ["[2]", "AT-AT Walker, StarWars.com Databank", "https://www.starwars.com/databank/at-at-walker"],
];
export const FACTS = { heightM: 22.5, troops: 40, bikes: 5, crew: 3, topKmh: 60 };

export const scene = {
  fig: "Fig 11", title: "All-terrain walker, in section",
  hint: "Drag orbits · [ ] slice · click a department",
  readout: "walking · slice off",
  size: "hero", width: 960, height: 620,
  camera: { azimuth: 30, elevation: 16 }, pad: 0.04, env: { intensity: 0.8 },
  section: { axis: "y", at: -2000 },
  parts,
};
assertScene(scene);
