import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, STEPS, THREADS, NEURONS, SITES, SEAT, Z, HEAD_Z, NEEDLE_H, TABLET, FACTS, SOURCES, SIMPLIFIED } from "./scene.mjs";

const live = `
const STEPS = ${JSON.stringify(STEPS)}, THREADS = ${JSON.stringify(THREADS)}, NEURONS = ${JSON.stringify(NEURONS)};
const SEAT = ${SEAT}, Z = ${JSON.stringify(Z)}, HEAD_Z = ${HEAD_Z}, NEEDLE_H = ${NEEDLE_H}, TABLET = ${JSON.stringify(TABLET)};
const { THREE } = fig;
const P = (id) => fig.parts.get(id), G = (id) => fig.shaders.get(id);
const hinge = P("scalp-hinge"), bone = P("bone-flap"), implant = P("implant"), r1 = P("r1"), needle = P("r1-needle"), charger = P("charger");
const gantry = ["r1-post-left", "r1-post-right", "r1-beam"].map(P);
const sutures = [0, 1, 2, 3, 4, 5].map((i) => P("suture-" + i));
const fields = [0, 1, 2].map((i) => P("field-" + i));
const asic = P("n1-asic");
const threads = THREADS.map((t) => { const mesh = P(t.id); return { ...t, mesh, total: mesh.geometry.index.count, curve: new THREE.CatmullRomCurve3(t.points.map((p) => new THREE.Vector3(...p))) }; });
const neurons = NEURONS.map((n, i) => ({ ...n, glow: G(n.id + "-glow"), pulse: P("pulse-" + i), pulseMat: G("pulse-" + i), flash: 0, travel: -1, rate: 0 }));
const packets = [0, 1, 2, 3].map((i) => ({ node: P("packet-" + i), mat: G("packet-" + i), t: -1 }));
const screen = fig.screens.get("tablet-screen");
const status = stage.parentElement.querySelector("[data-live]");
const buttons = [...stage.parentElement.querySelectorAll("[data-step]")];
const tablet = new THREE.Vector3(TABLET.x, TABLET.y - 30, 100), from = new THREE.Vector3(0, -4, Z.top);

let step = 0, clock = 0, inserted = 0;
const s = { flap: { at: 0, rate: 0 }, lift: { at: 0, rate: 0 }, drop: { at: 0, rate: 0 }, robot: { at: 0, rate: 0 }, charge: { at: 0, rate: 0 }, closed: { at: 0, rate: 0 } };
const tour = idleTour(4000, () => runner.kick());
const DWELL = [3, 3.5, THREADS.length * 0.8 + 1.6, 3, 3, 9, 4.5];
const cursor = { x: 0.5, y: 0.5 }, targets = [[0.82, 0.3], [0.2, 0.72], [0.78, 0.78], [0.25, 0.25]];
let target = 0, trace = new Float32Array(260), traceAt = 0, spikesSeen = 0, packetClock = 0;
const noise = () => (Math.random() + Math.random() + Math.random() - 1.5);

function setStep(next, fromTour) {
  step = (next + STEPS.length) % STEPS.length;
  if (step < 2) inserted = 0;
  if (step > 2 || (step === 2 && still.matches)) inserted = THREADS.length;
  if (step === 2 && inserted >= THREADS.length && !still.matches && fromTour) inserted = 0;
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === step)));
  if (status && !fromTour) status.textContent = "Step " + (step + 1) + ": " + STEPS[step].name + ". " + STEPS[step].text;
  clock = 0;
  runner.kick();
}

function paintScreen(t) {
  const { ctx, canvas } = screen, Wd = canvas.width, H = canvas.height;
  ctx.fillStyle = "#0d1014"; ctx.fillRect(0, 0, Wd, H);
  ctx.font = "600 18px ui-monospace, Menlo, monospace"; ctx.fillStyle = "#8a96a6";
  if (step < 5) { ctx.fillText(step < 4 ? "N1 app · no implant" : "N1 app · paired, idle", 18, 30); screen.update(); return; }
  ctx.fillText("ch 1 · 500 Hz–5 kHz", 18, 30);
  // One channel: the band-passed trace, the adaptive threshold, detected spikes.
  const y0 = 110;
  ctx.strokeStyle = "#3a4656"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(18, y0 + 34); ctx.lineTo(250, y0 + 34); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#7fd0ff"; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < trace.length; i++) { const v = trace[(traceAt + i) % trace.length]; const x = 18 + (i / trace.length) * 232; i ? ctx.lineTo(x, y0 + v) : ctx.moveTo(x, y0 + v); }
  ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = "#8a96a6"; ctx.fillText("threshold", 18, y0 + 58); ctx.fillText("spikes " + spikesSeen, 18, H - 24);
  // The cursor panel: target and cursor, moved by the decoded intent.
  const px = 280, py = 20, pw = Wd - px - 18, ph = H - 40;
  ctx.strokeStyle = "#3a4656"; ctx.strokeRect(px, py, pw, ph);
  const [tx, ty] = targets[target];
  ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + tx * pw, py + ty * ph, 22, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); const cx = px + cursor.x * pw, cy = py + cursor.y * ph;
  ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 22); ctx.lineTo(cx + 6, cy + 17); ctx.lineTo(cx + 12, cy + 26); ctx.lineTo(cx + 15, cy + 24); ctx.lineTo(cx + 10, cy + 15); ctx.lineTo(cx + 17, cy + 15); ctx.closePath(); ctx.fill();
  screen.update();
}

function record(dt) {
  // A schematic population code: each neuron prefers a direction; the intended direction (toward the target)
  // raises the rate of those that prefer it. Spikes are slowed for visibility.
  const [tx, ty] = targets[target];
  const want = Math.atan2(-(ty - cursor.y), tx - cursor.x);
  let vx = 0, vy = 0;
  for (const n of neurons) {
    const tuned = Math.max(0, Math.cos(n.dir - want));
    const rate = 0.6 + 4.5 * tuned;
    n.rate += (rate - n.rate) * Math.min(1, dt * 3);
    if (!still.matches && Math.random() < rate * dt) { n.flash = 1; if (n.travel < 0) n.travel = 0; spikesSeen++; if (n === neurons[0]) trace[(traceAt + trace.length - 1) % trace.length] = -38; }
    vx += Math.cos(n.dir) * (n.rate - 2.5); vy += Math.sin(n.dir) * (n.rate - 2.5);
  }
  const speed = Math.hypot(vx, vy) || 1;
  cursor.x = clamp(cursor.x + (vx / speed) * dt * 0.22, 0.04, 0.96); cursor.y = clamp(cursor.y - (vy / speed) * dt * 0.22, 0.04, 0.96);
  if (Math.hypot(tx - cursor.x, ty - cursor.y) < 0.05) target = (target + 1) % targets.length;
  for (let k = 0; k < 3; k++) { trace[traceAt] = trace[traceAt] < -10 ? trace[traceAt] : noise() * 6; traceAt = (traceAt + 1) % trace.length; }
}

function draw(time) {
  hinge.rotation.y = -Math.PI * s.flap.at;
  bone.position.z = Z.skull + 220 * s.lift.at;
  bone.visible = step <= 1 || s.lift.at < 0.98 && step < 2;
  implant.position.z = SEAT + 220 * (1 - s.drop.at);
  implant.visible = step >= 3 || s.drop.at > 0.02;
  const rb = s.robot.at;
  r1.visible = rb > 0.01; r1.position.z = (1 - rb) * 300;
  gantry.forEach((g) => (g.visible = rb > 0.01));
  sutures.forEach((x) => (x.visible = s.closed.at > 0.5));
  charger.visible = s.charge.at > 0.01; charger.position.z = (1 - s.charge.at) * 260;
  fields.forEach((f, i) => { f.visible = s.charge.at > 0.5; f.material.opacity = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(time * 4 - i * 1.4)) * s.charge.at; });
  // Threads: those inserted are drawn whole; the one being inserted is drawn as far as the needle has taken it.
  const j = Math.floor(inserted), f = inserted - j;
  threads.forEach((t, i) => t.mesh.geometry.setDrawRange(0, i < j ? t.total : i === j ? Math.floor((t.total * clamp((f - 0.15) / 0.5, 0, 1)) / 3) * 3 : 0));
  if (step === 2 && j < threads.length) {
    const t = threads[j];
    r1.position.x = follow(r1.position.x, t.x, 1 / 60, 0.08);
    const plunge = f < 0.15 ? 0 : f < 0.65 ? (f - 0.15) / 0.5 : Math.max(0, 1 - (f - 0.65) / 0.25);
    needle.position.z = -(HEAD_Z - NEEDLE_H - t.tip) * plunge;
  } else needle.position.z = 0;
  const recording = step === 5;
  for (const n of neurons) {
    // Reduced motion: no firing, but the tuned neurons are shown lit in proportion to their rate.
    n.glow.uniforms.uLevel.value = recording ? (still.matches ? Math.max(0, (n.rate - 0.6) / 4.5) : n.flash) : 0;
    const on = recording && n.travel >= 0;
    n.pulse.visible = on;
    if (on) { const th = threads[neurons.indexOf(n)]; n.pulse.position.copy(th.curve.getPointAt(1 - n.travel)); n.pulseMat.uniforms.uLevel.value = 1 - n.travel * 0.4; }
  }
  asic.material.emissiveIntensity = recording ? Math.min(1.5, neurons.reduce((m, n) => Math.max(m, n.travel > 0.8 ? 1.5 : 0), 0) + 0.3) : 0;
  for (const p of packets) {
    p.node.visible = recording && p.t >= 0;
    if (p.node.visible) { p.node.position.lerpVectors(from, tablet, p.t); p.node.position.z += Math.sin(p.t * Math.PI) * 120; p.mat.uniforms.uLevel.value = 1 - p.t * 0.5; }
  }
  paintScreen(time);
  let text = (step + 1) + "/" + STEPS.length + " · " + STEPS[step].name + " · " + STEPS[step].text;
  if (step === 2) text = "3/7 · Threads inserted · " + Math.min(threads.length, Math.floor(inserted)) + " of 16 drawn (64 real) · needle 24 µm";
  readoutTo(stage, text, step + 1);
  fig.render();
}

const runner = loop(stage, (dt, time) => {
  if (tour.touring) { clock += dt; if (clock > DWELL[step]) setStep(step + 1, true); }
  if (step === 2 && inserted < threads.length) inserted = still.matches ? threads.length : Math.min(threads.length, inserted + dt / 0.8);
  let busy = false;
  const want = { flap: step >= 1 && step <= 3 ? 1 : 0, lift: step >= 1 ? 1 : 0, drop: step >= 3 ? 1 : 0, robot: step === 2 ? 1 : 0, charge: step === 6 ? 1 : 0, closed: step >= 4 ? 1 : 0 };
  for (const k in s) busy = spring(s[k], want[k], dt, 90, 18) || busy;
  if (step === 5) {
    record(dt);
    for (const n of neurons) { n.flash = Math.max(0, n.flash - dt * 4); if (n.travel >= 0) { n.travel += dt / 0.6; if (n.travel > 1) n.travel = -1; } }
    packetClock += dt;
    if (packetClock > 0.3) { packetClock = 0; const free = packets.find((p) => p.t < 0); if (free) free.t = 0; }
    for (const p of packets) if (p.t >= 0) { p.t += dt / 0.9; if (p.t > 1) p.t = -1; }
    busy = true;
  }
  if (step === 6) busy = true;
  draw(time);
  return busy || tour.touring || (step === 2 && inserted < threads.length);
});

stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") setStep(step + 1);
  else if (event.key === "ArrowLeft") setStep(step - 1);
  else if (/^[1-7]$/.test(event.key)) setStep(Number(event.key) - 1);
  else if (event.key === "Escape") setStep(0);
  else return;
  event.preventDefault(); tour.touch();
});
buttons.forEach((b, i) => b.addEventListener("click", () => { tour.touch(); setStep(i); }));
stage.addEventListener("click", () => { stage.focus(); tour.touch(); setStep(step + 1); });
setStep(0, true);
draw(0);
`;

