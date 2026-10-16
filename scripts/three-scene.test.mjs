import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { validateScene, solidCount, KINDS } from "../kit/three-scene.mjs";
import { threeImportMap, threeModule, threeVersion } from "./inline-three.mjs";
import { scene } from "../examples/dial-indicator-3d/scene.mjs";

const base = (parts) => ({ fig: "Fig 1", title: "T", hint: "h", readout: "r", camera: { azimuth: 45, elevation: 30 }, parts });
const boxes = (n) => Array.from({ length: n }, (_, i) => ({ id: `p-${i}`, kind: "box", size: [4, 4, 4] }));

test("the example scene is valid and is a full Figure", () => {
  assert.deepEqual(validateScene(scene), []);
  assert.ok(solidCount(scene) >= 40);
  assert.equal(scene.parts.filter((p) => p.lit).length, 1);
});

test("a Figure needs at least 40 solids", () => {
  assert.deepEqual(validateScene(base(boxes(40))), []);
  assert.match(validateScene(base(boxes(12))).join(), /at least 40 solid parts, found 12/);
  assert.match(validateScene({ ...base(boxes(60)), size: "hero" }).join(), /hero needs at least 80/);
});

test("rejects unknown kinds, bad dimensions and missing fields", () => {
  const parts = [...boxes(40), { id: "x", kind: "polygon" }, { id: "y", kind: "box", size: [1, -1, 1] }, { id: "z", kind: "cylinder", r: 2 }];
  const problems = validateScene(base(parts)).join("\n");
  assert.match(problems, /unknown kind "polygon"/);
  assert.match(problems, /size must be three positive numbers/);
  assert.match(problems, /cylinder needs h/);
  assert.match(validateScene({ ...base(boxes(40)), title: "" }).join(), /title must be/);
  assert.match(validateScene({ ...base(boxes(40)), camera: { azimuth: 200, elevation: 30 } }).join(), /azimuth/);
});

test("checks ids, parents and the single lit part", () => {
  const parts = [...boxes(40), { id: "p-0", kind: "sphere", r: 1 }, { id: "a", kind: "group", parent: "b" }, { id: "b", kind: "group", parent: "a" }, { id: "c", kind: "group", parent: "nope" }];
  const problems = validateScene(base(parts)).join("\n");
  assert.match(problems, /duplicate id/);
  assert.match(problems, /parent chain loops/);
  assert.match(problems, /parent "nope" does not exist/);
  const lit = boxes(40).map((p, i) => (i < 2 ? { ...p, lit: true } : p));
  assert.match(validateScene(base(lit)).join(), /exactly one part may be lit, found 2/);
});

test("every kind is understood by the runtime", () => {
  const runtime = readFileSync(new URL("../kit/three-runtime.js", import.meta.url), "utf8");
  for (const kind of Object.keys(KINDS)) assert.ok(runtime.includes(`"${kind}"`), `runtime handles ${kind}`);
});

test("the inline import map embeds three and rewires its core import", () => {
  const map = JSON.parse(threeImportMap("inline").replace(/^<script type="importmap">|<\/script>$/g, ""));
  assert.deepEqual(Object.keys(map.imports), ["three", "three/core"]);
  const module = Buffer.from(map.imports.three.split(",")[1], "base64").toString();
  assert.ok(module.includes("'three/core'") && !module.includes("./three.core.js"));
  assert.match(threeImportMap("cdn"), new RegExp(`three@${threeVersion().replaceAll(".", "\\.")}/build/three\\.module\\.js`));
});

