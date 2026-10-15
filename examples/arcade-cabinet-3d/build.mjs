import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, MM, COIN, SLOTS, MECH, CHUTE, CASH, SWITCH_Z, SWITCHES } from "./scene.mjs";

const G = 9810 * MM; // units per s²
const ROLL = G * Math.sin(Math.PI / 6) * (2 / 3); // a rolling disc on a 30° slope
const FALL_MM = (CHUTE.to[2] - (CASH.z + 2)) / MM;

const live = `
const G = ${G}, ROLL = ${ROLL}, COIN = ${JSON.stringify(COIN)}, SLOT = ${JSON.stringify(SLOTS[0])}, Y0 = ${-scene.parts.find((p) => p.id === "kick-board").at[1] - 0}, MECH = ${JSON.stringify(MECH)};
const CHUTE = ${JSON.stringify(CHUTE)}, CASH = ${JSON.stringify(CASH)}, SWITCH_Z = ${SWITCH_Z}, SWITCHES = ${JSON.stringify(SWITCHES)};
const { THREE } = fig;
const front = -${-scene.parts.find((p) => p.id === "coin-door").at[1]};
const crt = fig.shaders.get("screen");
const screen = fig.screens.get("screen"), marquee = fig.screens.get("marquee"), meterWin = fig.screens.get("meter-window");
const tubeLamp = fig.parts.get("marquee-tube"), stick = fig.parts.get("stick"), fire = fig.parts.get("fire"), wire = fig.parts.get("switch-wire");
const lamps = [0, 1].map((i) => fig.parts.get("coin-lamp-" + i));
const micro = SWITCHES.map((id) => fig.parts.get(id));
const status = stage.parentElement.querySelector("[data-status]");
const coinGeo = new THREE.CylinderGeometry(COIN.r, COIN.r, COIN.h, 32);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.7, roughness: 0.3 });
const coins = [];
let credits = 0, count = 0, on = false, since = 0, power = { at: 0, rate: 0 }, tilt = { at: 0, rate: 0 }, tiltWant = 0, press = { at: 0, rate: 0 }, pressHold = 0, pulse = 0, clock = 0, nextCoin = 1.5, pile = 0;
const tour = idleTour(5000, () => runner.kick());
const P = (x, y, z) => new THREE.Vector3(x, y, z);
const START = P(SLOT[0], front - 14, SLOT[1]), INSIDE = P(SLOT[0], MECH.y, SLOT[1] - 4), TOP = P(...CHUTE.from), END = P(...CHUTE.to);
const CHUTE_LEN = TOP.distanceTo(END);
function insert() {
  const mesh = new THREE.Mesh(coinGeo, coinMat);
  mesh.castShadow = true;
  mesh.rotation.z = Math.PI / 2; // disc stands in the y-z plane
  fig.scene.add(mesh);
  const coin = { mesh, phase: 0, t: 0, v: 0, z: 0, counted: false };
  coins.push(coin);
  if (still.matches) { finish(coin); count++; credit(); }
  runner.kick();
}
function finish(coin) {
  coin.phase = 4;
  const i = pile++;
  coin.mesh.rotation.set(0, 0, 0);
  coin.mesh.position.set(CASH.x - 12 + (i * 7.3) % 24, CASH.y - 12 + ((i * 11.1) % 24), CASH.z + 2 + COIN.h / 2 + Math.floor(i / 12) * COIN.h);
}
function credit() {
  credits = Math.min(credits + 1, 99);
  pulse = 0.12;
  if (!on) { on = true; since = 0; if (status) status.textContent = "Coin accepted. The cabinet wakes."; }
  else if (status) status.textContent = credits + " credits";
}
function stepCoin(coin, dt) {
  coin.t += dt;
  const m = coin.mesh;
  if (coin.phase === 0) { // into the slot
    const k = Math.min(1, coin.t / 0.25); m.position.lerpVectors(START, INSIDE, ease(k)); if (k === 1) { coin.phase = 1; coin.t = 0; m.visible = false; } }
  else if (coin.phase === 1) { if (coin.t > 0.35) { coin.phase = 2; coin.t = 0; m.visible = true; } } // the mech checks it
  else if (coin.phase === 2) { // rolls down the 30° chute
    const s = Math.min(CHUTE_LEN, 0.5 * ROLL * coin.t * coin.t);
    m.position.lerpVectors(TOP, END, s / CHUTE_LEN);
    m.rotation.x = -s / COIN.r;
    if (s >= CHUTE_LEN) { coin.phase = 3; coin.t = 0; coin.v = ROLL * Math.sqrt((2 * CHUTE_LEN) / ROLL) * Math.sin(Math.PI / 6); coin.vy = coin.v / Math.tan(Math.PI / 6); }
  } else if (coin.phase === 3) { // falls past the switch wire into the cash box
    coin.v += G * dt;
    m.position.z -= coin.v * dt;
    m.position.y = Math.min(CASH.y + 8, m.position.y + coin.vy * dt);
    m.rotation.x -= dt * 8;
    if (!coin.counted && m.position.z < SWITCH_Z) { coin.counted = true; count++; credit(); }
    if (m.position.z <= CASH.z + 2 + COIN.r) finish(coin);
  }
  return coin.phase < 4;
}
function paintMarquee(level) {
  const { ctx, canvas } = marquee, W = canvas.width, H = canvas.height;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const lit = 0.18 + 0.82 * level;
  g.addColorStop(0, "rgba(" + Math.round(40 + 200 * lit) + "," + Math.round(20 + 90 * lit) + "," + Math.round(30 + 40 * lit) + ",1)");
  g.addColorStop(1, "rgba(" + Math.round(20 + 120 * lit) + "," + Math.round(10 + 30 * lit) + "," + Math.round(40 + 60 * lit) + ",1)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,240,210," + (0.25 + 0.75 * level) + ")"; ctx.font = "bold 76px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("STAR RAIDER", W / 2, H / 2 + 4);
  marquee.update();
}
function paintScreen(now) {
  const { ctx, canvas } = screen, W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#050607"; ctx.fillRect(0, 0, W, H);
  const p = power.at;
  if (p > 0.002) {
    // The CRT shader collapses the raster (uVertical: the monitor lies on its side, so to a vertical line,
    // then a dot), warms it up, scans and masks it; the canvas holds only the picture the board draws.
    ctx.save();
    {
      ctx.fillStyle = "#e9f1ff"; ctx.font = "bold 30px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (since < 2) {} else if (since < 3.6) {
        ctx.fillText("RAM OK", W / 2, H * 0.4); if (since > 2.8) ctx.fillText("ROM OK", W / 2, H * 0.5);
      } else {
        const t = still.matches ? 0 : now;
        ctx.fillStyle = "#1b2440"; for (let i = 0; i < 40; i++) { const sx = (i * 97) % W, sy = (i * 61 + t * 40 * (1 + (i % 3))) % H; ctx.fillRect(sx, sy, 3, 3); }
        const cols = ["#ff5a5a", "#ffd25a", "#5affb1", "#5ac8ff"];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) { ctx.fillStyle = cols[r]; const x = 60 + c * 50 + Math.sin(t * 1.2) * 24, y = 120 + r * 40; ctx.fillRect(x, y, 30, 18); ctx.fillRect(x + 6, y + 18, 6, 6); ctx.fillRect(x + 18, y + 18, 6, 6); }
        ctx.fillStyle = "#e9f1ff"; ctx.fillRect(W / 2 - 22 + Math.sin(t * 0.8) * 120, H - 90, 44, 16);
        ctx.fillText(credits ? "PUSH START" : "INSERT COIN", W / 2, 60);
        ctx.font = "bold 24px ui-monospace, Menlo, monospace"; ctx.fillText("CREDIT " + credits, W / 2, H - 36);
      }
    }
    ctx.restore();
  }
  screen.update();
  crt.uniforms.uPower.value = clamp(p, 0, 1);
  crt.uniforms.uWarm.value = on ? clamp(since / 2, 0, 1) : 1;
  fig.time(still.matches ? 0 : now);
}
function paintMeter() {
  const { ctx, canvas } = meterWin;
  ctx.fillStyle = "#e8e3d6"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111"; ctx.font = "bold 24px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(count).padStart(4, "0"), canvas.width / 2, canvas.height / 2 + 1);
  meterWin.update();
}
let lastCount = -1, lastLevel = -1;
function draw(now) {
  const level = on ? clamp(since / 0.4, 0, 1) : 0;
  tubeLamp.material.emissiveIntensity = 0.05 + level * 1.4;
  if (Math.abs(level - lastLevel) > 0.002) { paintMarquee(level); lastLevel = level; }
  paintScreen(now);
  if (lastCount !== count) { paintMeter(); lastCount = count; }
  for (const lamp of lamps) lamp.material.emissiveIntensity = on ? 1.2 : 0.25;
  stick.rotation.y = tilt.at * 0.32;
  micro[0].material.color.set(tilt.at < -0.6 ? 0x5a9bff : 0x2b62c9);
  micro[1].material.color.set(tilt.at > 0.6 ? 0x5a9bff : 0x2b62c9);
  fire.position.z = 1.6 - press.at * 1.6;
  wire.rotation.z = pulse > 0 ? 0.35 : 0;
  readoutTo(stage, (on ? "on" : "off") + " · " + credits + (credits === 1 ? " credit" : " credits"));
  fig.render();
}
micro.forEach((m) => (m.material = m.material.clone()));
const runner = loop(stage, (dt, now) => {
  if (tour.touring) {
    clock += dt;
    if ((nextCoin -= dt) <= 0) { nextCoin = 7; if (credits < 9) insert(); }
    tiltWant = clock % 7 > 4.5 ? Math.sign(Math.sin(clock * 3)) : 0;
    pressHold = clock % 7 > 5.8 && clock % 7 < 6 ? 0.1 : pressHold;
  }
  if (on) since += dt;
  pulse = Math.max(0, pulse - dt);
  pressHold = Math.max(0, pressHold - dt);
  let busy = false;
  for (let i = coins.length - 1; i >= 0; i--) if (coins[i].phase < 4) busy = stepCoin(coins[i], dt) || busy;
  busy = spring(power, on ? 1 : 0, dt, 70, 18) || busy;
  busy = spring(tilt, tiltWant, dt, 500, 30) || busy;
  busy = spring(press, pressHold > 0 ? 1 : 0, dt, 900, 40) || busy;
  draw(now);
  return busy || tour.touring || on || pulse > 0;
});
const act = () => { tour.touch(); runner.kick(); };
stage.addEventListener("click", () => { stage.focus(); act(); insert(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "c" || event.key === "C") insert();
  else if (event.key === "ArrowLeft") tiltWant = tiltWant > 0 ? 0 : -1;
  else if (event.key === "ArrowRight") tiltWant = tiltWant < 0 ? 0 : 1;
  else if (event.key === " ") pressHold = 0.14;
  else if (event.key === "Escape") { on = false; credits = 0; if (status) status.textContent = "Switched off"; }
  else return;
  event.preventDefault();
  act();
});
stage.addEventListener("keyup", (event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { tiltWant = 0; act(); } });
draw(0);
`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "arcade-cabinet-3d",
  scene,
  live,
  keys: [
    { mark: "lit", label: "The picture, on the CRT behind the tilted glass" },
    { mark: "raised", label: "Coin path: slot, mech, chute, switch wire, meter, cash box" },
    { mark: "edge", label: "Harness from the stick, buttons and coin switch to the board" },
  ],
  caption: `An upright cabinet in the style of 1981, 178 cm tall, with the left side panel off, as a three.js scene. Drop a quarter (24.26 mm) in the left slot: the mech checks it, it rolls down a 30° chute at the ${(ROLL / MM / 1000).toFixed(2)} m/s² a rolling disc reaches there, and falls ${(FALL_MM / 10).toFixed(0)} cm past the coin-switch wire into the open cash box (coins are drawn 2.2 times life size so they read). The switch ticks the meter and the board's coin line, and the first coin wakes the cabinet: the marquee strikes, the CRT warms for about two seconds, the board runs its RAM and ROM self-test and the attract mode starts. The monitor lies on its side for a vertical game, so its scan lines run up and down the glass and it collapses to a vertical line when switched off (Escape). Arrow keys move the stick, which closes a microswitch under the panel; space presses fire.`,
  stage: { label: "Arcade cabinet. Press C or click to insert a coin; left and right arrows move the joystick; space presses the fire button; Escape switches the cabinet off." },
  after: `<span role="status" aria-live="polite" data-status style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></span>`,
});
