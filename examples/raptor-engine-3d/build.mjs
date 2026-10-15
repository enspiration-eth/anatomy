import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, ASSEMBLIES, Z_EXIT } from "./scene.mjs";

const CHAMBER_BAR = 300, SEA_LEVEL_TF = 230, EXIT_M = 1.3;
const BACK_TF = (101325 * Math.PI * (EXIT_M / 2) ** 2) / 9806.65;

const live = `
const ASSEMBLIES = ${JSON.stringify(ASSEMBLIES)}, Z_EXIT = ${Z_EXIT}, PC = ${CHAMBER_BAR}, TF = ${SEA_LEVEL_TF};
const { THREE } = fig;
const dark = fig.theme === "dark";
const groups = Object.entries(ASSEMBLIES).map(([id, a], i) => ({ id, move: a.move, name: a.name, node: fig.parts.get(id), at: { at: 0, rate: 0 }, delay: i * 0.05 }));
const button = stage.parentElement.querySelector("[data-fire]"), label = stage.parentElement.querySelector("[data-fire-label]"), live = stage.parentElement.querySelector("[data-live]");
const plume = fig.parts.get("plume-jet"), plumeMat = fig.shaders.get("plume-jet");
plume.visible = false;
// Heat map: wall heat flux scales roughly as (throat area / local area)^0.9 (Bartz), so as (r_throat / r)^1.8
// on the bell's own radius. Painted as vertex colours over the copper, faded in and out by a spring.
const R_THROAT = 18, HEATED = ["bell", "chamber-body"];
const copper = new THREE.Color("#b5764a"), hot = new THREE.Color(), out = new THREE.Color();
for (const id of HEATED) { const mesh = fig.parts.get(id); mesh.material = mesh.material.clone(); mesh.material.color.set(0xffffff); }
let heatOn = false, heat = { at: 0, rate: 0 }, painted = -1;
const paintHeat = (h) => {
  if (Math.abs(h - painted) < 0.004) return;
  painted = h;
  for (const id of HEATED) fig.paint(id, (x, y) => out.copy(copper).lerp(fig.rampColor("heat", Math.pow(R_THROAT / Math.max(R_THROAT, Math.hypot(x, y)), 1.8), hot), h));
};
paintHeat(0);
const glow = new THREE.PointLight(0xff7a3a, 0, 700, 0);
glow.position.set(0, 0, 60);
fig.scene.add(glow);
let firing = false, level = { at: 0, rate: 0 }, apart = false, clock = 0, timeAt = 0;
const tour = idleTour(3600, () => runner.kick());
function draw(time) {
  for (const g of groups) g.node.position.set(g.move[0] * g.at.at, g.move[1] * g.at.at, g.move[2] * g.at.at);
  const l = Math.max(0, level.at);
  plume.visible = l > 0.003;
  plumeMat.uniforms.uLevel.value = l;
  fig.time(still.matches ? 0.5 : time);
  paintHeat(Math.max(0, Math.min(1, heat.at)));
  glow.intensity = l * (dark ? 2.2 : 0.8);
  const spread = groups.reduce((m, g) => Math.max(m, g.at.at), 0);
  let text = "1,630 kg · cold";
  if (l > 0.003) text = Math.round(TF * Math.min(1, l)) + " tf · Pc " + Math.round(PC * Math.min(1, l)) + " bar";
  else if (heat.at > 0.5 && spread < 0.05) text = "wall heat flux · peaks at the throat, ×" + (1 / Math.pow(18 / 65, 1.8)).toFixed(0) + " the exit's";
  else if (spread > 0.05) text = "1,630 kg · " + (spread > 0.95 ? "apart · 11 assemblies" : "coming apart");
  readoutTo(stage, text);
  fig.render();
}
const runner = loop(stage, (dt, time) => {
  if (tour.touring) {
    clock = (clock + dt) % 14;
    const want = clock < 1 ? "rest" : clock < 6 ? "fire" : clock < 7.5 ? "rest" : clock < 12 ? "apart" : "rest";
    setFire(want === "fire", true); setApart(want === "apart", true);
  }
  let busy = false;
  timeAt += dt;
  if (wantApart && !apart && !firing && level.at <= 0.01) setApart(true);
  for (const g of groups) {
    const want = apart ? 1 : 0;
    g.wait = (g.wait ?? 0) + dt;
    if (g.wait > (apart ? g.delay : 0.55 - g.delay)) busy = spring(g.at, want, dt, 120, 17) || busy;
    else busy = true;
  }
  // Ignition rises over about half a second and shutdown decays over a second: an envelope, never a jump.
  busy = spring(level, firing ? 1 : 0, dt, firing ? 40 : 10, firing ? 11 : 6.5) || busy;
  busy = spring(heat, heatOn ? 1 : 0, dt, 60, 15) || busy;
  draw(timeAt);
  return busy || firing || tour.touring;
});
function setFire(on, fromTour) {
  if (on && apart) return;
  if (on === firing) return;
  firing = on;
  if (label) label.textContent = on ? "Shut down" : "Ignite";
  if (button) button.setAttribute("aria-pressed", String(on));
  if (live && !fromTour) live.textContent = on ? "Ignition. 230 tonnes-force at 300 bar." : "Shutdown.";
  runner.kick();
}
let wantApart = false;
function setApart(on, fromTour) {
  wantApart = on;
  // Taking it apart shuts the engine down first; the pieces part once the plume has decayed.
  if (on && (firing || level.at > 0.01)) { if (!fromTour) setFire(false); runner.kick(); return; }
  if (on === apart) return;
  apart = on;
  for (const g of groups) g.wait = 0;
  runner.kick();
}
button?.addEventListener("click", () => { tour.touch(); setFire(!firing); });
const heatButton = stage.parentElement.querySelector("[data-heat]");
function setHeat(on) { heatOn = on; heatButton?.setAttribute("aria-pressed", String(on)); if (live) live.textContent = on ? "Heat map on: wall heat flux, hottest at the throat." : "Heat map off."; runner.kick(); }
heatButton?.addEventListener("click", () => { tour.touch(); setHeat(!heatOn); });
stage.addEventListener("pointermove", (event) => {
  const box = stage.getBoundingClientRect();
  const fx = (event.clientX - box.left) / box.width, fy = (event.clientY - box.top) / box.height;
  const over = fx > 0.3 && fx < 0.7 && fy > 0.05 && fy < 0.75;
  tour.touch(); setApart(over);
});
stage.addEventListener("pointerleave", () => { tour.touch(); setApart(false); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "i" || event.key === "I" || event.key === "Enter") setFire(!firing);
  else if (event.key === " " || event.key === "a" || event.key === "A") setApart(!apart);
  else if (event.key === "h" || event.key === "H") setHeat(!heatOn);
  else if (event.key === "Escape") { setFire(false); setApart(false); setHeat(false); }
  else return;
  event.preventDefault(); tour.touch();
});
draw(0);
`;

