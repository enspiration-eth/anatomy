import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import { scene, L1, L2, HZ, ANKLE, LEGS, GAIT, speed, GROUND, SNOW, DEPTS, SOURCES, FACTS, UNIT_M } from "./scene.mjs";
import { legAngles, footAt } from "./gait.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const live = `
const L1 = ${L1}, L2 = ${L2}, HZ = ${HZ}, ANKLE = ${ANKLE}, LEGS = ${JSON.stringify(LEGS)}, GAIT = ${JSON.stringify(GAIT)}, SPEED = ${speed}, GROUND = ${JSON.stringify(GROUND)}, NSNOW = ${SNOW}, UNIT_M = ${UNIT_M};
const DEPTS = ${JSON.stringify(DEPTS.map((d) => ({ ...d, match: d.match.source })))};
const SRC = ${JSON.stringify(SOURCES)};
${legAngles.toString()}
${footAt.toString()}
const { THREE } = fig;
const P = (id) => fig.parts.get(id), dark = fig.theme === "dark";
// ---------- atmosphere: an overcast sky, distance fog, a cool rim light from behind, a warm-white key
{
  const [top, mid, hz] = dark ? ["#1b2029", "#3a4351", "#6d7786"] : ["#98a3b2", "#bfc8d3", "#dde3ea"];
  // a sky dome fixed in the world, so the horizon always meets the fogged snow in the same colour
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, hz: { value: new THREE.Color(hz) } },
    vertexShader: "varying vec3 vd; void main() { vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 top, mid, hz; varying vec3 vd; void main() { float h = max(vd.z, 0.0); vec3 c = mix(hz, mid, smoothstep(0.0, 0.12, h)); c = mix(c, top, smoothstep(0.12, 0.6, h)); gl_FragColor = vec4(c, 1.0);\\n#include <colorspace_fragment>\\n}" }));
  sky.frustumCulled = false; sky.renderOrder = -1; fig.scene.add(sky);
  fig.scene.fog = new THREE.Fog(hz, 1e5, 2e5);
  if (!dark) fig.scene.environmentIntensity *= 0.45;
  fig.scene.traverse((o) => { if (o.isHemisphereLight) { o.intensity *= dark ? 0.7 : 0.5; o.color.set(dark ? "#d3d8e0" : "#e9edf2"); o.groundColor.set(dark ? "#4a4c50" : "#9a9890"); }
    if (o.isDirectionalLight) { o.color.set("#fff3e6"); o.intensity *= dark ? 1.45 : 0.85; } });
  const rim = new THREE.DirectionalLight(dark ? "#d6e2f5" : "#e8eef8", dark ? 2.0 : 1.5); rim.position.set(-900, 700, 520); fig.scene.add(rim);
  // Snow beyond the detailed field: one 400 000-unit plain (10x the old one: 4 vertices, 2 triangles, no texture, one
  // draw call — size costs nothing; only the far plane grows) at z -4, plus a blend apron that slopes smoothly from
  // the live heightfield's edge down to it, so the field's slab edge no longer shows as a rectangle when zoomed out.
  const plainMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }); // same colour and roughness as the snowfield, so the seam does not show
  // the outer plain is four flat strips beyond the apron (not one sheet under everything, see below), so no two snow
  // surfaces ever overlap and z-fight; together they span 400 000 units (10x the old 40 000 sheet)
  fig.camera.far = Math.max(fig.camera.far, 500000); fig.camera.updateProjectionMatrix();
  {
    // four indexed grid strips (smooth normals) sloping from the field's edge height down to the outer plain; the
    // fall is a smoothstep of the distance outside the field, so there is no crease at either end
    const B = fig.lowMemory ? 2400 : 6000, hw = GROUND.w / 2, hd = GROUND.d / 2;
    const strip = (w, d, sx, sy, at) => {
      const geo = new THREE.PlaneGeometry(w, d, Math.max(8, Math.round(w / 150)), Math.max(8, Math.round(d / 150))), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + at[0], y = pos.getY(i) + at[1], dist = Math.hypot(Math.max(Math.abs(x) - hw, 0), Math.max(Math.abs(y) - hd, 0)), t = Math.min(dist / B, 1); pos.setZ(i, 1 - 5 * t * t * (3 - 2 * t)); }
      geo.computeVertexNormals();
      const nor = geo.attributes.normal; // force the rim normals vertical, so the apron meets the field and the plain with no shading seam
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + at[0], y = pos.getY(i) + at[1], dist = Math.hypot(Math.max(Math.abs(x) - hw, 0), Math.max(Math.abs(y) - hd, 0)); if (dist < 1 || dist > B - 1) nor.setXYZ(i, 0, 0, 1); }
      const mesh = new THREE.Mesh(geo, plainMat); mesh.position.set(at[0], at[1], 0); mesh.name = "snowapron"; mesh.receiveShadow = true; fig.scene.add(mesh);
    };
    for (const s of [-1, 1]) { strip(B, GROUND.d + 2 * B, 0, 0, [s * (hw + B / 2), 0]); strip(GROUND.w, B, 0, 0, [0, s * (hd + B / 2)]); }
    // flat outer plain strips from the apron's rim (z -4) out to +/-200 000
    const OUT = 200000, flat = (w, d, x, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), plainMat); m.position.set(x, y, -4); m.name = "snowplain"; m.receiveShadow = true; fig.scene.add(m); };
    for (const s of [-1, 1]) { flat(OUT - hw - B, 2 * OUT, s * (hw + B + (OUT - hw - B) / 2), 0); flat(GROUND.w + 2 * B, OUT - hd - B, 0, s * (hd + B + (OUT - hd - B) / 2)); }
  }
  const fill = new THREE.DirectionalLight("#9fb3cc", 0.5); fill.position.set(400, -800, 200); fig.scene.add(fill);
  // light bounced up off the snow onto the belly
  const bounce = new THREE.DirectionalLight("#e8eef6", dark ? 0.5 : 0.32); bounce.position.set(150, 250, -700); fig.scene.add(bounce);
}
const root = stage.closest(".iso-plate")?.parentElement ?? document.body;
const $ = (q) => root.querySelector(q), status = $("[data-live]");
const sliceBtn = $("[data-slice]"), sliceIn = $("[data-depth]"), sliceOut = $("[data-depth-out]"), walkBtn = $("[data-walk]");
const viewBtns = [...root.querySelectorAll("[data-view]")], deptBtns = [...root.querySelectorAll("[data-dept]")];
const NAMES = { fl: "front left", fr: "front right", rl: "rear left", rr: "rear right" };

