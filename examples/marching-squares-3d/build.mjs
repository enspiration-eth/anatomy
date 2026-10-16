import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, TOP, TANK, FLOOR, HMAX, GANTRY_Z, RES, MAX_SOURCES, BOARD, SOURCES0, caseSpot } from "./scene.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// The model module, inlined as plain functions (exports stripped) so the page runs the same code the tests check.
const model = readFileSync(`${here}/march.mjs`, "utf8").replace(/^export /gm, "");

export const SOURCES = [
  ["[1]", "Marching squares (Wikipedia): the 16 cases, linear interpolation and the saddle ambiguity", "https://en.wikipedia.org/wiki/Marching_squares"],
  ["[2]", "Lorensen & Cline, Marching cubes: a high resolution 3D surface construction algorithm, SIGGRAPH 1987", "https://doi.org/10.1145/37402.37422"],
  ["[3]", "Nielson & Hamann, The asymptotic decider: resolving the ambiguity in marching cubes, IEEE Visualization 1991", "https://doi.org/10.1109/VISUAL.1991.175782"],
  ["[4]", "Blinn, A generalization of algebraic surface drawing (metaballs), ACM TOG 1982", "https://doi.org/10.1145/357306.357310"],
];
const SIMPLIFIED = [
  "The field is the simplest metaball sum, f = Σ r²/d², sampled at the grid corners. Its value at a source is capped so samples stay finite.",
  "Inside means f ≥ iso. The terrain height is a monotone function of f, so the waterline on the terrain is exactly the true iso-contour. The ribbon on the water is what marching squares recovers from the samples alone.",
  "The saddle cases (5 and 10) are resolved by the mean of the four corners (the centre bob). The asymptotic decider [3] uses the bilinear saddle value instead; it can disagree with the mean on rare cells.",
  "Corners exactly at iso count as inside, the same in every cell, so neighbouring cells always agree on a shared edge and the segments join.",
  "Contours that leave the grid stay open at the border. Every contour inside the grid closes.",
  "Only the march is slowed down for reading: a real implementation does all 1,024 cells of the fine grid in well under a millisecond.",
];

