import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, FACTS, SOURCES, SIMPLIFIED, HEART, CHEST_FRONT, ARM_NERVE, HEART_RINGS, BRAIN_RINGS, EARTH_LINES, DEPTH, heartPtAt, heartDipole, leadII } from "./scene.mjs";

const SOURCES_UI = [["heart", "Heart (MCG)"], ["brain", "Brain (MEG)"], ["nerve", "Nerve & EMG"], ["earth", "Earth's field"], ["skin", "Skin potential (ECG)"]];
const live = `
const FACTS = ${JSON.stringify(FACTS)}, HEART = ${JSON.stringify(HEART)}, CHEST = ${JSON.stringify(CHEST_FRONT)}, NERVE = ${JSON.stringify(ARM_NERVE)};
const HEART_RINGS = ${JSON.stringify(HEART_RINGS)}, BRAIN_RINGS = ${JSON.stringify(BRAIN_RINGS)}, EARTH_LINES = ${JSON.stringify(EARTH_LINES)}, UI = ${JSON.stringify(SOURCES_UI)};
const DEPTH = ${DEPTH};
const heartPtAt = ${heartPtAt.toString()};
${heartDipole.toString()}
const leadII = ${leadII.toString()};
const { THREE } = fig;
const P = (id) => fig.parts.get(id), G = (id) => fig.shaders.get(id);
const root = stage.parentElement, status = root.querySelector("[data-live]"), slider = root.querySelector("[data-dist]"), distOut = root.querySelector("[data-dist-out]");
const toggles = [...root.querySelectorAll("[data-src]")];
const on = { heart: true, brain: true, nerve: true, earth: true, skin: true };
const heartGroup = P("heart-field"), brainGroup = P("brain-field"), mcg = P("mcg"), probe = P("probe-mark"), needle = P("compass-needle");
const hRings = HEART_RINGS.map((r) => ({ ...r, g: G(r.id), node: P(r.id) })), bRings = BRAIN_RINGS.map((r) => ({ ...r, g: G(r.id), node: P(r.id) }));
const earth = EARTH_LINES.map((id) => ({ g: G(id), node: P(id) })), nerve = P("nerve"), nerveG = G("nerve");
const impulses = [0, 1, 2].map((i) => ({ node: P("impulse-" + i), g: G("impulse-" + i), t: -1 })), muscle = G("muscle-glow"), heartGlow = G("heart-glow");
const curve = new THREE.CatmullRomCurve3(NERVE.map((p) => new THREE.Vector3(...p))), nerveLen = curve.getLength();
const screen = fig.screens.get("monitor-screen");
const body = P("body"), bpos = body.geometry.attributes.position;
const z = new THREE.Vector3(0, 0, 1), dv = new THREE.Vector3(), q = new THREE.Quaternion();
let v = 0, d = 10, beat = 0.215, playing = !still.matches, frame = 0, ecg = new Float32Array(300), ecgAt = 0, emg = new Float32Array(300), emgAt = 0, nerveClock = 0, act = 0, alpha = 1;
const tour = idleTour(4000, () => runner.kick());
let tourClock = 0;
const distOf = (val) => 10 * Math.pow(300, val / 100);
function setDist(val, quiet) {
  v = clamp(val, 0, 100); d = distOf(v);
  if (slider) slider.value = String(Math.round(v)); if (distOut) distOut.textContent = fmtD(d);
  if (status && !quiet) status.textContent = "Sensor " + fmtD(d) + " from the chest: heart field " + fmtT(heartPtAt(d) * 1e-12) + ".";
  runner.kick();
}
const fmtD = (mm) => mm < 1000 ? Math.round(mm) + " mm" : (mm / 1000).toFixed(1) + " m";
const fmtX = (r) => r >= 1e9 ? (r / 1e9).toFixed(1) + " billion" : r >= 1e6 ? (r / 1e6).toFixed(1) + " million" : Math.round(r).toLocaleString("en");
function fmtT(T) { const u = [[1, "T"], [1e-3, "mT"], [1e-6, "µT"], [1e-9, "nT"], [1e-12, "pT"], [1e-15, "fT"]]; for (const [s, n] of u) if (T >= s) { const x = T / s; return (x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(0) : x.toFixed(1)) + " " + n; } return (T / 1e-15).toFixed(2) + " fT"; }
function toggle(key, quiet) { on[key] = !on[key]; toggles.forEach((b) => b.setAttribute("aria-pressed", String(on[b.dataset.src]))); if (status && !quiet) status.textContent = UI.find((u) => u[0] === key)[1] + (on[key] ? " shown." : " hidden."); runner.kick(); }
function paintSkin(p) {
  // Body-surface potential of a current dipole in a uniform conductor: V ∝ p·r / |r|³ (r from the heart).
  const mag = Math.hypot(...p);
  fig.paint("body", (x, y, zz) => {
    if (!on.skin) return 0.5;
    const rx = x - HEART[0], ry = y - HEART[1], rz = zz - HEART[2], r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2);
    const V = (p[0] * rx + p[1] * ry + p[2] * rz) / (r2 * r) * 9000;
    return 0.5 + 0.5 * Math.tanh(V);
  }, "potential");
}
function chart() {
  const { ctx, canvas } = screen, W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#0c1015"; ctx.fillRect(0, 0, W, H);
  ctx.font = "600 15px ui-monospace, Menlo, monospace"; ctx.fillStyle = "#8a96a6"; ctx.fillText("Magnetic field, log scale (tesla)", 16, 26);
  const top = 46, bot = 420, lo = -15, hi = 1, Y = (T) => bot - ((Math.log10(T) - lo) / (hi - lo)) * (bot - top);
  ctx.strokeStyle = "#1e2933"; ctx.fillStyle = "#56636f"; ctx.font = "12px ui-monospace, Menlo, monospace";
  for (let e = lo; e <= hi; e += 3) { ctx.beginPath(); ctx.moveTo(70, Y(10 ** e)); ctx.lineTo(W - 12, Y(10 ** e)); ctx.stroke(); ctx.fillText("1e" + e, 14, Y(10 ** e) + 4); }
  const hp = heartPtAt(d) * 1e-12;
  const rows = [
    [FACTS.mriT[1], "MRI scanner 3 T", "#b0b8c4", true], [FACTS.fridgeUt * 1e-6, "fridge magnet", "#b0b8c4", true],
    [50e-6, "Earth 25–65 µT", "#8fe08a", on.earth], [FACTS.urbanFt * 1e-15, "city noise 0.1 µT", "#8a96a6", true],
    [hp, "heart at " + fmtD(d) + ": " + fmtT(hp), "#ff7a4a", on.heart], [FACTS.brainFt.alpha * 1e-15, "brain alpha 1 pT", "#7ad0ff", on.brain],
    [FACTS.brainFt.cortical * 1e-15, "brain evoked 10 fT", "#7ad0ff", on.brain], [FACTS.squidFt * 1e-15, "SQUID noise 3 fT/√Hz", "#56636f", true],
  ];
  for (const [T, label, col, vis] of rows) {
    const y = Y(T); ctx.globalAlpha = vis ? 1 : 0.3;
    ctx.fillStyle = col; ctx.fillRect(72, y - 3, Math.max(4, ((Math.log10(T) - lo) / (hi - lo)) * (W - 320)), 6);
    ctx.font = "600 15px ui-monospace, Menlo, monospace"; ctx.fillText(label, W - 236, y + 5);
  }
  ctx.globalAlpha = 1;
  // ECG (lead II, mV) and surface EMG (mV) strips.
  const strip = (arr, at, y0, amp, col, name) => { ctx.strokeStyle = "#1e2933"; ctx.strokeRect(16, y0 - 50, W - 32, 100); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < arr.length; i++) { const x = 16 + (i / arr.length) * (W - 32), yy = y0 - arr[(at + i) % arr.length] * amp; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); ctx.lineWidth = 1; ctx.fillStyle = "#8a96a6"; ctx.font = "600 15px ui-monospace, Menlo, monospace"; ctx.fillText(name, 22, y0 - 32); };
  strip(ecg, ecgAt, 500, 40, "#7affa0", "ECG lead II · 1 mV R wave");
  strip(emg, emgAt, 590, 30, "#ffe07a", "surface EMG · up to ~10 mV");
  screen.update();
}
function draw(time) {
  const p = heartDipole(beat), mag = Math.hypot(...p);
  // Heart field: the ring group follows the dipole axis; brightness follows |p| and each ring's own strength.
  heartGroup.visible = on.heart;
  if (mag > 1e-4) { dv.set(p[0], p[1], p[2]).normalize(); q.setFromUnitVectors(z, dv); heartGroup.quaternion.copy(q); }
  const lvl = Math.min(1, Math.sqrt(mag) * 1.1); // display compression: the field is near zero between beats
  for (const r of hRings) r.g.uniforms.uLevel.value = on.heart ? lvl * r.s : 0;
  heartGlow.uniforms.uLevel.value = on.heart ? 0.6 * lvl : 0;
  brainGroup.visible = on.brain;
  for (const r of bRings) r.g.uniforms.uLevel.value = on.brain ? Math.abs(alpha) * r.s * 0.8 : 0;
  brainGroup.rotation.z = alpha < 0 ? Math.PI : 0;
  for (const e of earth) { e.node.visible = on.earth; e.g.uniforms.uLevel.value = 0.55; }
  needle.rotation.z = 0;
  nerve.visible = on.nerve; nerveG.uniforms.uLevel.value = on.nerve ? 0.3 : 0;
  for (const im of impulses) { im.node.visible = on.nerve && im.t >= 0; if (im.node.visible) { im.node.position.copy(curve.getPointAt(Math.min(1, im.t))); im.g.uniforms.uLevel.value = 1; } }
  muscle.uniforms.uLevel.value = on.nerve ? act * 0.8 : 0;
  // The sensor: the dewar's tip at distance d (drawn up to 0.7 m), probe point at the sensor face.
  const shown = Math.min(d, 700) - 10;
  mcg.position.y = CHEST[1] - 10 - shown; probe.position.y = CHEST[1] - 10 - shown;
  if (frame++ % 3 === 0 || still.matches) paintSkin(p);
  chart();
  const hp = heartPtAt(d) * 1e-12;
  readoutTo(stage, "Heart " + fmtT(hp * Math.max(0.02, mag)) + " at " + fmtD(d) + " (peak " + fmtT(hp) + ") · Earth " + fmtX(50e-6 / hp) + "×", Math.round(v));
  if (!still.matches) fig.time(time);
  fig.render();
}
const runner = loop(stage, (dt, time) => {
  if (tour.touring) { tourClock += dt; const want = 35 + 35 * Math.sin(tourClock * 0.25); setDist(want, true); }
  if (playing && !still.matches) {
    const slow = 0.35; beat = (beat + dt * slow) % (60 / 72);
    const pp = heartDipole(beat); ecg[ecgAt] = leadII(pp); ecgAt = (ecgAt + 1) % ecg.length;
    alpha = Math.sin(time * 10 * 2 * Math.PI * 0.05); // 10 Hz alpha shown 20× slower
    nerveClock += dt;
    if (nerveClock > 1.4) { nerveClock = 0; const f = impulses.find((i) => i.t < 0); if (f) f.t = 0; }
    for (const im of impulses) if (im.t >= 0) { im.t += dt * (55000 / nerveLen) / 40; if (im.t >= 1) { im.t = -1; act = 1; } } // 55 m/s, shown 40× slower
    act = Math.max(0, act - dt * 1.6);
    emg[emgAt] = act * (Math.random() * 2 - 1) * 1.2 + (Math.random() - 0.5) * 0.06; emgAt = (emgAt + 1) % emg.length;
  }
  draw(time);
  return (playing && !still.matches) || tour.touring;
});
stage.addEventListener("keydown", (e) => {
  if (/^[1-5]$/.test(e.key)) toggle(UI[Number(e.key) - 1][0]);
  else if (e.key === "ArrowRight") setDist(v + 8); else if (e.key === "ArrowLeft") setDist(v - 8);
  else if (e.key === " ") { playing = !playing; if (status) status.textContent = playing ? "Running." : "Paused."; runner.kick(); }
  else return;
  e.preventDefault(); tour.touch();
});
toggles.forEach((b) => b.addEventListener("click", () => { tour.touch(); toggle(b.dataset.src); }));
if (slider) slider.addEventListener("input", () => { tour.touch(); setDist(Number(slider.value)); });
if (still.matches) { beat = 0.215; for (let i = 0; i < ecg.length; i++) ecg[i] = leadII(heartDipole((i / ecg.length) * 60 / 72 * 1.6)); act = 0.8; alpha = 1; }
setDist(0, true);
draw(0);
`;
const css = `.bf-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font:11px/1.4 var(--anatomy-mono);color:var(--anatomy-muted)}
.bf-ctl button{padding:5px 9px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-muted);font:inherit;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.bf-ctl button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-strong)}.bf-ctl input{width:180px}
.bf-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.bf-notes a{color:inherit}.bf-notes ul{margin:4px 0 8px 18px;padding:0}
.bf-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const notes = `<details class="bf-notes"><summary>Sources and simplifications</summary><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;
writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "biofield-3d",
  scene, live, css, width: 900,
  keys: [
    { mark: "lit", label: "The sensor face: the field is read here" },
    { mark: "raised", label: "Skin coloured by the heart's surface potential, red + / blue −" },
    { mark: "edge", label: "Field lines: heart (orange), brain (blue), Earth (green)" },
  ],
  caption: `The body's real electromagnetic fields, as a three.js scene. Each heartbeat is an electrical wave through the heart muscle. Its currents raise a potential of about ${FACTS.ecgMv} mV on the skin, which the ECG records [8]; the skin here is coloured by that potential as it swings through the beat. The same currents make a magnetic field, the strongest in the body, about ${FACTS.heartPt[0]}–${FACTS.heartPt[1]} pT near the chest [1]: ${FACTS.heartPeakPtAt10mm} pT with a sensor 10 mm away [2]. It falls off fast: at 80 mm it is 38% of its value at 20 mm [3]. Move the SQUID dewar with the slider to see it fall. The brain's field is about a hundred to ten thousand times weaker: ~10 fT for cortical activity and ~1 pT for the alpha rhythm [4], read by the helmet of MEG sensors. Nerves carry impulses at ${FACTS.nerveMs[0]}–${FACTS.nerveMs[1]} m/s [10]. When one reaches a muscle, its fibres fire, and electrodes on the skin read the EMG, up to about ${FACTS.emgMv} mV [9]. For scale, the Earth's field is ${FACTS.earthUt[0]}–${FACTS.earthUt[1]} µT [5], over a hundred thousand times the heart's. Even city magnetic noise, about 0.1 µT, is a thousand times stronger [4], which is why MCG and MEG need shielded rooms and sensors with a noise of a few fT [7]. An MRI magnet is 1.5–3 T [6]. There is no 'aura': everything here has been measured. The body is a smooth implicit surface meshed at 4 mm, with about 300,000 triangles. Field lines use a glowing shader, the skin potential is painted as vertex colours, and the log chart shows the true ratios.`,
  stage: { role: "group", label: "Human body with its measured fields. Keys 1 to 5 toggle heart, brain, nerve and EMG, Earth's field, and skin potential; left and right arrows move the magnetometer; Space pauses." },
  after: `<div class="bf-ctl" role="group" aria-label="Sources">${SOURCES_UI.map(([k, n], i) => `<button type="button" data-src="${k}" aria-pressed="true">${i + 1} ${esc(n)}</button>`).join("")}<label>Sensor distance <input type="range" min="0" max="100" value="0" data-dist aria-label="Magnetometer distance from the chest, logarithmic"></label><span data-dist-out>10 mm</span></div><span class="bf-live" aria-live="polite" data-live></span>${notes}`,
});