const css = `.rp-controls{display:flex;align-items:center;gap:14px;margin-top:10px;font:12px/1.4 var(--anatomy-mono);color:var(--anatomy-muted)}
.rp-fire{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-strong);font:inherit;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.rp-fire[aria-pressed="true"] .rp-lamp{background:#ff6a2a;box-shadow:0 0 8px #ff6a2a}
.rp-lamp{width:7px;height:7px;border-radius:50%;background:var(--anatomy-lo)}
.rp-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "raptor-engine-3d",
  scene,
  live,
  css,
  width: 820,
  keys: Object.values(ASSEMBLIES).slice(0, 4).map((a) => ({ mark: "raised", label: a.name })),
  caption: `Raptor 2 in a test stand, as a three.js scene. It burns liquid oxygen and methane in a full-flow staged cycle: every drop of oxygen passes through the oxygen-rich preburner that drives the oxygen pump, every drop of methane through the fuel-rich one that drives the methane pump, and both hot gases meet in the main chamber at ${CHAMBER_BAR} bar. At sea level it makes about ${SEA_LEVEL_TF} tonnes-force, about ${Math.round(BACK_TF)} tf less than in vacuum because the air presses on its ${EXIT_M} m exit. Hover the engine (or press A) to take it apart into eleven assemblies on staggered springs; Ignite (or I) lights the plume, a shader on a cone from the exit to the deflector with Mach diamonds, rising and decaying through envelopes. Heat map (or H) paints the chamber and bell with vertex colours for the wall's heat flux, which scales about as the inverse 1.8 power of the local radius and so peaks hard at the throat: that is why the bell is regeneratively cooled by methane flowing through channels in its wall.`,
  stage: { label: "Raptor 2 engine in its test stand. Press I to ignite or shut down, H for the wall heat map, A or space to take it apart, Escape to reset." },
  after: `<div class="rp-controls"><button type="button" class="rp-fire" data-fire aria-pressed="false"><span class="rp-lamp" aria-hidden="true"></span><span data-fire-label>Ignite</span></button><button type="button" class="rp-fire" data-heat aria-pressed="false"><span class="rp-lamp" aria-hidden="true"></span>Heat map</button><span class="rp-live" aria-live="polite" data-live></span></div>`,
});