test("the module script mounts the scene and guards the live code", () => {
  const script = threeModule({ spec: scene, theme: "light", live: "fig.render();" });
  assert.match(script, /import \* as THREE from "three"/);
  assert.match(script, /mountScene\(stage, spec, \{ theme: "light" \}\)/);
  assert.match(script, /if \(fig\) \{\s*fig\.render\(\);/);
  assert.doesNotMatch(script, /<\/script>[\s\S]*<\/script>/);
});

test("the example builds a standalone page with no SVG figure", () => {
  const out = execFileSync(process.execPath, ["examples/dial-indicator-3d/build.mjs", "--three=cdn"], { encoding: "utf8" });
  assert.match(out, /wrote dial-indicator-3d\.html/);
  const page = readFileSync(new URL("../examples/dial-indicator-3d/dial-indicator-3d.html", import.meta.url), "utf8");
  assert.match(page, /<script type="importmap">/);
  assert.match(page, /class="iso-stage"/);
  assert.doesNotMatch(page, /<svg[^>]*class="iso-svg"/);
  execFileSync(process.execPath, ["examples/dial-indicator-3d/build.mjs"]);
});

const PORTS = ["dial-indicator", "desk-computer", "arcade-cabinet", "raptor-engine", "ripple-tank", "test-rig", "spot-plate", "turning-dial"];

test("every SVG example has a valid three.js port that meets its size", async () => {
  for (const name of PORTS) {
    const { scene: port } = await import(`../examples/${name}-3d/scene.mjs`);
    assert.deepEqual(validateScene(port), [], name);
    const least = { figure: 40, hero: 80 }[port.size ?? "figure"];
    assert.ok(solidCount(port) >= least, `${name}: ${solidCount(port)} solids`);
    assert.equal(port.parts.filter((p) => p.lit).length, 1, `${name} has one lit part`);
  }
});

test("every port's build validates with --check", () => {
  for (const name of PORTS) {
    const out = execFileSync(process.execPath, [`examples/${name}-3d/build.mjs`, "--check"], { encoding: "utf8" });
    assert.match(out, /^scene ok: \d+ solid parts/, name);
  }
});

test("validates screens, colours, scale and lights", () => {
  const ok = [...boxes(40), { id: "s", kind: "plane", size: [10, 8], screen: [64, 48], color: "#112233", opacity: 0.5 }, { id: "g", kind: "group", scale: 2 }];
  assert.deepEqual(validateScene({ ...base(ok), lights: [{ at: [0, 0, 10] }] }), []);
  const problems = validateScene({ ...base([...boxes(40), { id: "s", kind: "box", size: [1, 1, 1], screen: [64, 48], color: "red" }, { id: "g", kind: "group", scale: -1 }]), lights: [{}] }).join("\n");
  assert.match(problems, /screen must be/);
  assert.match(problems, /#rrggbb/);
  assert.match(problems, /scale must be/);
  assert.match(problems, /each light needs/);
});

// ---- expressive looks: textures, shaders, vertex colours, materials, env, instancing

import { TEXTURE_KINDS, SHADER_NAMES, RAMP_NAMES } from "../kit/three-scene.mjs";
const looks = readFileSync(new URL("../kit/three-looks.js", import.meta.url), "utf8");
const problemsOf = (extra, spec = {}) => validateScene({ ...base([...boxes(40), ...extra]), ...spec }).join("\n");

test("every texture, shader and ramp the validator accepts is in the looks library", () => {
  for (const kind of Object.keys(TEXTURE_KINDS)) assert.match(looks, new RegExp(`\\n  ${kind}\\(\\{`), `texture ${kind}`);
  for (const name of Object.keys(SHADER_NAMES)) assert.match(looks, new RegExp(`\\n  ${name}\\(\\{`), `shader ${name}`);
  for (const ramp of RAMP_NAMES) assert.match(looks, new RegExp(`\\n  ${ramp}: \\[\\[`), `ramp ${ramp}`);
  for (const name of Object.keys(SHADER_NAMES)) for (const u of SHADER_NAMES[name].uniforms) assert.ok(looks.includes(u), `${name} uniform ${u}`);
});

test("the looks library is inlined with the runtime as one module", () => {
  const source = threeModule({ spec: base(boxes(40)), theme: "dark" });
  assert.equal((source.match(/^import \* as THREE from "three";$/gm) ?? []).length, 1);
  assert.doesNotMatch(source, /from "\.\/three-looks\.js"/);
  assert.match(source, /function studioEnvironment/);
});

test("validates textures", () => {
  assert.equal(problemsOf([{ id: "t", kind: "box", size: [4, 4, 4], texture: { kind: "brushed", project: "box", tile: 30 } }]), "");
  assert.match(problemsOf([{ id: "t", kind: "box", size: [4, 4, 4], texture: { kind: "marble" } }]), /texture.kind must be one of/);
  assert.match(problemsOf([{ id: "t", kind: "box", size: [4, 4, 4], texture: { kind: "pcb", pitch: 3 } }]), /pcb does not take "pitch"/);
  assert.match(problemsOf([{ id: "t", kind: "box", size: [4, 4, 4], texture: { kind: "dial", count: 50, every: 5 } }]), /dial texture belongs on a disc or plane/);
  assert.match(problemsOf([{ id: "t", kind: "disc", r: 9, texture: { kind: "dial", count: 50, every: 7 } }]), /multiple of every/);
  assert.match(problemsOf([{ id: "t", kind: "disc", r: 9, texture: { kind: "dial", repeat: [2, 2] } }]), /picture, not a pattern/);
  assert.match(problemsOf([{ id: "t", kind: "box", size: [4, 4, 4], texture: { kind: "wood", project: "top", repeat: [1, 1] } }]), /not both/);
  assert.match(problemsOf([{ id: "t", kind: "box", size: [4, 4, 4], texture: { kind: "wood", project: "side" } }]), /project must be/);
});

test("validates shaders and treats plumes and glows as effects, not solids", () => {
  const plume = { id: "jet", kind: "cylinder", r: 9, h: 40, open: true, shader: { name: "plume", uniforms: { uLevel: 0, uDiamonds: 4 } } };
  assert.equal(problemsOf([plume]), "");
  assert.equal(solidCount(base([...boxes(40), plume, { id: "g", kind: "sphere", r: 3, shader: { name: "glow" } }])), 40);
  assert.match(validateScene(base([...boxes(39), plume])).join(), /found 39/);
  assert.match(problemsOf([{ ...plume, open: undefined }]), /plume needs an open cylinder/);
  assert.match(problemsOf([{ ...plume, shader: { name: "fire" } }]), /shader.name must be one of/);
  assert.match(problemsOf([{ ...plume, shader: { name: "plume", uniforms: { uHeat: 1 } } }]), /no uniform uHeat/);
  assert.match(problemsOf([{ ...plume, shader: { name: "plume", uniforms: { uLevel: "hot" } } }]), /must be a number/);
  assert.match(problemsOf([{ id: "s", kind: "plane", size: [4, 3], shader: { name: "crt" } }]), /give the plane screen/);
  assert.equal(problemsOf([{ id: "s", kind: "plane", size: [4, 3], screen: [64, 48], shader: { name: "crt", uniforms: { uTint: [1, 1, 1] } } }]), "");
  assert.match(problemsOf([{ id: "w", kind: "box", size: [4, 4, 4], shader: { name: "ripple" } }]), /ripple shader goes on a plane/);
  assert.match(problemsOf([{ ...plume, texture: { kind: "paper" } }]), /the shader is the look/);
  assert.match(problemsOf([{ id: "g", kind: "box", size: [4, 4, 4], shader: { name: "glow" } }]), /glow is a sphere/);
});

test("validates vertex colours", () => {
  const lathe = { id: "bell", kind: "lathe", profile: [[4, 0], [8, 10]] };
  assert.equal(problemsOf([{ ...lathe, colors: { ramp: "heat", axis: "r", range: [4, 8] } }]), "");
  assert.equal(problemsOf([{ ...lathe, colors: { stops: [[0, "#000000"], [1, "#ffffff"]], range: [0, 10] } }]), "");
  assert.match(problemsOf([{ ...lathe, colors: { ramp: "rainbow", range: [0, 1] } }]), /colors.ramp must be one of/);
  assert.match(problemsOf([{ ...lathe, colors: { range: [0, 1] } }]), /exactly one of ramp or stops/);
  assert.match(problemsOf([{ ...lathe, colors: { stops: [[0.5, "#000000"], [0.2, "#ffffff"]], range: [0, 1] } }]), /t rising/);
  assert.match(problemsOf([{ ...lathe, colors: { ramp: "heat", range: [5, 5] } }]), /high > low/);
  assert.match(problemsOf([{ ...lathe, colors: { ramp: "heat", axis: "w", range: [0, 1] } }]), /axis must be/);
  assert.match(problemsOf([{ id: "b", kind: "box", size: [4, 4, 4], colors: { ramp: "heat", range: [0, 4] } }]), /too few for a gradient/);
});

test("validates physical materials and asks reflective parts for an environment", () => {
  const glass = { id: "lens", kind: "sphere", r: 4, glass: true, material: { transmission: 0.9, ior: 1.5, thickness: 2 } };
  assert.equal(problemsOf([glass], { env: true }), "");
  assert.match(problemsOf([glass]), /set env/);
  assert.match(problemsOf([{ id: "m", kind: "sphere", r: 4, metal: 0.9 }]), /set env/);
  assert.match(problemsOf([{ ...glass, material: { transmission: 1.2 } }], { env: true }), /transmission must be in \[0, 1\]/);
  assert.match(problemsOf([{ ...glass, material: { ior: 4 } }], { env: true }), /ior must be in/);
  assert.match(problemsOf([{ ...glass, material: { shine: 1 } }], { env: true }), /no field shine/);
  assert.match(problemsOf([{ ...glass, opacity: 0.5 }], { env: true }), /not also faded/);
  assert.match(problemsOf([{ ...glass, material: { transmission: 1, metal: 0.8 } }], { env: true }), /metal does not transmit/);
  assert.match(problemsOf([], { env: { intensity: 9 } }), /env must be/);
});

test("validates instances and counts them once", () => {
  const vents = { id: "vents", kind: "instances", shape: "box", size: [1, 4, 1], items: [[0, 0, 0], [0, 0, 2], [0, 0, 4, 15]] };
  assert.equal(problemsOf([vents]), "");
  assert.equal(solidCount(base([...boxes(40), vents])), 41);
  assert.match(problemsOf([{ ...vents, items: [[0, 0, 0]] }]), /at least two/);
  assert.match(problemsOf([{ ...vents, shape: "cone" }]), /shape must be box, cylinder or sphere/);
  assert.match(problemsOf([{ ...vents, itemColors: ["red"] }]), /itemColors/);
});

test("the Neuralink figure is a valid hero whose threads miss the vessels and stay in the opening", async () => {
  const N = await import("../examples/neuralink-3d/scene.mjs");
  assert.deepEqual(validateScene(N.scene), []);
  assert.ok(solidCount(N.scene) >= 80);
  assert.equal(N.FACTS.threads * N.FACTS.perThread, N.FACTS.electrodes);
  for (const x of N.SITES) {
    assert.ok(Math.abs(x) < N.CHIP.r, `site ${x} inside the craniectomy`);
    for (const [vx, r] of N.VESSELS) assert.ok(Math.abs(x - vx) >= r + 6, `site ${x} clear of the vessel at ${vx}`);
  }
  assert.equal(N.THREADS.length, 16);
  assert.ok(N.SOURCES.every(([, , url]) => url.startsWith("https://")));
});

test("validates extrusions and sections", () => {
  assert.equal(problemsOf([{ id: "e", kind: "extrude", outline: [[0, 0], [4, 0], [0, 4]], depth: 2, cut: true }], { section: { axis: "y", at: 0 } }), "");
  assert.match(problemsOf([{ id: "e", kind: "extrude", outline: [[0, 0], [4, 0]], depth: 2 }]), /at least three/);
  assert.match(problemsOf([{ id: "e", kind: "extrude", outline: [[0, 0], [4, 0], [0, 4]], depth: 2, plane: "zx" }]), /plane must be/);
  assert.match(problemsOf([{ id: "e", kind: "extrude", outline: [[0, 0], [4, 0], [0, 4]], depth: 2, bevel: 1 }]), /bevel must be/);
  assert.match(problemsOf([{ id: "c", kind: "sphere", r: 2, cut: true }]), /no section/);
  assert.match(problemsOf([{ id: "c", kind: "plane", size: [2, 2], cut: true }], { section: { axis: "y", at: 0 } }), /only solid/);
  assert.match(problemsOf([], { section: { axis: "w", at: 0 } }), /section must be/);
  assert.match(problemsOf([{ id: "g", kind: "plane", size: [2, 2], texture: { kind: "glyph", text: "RETURN" } }]), /1 to 4 characters/);
});

test("validates flow, cherenkov and steam placement, cut fills, hatch colours and holes", () => {
  const sec = { section: { axis: "y", at: 0 } };
  assert.equal(problemsOf([{ id: "t", kind: "tube", points: [[0, 0, 0], [9, 0, 0]], r: 1, shader: { name: "flow", uniforms: { uA: "#ff0000", uLevel: 0.5 } } }]), "");
  assert.match(problemsOf([{ id: "t", kind: "box", size: [2, 2, 2], shader: { name: "flow" } }]), /flow runs along a tube/);
  assert.match(problemsOf([{ id: "c", kind: "box", size: [2, 2, 2], shader: { name: "cherenkov" } }]), /cherenkov/);
  assert.match(problemsOf([{ id: "s", kind: "cylinder", r: 2, h: 4, shader: { name: "steam" } }]), /open cylinder/);
  assert.equal(problemsOf([{ id: "b", kind: "sphere", r: 2, cut: "solid" }], sec), "");
  assert.match(problemsOf([{ id: "b", kind: "sphere", r: 2, cut: "solid", hatch: "#ffffff" }], sec), /hatch/);
  assert.match(problemsOf([{ id: "b", kind: "sphere", r: 2, cut: true, hatch: "red" }], sec), /hatch/);
  assert.match(problemsOf([{ id: "b", kind: "box", size: [2, 2, 2], holes: [[[0, 0], [1, 0], [0, 1]]] }]), /holes/);
  assert.equal(problemsOf([{ id: "w", kind: "sphere", r: 2, texture: { kind: "fiber", seed: 3 } }, { id: "k", kind: "box", size: [2, 2, 2], texture: { kind: "concrete" } }]), "");
});

test("the heart figure: valid hero, Merck pressure ordering, valves consistent with pressures", async () => {
  const H = await import("../examples/heart-3d/scene.mjs");
  assert.deepEqual(validateScene(H.scene), []);
  assert.ok(solidCount(H.scene) >= 80);
  assert.equal(H.LEAFLETS.length, 8);
  for (const bpm of [40, 72, 120, 180]) {
    const c = H.cycleOf(bpm);
    assert.ok(c.rapidEnd <= c.T, `${bpm} bpm: phases fit the beat`);
    let peakLv = 0, minAo = 999;
    for (let t = 0; t < c.T; t += c.T / 400) {
      const p = H.pressuresAt(c, t), ph = H.phaseAt(c, t);
      peakLv = Math.max(peakLv, p.lv); minAo = Math.min(minAo, p.ao);
      assert.ok(p.ao >= H.FACTS.artery[1] - 1, `${bpm} bpm: aorta stays at or above diastolic`);
      if (ph === 2 && bpm === 72) assert.ok(p.lv >= p.ao - 5, "LV at or above the aorta in ejection (aortic valve open)");
      if (ph === 1 || ph === 3) assert.ok(p.lv < p.ao + 1, "aortic valve shut in isovolumetric phases");
      assert.ok(p.rv <= p.lv + 1 && p.pa <= p.ao, "right heart below the left");
    }
    if (bpm === 72) { assert.ok(Math.abs(peakLv - H.FACTS.lv[0]) < 12, `peak LV ${peakLv}`); assert.ok(Math.abs(minAo - H.FACTS.artery[1]) < 3); }
  }
  assert.ok(H.SAT_T.left > H.SAT_T.right);
  assert.ok(H.SOURCES.every(([, , url]) => url.startsWith("https://")));
});

test("the reactor figure: valid hero, published reference numbers, rods lower power", async () => {
  const R = await import("../examples/reactor-3d/scene.mjs");
  assert.deepEqual(validateScene(R.scene), []);
  assert.ok(solidCount(R.scene) >= 80);
  const F = R.FACTS;
  assert.equal(F.assemblies * F.rodsPer, F.rods);
  assert.ok(Math.abs(F.mwe / F.mwt - F.eff / 100) < 0.01);
  assert.ok(Math.abs(F.psia * 0.00689476 - F.mpa) < 0.05);
  assert.ok(Math.abs(R.plantAt(1).tHot - F.tOut) < 1, "hot leg at full power matches the published outlet");
  let last = 2;
  for (let i = 0; i <= 10; i++) { const p = R.powerFor(i / 10); assert.ok(p <= last + 1e-9); last = p; }
  assert.equal(R.powerFor(0), 1);
  assert.ok(R.powerFor(1) <= 0.02 + 1e-9);
  assert.ok(R.SOURCES.every(([, , url]) => url.startsWith("https://")));
});

test("the watch figure: valid hero, exact train ratios, meshing centre distances, reserve in range", async () => {
  const M = await import("../examples/watch-3d/scene.mjs");
  assert.deepEqual(validateScene(M.scene), []);
  assert.ok(solidCount(M.scene) >= 80);
  const r = M.trainRates();
  assert.ok(Math.abs(r.centre * 3600 - M.FACTS.centreRevH) < 1e-9, "centre wheel once an hour");
  assert.ok(Math.abs(r.fourth * 60 - M.FACTS.fourthRevMin) < 1e-9, "fourth wheel once a minute");
  assert.equal(r.hz, 4);
  const pitch = (N, m) => (N * m) / 2, d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const [a, b] of [["barrel", "centre"], ["centre", "third"], ["third", "fourth"], ["fourth", "escape"]]) {
    const wa = M.W[a], wb = M.W[b];
    assert.ok(Math.abs(d(wa.at, wb.at) - pitch(wa.N, wa.m) - pitch(wb.pN, wb.pm)) < 1e-6, `${a} meshes ${b}`);
    assert.equal(wa.m, wb.pm, `${a} wheel and ${b} pinion share a module`);
  }
  const h = M.reserveHours();
  assert.ok(h >= M.FACTS.reserveH[0] && h <= M.FACTS.reserveH[1], `reserve ${h} h`);
  for (const p of [M.W.barrel, M.BAL]) assert.ok(Math.hypot(...p.at) + (p === M.BAL ? p.r + 5 : pitch(p.N, p.m) + p.m) < 128, "inside the plate");
});

test("implicit surfaces: validation and a smooth, closed, high-resolution mesh", async () => {
  assert.match(problemsOf([{ id: "b", kind: "implicit", shapes: [["blob", [0, 0, 0]]] }]), /shapes are/);
  assert.match(problemsOf([{ id: "b", kind: "implicit", shapes: [["ellipsoid", [0, 0, 0], [5, 5, 5]]], relax: 9 }]), /relax/);
  assert.match(problemsOf([{ id: "t", kind: "box", size: [1, 1, 1], shader: { name: "fieldline" } }]), /fieldline runs along a tube/);
  const { implicitGeometry, shapeDistance } = await import("../kit/three-looks.js");
  assert.ok(Math.abs(shapeDistance(["ellipsoid", [0, 0, 0], [10, 10, 10]], 20, 0, 0) - 10) < 1e-9);
  assert.ok(Math.abs(shapeDistance(["cone", [0, 0, 0], [0, 0, 50], 5, 5], 15, 0, 25) - 10) < 1e-9);
  const g = implicitGeometry({ shapes: [["ellipsoid", [0, 0, 0], [40, 30, 20]]], cell: 2 });
  const pos = g.attributes.position, nrm = g.attributes.normal;
  assert.ok(pos.count > 2000);
  // Vertices lie on the surface and normals point outward (smooth shading from the field gradient).
  let worst = 0;
  for (let i = 0; i < pos.count; i += 7) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x / 40, y / 30, z / 20);
    worst = Math.max(worst, Math.abs(r - 1));
    assert.ok(nrm.getX(i) * x / 1600 + nrm.getY(i) * y / 900 + nrm.getZ(i) * z / 400 > 0, "normal points outward");
  }
  assert.ok(worst < 0.08, `surface error ${worst}`);
});

