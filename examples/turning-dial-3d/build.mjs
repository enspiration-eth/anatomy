import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, FINGERS, NUMBERS, DIAL, DIAL_TOP, PLATE, PLATE_TOP, DOOR } from "./scene.mjs";

const live = `
const FINGERS = ${JSON.stringify(FINGERS)}, NUMBERS = ${NUMBERS}, STEP = 360 / NUMBERS;
const DIAL_R = ${DIAL.r}, DIAL_TOP = ${DIAL_TOP}, PLATE_HALF = ${PLATE.w / 2}, PLATE_TOP = ${PLATE_TOP}, DOOR_TOP = ${DOOR.h};
const { THREE } = fig;
const dial = fig.parts.get("dial"), pod = fig.parts.get("pod"), hand = fig.parts.get("hand"), led = fig.parts.get("led");
const index = FINGERS[1].map((id) => fig.parts.get(id));
const podHome = { parent: pod.parent, position: pod.position.clone(), quaternion: pod.quaternion.clone() };
const ledColor = led.material.color.clone();
const status = stage.parentElement.querySelector("[data-status]");
let angle = 0, target = 0, lift = { at: 0, rate: 0 }, liftWant = 0, clock = 0;
let free = null; // { v: Vector3, spin: Vector3, resting }
const tour = idleTour(3600, () => runner.kick());
// The tour dials a combination: right to 30, left to 60, right to 15, lifting the finger at each stop.
const COMBO = [30, -60, 15, 0];
let comboAt = 0, hold = 1.2;
const numberOf = (deg) => ((Math.round(-deg / STEP) % NUMBERS) + NUMBERS) % NUMBERS;
const groundAt = (x, y) => { const r = Math.hypot(x, y); return r < DIAL_R ? DIAL_TOP : r < DIAL_R + 6 ? PLATE_TOP + 4 : Math.abs(x) < PLATE_HALF && Math.abs(y) < PLATE_HALF ? PLATE_TOP : DOOR_TOP; };
function breakPod() {
  if (free) { // put it back
    podHome.parent.add(pod); pod.position.copy(podHome.position); pod.quaternion.copy(podHome.quaternion); free = null;
    if (status) status.textContent = "Pod refitted"; return;
  }
  fig.scene.attach(pod);
  const outward = new THREE.Vector3(pod.position.x, pod.position.y, 0).normalize();
  free = { v: new THREE.Vector3(outward.x * 70 - 30, outward.y * 70 - 40, 70), spin: new THREE.Vector3(3, -5, 2), resting: false };
  if (still.matches) { const p = pod.position; p.x += free.v.x * 0.9; p.y += free.v.y * 0.9; p.z = groundAt(p.x, p.y); pod.rotation.set(Math.PI / 2, 0, 0.6); free.resting = true; }
  if (status) status.textContent = "Pod broken off";
}
function stepFree(dt) {
  if (!free || free.resting) return false;
  const p = pod.position;
  free.v.z -= 900 * dt;
  p.addScaledVector(free.v, dt);
  pod.rotation.x += free.spin.x * dt; pod.rotation.y += free.spin.y * dt; pod.rotation.z += free.spin.z * dt;
  const floor = groundAt(p.x, p.y) + 2.5;
  if (p.z < floor) {
    p.z = floor;
    free.v.z = -free.v.z * 0.35; free.v.x *= 0.6; free.v.y *= 0.6; free.spin.multiplyScalar(0.5);
    if (Math.abs(free.v.z) < 25) { free.v.set(0, 0, 0); free.resting = true; p.z = floor - 2.5 + 0.1; pod.rotation.set(Math.PI / 2, 0, pod.rotation.z); }
  }
  return true;
}
function draw() {
  dial.rotation.z = (angle * Math.PI) / 180;
  const l = lift.at;
  index[0].rotation.y = -0.5 * l; index[1].rotation.y = -0.45 * l; index[2].rotation.y = -0.3 * l;
  const glow = 1 - Math.min(1, l * 1.5);
  led.material.color.copy(ledColor).lerp(new THREE.Color(0x3cff8a), glow);
  led.material.emissive.set(0x1aff6a).multiplyScalar(glow * 0.9);
  fig.shaders.get("led-glow").uniforms.uLevel.value = glow;
  const shown = ((angle % 360) + 360) % 360;
  readoutTo(stage, "dial " + numberOf(angle) + " · " + shown.toFixed(1) + "°", numberOf(angle));
  fig.render();
}
const runner = loop(stage, (dt) => {
  if (tour.touring) {
    clock += dt;
    if (Math.abs(target - angle) < 0.05) {
      liftWant = 1;
      if ((hold -= dt) <= 0) {
        hold = 1.4; liftWant = 0;
        const n = COMBO[comboAt++ % COMBO.length];
        // Right (clockwise, angle falling) to a positive n, left to a negative one, always at least half a turn.
        const want = -Math.abs(n) * STEP, dir = n >= 0 ? -1 : 1;
        let next = want + 360 * Math.round((angle - want) / 360);
        while (dir < 0 ? next > angle - 180 : next < angle + 180) next += dir * 360;
        target = next;
      }
    } else liftWant = 0.2;
  }
  angle = follow(angle, target, dt, 0.35);
  const a = spring(lift, liftWant, dt, 300, 24);
  const b = stepFree(dt);
  draw();
  return tour.touring || a || b || angle !== target;
});
const turnTo = (deg) => { tour.touch(); liftWant = 0; target = deg; runner.kick(); };
let grab = null;
const pointerAngle = (event) => { const p = fig.toWorld(event, DIAL_TOP); return p ? (Math.atan2(p.y, p.x) * 180) / Math.PI : null; };
stage.addEventListener("pointerdown", (event) => { stage.focus(); const a = pointerAngle(event); if (a === null) return; grab = { from: a, base: target }; stage.setPointerCapture(event.pointerId); tour.touch(); });
stage.addEventListener("pointermove", (event) => {
  if (!grab) return;
  const a = pointerAngle(event); if (a === null) return;
  let d = a - grab.from; d = ((d + 540) % 360) - 180;
  grab.base += d; grab.from = a;
  turnTo(grab.base);
});
stage.addEventListener("pointerup", () => { if (grab) { grab = null; turnTo(Math.round(target / STEP) * STEP); liftWant = 1; runner.kick(); } });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") turnTo(Math.round(target / STEP) * STEP - STEP);
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") turnTo(Math.round(target / STEP) * STEP + STEP);
  else if (event.key === "PageDown") turnTo(Math.round(target / STEP) * STEP - 10 * STEP);
  else if (event.key === "PageUp") turnTo(Math.round(target / STEP) * STEP + 10 * STEP);
  else if (event.key === " " || event.key === "Enter") { tour.touch(); liftWant = liftWant > 0.5 ? 0 : 1; runner.kick(); }
  else if (event.key === "b" || event.key === "B") { tour.touch(); breakPod(); runner.kick(); }
  else return;
  event.preventDefault();
});
draw();
`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "turning-dial-3d",
  scene,
  live,
  width: 680,
  keys: [
    { mark: "lit", label: "The LED under the index fingertip: it glows while the finger rests on it" },
    { mark: "raised", label: "Dial, 100 numbers; the hand turns with it" },
  ],
  caption: "A combination dial on a door, as a three.js scene. A small gold and chrome hand lies on the dial and turns with it; its index finger lifts on three hinges, and while it rests on the dial a green LED glows under the tip. Drag the dial or use the arrow keys (one number, 3.6°, per press; Page Up and Down for ten); space lifts the finger; B breaks the pod off the wrist as a free body that falls and bounces onto the door, and B again refits it.",
  stage: { role: "slider", label: "Turning dial: arrow keys turn it one number, space lifts the finger, B breaks the pod off", attrs: { "aria-valuemin": 0, "aria-valuemax": NUMBERS - 1, "aria-valuenow": 0 } },
  after: `<span role="status" aria-live="polite" data-status style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></span>`,
});
