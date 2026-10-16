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
  assert.match(problemsOf([{ id: "e", kind: "extrude", outline: [[0, 0], [4, 0], [0, 4]], depth: 2, plane: "yz" }]), /plane must be/);
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
