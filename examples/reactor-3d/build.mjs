import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, FACTS, SOURCES, SIMPLIFIED, CORE, ROD_TRAVEL, UTUBES, plantAt, powerFor } from "./scene.mjs";

const live = `
const FACTS = ${JSON.stringify(FACTS)}, CORE = ${JSON.stringify(CORE)}, ROD_TRAVEL = ${ROD_TRAVEL}, UTUBES = ${JSON.stringify(UTUBES)};
const plantAt = ${plantAt.toString().replace(/^function plantAt/, "function")};
const powerFor = ${powerFor.toString()};
const { THREE } = fig;
const P = (id) => fig.parts.get(id), G = (id) => fig.shaders.get(id);
const rcca = P("rcca"), rotor = P("rotor"), cher = G("cherenkov"), plume = G("tower-plume"), pzr = G("pzr-steam");
const hot = G("hot-leg"), surge = G("surge-line"), cold = ["cold-leg", "pump-discharge"].map(G), utubes = UTUBES.map((_, i) => G("u-tube-" + i));
const steam = ["main-steam", "crossover", "feedwater"].map(G);
const root = stage.parentElement, status = root.querySelector("[data-live]"), slider = root.querySelector("[data-rods]"), out = root.querySelector("[data-rods-out]");
const tC = (T) => fig.rampColor("heat", (T - 270) / 70);
let ins = 0, power = 1, painted = -1;
const s = { at: 0, rate: 0 };
const tour = idleTour(4000, () => runner.kick());
const tourIns = [0, 0.45, 0.85, 0.25];
let tourClock = 0;
function setIns(v, quiet) {
  ins = clamp(v, 0, 1);
  if (slider) slider.value = String(Math.round(ins * 100)); if (out) out.textContent = Math.round(ins * 100) + "% in";
  if (status && !quiet) status.textContent = "Control rods " + Math.round(ins * 100) + "% inserted; power heading to " + Math.round(powerFor(ins) * 100) + "%.";
  runner.kick();
}
function paintCore() {
  if (Math.abs(painted - power) < 0.01) return; painted = power;
  // Power density: a chopped cosine along the core height, scaled by power; held down where rods sit.
  const tip = CORE.z0 + CORE.h * (1 - s.at);
  fig.paint("core", (x, y, z) => { const u = (z - CORE.z0) / CORE.h; return power * Math.cos((u - 0.5) * 2.6) * (z > tip ? 0.8 : 1) * 0.92 + 0.04; }, "heat");
}
function draw(time) {
  rcca.position.z = (1 - s.at) * ROD_TRAVEL;
  const pl = plantAt(power);
  paintCore();
  cher.uniforms.uLevel.value = power;
  hot.uniforms.uA.value.copy(tC(pl.tHot)); hot.uniforms.uB.value.copy(tC(pl.tHot)); surge.uniforms.uA.value.copy(tC(pl.tHot)); surge.uniforms.uB.value.copy(tC(pl.tHot));
  for (const c of cold) { c.uniforms.uA.value.copy(tC(pl.tCold)); c.uniforms.uB.value.copy(tC(pl.tCold)); }
  for (const u of utubes) { u.uniforms.uA.value.copy(tC(pl.tHot)); u.uniforms.uB.value.copy(tC(pl.tCold)); }
  for (const g of steam) g.uniforms.uLevel.value = 0.1 + 0.9 * power;
  plume.uniforms.uLevel.value = 0.15 + 0.85 * power; pzr.uniforms.uLevel.value = 0.6;
  readoutTo(stage, Math.round(power * 100) + "% · Thot " + pl.tHot.toFixed(1) + " °C · Tcold " + pl.tCold.toFixed(1) + " °C · " + pl.mpa.toFixed(1) + " MPa · " + Math.round(pl.mwe) + " MWe", Math.round(power * 100));
  if (!still.matches) fig.time(time);
  fig.render();
}
const runner = loop(stage, (dt, time) => {
  if (tour.touring) { tourClock += dt; const w = tourIns[Math.floor(tourClock / 7) % tourIns.length]; if (w !== ins) setIns(w, true); }
  let busy = spring(s, ins, dt, 40, 12);
  const want = powerFor(s.at);
  const np = still.matches ? want : power + (want - power) * Math.min(1, dt / 2.5);
  busy = busy || Math.abs(np - want) > 0.002; power = np;
  if (!still.matches) rotor.rotation.x += dt * 3; // shown slow: the real shaft turns 1800 rpm, steadily
  draw(time);
  return busy || tour.touring || !still.matches;
});
// Drag: vertical pointer motion over the stage moves the rods (down inserts).
let drag = null;
stage.addEventListener("pointerdown", (e) => { drag = { y: e.clientY, ins }; stage.setPointerCapture(e.pointerId); tour.touch(); });
stage.addEventListener("pointermove", (e) => { if (!drag) return; setIns(drag.ins + (e.clientY - drag.y) / 260, true); tour.touch(); });
stage.addEventListener("pointerup", () => { if (drag) setIns(ins); drag = null; });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") setIns(ins + 0.1); else if (e.key === "ArrowUp") setIns(ins - 0.1);
  else if (e.key === "Home") setIns(0); else if (e.key === "End") setIns(1); else return;
  e.preventDefault(); tour.touch();
});
if (slider) slider.addEventListener("input", () => { tour.touch(); setIns(Number(slider.value) / 100); });
setIns(0, true);
draw(0);
`;
const css = `.rx-ctl{display:flex;gap:8px;align-items:center;margin-top:10px;font:11px/1.4 var(--anatomy-mono);color:var(--anatomy-muted)}.rx-ctl input{width:220px}
.rx-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.rx-notes a{color:inherit}.rx-notes ul{margin:4px 0 8px 18px;padding:0}
.rx-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const notes = `<details class="rx-notes"><summary>Sources and simplifications</summary><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;
writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "reactor-3d",
  scene, live, css, width: 920,
  keys: [
    { mark: "lit", label: "Control-rod drive: drag it to move the rods" },
    { mark: "raised", label: "Section through containment, vessel and steam generator" },
    { mark: "edge", label: "Primary loop coloured by temperature, secondary by steam and water" },
  ],
  caption: `A pressurized water reactor, as a three.js scene. The reference Westinghouse four-loop plant makes ${FACTS.mwt} MW of heat and ${FACTS.mwe} MW of electricity, about ${FACTS.eff}% efficient [1]. The core holds ${FACTS.assemblies} fuel assemblies, each a ${FACTS.lattice}×${FACTS.lattice} lattice with ${FACTS.rodsPer} fuel rods, ${FACTS.rods.toLocaleString("en")} in all [1]. ${FACTS.rccas} clusters of ${FACTS.absorbersPer} absorber rods control it [1]. Water at ${FACTS.mpa} MPa (${FACTS.psia} psia) [1][2] cannot boil. It enters the core at ${FACTS.tIn} °C and leaves about ${FACTS.rise} °C hotter at full power [1][2]. A pressurizer holds that pressure. The hot leg carries the water to a steam generator, where it heats a separate secondary loop through thousands of U-tubes. A pump returns it to the vessel. Each of the ${FACTS.loops} loops has its own generator and pump [3]. The secondary water boils, and the steam drives the turbine and generator. It is condensed by cooling water whose heat leaves through the tower. Drag the control rods down and the power falls with a lag. With flow held constant, the core temperature rise falls with it. Cherenkov light, the blue glow of fast electrons in water [4], fades with power. The scene uses a concrete texture on the containment, cut-face hatching, a temperature ramp painted on the core, and flow, Cherenkov and steam shaders.`,
  stage: { role: "group", label: "Pressurized water reactor in section. Drag up or down, or press up and down arrows, to move the control rods." },
  after: `<div class="rx-ctl"><label>Control rods <input type="range" min="0" max="100" value="0" data-rods aria-label="Control rod insertion, percent"></label><span data-rods-out>0% in</span></div><span class="rx-live" aria-live="polite" data-live></span>${notes}`,
});