// ---------- state
let t = 1.3, walking = !still.matches, az = 36, el = 2, zoom = 2.9, sliceOn = false, sliceY = -20, open = null, hover = null, frame = 0;
const TARGET0 = [70, 0, 250], target = new THREE.Vector3(...TARGET0);
const tour = idleTour(6000, () => runner.kick());
let tourClock = 0;
const body = P("body"), head = P("head"), neck = P("neck");
const legs = LEGS.map(([n, hx, hy, ph]) => ({ n, hx, hy, ph, thigh: P("thigh-" + n), shin: P("shin-" + n), foot: P("foot-" + n), stance: true }));
const prints = [];
let travelled = 0;

// ---------- gait, prints
function pose(time, bob) {
  for (const L of legs) {
    const [fx, lift, stance] = footAt(L.hx, L.ph, time);
    if (stance && !L.stance) prints.push({ x: fx, y: L.hy, age: 0 });
    L.stance = stance; L.lift = lift;
    const [a, b, c] = legAngles(fx - L.hx, ANKLE + lift - bob - HZ);
    L.thigh.rotation.y = a; L.shin.rotation.y = b; L.foot.rotation.y = c;
  }
}
function advance(dt) {
  t += dt; travelled += SPEED * dt;
  for (const p of prints) { p.x -= SPEED * dt; p.age += dt; }
  while (prints.length && prints[0].x < -GROUND.w / 2 - 80) prints.shift();
}
function bobAt(time) { return -4 + 4 * Math.cos((4 * Math.PI * time) / GAIT.period); }
function sway(time) {
  const bob = bobAt(time);
  body.position.z = bob;
  let roll = 0; for (const L of legs) roll += (L.lift || 0) * Math.sign(L.hy) * 0.0004;
  body.rotation.x = roll;
  body.rotation.y = 0.012 * Math.sin((2 * Math.PI * time) / GAIT.period);
  head.rotation.z = 0.14 * Math.sin(time * 0.21);
  neck.rotation.x = 0;
  return bob;
}
// ---------- snow ground
const R = 58;
function snowHeight(x, y) {
  // the waves flatten out over the last 500 units of the field, so it meets the smooth blend apron at a constant
  // height (z 1) with no visible seam; footprints only ever occur near the middle, where the fade is 1
  const ef = Math.min(1, Math.max(0, Math.min(GROUND.w / 2 - Math.abs(x), GROUND.d / 2 - Math.abs(y)) / 500)), es = ef * ef * (3 - 2 * ef);
  let z = 1 + (2.4 * Math.sin((x + travelled) * 0.013) * Math.cos(y * 0.021) + 1.6 * Math.sin((x + travelled) * 0.031 + y * 0.017)) * es;
  for (const p of prints) {
    const dx = x - p.x, dy = y - p.y; if (dx > 80 || dx < -80 || dy > 80 || dy < -80) continue;
    const r = Math.hypot(dx, dy), fade = Math.exp(-p.age / 30);
    if (r < R) z -= 13 * fade * (1 - Math.pow(r / R, 6)) + 2.5 * fade * (Math.abs(Math.sin(Math.atan2(dy, dx) * 2)) > 0.92 && r > R * 0.72 ? 1 : 0);
    else if (r < R + 18) z += 3.5 * fade * Math.sin((Math.PI * (r - R)) / 18);
  }
  return z;
}
const SNOW_RAMP = [[0, "#7d91ae"], [0.5, "#c7d3e3"], [0.78, "#edf2f8"], [1, "#ffffff"]];
function drawSnow() {
  fig.heights("snowfield", snowHeight);
  fig.paint("snowfield", (x, y, z) => Math.min(dark ? 1 : 0.86, Math.max(0, 0.78 + z / 22)), SNOW_RAMP);
}
// ---------- falling snow
// fewer falling flakes on the low-memory (phone) profile
const NFLAKES = fig.lowMemory ? Math.round(NSNOW * 0.4) : NSNOW;
const flakes = P("flakes"), fpos = [], fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fv = new THREE.Vector3(), fs = new THREE.Vector3(1, 1, 1);
for (let i = 0; i < NFLAKES; i++) { const h = Math.sin(i * 12.9898) * 43758.5453; fpos.push([(h - Math.floor(h) - 0.5) * GROUND.w, ((Math.sin(i * 78.233) * 43758.5453) % 1) * GROUND.d / 2, ((i * 37) % 640), 28 + (i % 7) * 7]); }
function snowfall(dt) {
  for (let i = 0; i < NFLAKES; i++) { const f = fpos[i];
    f[2] -= f[3] * dt; f[0] -= SPEED * 0.25 * dt + 6 * Math.sin(t * 0.7 + i) * dt;
    if (f[2] < 0) { f[2] += 640; } if (f[0] < -GROUND.w / 2) f[0] += GROUND.w;
    flakes.setMatrixAt(i, fm.compose(fv.set(f[0], f[1], f[2]), fq, fs)); }
  flakes.count = NFLAKES; flakes.instanceMatrix.needsUpdate = true;
}