const css = `.nl-steps{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;font:11px/1.4 var(--anatomy-mono)}
.nl-steps button{padding:5px 9px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-muted);font:inherit;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.nl-steps button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-strong)}
.nl-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.nl-notes a{color:inherit}.nl-notes ul,.nl-notes ol{margin:4px 0 8px 18px;padding:0}
.nl-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const notes = `<details class="nl-notes"><summary>Sources and simplifications</summary><p>Schematic, not to scale where noted:</p><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "neuralink-3d",
  scene,
  live,
  css,
  width: 860,
  keys: [
    { mark: "lit", label: "The implant's chips: spikes detected on the implant" },
    { mark: "raised", label: "Section through scalp, skull, dura and cortex" },
    { mark: "edge", label: "16 of the 64 threads, each to one neuron" },
  ],
  caption: `The Neuralink N1 implant, as a three.js scene cut through the head on one plane. The implant is ${FACTS.implantMm[0]} mm across and ${FACTS.implantMm[1]} mm tall [3]. It records from ${FACTS.electrodes} electrodes on ${FACTS.threads} flexible threads [1], each thread ${FACTS.threadUm[0]}–${FACTS.threadUm[1]} µm wide and ${FACTS.threadThickUm[0]}–${FACTS.threadThickUm[1]} µm thick [4]. Step through it. A flap of scalp is folded back and a disc of bone is removed (a craniectomy). The R1 robot pushes each thread into the cortex on a tungsten-rhenium needle etched to ${FACTS.needleUm} µm [4], aiming between the surface vessels. The 2019 system could insert up to ${FACTS.threadsPerMin} threads a minute [4]. The implant then takes the bone's place in the opening, and the skin is closed over the implant, which cannot be seen from outside [1]. When a neuron fires, the electrode next to it picks up the spike. Chips in the implant band-pass the signal (${FACTS.bandHz[0]} Hz–${FACTS.bandHz[1] / 1000} kHz), set an adaptive threshold for each channel and detect spikes, which are often under ${FACTS.spikeUv} µV. Only the spikes are sent on, which is how the whole system runs on about ${FACTS.powerMw} mW [5]. They go over Bluetooth [6] to the app, which decodes them into cursor movement [2]. A battery inside is recharged through the scalp by an inductive charger [2]. The 3D view uses a section plane that clips the implant, bone and vessels and hatches their cut faces. The grey matter is shaded with vertex colours, the spikes and radio packets glow with a shader, and the implant's board carries a procedural texture. The step-3 thread count shows 16 because only 16 of the 64 threads are drawn. Simplifications and sources are listed below.`,
  stage: { role: "group", label: "Neuralink N1 implant in section. Left and right arrows, or 1 to 7, step through installation and function; a click goes to the next step." },
  after: `<div class="nl-steps" role="group" aria-label="Steps">${STEPS.map((st, i) => `<button type="button" data-step="${i}" aria-pressed="${i === 0}">${i + 1} ${esc(st.name)}</button>`).join("")}</div><span class="nl-live" aria-live="polite" data-live></span>${notes}`,
});