test("the biofield figure: valid hero, high-poly body, measured magnitudes and fall-off", async () => {
  const B = await import("../examples/biofield-3d/scene.mjs");
  assert.deepEqual(validateScene(B.scene), []);
  assert.ok(solidCount(B.scene) >= 80);
  const { implicitGeometry } = await import("../kit/three-looks.js");
  const body = B.scene.parts.find((p) => p.id === "body");
  const g = implicitGeometry(body);
  assert.ok(g.index.count / 3 > 200000, `body has ${g.index.count / 3} triangles`);
  // Fall-off reproduces the KRISS ratios within 2%, and 100 pT at 10 mm.
  assert.ok(Math.abs(B.heartPtAt(10) - B.FACTS.heartPeakPtAt10mm) < 1e-9);
  B.FACTS.falloff.d.forEach((d, i) => assert.ok(Math.abs(B.heartPtAt(d) / B.heartPtAt(20) - B.FACTS.falloff.rel[i]) < 0.02, `${d} mm`));
  // Ordering of magnitudes (tesla): brain < heart < urban noise < Earth < MRI.
  const brain = B.FACTS.brainFt.alpha * 1e-15, heart = B.heartPtAt(10) * 1e-12, urban = B.FACTS.urbanFt * 1e-15, earth = B.FACTS.earthUt[0] * 1e-6;
  assert.ok(brain < heart && heart < urban && urban < earth && earth < B.FACTS.mriT[0]);
  // The dipole peaks at the R wave and lead II is positive there.
  let peak = 0, at = 0; for (let t = 0; t < 0.83; t += 0.001) { const m = Math.hypot(...B.heartDipole(t)); if (m > peak) { peak = m; at = t; } }
  assert.ok(Math.abs(at - 0.215) < 0.01 && B.leadII(B.heartDipole(at)) > 0.8);
  // Electrodes sit on the skin.
  for (const p of B.scene.parts.filter((q) => /^(ecg|emg)-.*-mount$/.test(q.id))) assert.ok(Math.abs(B.skinDistance(...p.at)) < 1, `${p.id} on the skin`);
  assert.ok(B.SOURCES.every(([, , u]) => u.startsWith("https://")));
});

