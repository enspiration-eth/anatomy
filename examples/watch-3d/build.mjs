import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, FACTS, SOURCES, SIMPLIFIED, W, ARBORS, BAL, PATH, FORK_ANGLE, trainRates, reserveHours, MAINSPRING_TURNS } from "./scene.mjs";

const STEPS = [
  ["Mainspring", "The wound spring turns the barrel, about once every 6.7 hours"],
  ["Going train", "Barrel → centre (1 rev/h) → third → fourth (1 rev/min) → escape wheel"],
  ["Escapement", "Each beat the lever unlocks a tooth; it slides the pallet's impulse face, drops and locks: half a tooth, 12°"],
  ["Balance", "The balance and hairspring swing at 4 Hz; the impulse pin gives and takes the lever"],
];
const live = `
const W = ${JSON.stringify(W)}, ARBORS = ${JSON.stringify(ARBORS)}, BAL = ${JSON.stringify(BAL)}, PATH = ${JSON.stringify(PATH)}, STEPS = ${JSON.stringify(STEPS)};
const RATES = ${JSON.stringify(trainRates())}, RESERVE = ${reserveHours()}, TURNS = ${MAINSPRING_TURNS}, FACTS = ${JSON.stringify(FACTS)}, FORK0 = ${FORK_ANGLE};
const { THREE } = fig;
const P = (id) => fig.parts.get(id), G = (id) => fig.shaders.get(id);
const deg = Math.PI / 180, A = BAL.amp * deg, LIFT = 26 * deg, FORK = 8 * deg, f = RATES.hz;
const arbors = Object.fromEntries(ARBORS.map((id) => [id, P(id)]));
const balance = P("balance"), pallet = P("pallet"), hair = P("hairspring-pivot"), spring = P("spring-pivot");
const energy = P("energy"), energyG = G("energy"), impulseG = G("impulse-glow");
const root = stage.parentElement, status = root.querySelector("[data-live]"), slider = root.querySelector("[data-speed]"), out = root.querySelector("[data-speed-out]");
const buttons = [...root.querySelectorAll("[data-step]")];
const SPEEDS = [1 / 40, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1];
const groups = [["barrel-wheel", "barrel-drum", "mainspring", "ratchet"], ["centre-wheel", "third-wheel", "fourth-wheel", "centre-pinion", "third-pinion", "fourth-pinion", "escape-pinion"], ["escape-wheel", "pallet-fork", "pallet-stone-0", "pallet-stone-1"], ["balance-rim", "balance-arm-0", "balance-arm-1", "balance-arm-2", "hairspring", "roller", "impulse-jewel"]];
for (const g of groups) for (const id of g) { const m = P(id); m.material = m.material.clone(); m.material.emissive = new THREE.Color("#ffb040"); m.material.emissiveIntensity = 0; }
// Mesh phases: each pinion sits so its teeth fall between the wheel's at the line of centres.
const mesh = [["barrel", "centre"], ["centre", "third"], ["third", "fourth"], ["fourth", "escape"]].map(([a, b]) => ({ a, b, phi: Math.atan2(W[b].at[1] - W[a].at[1], W[b].at[0] - W[a].at[0]), Nw: W[a].N, Np: W[b].pN }));
let speed = 2, tau = 0.013, playing = !still.matches, step = 2, reserve = RESERVE * 0.92, glow = 0;
const tour = idleTour(4000, () => runner.kick());
let tourClock = 0;
const sm = (x) => x * x * (3 - 2 * x);
function setStep(i, quiet) { step = (i + 4) % 4; buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(j === step))); if (status && !quiet) status.textContent = STEPS[step][0] + ": " + STEPS[step][1] + "."; glow = 1; runner.kick(); }
function setSpeed(i, quiet) { speed = clamp(i, 0, SPEEDS.length - 1); if (slider) slider.value = String(speed); const s = SPEEDS[speed]; const t = s === 1 ? "real time" : "1/" + Math.round(1 / s) + " speed"; if (out) out.textContent = t; if (status && !quiet) status.textContent = "Slow motion " + t + "."; runner.kick(); }
function draw(time) {
  const u = 2 * f * tau, theta = A * Math.sin(Math.PI * u);
  balance.rotation.z = theta;
  hair.rotation.z = theta * 0.4; const br = 1 - 0.035 * Math.sin(Math.PI * u); hair.scale.set(br, br, 1);
  pallet.rotation.z = -FORK * clamp(theta / LIFT, -1, 1);
  // The escape wheel moves half a tooth (12°) during each impulse window, locked between.
  const k = Math.round(u), win = (2 / Math.PI) * Math.asin(LIFT / A), s = clamp((u - k) / win + 0.5, 0, 1);
  const esc = -(k - 0.5 + sm(s)) * (Math.PI * 2 / FACTS.escapeTeeth) / 2;
  const ang = { escape: esc };
  for (let i = mesh.length - 1; i >= 0; i--) { const m = mesh[i], b = ang[m.b]; ang[m.a] = m.phi - (m.Np / m.Nw) * (b - m.phi - Math.PI - Math.PI / m.Np); }
  for (const id of ARBORS) arbors[id].rotation.z = ang[id];
  spring.rotation.z = ang.barrel - (reserve / RESERVE) * TURNS * 0.05;
  const imp = Math.abs(u - k) < win / 2 ? 1 - Math.abs(u - k) / (win / 2) : 0;
  impulseG.uniforms.uLevel.value = imp;
  // The energy path: one pulse per beat from the barrel to the balance.
  const fr = ((u + 0.5) % 1 + 1) % 1, seg = fr * (PATH.length - 1), j = Math.min(PATH.length - 2, Math.floor(seg)), g = seg - j;
  energy.position.set(PATH[j][0] + (PATH[j + 1][0] - PATH[j][0]) * g, PATH[j][1] + (PATH[j + 1][1] - PATH[j][1]) * g, 36);
  energyG.uniforms.uLevel.value = still.matches ? 0 : 0.7 * Math.sin(Math.PI * fr);
  groups.forEach((gr, i) => { const v = i === step ? 0.12 + 0.25 * glow : 0; for (const id of gr) P(id).material.emissiveIntensity = v; });
  const secs = (tau % 60).toFixed(2);
  readoutTo(stage, STEPS[step][0] + " · 4 Hz · " + Math.round(theta / deg) + "° · beat " + k + " · " + reserve.toFixed(1) + " h", k);
  fig.render();
}
const runner = loop(stage, (dt, time) => {
  if (tour.touring) { tourClock += dt; const want = Math.floor(tourClock / 6) % 4; if (want !== step) setStep(want, true); }
  if (playing && !still.matches) { const d = dt * SPEEDS[speed]; tau += d; reserve = Math.max(0, reserve - d / 3600); }
  glow = Math.max(0, glow - dt * 1.5);
  draw(time);
  return (playing && !still.matches) || tour.touring || glow > 0;
});
stage.addEventListener("keydown", (e) => {
  if (/^[1-4]$/.test(e.key)) setStep(Number(e.key) - 1);
  else if (e.key === " ") { playing = !playing; if (status) status.textContent = playing ? "Running." : "Paused."; runner.kick(); }
  else if (e.key === "ArrowLeft") setSpeed(speed - 1); else if (e.key === "ArrowRight") setSpeed(speed + 1);
  else if (e.key === "w" || e.key === "W") { reserve = RESERVE; if (status) status.textContent = "Wound: " + RESERVE.toFixed(0) + " hours."; runner.kick(); }
  else return;
  e.preventDefault(); tour.touch();
});
buttons.forEach((b, i) => b.addEventListener("click", () => { tour.touch(); setStep(i); }));
if (slider) slider.addEventListener("input", () => { tour.touch(); setSpeed(Number(slider.value)); });
stage.addEventListener("click", () => { stage.focus(); tour.touch(); setStep(step + 1); });
setSpeed(2, true); setStep(2, true);
draw(0);
`;
const css = `.wt-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font:11px/1.4 var(--anatomy-mono);color:var(--anatomy-muted)}
.wt-ctl button{padding:5px 9px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-muted);font:inherit;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.wt-ctl button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-strong)}.wt-ctl input{width:140px}
.wt-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.wt-notes a{color:inherit}.wt-notes ul{margin:4px 0 8px 18px;padding:0}
.wt-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const notes = `<details class="wt-notes"><summary>Sources and simplifications</summary><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;
const R = trainRates();
writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "watch-3d",
  scene, live, css, width: 860,
  keys: [
    { mark: "lit", label: "Seconds marker on the fourth wheel: once a minute" },
    { mark: "raised", label: "Skeletonised bridges over the going train" },
    { mark: "edge", label: "Ruby jewels at every pivot and on the pallets" },
  ],
  caption: `A mechanical watch movement from the back, as a three.js scene. It is a ${FACTS.diameterMm} mm automatic of the ETA 2824 class [5], with the rotor taken off. The wound mainspring turns the barrel, and the going train steps the speed up. The centre wheel turns once an hour and carries the minute hand. The fourth wheel turns once a minute and carries the seconds [3]. The escape wheel then turns ${Math.round(R.escape * 60)} times a minute. Without a brake the spring would unwind in seconds. The lever escapement is that brake [2]. The balance wheel and hairspring swing ${FACTS.bph.toLocaleString("en")} beats an hour, ${R.hz} times a second [1]. Each time the balance passes its centre, its impulse pin flips the lever. The lever unlocks one tooth of the ${FACTS.escapeTeeth}-tooth escape wheel. The tooth slides over a ruby pallet, kicking the balance to keep it swinging, then drops and locks on the other pallet. Each beat the escape wheel turns half a tooth, 12° [2]. That steady release is what the hands count, and the tick you hear. With ${MAINSPRING_TURNS} turns of spring the model runs ${reserveHours().toFixed(0)} hours, inside the ${FACTS.reserveH[0]}–${FACTS.reserveH[1]} h of a one-day movement [4]. The scene uses brushed bridges and plate, gold-plated wheels and blued, iridescent screws and springs. The jewels are transmissive rubies, and glow shaders mark the impulse and the energy passing down the train each beat. Steps 1–4 highlight each stage, ← → set the slow motion, and W winds the spring.`,
  stage: { role: "group", label: "Watch movement. 1 to 4 highlight mainspring, train, escapement, balance; left and right arrows change slow motion; Space pauses; W winds." },
  after: `<div class="wt-ctl" role="group" aria-label="Movement">${STEPS.map(([n], i) => `<button type="button" data-step="${i}" aria-pressed="${i === 2}">${i + 1} ${esc(n)}</button>`).join("")}<label>Slow motion <input type="range" min="0" max="5" step="1" value="2" data-speed aria-label="Slow motion"></label><span data-speed-out>1/8 speed</span></div><span class="wt-live" aria-live="polite" data-live></span>${notes}`,
});
