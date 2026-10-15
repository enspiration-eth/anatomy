import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { coilPoints } from "../../kit/three-parts.mjs";
import { scene, HALF, BUTTON_H, BUTTON_Z, SWELL, GIVE, CARRY, PULL_MOST, RODS, CARRIAGE, SPRING, FINGER } from "./scene.mjs";

const lean = (pull) => Math.sign(pull) * GIVE * (1 - Math.exp(-Math.abs(pull * (1 - CARRY)) / GIVE));
const pulled = lean(-PULL_MOST);

const live = `
const HALF = ${JSON.stringify(HALF)}, BUTTON_H = ${BUTTON_H}, BUTTON_Z = ${BUTTON_Z}, SWELL = ${SWELL}, GIVE = ${GIVE}, CARRY = ${CARRY}, PULL_MOST = ${PULL_MOST};
const RODS = ${JSON.stringify(RODS)}, CW = ${CARRIAGE.w}, SPRING = ${JSON.stringify(SPRING)}, TRAVEL = ${FINGER.travel};
const { THREE } = fig;
const carriage = fig.parts.get("carriage"), probe = fig.parts.get("probe"), finger = fig.parts.get("finger");
const button = fig.parts.get("button"), plunger = fig.parts.get("plunger"), needle = fig.parts.get("gauge-needle");
const springs = [-1, 1].flatMap((sx, i) => RODS.y.map((y, j) => ({ sx, y, mesh: fig.parts.get("spring-" + i + "-" + j) })));
button.matrixAutoUpdate = false;
const coil = ${coilPoints.toString()};
const leanOf = (pull) => Math.sign(pull) * GIVE * (1 - Math.exp(-Math.abs(pull * (1 - CARRY)) / GIVE));
let press = { at: 0, rate: 0 }, pull = { at: 0, rate: 0 }, pressed = false, pullTarget = 0, clock = 0;
const tour = idleTour(3600, () => runner.kick());
const TOUR = [[0.0, false, 0], [1.0, true, 0], [2.2, true, PULL_MOST], [3.6, true, -PULL_MOST], [5.0, true, 0], [5.8, false, 0], [7.4, false, 0]];
function rebuildSprings(cx) {
  for (const s of springs) {
    const from = s.sx * RODS.end, to = cx + s.sx * (CW / 2 + 6);
    const pts = coil(0, 0, SPRING.r, from, to, SPRING.turns, 14).map(([a, b, x]) => new THREE.Vector3(x, s.y + a, RODS.z + b));
    s.mesh.geometry.dispose();
    s.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, SPRING.wire, 8, false);
  }
}
let lastCx = null;
function draw() {
  const p = Math.max(0, Math.min(1, press.at));
  const cx = pull.at * CARRY * p;
  const l = leanOf(pull.at) * p;
  const swell = 1 + SWELL * p;
  carriage.position.x = cx;
  if (lastCx === null || Math.abs(cx - lastCx) > 0.01) { rebuildSprings(cx); lastCx = cx; }
  const squash = 1 - 0.12 * p;
  // Lean is a shear: the top moves by l, the base stays on the pad.
  button.matrix.set(swell, 0, l / (BUTTON_H * squash), 0, 0, swell, 0, 0, 0, 0, squash, BUTTON_Z, 0, 0, 0, 1);
  button.matrix.multiply(new THREE.Matrix4().makeScale(1, 1, 1));
  button.matrixWorldNeedsUpdate = true;
  plunger.position.x = HALF[0] * swell + l;
  needle.rotation.z = -(l / 20) * Math.PI * 2;
  probe.position.x = cx + l;
  finger.position.z = -TRAVEL * press.at - (BUTTON_H * 0.12 * p);
  const text = (HALF[0] * 2 * swell).toFixed(1) + " × " + (HALF[1] * 2 * swell).toFixed(1) + " · lean " + Math.abs(l).toFixed(1) + " px";
  readoutTo(stage, text, Math.round(Math.abs(l)));
  fig.render();
}
const runner = loop(stage, (dt) => {
  if (tour.touring) {
    clock = (clock + dt) % TOUR[TOUR.length - 1][0];
    const step = [...TOUR].reverse().find((s) => s[0] <= clock);
    pressed = step[1]; pullTarget = step[2];
  }
  const a = spring(press, pressed ? 1 : 0, dt, 540, 40);
  const b = spring(pull, pressed ? pullTarget : 0, dt, 320, 22);
  draw();
  return a || b || tour.touring;
});
const act = (nextPressed, nextPull) => { tour.touch(); pressed = nextPressed; pullTarget = clamp(nextPull, -PULL_MOST, PULL_MOST); runner.kick(); };
let dragFrom = null;
stage.addEventListener("pointerdown", (event) => { stage.focus(); dragFrom = event.clientX; act(true, 0); });
stage.addEventListener("pointermove", (event) => {
  if (dragFrom === null) return;
  const box = stage.getBoundingClientRect();
  act(true, ((event.clientX - dragFrom) / box.width) * PULL_MOST * 3);
});
addEventListener("pointerup", () => { if (dragFrom !== null) { dragFrom = null; act(false, 0); } });
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") act(!pressed, 0);
  else if (event.key === "ArrowRight") act(true, pullTarget + 20);
  else if (event.key === "ArrowLeft") act(true, pullTarget - 20);
  else if (event.key === "Escape") act(false, 0);
  else return;
  event.preventDefault();
});
draw();
`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "test-rig-3d",
  scene,
  live,
  keys: [
    { mark: "lit", label: "Finger probe: presses the button and pulls it sideways" },
    { mark: "raised", label: "Glass button on a spring-mounted carriage, read by a dial gauge" },
  ],
  caption: `A 120 × 32 glass button on a test rig, as a three.js scene: a carriage on two guide rods held by four springs, a finger probe on a gantry behind it, and a dial gauge riding on the carriage whose feeler reads how far the button's top leans. Pressed, the button swells ${SWELL * 100}% across; pulled, the carriage takes ${CARRY * 100}% of the pull against its springs and the rubber top leans the rest, up to ${GIVE} px. Pulled 80 px it leans ${Math.abs(pulled).toFixed(1)} px; one turn of the needle is 20 px.`,
  stage: { role: "slider", label: "Test rig: space presses the button, left and right arrows pull it", attrs: { "aria-valuemin": 0, "aria-valuemax": GIVE, "aria-valuenow": 0 } },
});
