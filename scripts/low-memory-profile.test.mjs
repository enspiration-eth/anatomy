import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the kit has a low-memory profile with smaller, pooled textures and a capped pixel ratio", () => {
  const src = readFileSync(new URL("../kit/three-runtime.js", import.meta.url), "utf8");
  const low = src.match(/LOW_MEMORY \? \{([^}]*)\}/)[1], full = src.match(/LOW_MEMORY \? \{[^}]*\} : \{([^}]*)\}/)[1];
  const num = (s, k) => Number(s.match(new RegExp(`${k}: ([\\d.]+)`))[1]);
  assert.ok(num(low, "textureSize") <= 512 && num(low, "texturePool") <= 4 && num(low, "shadow") <= 1024 && num(low, "dpr") <= 2);
  assert.ok(num(full, "dpr") <= 2 && num(full, "texturePool") <= 8);
  assert.match(src, /textureCache/, "procedural textures are shared through a cache");
  assert.match(src, /webglcontextlost/, "a lost WebGL context is handled");
  assert.doesNotMatch(src, /TEXTURES\[part\.texture\.kind\]\(/, "parts never build their own texture set");
});