test("heightfields, ribbons, the contour shader and fit: validation", () => {
  const ok = base([...boxes(40), { id: "t", kind: "heightfield", size: [100, 100], grid: 32 }, { id: "c", kind: "ribbon", width: 3, shader: { name: "contour" } }]);
  assert.deepEqual(validateScene(ok), []);
  assert.equal(solidCount(ok), 41); // the heightfield is a solid, the ribbon is not
  assert.ok(validateScene(base([...boxes(40), { id: "t", kind: "heightfield", size: [100] }])).some((p) => /size/.test(p)));
  assert.ok(validateScene(base([...boxes(40), { id: "t", kind: "heightfield", size: [100, 100], grid: 1000 }])).some((p) => /grid/.test(p)));
  assert.ok(validateScene(base([...boxes(40), { id: "c", kind: "ribbon", width: 0 }])).some((p) => /width/.test(p)));
  assert.ok(validateScene(base([...boxes(40), { id: "c", kind: "tube", points: [[0, 0, 0], [1, 0, 0]], r: 1, shader: { name: "contour" } }])).some((p) => /ribbon/.test(p)));
  assert.ok(validateScene({ ...base(boxes(40)), fit: "tight" }).some((p) => /fit/.test(p)));
  assert.deepEqual(validateScene({ ...base(boxes(40)), fit: "parts" }), []);
});

