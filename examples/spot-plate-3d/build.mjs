import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeThreeFigure } from "../../scripts/build-three.mjs";
import * as S from "./scene.mjs";

const { scene, GAPS, MERGE, RA, RB, BIG_Y, DATUM_Y, WELL_HALF, GLASS_H, BLADES, MERGE_MOST, ROWS } = S;
const joined = S.joinedAt(MERGE);

const live = `
const GAPS = ${JSON.stringify(GAPS)}, RA = ${RA}, RB = ${RB}, BIG_Y = ${BIG_Y}, DATUM_Y = ${DATUM_Y}, GLASS_H = ${GLASS_H}, MOST = ${MERGE_MOST};
const BLADES = ${JSON.stringify(BLADES)};
const joinedAt = ${S.joinedAt.toString()}, readoutOf = ${S.readoutOf.toString()}, angleOf = ${S.angleOf.toString()};
const reachOf = ${S.reachOf.toString()}, MERGE_LEAST = 0, MERGE_MOST = MOST, SWEEP = ${S.SWEEP}, ROWS = ${ROWS};
const { THREE } = fig;
// Each pair is one distance field: two circles joined by a polynomial smooth minimum of reach 2·merge,
// so a pair whose gap is under merge runs together into one piece of glass.
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
const BEVEL = 9;
const heightOf = (s) => (s >= 0 ? -0.6 * Math.min(1, s / 0.6) : s <= -BEVEL ? GLASS_H : GLASS_H * Math.sqrt(1 - (1 + s / BEVEL) ** 2));
const wells = GAPS.map((gap, row) => {
  const mesh = fig.parts.get("drops-" + row);
  const [w, d] = [mesh.geometry.parameters.width, mesh.geometry.parameters.height];
  const geometry = new THREE.PlaneGeometry(w, d, Math.round(w / 0.6), Math.round(d / 0.6));
  mesh.geometry.dispose(); mesh.geometry = geometry;
  mesh.castShadow = true;
  // Plane-local y runs along the well; the well's start is at -d/2.
  const big = [0, -d / 2 - 1 + BIG_Y], small = [0, -d / 2 - 1 + DATUM_Y + gap + RB];
  return { gap, geometry, big, small, mesh };
});
const RAMP = [[0, "#ffffff"], [1, fig.theme === "dark" ? "#7fb6ff" : "#5a8fe0"]], tint = new THREE.Color();
function shape(merge) {
  const k = reachOf(merge);
  for (const well of wells) {
    const pos = well.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const a = Math.hypot(x - well.big[0], y - well.big[1]) - RA, b = Math.hypot(x - well.small[0], y - well.small[1]) - RB;
      pos.setZ(i, heightOf(smin(a, b, k)));
    }
    pos.needsUpdate = true;
    well.geometry.computeVertexNormals();
    // Thickness as colour: a vertex ramp on the glass's own height, so the neck of a merged pair reads as
    // thinner than either drop (the smooth minimum dips there) even where the outline hides it.
    fig.paint(well.mesh.name, (x, y, z) => fig.rampColor(RAMP, Math.max(0, z) / GLASS_H, tint));
  }
}
const blades = BLADES.map((b) => ({ ...b, node: fig.parts.get(b.id) }));
const lead = fig.parts.get("lead");
const rad = (deg) => (deg * Math.PI) / 180 - Math.PI / 2;
let merge = ${MERGE}, target = merge, shaped = null, clock = 0;
const tour = idleTour(3600, () => runner.kick());
function draw() {
  const shown = Math.round(merge * 4) / 4;
  if (shaped !== shown) { shape(shown); shaped = shown; }
  // Each feeler blade follows the lead until it reaches the stop pin at its own gap.
  for (const b of blades) b.node.rotation.z = rad(angleOf(Math.min(merge, b.gap)));
  lead.rotation.z = rad(angleOf(merge));
  readoutTo(stage, readoutOf(merge), Math.round(merge));
  fig.render();
}
const runner = loop(stage, (dt) => {
  if (tour.touring) { clock += dt; target = MOST / 2 - (MOST / 2) * Math.cos(clock * 0.45); }
  merge = follow(merge, target, dt, 0.3);
  draw();
  return tour.touring || merge !== target;
});
const steer = (next) => { tour.touch(); target = clamp(next, 0, MOST); runner.kick(); };
stage.addEventListener("pointermove", (event) => {
  const box = stage.getBoundingClientRect();
  steer(clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1) * MOST);
});
stage.addEventListener("keydown", (event) => {
  const to = { ArrowRight: target + 1, ArrowUp: target + 1, ArrowLeft: target - 1, ArrowDown: target - 1, Home: 0, End: MOST }[event.key];
  if (to === undefined) return;
  event.preventDefault();
  steer(Math.round(to));
});
draw();
`;

writeThreeFigure({
  dir: dirname(fileURLToPath(import.meta.url)),
  name: "spot-plate-3d",
  scene,
  live,
  keys: [
    { mark: "lit", label: "The lead blade: its angle is merge" },
    { mark: "raised", label: "Six pairs of glass drops, one distance field per pair" },
  ],
  caption: `A spot plate with six channels, as a three.js scene, each holding a pair of glass drops (${RA} and ${RB} px) at gaps from ${GAPS[0]} to ${GAPS[GAPS.length - 1]} px. Each pair is one distance field whose glass surface is rebuilt as merge changes, so a pair closer than merge runs together into one piece of glass. The fan sets merge: each feeler blade stops at its own gap. At ${MERGE} px the ${S.listOf(joined)} px pairs have joined.`,
  stage: { role: "slider", label: "Spot plate: arrow keys set merge, from 0 to 48 px", attrs: { "aria-valuemin": 0, "aria-valuemax": MERGE_MOST, "aria-valuenow": MERGE } },
});
