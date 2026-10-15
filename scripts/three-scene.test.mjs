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