// ---------- camera
// a camera looking up must stay above the snow: lift the elevation until it does
function keepAboveSnow() { const p = fig.camera.position, d = p.distanceTo(target); if (p.z < 30 && d > 0) { el = Math.asin(Math.max(-1, Math.min(1, (30 - target.z) / d))) * 180 / Math.PI; fig.view(az, el, zoom, target); } }
function applyView() { fig.view(az, el, zoom, target); keepAboveSnow(); const cam = fig.camera;
  // in the orthographic (isometric) view the camera sits far away by construction, so fog follows the equivalent
  // perspective distance instead, or the walker would fog out
  const d = fig.ortho ? (cam.userData.halfW ?? 1800) / (0.268 * ((cam.right - cam.left) / (cam.top - cam.bottom))) / zoom : cam.position.distanceTo(target);
  // the orthographic camera sits radius*6 away, so shift the fog band by that physical distance minus the equivalent one
  if (fig.scene.fog) { const off = fig.ortho ? cam.position.distanceTo(target) - d : 0; fig.scene.fog.near = off + d * 1.1; fig.scene.fog.far = off + d * 5; } }
// ---------- section
function applySlice() {
  fig.setSection(sliceOn ? sliceY : -2000);
  if (sliceBtn) { sliceBtn.setAttribute("aria-pressed", String(sliceOn)); sliceBtn.textContent = sliceOn ? "S Slice on" : "S Slice off"; }
  if (sliceIn) sliceIn.value = String(sliceY);
  if (sliceOut) sliceOut.textContent = sliceOn ? (sliceY * UNIT_M >= 0 ? "+" : "−") + Math.abs(sliceY * UNIT_M).toFixed(1) + " m" : "off";
}

