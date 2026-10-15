import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, KEYS, KEY, SCREEN } from "./scene.mjs";

const live = `
const KEYS = ${JSON.stringify(KEYS)}, TRAVEL = ${KEY.travel};
const screen = fig.screens.get("screen"), rocker = fig.parts.get("rocker"), led = fig.parts.get("power-led");
const keyOf = new Map(KEYS.map((k) => [k.label, fig.parts.get(k.id)]));
const rest = new Map(KEYS.map((k) => [k.id, fig.parts.get(k.id).position.z]));
const down = new Map(); // key id -> { at, rate, hold }
const status = stage.parentElement.querySelector("[data-status]");
const COLS = 26, LINES = 6;
let text = "", on = true, power = { at: 1, rate: 0 }, blink = 0;
const tour = idleTour(4000, () => runner.kick());
const DEMO = "HELLO. I AM A DESK COMPUTER.\\nTYPE ON ME.";
let demoAt = 0, demoClock = 0, demoPause = 0;
function press(label) {
  const node = keyOf.get(label);
  if (!node) return;
  down.set(node.name, { at: down.get(node.name)?.at ?? 0, rate: 0, hold: 0.09 });
}
function type(ch) {
  if (!on) return;
  if (ch === "\\b") text = text.slice(0, -1);
  else if (text.length < COLS * LINES) text += ch;
  press(ch === "\\b" ? "=" : ch.toUpperCase());
}
function linesOf(t) {
  const out = [];
  for (const para of t.split("\\n")) { let line = para; do { out.push(line.slice(0, COLS)); line = line.slice(COLS); } while (line.length); }
  return out.slice(-LINES);
}
function paint(now) {
  const { ctx, canvas } = screen, W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#0a0c0b"; ctx.fillRect(0, 0, W, H);
  const p = power.at;
  if (p <= 0.001) { screen.update(); return; }
  // A CRT collapses to a line, then to a dot: height first, then width.
  const sy = Math.min(1, p * 2), sx = Math.min(1, Math.max(0.012, p * 2 - 0)) ;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(p > 0.5 ? 1 : Math.max(0.01, (p - 0.02) * 2), p > 0.5 ? (p - 0.5) * 2 + 0.004 : 0.004);
  ctx.translate(-W / 2, -H / 2);
  const glow = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
  glow.addColorStop(0, "#16201b"); glow.addColorStop(1, "#0b0f0d");
  ctx.fillStyle = p > 0.5 ? glow : "#d8ffe8"; ctx.fillRect(0, 0, W, H);
  if (p > 0.5) {
    ctx.fillStyle = "#c8f7d8"; ctx.font = "bold 28px ui-monospace, Menlo, monospace"; ctx.textBaseline = "top";
    ctx.globalAlpha = 0.55; ctx.fillText("\\u25C6 DESK/84", 28, 22); ctx.globalAlpha = 1;
    const lines = linesOf(text);
    lines.forEach((line, i) => ctx.fillText(line, 28, 74 + i * 46));
    const last = lines[lines.length - 1] ?? "";
    if (Math.floor(now * 2) % 2 === 0 || still.matches) ctx.fillRect(28 + ctx.measureText(last).width + 2, 74 + Math.max(0, lines.length - 1) * 46, 16, 30);
    ctx.globalAlpha = 0.08; ctx.fillStyle = "#000"; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); ctx.globalAlpha = 1;
  }
  ctx.restore();
  screen.update();
}
function draw(now) {
  for (const [id, state] of down) fig.parts.get(id).position.z = rest.get(id) - state.at * TRAVEL;
  rocker.rotation.x = (on ? -1 : 1) * 0.18;
  led.material.emissiveIntensity = on ? 0.9 : 0;
  led.material.color.set(on ? fig.colors.lit : fig.colors.lo);
  paint(now);
  readoutTo(stage, (on ? "on" : "off") + " · " + text.length + " chars");
  fig.render();
}
const runner = loop(stage, (dt, now) => {
  let busy = false;
  if (tour.touring && on) {
    busy = true;
    if (demoPause > 0) { demoPause -= dt; if (demoPause <= 0) { text = ""; demoAt = 0; } }
    else if ((demoClock += dt) > 0.16) { demoClock = 0; if (demoAt < DEMO.length) type(DEMO[demoAt++]); else demoPause = 2.4; }
  }
  for (const [id, state] of down) {
    state.hold -= dt;
    const moving = spring(state, state.hold > 0 ? 1 : 0, dt, 900, 40);
    if (!moving && state.hold <= 0) { down.delete(id); fig.parts.get(id).position.z = rest.get(id); } else busy = true;
  }
  if (spring(power, on ? 1 : 0, dt, 60, 16)) busy = true;
  power.at = Math.min(1, Math.max(0, power.at));
  draw(now);
  return busy || on; // the cursor blinks while on
});
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  let ch = null;
  if (event.key === "Escape") { on = !on; if (status) status.textContent = on ? "Switched on" : "Switched off"; }
  else if (event.key === "Backspace") ch = "\\b";
  else if (event.key === "Enter") ch = "\\n";
  else if (event.key.length === 1) ch = event.key;
  else return;
  event.preventDefault();
  if (tour.touring) { text = ""; demoAt = 0; demoPause = 0; }
  tour.touch();
  if (ch) type(ch);
  runner.kick();
});
stage.addEventListener("click", () => { stage.focus(); tour.touch(); on = !on; if (status) status.textContent = on ? "Switched on" : "Switched off"; runner.kick(); });
draw(0);
`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "desk-computer-3d",
  scene,
  live,
  keys: [
    { mark: "lit", label: "The power light, and the picture on the CRT" },
    { mark: "raised", label: "Fifty-eight keys; each one goes down as it is typed" },
    { mark: "edge", label: "A coiled cord from the keyboard to the side port" },
  ],
  caption: "An all-in-one desk computer in the spirit of 1984, as a three.js scene: a CRT set into a tall case, a floppy slot and speaker grille under it, vents and a rocker switch on the side. Focus it and type: each key you press goes down on the keyboard and the character lands on the screen. Backspace and Return work; Escape or a click switches it off and the picture collapses to a line and then a dot, as a CRT does. Left alone, it types a short greeting to itself.",
  stage: { label: "Desk computer. Type to write on its screen; Escape or a click switches the power." },
  after: `<span class="iso-sr" role="status" aria-live="polite" data-status style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></span>`,
});
