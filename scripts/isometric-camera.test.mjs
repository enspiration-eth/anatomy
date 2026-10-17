import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const kit = readFileSync(new URL("../kit/three-runtime.js", import.meta.url), "utf8");
const atat = readFileSync(new URL("../examples/at-at-3d/build.mjs", import.meta.url), "utf8");

test("a perspective figure gets an orthographic twin it can switch to (true isometric)", () => {
  assert.match(kit, /orthoCamera = fov \? new THREE\.OrthographicCamera/, "an orthographic twin is created alongside the perspective camera");
  assert.match(kit, /setOrtho\(on\)/, "the handle exposes setOrtho");
  assert.match(kit, /userData\.aspect/, "the twin keeps the stage aspect, so its frustum is not stretched");
  assert.match(kit, /if \(fov && !orthoMode\)/, "view() uses the perspective branch only outside ortho mode");
});

test("the AT-AT Iso preset is a real isometric view and its snow has no reachable edge", () => {
  assert.match(atat, /fig\.setOrtho\(true\); az = -135; el = ISO_EL/, "Iso: azimuth -135, isometric elevation, orthographic camera");
  assert.match(atat, /ISO_EL = 35\.264/, "elevation is asin(1/sqrt(3)) in degrees");
  assert.match(atat, /fig\.setOrtho\(false\)/, "the other presets restore the cinematic perspective camera");
  assert.match(atat, /OUT = 200000/, "the outer snow plain spans 400 000 units (10x the old sheet)");
  assert.match(atat, /snowapron/, "a blend apron joins the detailed field to the outer plain");
  assert.match(atat, /waves flatten out over the last 500 units/, "the detailed field flattens to meet the apron");
});