test("marching squares: the 16-case table separates inside from outside, saddles included", async () => {
  const M = await import("../examples/marching-squares-3d/march.mjs");
  const EDGE = { T: [8, 4], R: [4, 2], B: [2, 1], L: [1, 8] };
  const crossed = (idx) => Object.keys(EDGE).filter((e) => !!(idx & EDGE[e][0]) !== !!(idx & EDGE[e][1])).sort();
  for (let idx = 0; idx < 16; idx++) {
    const readings = idx === 5 || idx === 10 ? [M.SADDLES[idx].split, M.SADDLES[idx].joined] : [M.CASES[idx]];
    for (const pairs of readings) {
      // every crossed edge (corners on opposite sides) is used exactly once, and no other edge is
      assert.deepEqual(pairs.flat().sort(), crossed(idx), `case ${idx}`);
    }
  }
  assert.equal(M.CASES.filter((c) => c && c.length === 0).length, 2); // 0 and 15 draw nothing
  assert.equal(M.caseIndex(1, 0, 1, 0, 0.5), 10);
  assert.equal(M.caseIndex(0, 1, 0, 1, 0.5), 5);
  // The saddle follows the centre sample: mean of the corners against iso.
  const vals = new Float64Array([0, 2, 2, 0]); // n = 1: bl, br, tl, tr -> bl 0, br 2, tl 2, tr 0: case 8 | 2 = 10
  const joined = M.cell(vals, 1, 2, 0, 0, 1), split = M.cell(vals, 1, 2, 0, 0, 1.1);
  assert.equal(joined.idx, 10); assert.ok(joined.saddle && joined.joined); assert.ok(split.saddle && !split.joined);
  assert.deepEqual(joined.pairs, M.SADDLES[10].joined); assert.deepEqual(split.pairs, M.SADDLES[10].split);
});

