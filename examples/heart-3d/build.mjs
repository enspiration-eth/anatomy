import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, FACTS, SOURCES, SIMPLIFIED, PHASES, LEAFLETS, PATHS, SA, AV, SAT_T, LV, RV, cycleOf, phaseAt, pressuresAt } from "./scene.mjs";

const live = `
const FACTS = ${JSON.stringify(FACTS)}, PHASES = ${JSON.stringify(PHASES)}, LEAFLETS = ${JSON.stringify(LEAFLETS)}, PATHS = ${JSON.stringify(PATHS)};
const SA = ${JSON.stringify(SA)}, AV = ${JSON.stringify(AV)}, SAT_T = ${JSON.stringify(SAT_T)}, LV = ${JSON.stringify(LV)}, RV = ${JSON.stringify(RV)};
${cycleOf.toString()}
${phaseAt.toString()}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
${pressuresAt.toString()}
const { THREE } = fig;
const P = (id) => fig.parts.get(id), G = (id) => fig.shaders.get(id);
const leaflets = LEAFLETS.map((l) => ({ ...l, node: P(l.id), s: { at: 0, rate: 0 } }));
const groups = { lv: P("lv"), rv: P("rv"), ra: P("ra"), la: P("la") };
const walls = ["lv-wall", "rv-wall", "ra-wall", "la-wall"].map(P);
const wave = P("wave"), waveG = G("wave"), saG = G("sa-glow"), avG = G("av-glow");
const flows = ["aorta", "pulmonary-trunk", "pulmonary-left", "pulmonary-right", "svc", "ivc", "pulmonary-vein-0", "pulmonary-vein-1", "pulmonary-vein-2", "pulmonary-vein-3", "arch-branch-0", "arch-branch-1", "arch-branch-2"].map((id) => ({ id, g: G(id) }));
const coronaries = ["circumflex", "obtuse-marginal", "posterior-descending", "right-coronary", "acute-marginal", "great-cardiac-vein", "middle-cardiac-vein"].map(G);
const curves = Object.fromEntries(Object.entries(PATHS).map(([k, pts]) => [k, new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))]));
const screen = fig.screens.get("monitor-screen");
const root = stage.parentElement, status = root.querySelector("[data-live]");
const buttons = [...root.querySelectorAll("[data-phase]")], slider = root.querySelector("[data-bpm]"), bpmOut = root.querySelector("[data-bpm-out]");
// Blood by saturation: right heart 75%, left 95%, with a slight swirl of variation.
for (const [id, t] of [["rv-blood", SAT_T.right], ["ra-blood", SAT_T.right], ["lv-blood", SAT_T.left], ["la-blood", SAT_T.left]])
  fig.paint(id, (x, y, z) => t + 0.04 * Math.sin(x * 0.2 + z * 0.13) * Math.cos(y * 0.17), "oxygen");
for (const w of walls) { w.material.emissive = new THREE.Color("#ff9a4a"); w.material.emissiveIntensity = 0; }

let bpm = 72, c = cycleOf(bpm), t = c.ejStart + 0.12, playing = !still.matches;
const tour = idleTour(4000, () => runner.kick());
const tourBpm = [72, 120, 60, 150, 72];
let tourClock = 0;

function setBpm(v, quiet) {
  const at = t / c.T; bpm = clamp(Math.round(v), 40, 180); c = cycleOf(bpm); t = at * c.T;
  if (slider) slider.value = String(bpm); if (bpmOut) bpmOut.textContent = bpm + " bpm";
  if (status && !quiet) status.textContent = "Heart rate " + bpm + " beats a minute.";
  runner.kick();
}
const starts = () => [c.atrialStart, c.ivcStart, c.ejStart, c.ejEnd, c.ivrEnd, c.rapidEnd];
function gotoPhase(i, quiet) {
  i = (i + 6) % 6; const s = starts(), e = [...s.slice(1), c.T + c.atrialStart][i];
  t = ((s[i] + e) / 2) % c.T; playing = false;
  if (status && !quiet) status.textContent = PHASES[i] + ".";
  runner.kick();
}
// Electrical activation 0..1 of each region at time t, and where the wave front is.
function electric(tt) {
  const atria = sm(0, c.atrialStart + 0.06, tt) * (1 - sm(c.ivcStart, c.ejStart + 0.04, tt));
  const vent = sm(c.ivcStart - 0.04, c.ejStart, tt) * (1 - sm(c.ejEnd - 0.06, c.ivrEnd, tt));
  let pos = null, level = 0;
  const pr = c.atrialEnd;
  if (tt < 0.08) { pos = curves.internodal.getPointAt(tt / 0.08 * 0.999); level = 1; }
  else if (tt < pr - 0.03) { pos = new THREE.Vector3(...AV); level = 0.55 + 0.25 * Math.sin(tt * 40); }
  else if (tt < pr + 0.06) { const f = (tt - pr + 0.03) / 0.09; pos = f < 0.4 ? curves.his.getPointAt(f / 0.4) : curves.left.getPointAt((f - 0.4) / 0.6 * 0.999); level = 1; }
  return { atria, vent, pos, level, sa: Math.max(0, 1 - tt / 0.06), av: tt > 0.06 && tt < pr ? 0.8 : 0 };
}
function ecg(tt) {
  const g = (m, w, a) => a * Math.exp(-(((tt - m) / w) ** 2));
  return g(0.05, 0.025, 0.15) + g(c.ivcStart - 0.02, 0.008, -0.1) + g(c.ivcStart, 0.012, 1) + g(c.ivcStart + 0.02, 0.01, -0.25) + g(c.ejEnd - 0.06, 0.05, 0.3);
}
function paintScreen(p) {
  const { ctx, canvas } = screen, W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#0b0f13"; ctx.fillRect(0, 0, W, H);
  const x0 = 50, x1 = W - 20, yP = (v) => 270 - v * 1.75, X = (tt) => x0 + (tt / c.T) * (x1 - x0);
  ctx.strokeStyle = "#1f2a33"; ctx.lineWidth = 1; ctx.font = "15px ui-monospace, Menlo, monospace"; ctx.fillStyle = "#6c7a88";
  for (const v of [0, 40, 80, 120]) { ctx.beginPath(); ctx.moveTo(x0, yP(v)); ctx.lineTo(x1, yP(v)); ctx.stroke(); ctx.fillText(String(v), 10, yP(v) + 5); }
  const s = starts();
  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(X(c.ivcStart), 30, X(c.ejStart) - X(c.ivcStart), 245); ctx.fillRect(X(c.ejEnd), 30, X(c.ivrEnd) - X(c.ejEnd), 245);
  const series = [["ao", "#e85a50", "Ao"], ["lv", "#ffd27a", "LV"], ["la", "#7fd0ff", "LA"], ["pa", "#c07ab0", "PA"], ["rv", "#9ad07a", "RV"]];
  const n = 160, pts = Array.from({ length: n + 1 }, (_, i) => pressuresAt(c, (i / n) * c.T));
  series.forEach(([k, col, name], j) => {
    ctx.strokeStyle = col; ctx.lineWidth = k === "lv" || k === "ao" ? 3 : 2; ctx.beginPath();
    pts.forEach((q, i) => { const x = X((i / n) * c.T), y = yP(q[k]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.fillStyle = col; ctx.fillText(name, x0 + 10 + j * 52, 24);
  });
  ctx.fillStyle = "#6c7a88"; ctx.fillText("mmHg", W - 70, 24);
  ctx.strokeStyle = "#7affa0"; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const tt = (i / n) * c.T, y = 360 - ecg(tt) * 55; i ? ctx.lineTo(X(tt), y) : ctx.moveTo(X(tt), y); } ctx.stroke();
  ctx.fillStyle = "#6c7a88"; ctx.fillText("ECG", 10, 362);
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(t), 30); ctx.lineTo(X(t), 400); ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.font = "600 17px ui-monospace, Menlo, monospace"; ctx.fillText(PHASES[phaseAt(c, t)], x0, 410);
  ctx.fillText(bpm + " bpm", x1 - 80, 410);
  screen.update();
}
function draw(time) {
  const ph = phaseAt(c, t), p = pressuresAt(c, t), e = electric(t);
  // Contraction: the ventricles squeeze radially and shorten during ejection; the atria during atrial systole.
  const sq = sm(c.ivcStart, c.ejEnd, t) * (1 - sm(c.ejEnd, c.rapidEnd, t));
  for (const k of ["lv", "rv"]) { const g = groups[k]; g.scale.set(1 - 0.11 * sq, 1 - 0.11 * sq, 1 - 0.05 * sq); g.position.z = (k === "lv" ? LV.apex : RV.apex) + (k === "lv" ? LV.len : RV.len) * 0.05 * sq; }
  const as = Math.sin(Math.PI * sm(c.atrialStart, c.atrialEnd, t)) * (t < c.atrialEnd + 0.02 ? 1 : 0);
  for (const k of ["ra", "la"]) groups[k].scale.setScalar(1 - 0.07 * as);
  walls[0].material.emissiveIntensity = walls[1].material.emissiveIntensity = 0.35 * e.vent;
  walls[2].material.emissiveIntensity = walls[3].material.emissiveIntensity = 0.35 * e.atria;
  wave.visible = !!e.pos; if (e.pos) wave.position.copy(e.pos); waveG.uniforms.uLevel.value = e.level;
  saG.uniforms.uLevel.value = e.sa; avG.uniforms.uLevel.value = e.av;
  const ej = ph === 2 ? 1 : 0, fill = ph === 4 || ph === 0 ? 1 : 0.4;
  for (const f of flows) f.g.uniforms.uLevel.value = /aorta|pulmonary-(trunk|left|right)|arch/.test(f.id) ? 0.2 + 0.8 * ej : 0.3 + 0.5 * fill;
  for (const g of coronaries) g.uniforms.uLevel.value = ph === 3 || ph === 4 ? 0.9 : 0.35; // coronaries fill in diastole
  for (const l of leaflets) { const a = l.av ? -l.side * 72 : l.side * 80; l.node.rotation.y = (a * Math.PI / 180) * l.s.at; }
  paintScreen(p);
  readoutTo(stage, PHASES[ph] + " · LV " + Math.round(p.lv) + " / Ao " + Math.round(p.ao) + " · RV " + Math.round(p.rv) + " / PA " + Math.round(p.pa) + " mmHg · " + bpm + " bpm", Math.round(p.lv));
  if (!still.matches) fig.time(time);
  fig.render();
}
const runner = loop(stage, (dt, time) => {
  if (tour.touring) { tourClock += dt; const want = tourBpm[Math.floor(tourClock / 8) % tourBpm.length]; if (want !== bpm) setBpm(want, true); playing = true; }
  if (playing && !still.matches) t = (t + dt * (bpm >= 120 ? 0.6 : 0.5)) % c.T; // shown at half speed
  const ph = phaseAt(c, t); let busy = false;
  const avOpen = ph === 4 || ph === 5 || ph === 0, slOpen = ph === 2;
  for (const l of leaflets) busy = spring(l.s, (l.av ? avOpen : slOpen) ? 1 : 0, dt, 600, 40) || busy;
  draw(time);
  return busy || (playing && !still.matches) || tour.touring;
});
stage.addEventListener("keydown", (event) => {
  const k = event.key;
  if (k === " ") { playing = !playing; if (status) status.textContent = playing ? "Playing." : "Paused at " + PHASES[phaseAt(c, t)] + "."; runner.kick(); }
  else if (k === "ArrowRight") gotoPhase(phaseAt(c, t) + 1);
  else if (k === "ArrowLeft") gotoPhase(phaseAt(c, t) - 1);
  else if (k === "ArrowUp" || k === "+" || k === "=") setBpm(bpm + 10);
  else if (k === "ArrowDown" || k === "-") setBpm(bpm - 10);
  else return;
  event.preventDefault(); tour.touch();
});
buttons.forEach((b) => b.addEventListener("click", () => { tour.touch(); gotoPhase(Number(b.dataset.phase)); }));
if (slider) slider.addEventListener("input", () => { tour.touch(); setBpm(Number(slider.value)); });
stage.addEventListener("click", () => { stage.focus(); tour.touch(); gotoPhase(phaseAt(c, t) + 1); });
if (still.matches) for (const l of leaflets) l.s.at = (l.av ? false : true) ? 1 : 0;
setBpm(72, true);
draw(0);
`;

