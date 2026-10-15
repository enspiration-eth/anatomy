# three.js figures

Every Anatomy figure is a three.js scene. This is the contract.

## 1. The pieces

| File | Runs in | Job |
|---|---|---|
| `examples/<name>/scene.mjs` | Node and browser | The figure as data: `export const scene = { … }` plus any constants the live code needs. |
| `kit/three-scene.mjs` | Node and browser | `validateScene(scene)` → problems, `assertScene(scene)` throws, `solidCount(scene)`. |
| `kit/three-runtime.js` | Browser (imports `three`) | `mountScene(stage, scene, { theme })` → `{ THREE, scene, camera, renderer, parts, render, toWorld }`, or `null` without WebGL. |
| `scripts/inline-three.mjs` | Node | `threeImportMap("inline" \| "cdn" \| url)` and `threeModule({ spec, theme, live })` for the page. |
| `examples/<name>/build.mjs` | Node | Asserts the scene, builds the card with `plateHtml`, writes the page. `--light`, `--check`, `--three=`. |

`three` is the only dependency (`npm install`). The built pages embed it by default (about 2.8 MB, opens offline and from `file://`); they are git-ignored and rebuilt by CI.

## 2. The scene

```js
export const scene = {
  fig: "Fig 1", title: "Dial indicator", hint: "Hover to slide the carriage", readout: "block 1 · reads 18.0 px",
  size: "figure",            // figure (>= 40 solids), hero (>= 80), epic (>= 150)
  width: 600, height: 380,   // aspect of the stage
  camera: { azimuth: 42, elevation: 30 },
  pad: 0.12,                 // extra margin around the fitted bounds (may be negative)
  parts: [ /* … */ ],
};
```

World units are about 1 px of the real thing; x and y on the floor, z up. A part is

```js
{ id: "carriage-slab", kind: "box", size: [56, 48, 5], r: 3, at: [0, 0, 3], rot: [0, 0, 0], tone: "mid", parent: "carriage" }
```

- `id` kebab-case and unique; live code finds the part by it.
- `at` is the part's origin in its parent's frame: the **centre of the bottom face** for `box`, `cylinder` and `lathe`, the centre for `sphere` and `torus`. `rot` is in degrees.
- `tone`: `lo` (base, feet), `mid` (structure), `hi` (the subject), `faint`. Exactly one part may be `lit: true`, the accent the reader watches.
- `edges: false` drops the edge lines (screw heads, rods); `edgeAngle` (default 28°) sets which creases draw.

| kind | fields |
|---|---|
| `box` | `size: [w, d, h]`, `r` corner radius (rounded and bevelled) |
| `cylinder` | `r`, `h`, `r2` top radius, `segments` |
| `lathe` | `profile: [[radius, z], …]` turned about z, `segments` |
| `tube` | `points: [[x, y, z], …]`, `r` |
| `sphere` | `r` |
| `torus` | `r`, `tube` |
| `ticks` | `r`, `count`, `every`, `len: [minor, major]`, dial graduations in the part's xy plane |
| `rail` | `from`, `to`, `step`, `every`, `len`, ruler ticks along x |
| `group` | none: an assembly that moves; give its parts `parent` |

## 3. Live code

`threeModule` runs your `live` string with `fig`, `spec` and `stage` in scope, only when WebGL started. Move groups, never rebuild geometry per frame, and render on demand:

```js
const carriage = fig.parts.get("carriage");
function draw() { carriage.position.x = x; fig.render(); }
```

The motion rules of `references/motion.md` all hold: exponential follow or springs, an idle tour, pointer and keyboard on the focusable `.iso-stage`, `IntersectionObserver` to stop offscreen, still under reduced motion. `fig.toWorld(event, z)` turns a pointer into a world point on the plane at height `z`.

## 4. Look

The runtime gives an orthographic camera fitted to the bounds, a key light with soft contact shadows on an invisible floor, a hemisphere fill, edge lines on every crease, and tone materials for dark and light. The device ratio is capped at 1.5. The craft rules in `references/craft.md` are unchanged: a real object, dense with purposeful parts, everything sitting on something.

## 5. Verify

- `node build.mjs --check` prints `scene ok: N solid parts`.
- `node scripts/capture.mjs page.html --out shots/fig.png` (also `--width 390`, `--hover 0.7,0.5`, `--times 1200,2400`, `--reduced`, `--zoom x,y,w,h`) and the `-light` page: no console errors, the readout changes, and read every PNG.
- `node --test scripts/three-*.test.mjs` covers the validator, the import map and the example build.

## 6. Limits

- Standalone pages are large because three is embedded; use `--three=cdn` or the app's bundler when size matters.
- The SVG-only proofs (`kit/audit.mjs`, `scripts/lines.mjs`, `scripts/turn-check.mjs`) do not read three.js scenes; interpenetration is checked by eye from close-ups.
- WebGL is required; without it the stage shows a one-line notice.