// ---------- departments: meshes, hover highlight, click card with a leader
const deptOf = new Map(), deptMeshes = new Map(), walker = [];
const RX = DEPTS.map((d) => [d, new RegExp(d.match)]);
fig.scene.traverse((o) => {
  if (!(o.isMesh) || !o.name || o.name === "snowfield" || o.name === "flakes") return;
  walker.push(o);
  const hit = RX.find(([, rx]) => rx.test(o.name));
  if (hit) { deptOf.set(o, hit[0]); if (!deptMeshes.has(hit[0].id)) deptMeshes.set(hit[0].id, []); deptMeshes.get(hit[0].id).push(o); }
});
const HI = new THREE.Color(dark ? "#ffb347" : "#ff9a1f");
for (const list of deptMeshes.values()) for (const m of list) { m.userData.em = m.material.emissive ? m.material.emissive.clone() : null; m.userData.ei = m.material.emissiveIntensity ?? 1; }
function highlight(id, on) {
  for (const m of deptMeshes.get(id) ?? []) { if (!m.material.emissive) continue;
    if (on) { m.material.emissive.copy(HI); m.material.emissiveIntensity = dark ? 0.32 : 0.22; } else { m.material.emissive.copy(m.userData.em); m.material.emissiveIntensity = m.userData.ei; } }
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = fig.renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, fig.camera);
  for (const h of ray.intersectObjects(walker, false)) {
    if (sliceOn && h.point.y < sliceY) continue; // clipped away: look through it
    return deptOf.get(h.object) ?? null;
  }
  return null;
}
stage.style.position = "relative";
const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
overlay.setAttribute("class", "atat-leader"); overlay.setAttribute("aria-hidden", "true");
overlay.innerHTML = '<line></line><circle r="5"></circle><circle r="11" class="ring"></circle>';
const card = document.createElement("div");
card.className = "atat-card"; card.setAttribute("role", "dialog"); card.hidden = true; overlay.style.display = "none";
stage.append(overlay, card);
const lineEl = overlay.querySelector("line"), dotEl = overlay.querySelectorAll("circle");
function openCard(d) {
  if (open) highlight(open.id, false);
  open = d; highlight(d.id, true);
  card.innerHTML = '<button type="button" class="atat-x" aria-label="Close">×</button><p class="atat-k">Department</p><h3></h3><p class="atat-fn"></p><p class="atat-canon"></p><p class="atat-src"></p>';
  card.querySelector("h3").textContent = d.name; card.querySelector(".atat-fn").textContent = d.fn;
  card.querySelector(".atat-canon").textContent = "Canon note: " + d.canon;
  card.querySelector(".atat-src").innerHTML = 'Fiction, after <a href="' + SRC[0][2] + '">Wookieepedia</a> and the <a href="' + SRC[1][2] + '">StarWars.com databank</a>.';
  card.querySelector(".atat-x").addEventListener("click", (e) => { e.stopPropagation(); closeCard(); });
  card.setAttribute("aria-label", d.name); card.hidden = false; overlay.style.display = "";
  deptBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dept === d.id)));
  if (status) status.textContent = d.name + ": " + d.fn;
  placeCard(); runner.kick();
}
function closeCard() { if (!open) return; cardAt = null; highlight(open.id, false); if (hover && hover.id === open.id) highlight(hover.id, true); open = null; card.hidden = true; overlay.style.display = "none"; deptBtns.forEach((b) => b.setAttribute("aria-pressed", "false")); fig.render(); }
card.addEventListener("pointerdown", (e) => e.stopPropagation());
const av = new THREE.Vector3(), bv = new THREE.Vector3(); let cardAt = null;
function placeCard() {
  if (!open) return;
  const W = stage.clientWidth, H = fig.renderer.domElement.clientHeight;
  av.set(...open.anchor); body.localToWorld(av); av.project(fig.camera);
  const ax = (av.x + 1) / 2 * W, ay = (1 - av.y) / 2 * H;
  const cw = Math.min(250, W - 24); card.style.width = cw + "px"; card.style.maxHeight = (H - 16) + "px"; card.style.overflowY = "auto"; const ch = card.offsetHeight || 160;
  // the walker's box on screen, so the card sits clear of the subject when it can
  const boxOf = (xs, zs) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of xs) for (const y of [-70, 70]) for (const z of zs) { bv.set(x, y, z); body.localToWorld(bv); bv.project(fig.camera);
      const sx = (bv.x + 1) / 2 * W, sy = (1 - bv.y) / 2 * H; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); } return [x0, y0, x1, y1]; };
  const hullBox = boxOf([-190, 400], [300, 500]), legBox = boxOf([-160, 160], [0, 300]);
  const [bx0, by0, bx1, by1] = hullBox;
  const m = 14, cands = [];
  for (const cx of [m, (W - cw) / 2, W - cw - m]) for (const cy of [m, (H - ch) / 2, H - ch - m]) cands.push([cx, cy]);
  cands.push([Math.max(m, bx0 - cw - 24), clamp(ay - ch / 2, m, H - ch - m)], [Math.min(W - cw - m, bx1 + 24), clamp(ay - ch / 2, m, H - ch - m)]);
  const ov = (cx, cy, [x0, y0, x1, y1]) => Math.max(0, Math.min(cx + cw, x1) - Math.max(cx, x0)) * Math.max(0, Math.min(cy + ch, y1) - Math.max(cy, y0));
  const overlap = (cx, cy) => ov(cx, cy, hullBox) + 0.3 * ov(cx, cy, legBox);
  let best = cands[0], score = Infinity;
  for (const [cx, cy] of cands) { if (cx < 0 || cy < 0 || cx + cw > W || cy + ch > H + 1) continue; const sc = overlap(cx, cy) * 4 + Math.hypot(cx + cw / 2 - ax, cy + ch / 2 - ay) * 40; if (sc < score) { score = sc; best = [cx, cy]; } }
  // hold still unless the better spot is clearly better, so the card does not jitter as the walker moves
  if (cardAt && Math.abs(cardAt[0] - best[0]) + Math.abs(cardAt[1] - best[1]) > 1) { const [ox, oy] = cardAt, old = overlap(ox, oy) * 4 + Math.hypot(ox + cw / 2 - ax, oy + ch / 2 - ay) * 40; if (old < score * 1.25 + 2000) best = cardAt; }
  if (W < 520) best = [12, Math.max(8, H - ch - 8)];
  cardAt = best;
  const [cx, cy] = best;
  card.style.width = cw + "px"; card.style.left = cx + "px"; card.style.top = cy + "px";
  overlay.setAttribute("width", W); overlay.setAttribute("height", H); overlay.setAttribute("viewBox", "0 0 " + W + " " + H);
  const ex = clamp(ax, cx, cx + cw), ey = clamp(ay, cy, cy + ch);
  lineEl.setAttribute("x1", ex); lineEl.setAttribute("y1", ey); lineEl.setAttribute("x2", ax); lineEl.setAttribute("y2", ay);
  dotEl.forEach((c) => { c.setAttribute("cx", ax); c.setAttribute("cy", ay); });
}