const css = `.ht-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font:11px/1.4 var(--anatomy-mono)}
.ht-ctl button{padding:5px 9px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-muted);font:inherit;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.ht-ctl label{display:flex;gap:6px;align-items:center;color:var(--anatomy-muted)}.ht-ctl input{width:140px}
.ht-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.ht-notes a{color:inherit}.ht-notes ul{margin:4px 0 8px 18px;padding:0}
.ht-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const notes = `<details class="ht-notes"><summary>Sources and simplifications</summary><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "heart-3d",
  scene, live, css, width: 860,
  keys: [
    { mark: "lit", label: "SA node: the pacemaker; the glow is the electrical wave" },
    { mark: "raised", label: "Section through the four chambers, walls hatched, blood filled" },
    { mark: "edge", label: "Valves open and close with the pressure differences" },
  ],
  caption: `The human heart in a four-chamber section, as a three.js scene. Blood returns from the body to the right atrium, passes the tricuspid valve into the right ventricle, and is pumped through the pulmonary valve to the lungs. It returns to the left atrium, passes the mitral valve, and the left ventricle pumps it through the aortic valve to the body. Average resting pressures are LV ${FACTS.lv[0]}/${FACTS.lv[1]}, aorta ${FACTS.artery[0]}/${FACTS.artery[1]}, RV ${FACTS.rv[0]}/${FACTS.rv[1]}, PA ${FACTS.pa[0]}/${FACTS.pa[1]}, LA mean ${FACTS.la} and RA mean ${FACTS.ra} mmHg [1]. Blood is coloured by oxygen saturation, about ${FACTS.satRight}% in the right heart and ${FACTS.satLeft}% in the left [2]. Each beat starts at the SA node, crosses the atria, is held at the AV node (a PR interval of ${FACTS.pr[0]}–${FACTS.pr[1]} s), then runs down the His bundle and bundle branches into the Purkinje fibres [3]. Valves open only when the pressure behind them exceeds the pressure ahead. Both sets are shut during the isovolumetric phases [5]. At higher rates diastole shortens much more than systole: ejection time ≈ ${FACTS.lvet[0]} − ${FACTS.lvet[1]} × HR ms [4]. The monitor plots the model's Wiggers diagram. The scene uses a fibre texture on the muscle, saturation vertex colours on the blood, flow shaders on the vessels and a glow shader for the wave. The animation runs at half speed.`,
  stage: { role: "group", label: "Heart in section. Space plays or pauses; left and right arrows step the cardiac phases; up and down change the heart rate." },
  after: `<div class="ht-ctl" role="group" aria-label="Cardiac cycle">${PHASES.map((p, i) => `<button type="button" data-phase="${i}">${esc(p)}</button>`).join("")}<label>Rate <input type="range" min="40" max="180" step="1" value="72" data-bpm aria-label="Heart rate, beats per minute"><span data-bpm-out>72 bpm</span></label></div><span class="ht-live" aria-live="polite" data-live></span>${notes}`,
});