test("marching squares: linear interpolation is exact on a linear field, midpoints when off", async () => {
  const M = await import("../examples/marching-squares-3d/march.mjs");
  assert.equal(M.crossing(0, 2, 0.5), 0.25);
  assert.equal(M.crossing(3, 1, 2.5), 0.25);
  assert.equal(M.crossing(0, 2, 0.5, false), 0.5);
  assert.equal(M.crossing(1, 1, 1), 0.5); // flat edge: no division by zero
  // A plane f = x + 100 sampled on a grid: every crossing of iso lands exactly on x = iso - 100.
  const n = 8, size = 160, vals = new Float64Array((n + 1) ** 2);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) vals[j * (n + 1) + i] = -size / 2 + (i * size) / n + 100;
  const { segs } = M.march(vals, n, size, 117, true);
  assert.ok(segs.length === n);
  for (const s of segs) for (const e of s) assert.ok(Math.abs(e.x - 17) < 1e-9);
});

test("marching squares: contours close, segments share crossings, and finer grids converge on the true circle", async () => {
  const M = await import("../examples/marching-squares-3d/march.mjs");
  const S = await import("../examples/marching-squares-3d/scene.mjs");
  for (const n of S.RES) for (const iso of [0.6, 1, 2]) {
    const vals = M.sampleGrid(S.SOURCES0, n, S.TANK.size);
    const { segs } = M.march(vals, n, S.TANK.size, iso, true);
    // each crossing key is used by exactly two segments (the field is below iso all round the border)
    const use = new Map(); for (const s of segs) for (const e of s) use.set(e.key, (use.get(e.key) ?? 0) + 1);
    assert.ok([...use.values()].every((c) => c === 2), `n ${n} iso ${iso}: every crossing shared`);
    const lines = M.stitch(segs);
    assert.ok(lines.length >= 1 && lines.every((l) => l.closed), `n ${n} iso ${iso}: ${lines.length} contours, all closed`);
    assert.equal(lines.reduce((a, l) => a + l.points.length, 0), segs.length);
  }
  // one source: f = r^2/d^2 = iso is a circle of radius r / sqrt(iso)
  const err = (n, interp) => { const vals = M.sampleGrid([[0, 0, 60]], n, 480); const { segs } = M.march(vals, n, 480, 1, interp); let m = 0; for (const s of segs) for (const e of s) m = Math.max(m, Math.abs(Math.hypot(e.x, e.y) - 60)); return m; };
  assert.ok(err(32, true) < err(32, false), "interpolation beats midpoints");
  assert.ok(err(32, true) < err(16, true) && err(16, true) < 4, `16: ${err(16, true)} 32: ${err(32, true)}`);
  // The default bench has a saddle at 16 x 16, and a coarse grid misses a contour the fine grid finds.
  const count = (n) => M.stitch(M.march(M.sampleGrid(S.SOURCES0, n, 480), n, 480, 1).segs).length;
  assert.ok(M.march(M.sampleGrid(S.SOURCES0, 16, 480), 16, 480, 1).cells.some((c) => c.saddle));
  assert.ok(count(32) > count(16));
});

