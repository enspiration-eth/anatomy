// The dial indicator, built as a three.js scene instead of SVG.
//   node examples/dial-indicator-3d/build.mjs [--light] [--three=inline|cdn|<url>] [--check]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { assertScene, solidCount } from "../../kit/three-scene.mjs";
import { threeImportMap, threeModule } from "../../scripts/inline-three.mjs";
import { scene, BLOCKS, STOPS, REACH, DIAL, PER_TURN, BASE, STEP, BLOCK_W, TIP_R } from "./scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const theme = args.includes("--light") ? "light" : "dark";
const three = args.find((a) => a.startsWith("--three="))?.slice(8) ?? "inline";

assertScene(scene);
if (args.includes("--check")) {
  console.log(`scene ok: ${solidCount(scene)} solid parts`);
  process.exit(0);
}

const live = `
const BLOCKS = ${JSON.stringify(BLOCKS)}, STOPS = ${JSON.stringify(STOPS)}, REACH = ${JSON.stringify(REACH)};
const DIAL = ${JSON.stringify(DIAL)}, PER_TURN = ${PER_TURN}, BASE = ${BASE}, STEP = ${STEP}, BLOCK_W = ${BLOCK_W}, TIP_R = ${TIP_R};
const carriage = fig.parts.get("carriage"), plunger = fig.parts.get("plunger"), needle = fig.parts.get("needle");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const heightUnder = (cx) => BLOCKS.reduce((top, h, i) => { const from = cx - 24 + STEP * i; return from + BLOCK_W > DIAL[0] - TIP_R && from < DIAL[0] + TIP_R ? Math.max(top, BASE + h) : top; }, BASE);
const blockUnder = (cx) => BLOCKS.findIndex((_, i) => { const from = cx - 24 + STEP * i; return DIAL[0] >= from && DIAL[0] <= from + BLOCK_W; });
let x = STOPS[0], target = x, tip = { at: BASE + BLOCKS[0], rate: 0 };
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0;
function draw() {
  carriage.position.x = x;
  plunger.position.z = tip.at;
  needle.rotation.z = -((tip.at - BASE) / PER_TURN) * Math.PI * 2;
  const i = blockUnder(x);
  const text = (i < 0 ? "between blocks" : "block " + (i + 1)) + " · reads " + (tip.at - BASE).toFixed(1) + " px";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(tip.at - BASE)));
  stage.setAttribute("aria-valuetext", text);
  fig.render();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = STOPS[Math.floor(clock / 2.2) % STOPS.length]; }
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.28));
  if (Math.abs(target - x) < 0.01) x = target;
  const want = heightUnder(x), stiff = 420, drag = calm ? 2 * Math.sqrt(420) : 26;
  for (let n = 0; n < 4; n++) { tip.rate += ((want - tip.at) * stiff - tip.rate * drag) * dt / 4; tip.at += tip.rate * dt / 4; }
  if (Math.abs(want - tip.at) < 0.005 && Math.abs(tip.rate) < 0.005) { tip.at = want; tip.rate = 0; }
  draw();
  const settled = !touring && x === target && tip.rate === 0 && tip.at === want;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = stage.getBoundingClientRect();
  steer(REACH[0] + clamp(((event.clientX - box.left) / box.width - 0.25) / 0.5, 0, 1) * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = STOPS.reduce((b, s, i) => (Math.abs(s - target) < Math.abs(STOPS[b] - target) ? i : b), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.max(0, here - 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.min(STOPS.length - 1, here + 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = STOPS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(STOPS[to]);
});
draw();
`;

const body = k.plateHtml({
  fig: scene.fig,
  title: scene.title,
  hint: scene.hint,
  readout: scene.readout,
  keys: [
    { mark: "lit", label: "Plunger and needle: what moves when the height changes" },
    { mark: "raised", label: "Three gauge blocks, 18, 14 and 10 tall" },
  ],
  caption: "A dial indicator on a surface plate, drawn as a three.js scene. Slide the carriage and the plunger rides onto the block beneath it; one turn of the needle is 20 px of travel, so every block reads its own height.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Dial indicator: arrow keys move the carriage from block to block" aria-valuemin="0" aria-valuemax="18" aria-valuenow="18"></div>`,
});

const name = theme === "light" ? "dial-indicator-3d-light.html" : "dial-indicator-3d.html";
const page = k
  .pageHtml({ title: scene.title, theme, body })
  .replace("</head>", `${threeImportMap(three)}</head>`)
  .replace("</body>", `${threeModule({ spec: scene, theme, live })}</body>`);
writeFileSync(join(HERE, name), page);
console.log(`wrote ${name} (${solidCount(scene)} solid parts, three ${three})`);