// ---------- input: orbit drag, wheel zoom, hover, click
let down = null;
stage.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, az, el, moved: false }; stage.setPointerCapture(e.pointerId); tour.touch(); });
stage.addEventListener("pointermove", (e) => {
  if (down) { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 4) down.moved = true;
    if (down.moved) { az = down.az - dx * 0.35; el = clamp(down.el + dy * 0.25, -30, 80); applyView(); runner.kick(); } return; }
  const d = pick(e);
  if ((d && d.id) !== (hover && hover.id)) { if (hover && (!open || open.id !== hover.id)) highlight(hover.id, false); hover = d; if (d) highlight(d.id, true); stage.style.cursor = d ? "pointer" : "grab"; runner.kick(); }
});
stage.addEventListener("pointerup", (e) => {
  if (!down) return; const moved = down.moved; down = null; if (moved) return;
  const d = pick(e); if (d) openCard(d); else closeCard(); runner.kick();
});
stage.addEventListener("pointerleave", () => { if (hover && (!open || open.id !== hover.id)) highlight(hover.id, false); hover = null; runner.kick(); });
stage.addEventListener("wheel", (e) => { e.preventDefault(); tour.touch(); zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 1.2, 8); applyView(); runner.kick(); }, { passive: false });
const ISO_EL = 35.264; // true isometric elevation: asin(1/sqrt(3))
const setView = (k) => { target.set(...TARGET0); if (k === "iso") { fig.setOrtho(true); az = -135; el = ISO_EL; zoom = 2.6; applyView(); return; } fig.setOrtho(false); if (k === "side") { az = 0; el = 3; zoom = 2.4; } else if (k === "front") { az = -90; el = 5; zoom = 2.5; } else if (k === "low") { az = 24; el = -18; zoom = 4.6; target.set(20, 0, 330); } else { az = 36; el = 2; zoom = 2.9; } applyView(); };
viewBtns.forEach((b) => b.addEventListener("click", () => { tour.touch(); setView(b.dataset.view); runner.kick(); }));
deptBtns.forEach((b) => b.addEventListener("click", () => { tour.touch(); const d = DEPTS.find((q) => q.id === b.dataset.dept); if (open && open.id === d.id) closeCard(); else openCard(d); }));
sliceBtn?.addEventListener("click", () => { tour.touch(); sliceOn = !sliceOn; applySlice(); runner.kick(); });
sliceIn?.addEventListener("input", () => { tour.touch(); sliceOn = true; sliceY = Number(sliceIn.value); applySlice(); runner.kick(); });
walkBtn?.addEventListener("click", () => { tour.touch(); walking = !walking && !still.matches; walkBtn.setAttribute("aria-pressed", String(walking)); walkBtn.textContent = walking ? "Space Pause walk" : "Space Walk"; runner.kick(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { closeCard(); e.preventDefault(); } });
stage.addEventListener("keydown", (e) => {
  if (e.key === "[" || e.key === "]") { sliceOn = true; sliceY = clamp(sliceY + (e.key === "]" ? 5 : -5), -70, 70); applySlice(); }
  else if (e.key === "s" || e.key === "S") { sliceOn = !sliceOn; applySlice(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { az += e.key === "ArrowRight" ? 10 : -10; applyView(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") { el = clamp(el + (e.key === "ArrowUp" ? 5 : -5), -30, 80); applyView(); }
  else if (e.key === "v" || e.key === "V") setView("side");
  else if (e.key === " ") walkBtn?.click();
  else if (/^[1-7]$/.test(e.key)) { openCard(DEPTS[Number(e.key) - 1]); }
  else return;
  e.preventDefault(); tour.touch(); runner.kick();
});

// ---------- loop
function readout() {
  const sw = legs.find((L) => !L.stance);
  const text = (walking ? (sw ? NAMES[sw.n] + " leg swinging" : "all four feet down") : still.matches ? "standing mid-stride" : "paused") + " · " + (sliceOn ? "slice " + (sliceY * UNIT_M >= 0 ? "+" : "−") + Math.abs(sliceY * UNIT_M).toFixed(1) + " m" : "slice off") + (open ? " · " + open.name : "");
  readoutTo(stage, text);
}
function draw(dt) {
  const bob = sway(t); pose(t, bob);
  if (frame++ % 3 === 0 || dt === 0) drawSnow();
  fig.render(); placeCard(); readout();
}
const runner = loop(stage, (dt) => {
  if (tour.touring) {
    tourClock += dt;
    az = 38 + 34 * Math.sin(tourClock * 0.09); el = 7 + 5 * Math.sin(tourClock * 0.13);
    const ph = (tourClock % 36) / 36; // every 36 s: slice in from the near side, hold, out
    if (ph > 0.45) { sliceOn = true; sliceY = -70 + 80 * Math.min(1, (ph - 0.45) / 0.25); } else if (sliceOn && ph < 0.05) sliceOn = false;
    applySlice(); applyView();
  }
  if (walking) { advance(dt); snowfall(dt); }
  draw(dt);
  return walking || tour.touring || !!down;
});
// seed footprints by walking 14 s unrendered, so the field already has a trail
for (let k = 0; k < 14 * 30; k++) { advance(1 / 30); pose(t, bobAt(t)); }
if (still.matches) t = 2.0;
snowfall(0); applyView(); applySlice(); draw(0);
if (walkBtn) { walkBtn.setAttribute("aria-pressed", String(walking)); walkBtn.textContent = walking ? "Space Pause walk" : "Space Walk"; }
window.__atat = { open: (id) => openCard(DEPTS.find((d) => d.id === id)), close: closeCard, get card() { return open && open.id; }, prints, fig, setSlice: (y) => { sliceOn = y !== null; if (y !== null) sliceY = y; applySlice(); draw(0); }, view: (a, e, z = 1, tg) => { az = a; el = e; zoom = z; target.set(...(tg ?? TARGET0)); applyView(); draw(0); }, legs };
`;
const css = `.at-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font:11px/1.4 var(--anatomy-mono);color:var(--anatomy-muted)}
.at-ctl button{padding:5px 9px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-muted);font:inherit;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.at-ctl button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-strong)}.at-ctl input{width:150px}.at-ctl .at-gap{width:10px}
.atat-leader{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}.atat-leader line{stroke:var(--anatomy-strong);stroke-width:1.2}.atat-leader circle{fill:var(--anatomy-strong)}.atat-leader circle.ring{fill:none;stroke:var(--anatomy-strong);stroke-width:1;opacity:.6}
.atat-card{position:absolute;z-index:3;box-sizing:border-box;padding:10px 12px 8px;font-size:10.5px!important;background:var(--anatomy-card,var(--anatomy-page));border:1px solid var(--anatomy-strong);color:var(--anatomy-muted);font:11px/1.55 var(--anatomy-mono);box-shadow:0 8px 28px rgba(0,0,0,.35)}
.atat-card h3{margin:0 0 6px;font:600 13px/1.3 var(--anatomy-mono);color:var(--anatomy-strong);letter-spacing:.04em;text-transform:uppercase}
.atat-card p{margin:0 0 6px}.atat-card .atat-k{font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin:0 0 2px}.atat-card .atat-canon{opacity:.85}.atat-card .atat-src{font-size:10px;opacity:.75}.atat-card a{color:inherit}
.atat-x{position:absolute;right:6px;top:4px;border:0;background:transparent;color:var(--anatomy-strong);font:16px/1 var(--anatomy-mono);cursor:pointer;padding:4px}
.at-notes{margin-top:12px;font:11px/1.6 var(--anatomy-mono);color:var(--anatomy-muted)}.at-notes a{color:inherit}.at-notes ul{margin:4px 0 8px 18px;padding:0}
.at-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
const SIMPLIFIED = [
  "This is fiction. The walker is an original model built from code in the spirit of the design, not a film asset or official blueprint.",
  "Interior layout is illustrative. Canon names the crew, troops, speeder bikes and guns [1][2], not a deck plan.",
  "The walk is a lateral-sequence gait: one foot in the air at a time, the slow, stable gait of large quadrupeds. Knees bend forward. Leg angles come from two-bone inverse kinematics, so every planted foot holds still on the snow as the ground slides back beneath it.",
  "Footprints are pressed into a live heightfield as each foot lands. They drift back with the snow and fill in over about half a minute.",
  `Scale is about 4.5 cm per unit, which puts the roof near ${FACTS.heightM} m, the height Wookieepedia gives [1].`,
];
const notes = `<details class="at-notes"><summary>Sources and simplifications</summary><ul>${SIMPLIFIED.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Sources:</p><ul>${SOURCES.map(([n, t, u]) => `<li>${n} <a href="${u}">${esc(t)}</a></li>`).join("")}</ul></details>`;
writeThreeFigure({
  dir: here, name: "at-at-3d", scene, live, css, width: 980,
  keys: [
    { mark: "raised", label: "Hatched faces: the walls the slice cuts through" },
    { mark: "lit", label: "A highlighted department: click it for its card" },
    { mark: "edge", label: "Footprints pressed into the snow, drifting back as it walks" },
  ],
  caption: `An all-terrain armoured transport walking in place through snow. It is fiction, built here as an original procedural model after the canon design [1][2]. It walks one foot at a time: each leg's thigh, knee and ankle angles are solved from where its foot must be, so a planted foot stays still while the snow slides back beneath it. Each landing presses a print with a raised rim into the snow, and older prints fill in. Turn on the slice and move it through the body from the side to see what lies inside: the cockpit in the head, the neck corridor, the troop bay, the speeder bike bay, the generator and the leg drives. Click any of them for a card explaining what it does. Canon gives a crew of ${FACTS.crew} in the cockpit, about ${FACTS.troops} troops and ${FACTS.bikes} speeder bikes [1]; the deck layout shown is illustrative.`,
  stage: { role: "group", label: "Walker in snow. Drag to orbit, scroll to zoom, arrow keys turn the camera, V side view, Low looks up at the belly. S toggles the slice, [ and ] move it. Keys 1 to 7 open a department card, Escape closes it. Space pauses the walk." },
  after: `<div class="at-ctl" role="group" aria-label="View and slice"><button type="button" data-walk aria-pressed="true">Space Pause walk</button><span class="at-gap"></span><button type="button" data-view="iso">Iso</button><button type="button" data-view="side">V Side</button><button type="button" data-view="front">Front</button><button type="button" data-view="low">Low</button><span class="at-gap"></span><button type="button" data-slice aria-pressed="false">S Slice off</button><label>Depth <input type="range" min="-70" max="70" step="1" value="-20" data-depth aria-label="Slice depth across the body, from the near side"></label><span data-depth-out>off</span></div>
<div class="at-ctl" role="group" aria-label="Departments">${DEPTS.map((d, i) => `<button type="button" data-dept="${d.id}" aria-pressed="false">${i + 1} ${esc(d.name)}</button>`).join("")}</div><span class="at-live" aria-live="polite" data-live></span>${notes}`,
});