test("the marching squares figure: a valid hero that builds", async () => {
  const S = await import("../examples/marching-squares-3d/scene.mjs");
  assert.deepEqual(validateScene(S.scene), []);
  assert.ok(solidCount(S.scene) >= 80);
  assert.equal(S.scene.parts.filter((p) => /^tile-\d+$/.test(p.id)).length, 16);
  execFileSync(process.execPath, ["examples/marching-squares-3d/build.mjs", "--check"]);
});

test("the walker: valid hero; IK lands every foot; planted feet hold still; one foot in the air at a time", async () => {
  const S = await import("../examples/at-at-3d/scene.mjs");
  const G = await import("../examples/at-at-3d/gait.mjs");
  assert.deepEqual(validateScene(S.scene), []);
  assert.ok(solidCount(S.scene) >= 80);
  // forward kinematics of the solved angles reaches the target (rotation about y: down vector -> x = -sin(theta))
  const R = S.L1 + S.L2;
  for (const [dx, dz] of [[0, -0.95 * R], [0.3 * R, -0.9 * R], [-0.3 * R, -0.88 * R], [0.1 * R, -0.75 * R]]) {
    const [a, b] = G.legAngles(dx, dz);
    const x = -S.L1 * Math.sin(a) - S.L2 * Math.sin(a + b), z = -S.L1 * Math.cos(a) - S.L2 * Math.cos(a + b);
    assert.ok(Math.hypot(x - dx, z - dz) < 1e-6, `reach ${dx},${dz}`);
    const [, , c] = G.legAngles(dx, dz); assert.ok(Math.abs(a + b + c) < 1e-9, "foot stays level");
  }
  // in stance a foot moves back at exactly the ground speed, so it does not slide on the snow
  const [x0, , st0] = G.footAt(170, 0, 0.5), [x1, , st1] = G.footAt(170, 0, 0.6);
  assert.ok(st0 && st1 && Math.abs((x0 - x1) / 0.1 - S.speed) < 1e-6);
  for (let t = 0.01; t < S.GAIT.period; t += 0.05) {
    const up = S.LEGS.filter(([, hx, , ph]) => !G.footAt(hx, ph, t)[2]).length;
    assert.ok(up <= 1, `t ${t.toFixed(2)}: ${up} feet up`);
  }
  // the whole stride is reachable from the hip
  for (const dx of [-S.GAIT.stride / 2, S.GAIT.stride / 2]) assert.ok(Math.hypot(dx, S.HZ + 8 - S.ANKLE) < S.L1 + S.L2);
  assert.ok(S.DEPTS.length >= 7 && S.DEPTS.every((d) => d.fn && d.canon && S.scene.parts.some((p) => d.match.test(p.id))));
  assert.ok(S.SOURCES.every(([, , u]) => u.startsWith("https://")));
  execFileSync(process.execPath, ["examples/at-at-3d/build.mjs", "--check"]);
});