const live = `
${model}
const TOP = ${TOP}, TANK = ${JSON.stringify(TANK)}, FLOOR = ${FLOOR}, HMAX = ${HMAX}, GZ = ${GANTRY_Z}, RES = ${JSON.stringify(RES)}, MAXS = ${MAX_SOURCES}, BOARD = ${JSON.stringify(BOARD)};
const SPOTS = ${JSON.stringify(Array.from({ length: 16 }, (_, k) => caseSpot(k)))};
const heightOf = (f) => HMAX * (1 - Math.exp(-f / 1.4));
const { THREE } = fig;
const P = (id) => fig.parts.get(id);
const S = TANK.size, HALF = S / 2, dark = fig.theme === "dark";
const root = stage.closest(".iso-plate")?.parentElement ?? document.body;
const $ = (q) => root.querySelector(q), status = $("[data-live]");
const btn = { play: $("[data-play]"), step: $("[data-step]"), interp: $("[data-interp]"), add: $("[data-add]"), del: $("[data-del]") };
const resBtns = [...root.querySelectorAll("[data-res]")], isoIn = $("[data-iso]"), isoOut = $("[data-iso-out]");
const COL = { inside: "#ffb547", outside: dark ? "#3c4a5c" : "#6f7d90", ink: "#22252b", amber: "#e08a1e" };

// ---------------- state
let sources = ${JSON.stringify(SOURCES0)}.map((s) => s.slice());
const home = sources.map((s) => s.slice());
let resIdx = 1, n = RES[resIdx], iso = 1, interp = true, at = 0, playing = !still.matches, clock = 0, hold = 0;
let data = null, dirty = true, drag = -1, tourPass = 0;
const tour = idleTour(5000, () => { playing = true; runner.kick(); });

// ---------------- parts
const terrain = P("terrain"), water = P("water"), gWater = P("gauge-water"), gFloat = P("gauge-float");
const stems = P("pin-stems"), caps = P("pin-caps"), bridge = P("bridge"), carriage = P("carriage");
const CORN = [["tl", -1, 1], ["tr", 1, 1], ["br", 1, -1], ["bl", -1, -1]];
const probes = CORN.map(([k, sx, sy]) => ({ k, sx, sy, g: P("probe-" + k), rod: P("probe-rod-" + k), tip: P("probe-tip-" + k), sleeve: P("probe-sleeve-" + k), lamp: P("lamp-" + k) }));
const bits = [8, 4, 2, 1].map((b) => P("bit-" + b)), bob = P("centre-bob"), line = P("centre-line");
const tiles = Array.from({ length: 16 }, (_, k) => P("tile-" + k)), tileScreens = Array.from({ length: 16 }, (_, k) => fig.screens.get("tile-face-" + k));
const srcNodes = Array.from({ length: MAXS }, (_, k) => P("src-" + k));
const plotBridge = P("plot-bridge"), penCar = P("pen-carriage");
const paper = fig.screens.get("paper"), insp = fig.screens.get("inspect-screen");
const fcache = new Float32Array(terrain.geometry.attributes.position.count);
const inside = new THREE.Color(COL.inside), outside = new THREE.Color(COL.outside);
const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
for (const p of probes) p.lamp.material.emissive = new THREE.Color(0x000000);
for (const b of bits) b.material.emissive = new THREE.Color(0x000000);
const head = { x: 0, y: 0, lift: new Float32Array(16) };

// ---------------- the model run
function recompute() {
  const vals = sampleGrid(sources, n, S);
  const m = march(vals, n, S, iso, interp);
  data = { vals, cells: m.cells, segs: m.segs, lines: stitch(m.segs) };
  at = Math.min(at, n * n - 1);
  // terrain: heights from the field, colour by the field against iso (cool outside, warm inside)
  let i = 0;
  fig.heights("terrain", (x, y) => { const f = fieldAt(sources, x, y); fcache[i++] = f; return 0.5 + heightOf(f); });
  fig.paint("terrain", (x, y, z, k) => { const f = fcache[k]; return f < iso ? 0.49 * Math.pow(f / iso, 1.4) : 0.51 + 0.49 * Math.min(1, (f - iso) / (2.5 * iso)); }, "field");
  // pins at the samples
  const N1 = n + 1, s = n <= 8 ? 1.7 : n <= 16 ? 1.15 : 0.75;
  stems.count = caps.count = N1 * N1;
  for (let j = 0; j < N1; j++) for (let a = 0; a < N1; a++) {
    const k = j * N1 + a, f = vals[k], x = -HALF + (a * S) / n, y = -HALF + (j * S) / n, z = 0.5 + heightOf(f);
    stems.setMatrixAt(k, m4.compose(v3.set(x, y, z), q0, sc.set(s, s, 1)));
    caps.setMatrixAt(k, m4.compose(v3.set(x, y, z + 12), q0, sc.set(s, s, s)));
    caps.setColorAt(k, f >= iso ? inside : outside);
  }
  stems.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true; caps.instanceColor.needsUpdate = true;
  // water and gauge at the iso height
  const wz = heightOf(iso);
  water.scale.z = wz; gWater.scale.z = Math.max(0.01, wz - 5); gFloat.position.z = FLOOR + wz - 3;
  fig.ribbon("contour", data.lines.map((l) => ({ closed: l.closed, points: l.points.map((p) => [p.x, p.y, wz + 0.9]) })));
  srcNodes.forEach((g, k) => { g.visible = k < sources.length; if (k < sources.length) g.position.set(TANK.x + sources[k][0], TANK.y + sources[k][1], FLOOR); });
  for (let k = 0; k < 16; k++) drawTile(k);
  dirty = false;
}

// ---------------- drawing: tiles, paper, inspector
const EDGE_PT = { T: [64, 16], R: [112, 64], B: [64, 112], L: [16, 64] };
function drawTile(k) {
  const scr = tileScreens[k], g = scr.ctx, c = data && data.cells[at], active = c && c.idx === k;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.fillStyle = active ? "#fff4dc" : "#ece5d3"; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#b9b09a"; g.lineWidth = 2; g.strokeRect(16, 16, 96, 96);
  g.fillStyle = "#b3a88e"; g.font = "700 44px ui-monospace, Menlo, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(k), 64, 66);
  const seg = (pairs, dash) => { g.setLineDash(dash ? [6, 6] : []); g.strokeStyle = dash ? "#8d846f" : COL.ink; g.lineWidth = dash ? 4 : 9; g.lineCap = "round";
    for (const [a, b] of pairs) { g.beginPath(); g.moveTo(...EDGE_PT[a]); g.lineTo(...EDGE_PT[b]); g.stroke(); } g.setLineDash([]); };
  if (k === 5 || k === 10) {
    const useJoined = active && c.joined;
    seg(useJoined ? SADDLES[k].split : SADDLES[k].joined, true); seg(useJoined ? SADDLES[k].joined : SADDLES[k].split, false);
  } else seg(CASES[k], false);
  [[8, 16, 16], [4, 112, 16], [2, 112, 112], [1, 16, 112]].forEach(([b, x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); if (k & b) { g.fillStyle = COL.amber; g.fill(); } else { g.fillStyle = "#ece5d3"; g.fill(); g.strokeStyle = "#7d7562"; g.lineWidth = 3; g.stroke(); } });
  if (active) { g.strokeStyle = COL.amber; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122); }
  scr.update();
}
const PK = 880 / 480, PX = (x) => 512 + x * PK, PY = (y) => 512 - y * PK;
function drawPaper() {
  const g = paper.ctx, h = S / n, c = data.cells[at], done = still.matches ? n * n : at + 1;
  g.fillStyle = "#f3eee2"; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(60,80,110,0.22)"; g.lineWidth = 1.5;
  for (let k = 0; k <= n; k++) { const u = PX(-HALF + k * h); g.beginPath(); g.moveTo(u, PY(HALF)); g.lineTo(u, PY(-HALF)); g.stroke(); g.beginPath(); g.moveTo(PX(-HALF), PY(-HALF + k * h)); g.lineTo(PX(HALF), PY(-HALF + k * h)); g.stroke(); }
  // the marched rows so far, shaded
  const row = Math.floor((done - 1) / n);
  g.fillStyle = "rgba(224,138,30,0.06)"; g.fillRect(PX(-HALF), PY(-HALF + row * h), PX(HALF) - PX(-HALF), PY(-HALF) - PY(-HALF + row * h));
  // segments: future ones faint and dashed, marched ones in ink
  g.lineCap = "round";
  data.cells.forEach((cl, k) => { if (!cl.segs.length) return; const ink = k < done;
    g.setLineDash(ink ? [] : [6, 8]); g.strokeStyle = ink ? COL.ink : "rgba(60,70,90,0.28)"; g.lineWidth = ink ? (n >= 32 ? 3.2 : 4.5) : 2;
    for (const [a, b] of cl.segs) { g.beginPath(); g.moveTo(PX(a.x), PY(a.y)); g.lineTo(PX(b.x), PY(b.y)); g.stroke(); } });
  g.setLineDash([]);
  // samples: filled inside, hollow outside
  const r = n <= 8 ? 9 : n <= 16 ? 6 : 3.4;
  for (let j = 0; j <= n; j++) for (let a = 0; a <= n; a++) { const inn = data.vals[j * (n + 1) + a] >= iso; g.beginPath(); g.arc(PX(-HALF + a * h), PY(-HALF + j * h), r, 0, 7);
    if (inn) { g.fillStyle = COL.amber; g.fill(); } else { g.strokeStyle = "rgba(60,70,90,0.55)"; g.lineWidth = 1.5; g.stroke(); } }
  // the current cell and its edge crossings
  const x0 = -HALF + c.i * h, y0 = -HALF + c.j * h;
  g.strokeStyle = "#c2410c"; g.lineWidth = 4; g.strokeRect(PX(x0), PY(y0 + h), h * PK, h * PK);
  for (const [a, b] of c.segs) for (const e of [a, b]) { g.beginPath(); g.arc(PX(e.x), PY(e.y), 7, 0, 7); g.fillStyle = "#c2410c"; g.fill(); }
  g.fillStyle = "#3a3d44"; g.font = "600 26px ui-monospace, Menlo, monospace"; g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillText("iso " + iso.toFixed(2) + " · " + n + "×" + n + " · " + (interp ? "interpolated" : "midpoints"), 66, 48);
  g.textAlign = "right"; const closed = data.lines.filter((l) => l.closed).length;
  g.fillText(data.lines.length + " contour" + (data.lines.length === 1 ? "" : "s") + ", " + closed + " closed", 958, 48);
  paper.update();
}
const f2 = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(2));
function drawInspector() {
  const g = insp.ctx, c = data.cells[at], W = 636, H = 456;
  g.setTransform(732 / 636, 0, 0, 528 / 456, 0, 0);
  g.fillStyle = "#0e1418"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#7fa3b5"; g.font = "600 26px ui-monospace, Menlo, monospace"; g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillText("CELL " + c.i + "," + c.j + "  ·  " + (at + 1) + " of " + n * n + "  ·  iso " + iso.toFixed(2), 30, 44);
  // the cell: corners with values and bits
  const bx = 92, by = 96, bs = 180, cs = { tl: [bx, by], tr: [bx + bs, by], br: [bx + bs, by + bs], bl: [bx, by + bs] };
  g.strokeStyle = "#3d5866"; g.lineWidth = 2; g.strokeRect(bx, by, bs, bs);
  const EP = { T: (t) => [bx + t * bs, by], B: (t) => [bx + t * bs, by + bs], L: (t) => [bx, by + bs - t * bs], R: (t) => [bx + bs, by + bs - t * bs] };
  g.strokeStyle = "#ffd27a"; g.lineWidth = 5; g.lineCap = "round";
  c.pairs.forEach(([ea, eb], k) => { const [a, b] = c.segs[k]; g.beginPath(); g.moveTo(...EP[ea](a.t)); g.lineTo(...EP[eb](b.t)); g.stroke(); });
  [["tl", 8], ["tr", 4], ["br", 2], ["bl", 1]].forEach(([k, b]) => { const [x, y] = cs[k], v = c.corners[k], on = v >= iso;
    g.beginPath(); g.arc(x, y, 11, 0, 7); g.fillStyle = on ? "#ffb547" : "#0e1418"; g.fill(); g.strokeStyle = on ? "#ffb547" : "#5d7380"; g.lineWidth = 3; g.stroke();
    g.fillStyle = on ? "#ffd9a0" : "#8aa0ab"; g.font = "600 22px ui-monospace, Menlo, monospace"; g.textAlign = k[1] === "l" ? "right" : "left";
    g.fillText(f2(v), x + (k[1] === "l" ? -16 : 16), y + (k[0] === "t" ? -10 : 24)); });
  if (c.saddle) { g.beginPath(); g.arc(bx + bs / 2, by + bs / 2, 7, 0, 7); g.fillStyle = c.joined ? "#ffb547" : "#5d7380"; g.fill(); g.fillStyle = "#cfe0e8"; g.textAlign = "center"; g.font = "600 17px ui-monospace, Menlo, monospace"; g.fillText("c " + f2(c.centre), bx + bs / 2, by + bs / 2 + 26); }
  // the arithmetic
  const X = 340; let y = 112; g.textAlign = "left";
  const line = (t, col = "#cfe0e8", size = 20) => { g.fillStyle = col; g.font = "600 " + size + "px ui-monospace, Menlo, monospace"; g.fillText(t, X, y); y += size + 12; };
  line("TL TR BR BL", "#7fa3b5", 22);
  line(" " + c.bits.split("").join("  ") + " → " + c.idx, "#ffd27a", 30);
  const sum = [8, 4, 2, 1].filter((b) => c.idx & b);
  line("case " + c.idx + " = " + (sum.length ? sum.join("+") : "0"), "#9fb8c4", 22);
  if (c.saddle) line("saddle: c" + (c.joined ? "≥" : "<") + "iso → " + (c.joined ? "joined" : "split"), "#ffb547", 21);
  else line(c.idx === 0 ? "all outside: no line" : c.idx === 15 ? "all inside: no line" : c.segs.length + " segment" + (c.segs.length > 1 ? "s" : ""), "#9fb8c4", 22);
  y += 6;
  const named = { T: ["tl", "tr"], B: ["bl", "br"], L: ["bl", "tl"], R: ["br", "tr"] };
  const seen = new Set(); let y2 = null;
  c.pairs.forEach(([ea, eb], k) => [[ea, c.segs[k][0]], [eb, c.segs[k][1]]].forEach(([e, p]) => { if (seen.has(e) || (y2 ?? 0) > 440) return; seen.add(e);
    const [a, b] = named[e].map((q) => c.corners[q]);
    y2 = y2 ?? Math.max(y, by + bs + 56); g.fillStyle = "#cfe0e8"; g.font = "600 21px ui-monospace, Menlo, monospace"; g.textAlign = "left";
    g.fillText(interp ? e + "  t = (" + iso.toFixed(2) + " − " + f2(a) + ") / (" + f2(b) + " − " + f2(a) + ") = " + p.t.toFixed(2) : e + "  t = 0.50 (midpoint, interpolation off)", 30, y2); y2 += 32; }));
  insp.update();
}

// ---------------- head, probes, plotter
function placeHead(dt) {
  const c = data.cells[at], h = S / n, cx = -HALF + (c.i + 0.5) * h, cy = -HALF + (c.j + 0.5) * h;
  const snap = !dt || still.matches;
  head.x = snap ? cx : follow(head.x, cx, dt, 0.06); head.y = snap ? cy : follow(head.y, cy, dt, 0.06);
  bridge.position.x = TANK.x + head.x; carriage.position.y = head.y;
  const vals = c.corners, s = n <= 8 ? 1.7 : n <= 16 ? 1.15 : 0.75;
  probes.forEach((p, k) => {
    const v = vals[p.k], capTop = FLOOR + 0.5 + heightOf(v) + 12 + 3.6 * s, z = capTop - GZ, L = -z;
    p.g.position.set(p.sx * h / 2, p.sy * h / 2, z);
    p.rod.scale.z = L; p.sleeve.position.z = L - 12;
    const on = v >= iso; p.lamp.material.color.set(on ? COL.inside : COL.outside); p.lamp.material.emissive.set(on && dark ? "#a15a00" : "#000000");
    const bitOn = (c.idx & [8, 4, 2, 1][k]) !== 0; bits[k].material.color.set(bitOn ? COL.inside : COL.outside); bits[k].material.emissive.set(bitOn && dark ? "#7a4200" : "#000000"); bits[k].position.z = bitOn ? 9 : 5;
  });
  const bz = FLOOR + 0.5 + heightOf(c.centre) + 6 - GZ; bob.position.z = bz; line.position.z = bz; line.scale.z = -bz;
  for (let k = 0; k < 16; k++) { const want = k === c.idx ? 16 : 0; head.lift[k] = snap ? want : follow(head.lift[k], want, dt, 0.08); tiles[k].position.z = TOP + 22 + head.lift[k]; }
  // pen: to the current cell's last crossing (or its centre)
  const tgt = c.segs.length ? c.segs[c.segs.length - 1][1] : { x: cx, y: cy }, k = 300 / 480;
  plotBridge.position.y = BOARD.y + tgt.y * k + 16; penCar.position.x = tgt.x * k;
}
function readout() {
  const c = data.cells[at], closed = data.lines.filter((l) => l.closed).length;
  const open = data.lines.length - closed;
  const text = "cell " + c.i + "," + c.j + " · " + c.bits + " → case " + c.idx + (c.saddle ? (c.joined ? " · joined" : " · split") : "") + " · " + closed + " loop" + (closed === 1 ? "" : "s") + (open ? ", " + open + " open" : "");
  readoutTo(stage, text, c.idx);
}
let lastCell = -1, lastIdx = -1, lastJoined = null;
function show(dt, time) {
  if (dirty) { recompute(); lastCell = -1; }
  const c = data.cells[at];
  if (at !== lastCell) {
    if (c.idx !== lastIdx || c.joined !== lastJoined) { for (const k of new Set([lastIdx, c.idx, 5, 10])) if (k >= 0) drawTile(k); lastIdx = c.idx; lastJoined = c.joined; }
    drawPaper(); drawInspector(); readout(); lastCell = at;
  }
  placeHead(dt);
  if (!still.matches && time !== undefined) fig.time(time);
  fig.render();
}
function say(t) { if (status) status.textContent = t; }

// ---------------- controls
const setIso = (v) => { iso = clamp(Math.round(v * 100) / 100, 0.3, 3); if (isoIn) isoIn.value = String(iso); if (isoOut) isoOut.textContent = iso.toFixed(2); dirty = true; };
const setRes = (k) => { resIdx = (k + RES.length) % RES.length; const old = n; n = RES[resIdx];
  const c = data ? data.cells[at] : null; if (c) { const fi = Math.floor(((c.i + 0.5) / old) * n), fj = Math.floor(((c.j + 0.5) / old) * n); at = fj * n + fi; }
  resBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === resIdx))); dirty = true; say("Grid " + n + " by " + n + " cells."); };
const setInterp = (v) => { interp = v; if (btn.interp) { btn.interp.setAttribute("aria-pressed", String(v)); btn.interp.textContent = "I Interpolation " + (v ? "on" : "off"); } dirty = true; say(v ? "Edge crossings interpolated." : "Edge crossings at midpoints."); };
const setPlay = (v) => { playing = v && !still.matches; if (btn.play) { btn.play.setAttribute("aria-pressed", String(playing)); btn.play.textContent = playing ? "Space Pause" : "Space March"; } };
function step(d, toContour) {
  setPlay(false);
  const N = n * n; let k = at;
  do { k = (k + d + N) % N; } while (toContour && !data.cells[k].segs.length && k !== at);
  at = k; const c = data.cells[at];
  say("Cell " + c.i + ", " + c.j + ": bits " + c.bits + ", case " + c.idx + ", " + c.segs.length + " segments.");
}
function addSource() {
  if (sources.length >= MAXS) return say("Five sources is the most.");
  const spots = [[150, -150], [-150, 150], [160, 150], [-160, -160], [0, 0]];
  const free = spots.find(([x, y]) => sources.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > 90)) ?? [0, 0];
  sources.push([free[0], free[1], 46]); dirty = true; say("Source added. Drag its knob.");
}
function removeSource() { if (sources.length <= 1) return; sources.pop(); dirty = true; say("Source removed."); }
const touch = () => { tour.touch(); runner.kick(); };
btn.play?.addEventListener("click", () => { touch(); setPlay(!playing); });
btn.step?.addEventListener("click", () => { touch(); step(1, false); });
btn.interp?.addEventListener("click", () => { touch(); setInterp(!interp); });
btn.add?.addEventListener("click", () => { touch(); addSource(); });
btn.del?.addEventListener("click", () => { touch(); removeSource(); });
resBtns.forEach((b, i) => b.addEventListener("click", () => { touch(); setRes(i); }));
isoIn?.addEventListener("input", () => { touch(); setIso(Number(isoIn.value)); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") step(e.key === "ArrowRight" ? 1 : -1, e.shiftKey);
  else if (e.key === "n" || e.key === "N") step(1, true);
  else if (e.key === " ") setPlay(!playing);
  else if (e.key === "i" || e.key === "I") setInterp(!interp);
  else if (e.key === "r" || e.key === "R") setRes(resIdx + 1);
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") setIso(iso + (e.key === "ArrowUp" ? 0.05 : -0.05));
  else if (e.key === "a" || e.key === "A") addSource();
  else if (e.key === "Delete" || e.key === "Backspace") removeSource();
  else return;
  e.preventDefault(); touch();
});
// drag a knob; a click on the water picks a cell
const KNOB_Z = FLOOR + HMAX + 37;
stage.addEventListener("pointerdown", (e) => {
  const p = fig.toWorld(e, KNOB_Z); if (!p) return;
  let best = -1, bd = 34;
  sources.forEach(([x, y], k) => { const d = Math.hypot(TANK.x + x - p.x, TANK.y + y - p.y); if (d < bd) { bd = d; best = k; } });
  touch();
  if (best >= 0) { drag = best; stage.setPointerCapture(e.pointerId); e.preventDefault(); return; }
  const w = fig.toWorld(e, FLOOR + heightOf(iso)); if (!w) return;
  const lx = w.x - TANK.x, ly = w.y - TANK.y;
  if (Math.abs(lx) < HALF && Math.abs(ly) < HALF) { setPlay(false); const h = S / n; at = Math.floor((ly + HALF) / h) * n + Math.floor((lx + HALF) / h); }
});
stage.addEventListener("pointermove", (e) => {
  if (drag < 0) return;
  const p = fig.toWorld(e, KNOB_Z); if (!p) return;
  sources[drag][0] = clamp(p.x - TANK.x, -HALF + 24, HALF - 24); sources[drag][1] = clamp(p.y - TANK.y, -HALF + 24, HALF - 24); dirty = true; touch();
});
const endDrag = () => { if (drag >= 0) say("Source moved: the field and every contour follow."); drag = -1; };
stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);

// ---------------- the loop
let driftClock = 0;
const runner = loop(stage, (dt, time) => {
  if (tour.touring) {
    driftClock += dt;
    if (Math.floor(driftClock * 10) % 3 === 0) { sources.forEach((s, k) => { const hm = home[k] ?? s; s[0] = hm[0] + 28 * Math.sin(driftClock * 0.23 + k * 2.1); s[1] = hm[1] + 22 * Math.cos(driftClock * 0.19 + k * 1.3); }); dirty = true; }
  }
  if (playing) {
    if (hold > 0) hold -= dt;
    else { clock += dt * (n * n) / 11; const adv = Math.floor(clock); if (adv > 0) { clock -= adv; at += adv; if (at >= n * n) { at = n * n - 1; hold = 1.6; clock = 0;
      if (tour.touring) { tourPass++; setRes([1, 0, 2, 1][tourPass % 4]); setInterp(tourPass % 4 !== 2); }
      setTimeout(() => { at = 0; lastCell = -1; }, 1500); } } }
  }
  show(dt, time);
  return playing || tour.touring || drag >= 0 || Math.abs(head.x - (-HALF + (data.cells[at].i + 0.5) * S / n)) > 0.3;
});
// still: the whole contour drawn, the head parked on a saddle if there is one, else on the first cell with a line
recompute();
if (still.matches) { const k = data.cells.findIndex((c) => c.saddle); at = k >= 0 ? k : data.cells.findIndex((c) => c.segs.length); }
setIso(1); setRes(1); setInterp(true); setPlay(playing);
show(0);
window.__march = { go: (k) => { setPlay(false); tour.touch(); at = k; runner.kick(); }, get data() { return data; }, get at() { return at; }, get n() { return n; }, get iso() { return iso; }, get interp() { return interp; }, sources };
`;
const css = `.ms-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font:11px/1.4 var(--anatomy-mono);color:var(--anatomy-muted)}
.ms-ctl button{padding:5px 9px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-muted);font:inherit;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.ms-ctl button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-strong)}.ms-ctl input{width:120px}.ms-ctl .ms-gap{width:10px}
.ms-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.ms-notes a{color:inherit}.ms-notes ul{margin:4px 0 8px 18px;padding:0}
.ms-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const notes = `<details class="ms-notes"><summary>Sources and simplifications</summary><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;
writeThreeFigure({
  dir: here,
  name: "marching-squares-3d",
  scene, live, css, width: 980,
  keys: [
    { mark: "lit", label: "Centre bob: the mean of the four corners, which decides saddle cases 5 and 10" },
    { mark: "raised", label: "Terrain coloured by the field: warm is inside (f ≥ iso), cool is outside" },
    { mark: "edge", label: "Gold ribbon on the water: the stitched marching-squares contour" },
  ],
  caption: `Marching squares turns samples of a scalar field into contour lines [1]. It is the 2D form of marching cubes [2]. Here the field is a sum of metaballs [4], one per brass knob, shown as terrain in a tank. The water level is the iso-value, so land above water is inside. A survey pin stands at every grid corner: these samples are all the algorithm sees. The gantry visits each cell in turn. Each of its four probes reads one corner, and the lamp lights if that corner is inside: one bit, TL = 8, TR = 4, BR = 2, BL = 1. The four bits form a case index from 0 to 15, which picks one of 16 stencils from the type case. Cases 5 and 10 are saddles, with two diagonal corners inside. Their stencil depends on the centre bob, the mean of the four corners: at or above iso, the inside corners join; below, they stay apart [3]. Along each crossed edge, the crossing goes where linear interpolation puts the iso-value, t = (iso − a)/(b − a). Turn interpolation off and every crossing falls at an edge midpoint, so the contour turns blocky. Neighbouring cells compute the same crossing on a shared edge, so the segments join. The plotter draws them on the sheet, and they are stitched end to end into contours. Every contour inside the grid closes. A coarse grid misses thin necks and small islands that the waterline still shows.`,
  stage: { role: "group", label: "Contour bench. Arrow keys step cell by cell, N (or Shift and right arrow) jumps to the next cell with a line, Space marches, I toggles interpolation, R changes grid resolution, up and down change the iso-value, A adds a source and Delete removes one. Drag a knob to move a source." },
  after: `<div class="ms-ctl" role="group" aria-label="Marching squares controls"><button type="button" data-play aria-pressed="true">Space Pause</button><button type="button" data-step>→ Step</button><button type="button" data-interp aria-pressed="true">I Interpolation on</button><span class="ms-gap"></span>${RES.map((r, i) => `<button type="button" data-res="${r}" aria-pressed="${i === 1}">${r}×${r}</button>`).join("")}<span class="ms-gap"></span><button type="button" data-add>A + Source</button><button type="button" data-del>− Source</button><label>Iso <input type="range" min="0.3" max="3" step="0.01" value="1" data-iso aria-label="Iso-value: the water level"></label><span data-iso-out>1.00</span></div><span class="ms-live" aria-live="polite" data-live></span>${notes}`,
});