test("extrude bevel, yz plane and armor texture validate", () => {
  assert.equal(problemsOf([{ id: "p", kind: "extrude", plane: "yz", bevel: 3, depth: 40, outline: [[0, 0], [50, 0], [50, 30], [0, 30]], texture: { kind: "armor", seed: 2 } }]), "");
});

test("validates lofts and the perspective camera", () => {
  const sq = (w) => [[-w, -w], [w, -w], [w, w], [-w, w]];
  assert.equal(problemsOf([{ id: "l", kind: "loft", sections: [[0, sq(4)], [10, sq(2)]], inside: true }]), "");
  assert.match(problemsOf([{ id: "l", kind: "loft", sections: [[0, sq(4)], [10, [[0, 0], [1, 0], [0, 1]]]] }]), /same number of points/);
  assert.match(problemsOf([{ id: "l", kind: "loft", sections: [[0, sq(4)]] }]), /two or more/);
  assert.deepEqual(validateScene({ fig: "F", title: "t", size: "simple", camera: { azimuth: 30, elevation: 20, fov: 30 }, parts: [{ id: "b", kind: "box", size: [1, 1, 1] }] }).filter((p) => /fov/.test(p)), []);
  assert.ok(validateScene({ fig: "F", title: "t", camera: { azimuth: 30, elevation: 20, fov: 120 }, parts: [] }).some((p) => /fov/.test(p)));
});
