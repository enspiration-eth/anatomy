# Expressive looks for three.js figures

Tone materials and edge lines are the default and stay the default. Everything in this file is a way to
show something tone cannot: what a surface is made of, what a field is doing, where heat or load goes, what
a screen shows. Each look is declared in the scene as data, checked by the validator, and drawn by
`kit/three-looks.js`, which is generated in the page from code. No image files, no extra packages: three is
still the only dependency.

The test for every look is the same as for every part (`references/craft.md`): **does the reader learn
something from it?** A brushed texture that says "machined steel" next to a painted cover earns its place.
A heat map that shows the throat of a nozzle running ten times hotter than its exit is the point of the
figure. Gloss for its own sake is noise, and noise in a technical figure reads as a claim.

## 1. What there is

| Field | On | What it draws | Use it for |
|---|---|---|---|
| `texture: { kind, … }` | any mesh part | a procedural canvas texture: colour, and for some kinds roughness and bump | what a surface is made of; printed graduations, scales, plates |
| `shader: { name, uniforms }` | specific kinds (below) | a library ShaderMaterial the live code drives through uniforms | things that are not surfaces: fields, plumes, glows, tubes |
| `colors: { ramp \| stops, axis, range }` | lathe, cylinder, sphere, torus, tube, rounded box, plane, disc | vertex colours baked along one axis or the radius | gradients that carry data |
| `fig.paint(id, fn, ramp)` | any mesh part, at run time | vertex colours from a function of each vertex | heat and stress maps that change with the state |
| `material: { … }` | any mesh part | MeshPhysicalMaterial: transmission, ior, thickness, clearcoat, sheen, iridescence | real glass, lenses, coated metal |
| `env: true \| { intensity }` | the scene | a procedural studio, prefiltered (PMREM), as the scene's environment | anything with `metal >= 0.7` or transmission |
| `kind: "instances"` | a part | one geometry drawn many times (InstancedMesh) | identical rows: vents, slots, louvres, rivets |
| `kind: "disc"` | a part | a flat disc whose uv spans its face | dial faces with a `dial` texture |
| `open: true` | cylinder | no caps, 24 rows along its height | plumes and sleeves |

## 2. Procedural textures

```js
add({ id: "plate", kind: "box", size: [300, 120, 10], r: 8, texture: { kind: "brushed", project: "box", tile: 90 }, metal: 0.7, rough: 0.42 });
add({ id: "dial-face", kind: "disc", r: 36, texture: { kind: "dial", count: 50, every: 5, from: 0, step: 10 } });
```

| kind | options | carries |
|---|---|---|
| `brushed` | `color` (theme default), `seed` | colour, roughness and bump streaks along u: the highlight stretches across the grain, as on a real brushed part |
| `knurl` | `pitch` | bump only: a diamond cross-hatch for knobs and grips |
| `dial` | `count`, `every`, `from`, `step`, `ring`, `font`, `reverse` | a printed face: `count` graduations, a major every `every`, numerals `from` by `step` |
| `ruler` | `from`, `to`, `step`, `every`, `label` | a printed scale along u |
| `label` | `title`, `lines`, `aspect` | a rating plate: title, lines, border |
| `glyph` | `text` (1–4 characters), `ink`, `font` | a key legend or engraving on a transparent ground, alpha-tested; on a plane laid on the face it labels, parented to the part so it moves with it |
| `pcb` | `seed` | FR-4 green, copper traces on a router grid, pads, silkscreen; bump for the copper |
| `paper` | `seed` | fibre noise on a paper tone |
| `wood` | `seed`, `color` | growth rings along u |

Common options: `repeat: [u, v]` (on the part's own uv), or `project: "box" | "top"` with `tile` (world units
per repeat), which rewrites the uv in world units: `box` picks the axis per face from its normal, `top`
projects straight down. `size` is the canvas size in px (64 to 2048).

**Rules.**
- **Patterns repeat, pictures do not.** `brushed`, `knurl`, `pcb`, `paper`, `wood` are patterns: project
  them with a `tile` close to the real grain (a 300 px plate with a 90 px tile reads as brushed; a 10 px tile
  reads as noise). `dial`, `ruler` and `label` are pictures: they span the part's uv once, and the validator
  refuses `repeat` or `project` on them.
- **Draw the graduations from the model's numbers.** A `dial` texture takes `count` and `every` from the
  same constants the live code reads the needle with (`NUMBERS`, `STEP`), so the printed face cannot
  disagree with the readout. Check the direction once by eye: `reverse: true` puts numbers anticlockwise,
  as on a lock dial where turning right brings higher numbers to the index.
- **A dial texture goes on a `disc`** (or a `plane`): their uv spans the face. Lathe tops and cylinder caps
  map uv differently and would smear the numerals; the validator says so.
- **Textures are theme-aware.** Ink and face colours flip with the theme; `brushed` picks a light or dark
  steel by default. Pass `color` only when the material is a fact (copper, a green board), never to restyle.
- **A texture with its own colour sets the material to white** so the map reads true. Do not also tint it
  with `color` unless you mean a tinted finish.

- **Grain scales with the canvas.** `brushed` and `wood` draw at 1024 px with one-pixel streaks and a whole number of rings per tile (`rings`), so they tile without seams; choose `tile` so the grain is finer than the smallest feature on the part.

**Failure modes.** Streaks the wrong way on a long part (rotate the part or the projection, the grain
follows the machining). A wood tile so small the rings alias into moiré at 1.5 dpr. Printed numerals too
small to read at the figure's width: at 650 px a numeral under about 6 px tall is decoration, so either
enlarge `font`, cut to majors only, or leave the numbers to the readout.

## 3. Shaders

```js
add({ id: "plume-jet", kind: "cylinder", open: true, r: 120, r2: 64, h: 166, at: [0, 0, -166], edges: false, parent: "plume",
  shader: { name: "plume", uniforms: { uDiamonds: 4, uSpeed: 6 } } });
// live code
const plume = fig.shaders.get("plume-jet");
plume.uniforms.uLevel.value = level;      // an envelope, 0..1
fig.time(still.matches ? 0.5 : time);     // every library shader's uTime
```

| name | goes on | uniforms | what it shows |
|---|---|---|---|
| `plume` | open cylinder, uv.y = 1 at the exit | `uLevel`, `uDiamonds`, `uSpeed`, `uTime` | an exhaust: hot core, cooler mantle, Mach diamonds fading downstream, turbulence moving with the flow; additive in dark, ink in light |
| `ripple` | plane | `uK`, `uDecay`, `uHalf`, `uAmp`, `uBeat`, `uSource`, `uTime` | a water surface: the height of two in-phase point sources, shaded by slope |
| `caustics` | plane | the ripple uniforms plus `uLift`, `uLamp`, `uInside`, `uFocus` | the light a rippled surface throws on paper below: brighter under crests (weak lenses), magnified from the lamp |
| `crt` | plane with `screen` | `uPower`, `uWarm`, `uVertical`, `uLines`, `uGlow`, `uCurve`, `uTint`, `uTime` | a cathode-ray tube: curved face, scan lines along the raster, a phosphor mask, glow, warm-up, and the collapse to a line then a dot at switch-off |
| `glow` | sphere round a light | `uColor`, `uLevel`, `uPower` | the halo of an LED or filament, facing the viewer |

**Rules.**
- **The shader is the look.** A shader part takes no `texture`, `material` or `colors`; the validator refuses
  them. Uniforms are numbers, `[x, y]`, `[x, y, z]` or `#rrggbb`, and only the ones the shader declares.
- **Plumes and glows are effects, not solids.** They do not count toward the solid minimum, cast no shadow,
  are left out of the camera fit, and draw after the solids (`renderOrder` 10). An effect never stands in
  for a part.
- **One model, many shaders.** When two shaders show the same physics (the ripple tank's water and its
  caustics) they take the same uniforms from the same model and are set together, so the paper always shows
  the light the water above it would throw.
- **Drive by envelopes.** `uLevel`, `uPower`, `uWarm` come from springs or follows, never jumps: ignition
  rises, shutdown decays, a tube warms over a second. The canvas of a `crt` holds only the picture the
  machine draws; the tube's behaviour (collapse, scan, warm-up) belongs to the shader, not to canvas
  transforms.
- **Time.** `fig.time(t)` sets every library shader's `uTime`. Under reduced motion pass a constant: the
  figure still shows the field, frozen at a representative phase (choose one where the pattern is clear,
  not 0 if 0 is a node).
- **Theme.** Each shader takes the theme at build: additive light on dark, ink-on-paper on light. Check both;
  an additive plume on a light card is invisible.

**Failure modes.** A field shader whose wavelength is a free constant instead of the model's (it will look
right and be wrong). A shader on a part whose uv runs the other way (a plume bright at the far end: check
uv.y = 1 at the exit). A glow sphere so large it washes the part it surrounds. Banding in slow gradients
(the library dithers; custom shaders should too).

## 4. Vertex colours: gradients and maps

Baked, when the gradient is a fact of the object:

```js
add({ id: "fin", kind: "lathe", profile, colors: { ramp: "temper", axis: "z", range: [0, 40] } });
```

Live, when it is a state:

```js
// wall heat flux ~ (r_throat / r)^1.8 on the bell's own radius
fig.paint("bell", (x, y, z) => Math.pow(18 / Math.max(18, Math.hypot(x, y)), 1.8), "heat");
// or blend from the part's colour to the map, by a spring, so the view fades in
fig.paint("bell", (x, y) => out.copy(copper).lerp(fig.rampColor("heat", t(x, y), tmp), shown));
```

Ramps: `heat` (blackbody-like), `stress` (blue, green, yellow, red, as in a finite-element plot), `depth`,
`temper` (steel oxide colours), `tone`; or your own `stops: [[t, "#rrggbb"], …]`, t rising from 0 to 1.
`axis` is `x`, `y`, `z` (the part's own frame) or `r` (distance from its z axis).

**Rules.**
- **A map is a claim; say what it maps.** Put the quantity in the readout or caption ("wall heat flux,
  peaks at the throat, ×10 the exit's") and say when it is a sketch rather than a result (the test rig's
  button strain is a sketch of where shear gathers, not FEA). Use the formula from the model, never a
  gradient chosen to look hot.
- **Maps are views.** Default to the part's real finish and toggle the map with a key and a button (`H`,
  `S`), faded by a spring; announce it in the live region. A map that is always on hides the object.
- **Colour needs vertices.** Colour interpolates between vertices: a sharp `box` has 24 and cannot carry a
  gradient (the validator refuses it); the caps of an extruded box have vertices only on their outline, so
  a gradient across a cap shows only what the outline carries. Lathes, cylinders with `open`, tubes and
  subdivided planes are good carriers.
- **Paint on change, not per frame.** Repaint when the state moves by more than a visible step (raptor:
  0.004 of the fade; spot plate: each quarter-pixel of merge).
- `fig.paint` gives the part its own white material the first time, because tone materials are shared and
  a vertex-coloured material on a mesh without colours draws black.

## 5. Physical materials and the environment

```js
add({ id: "drops-0", kind: "plane", …, glass: true, material: { transmission: 0.9, ior: 1.5, thickness: 3, rough: 0.04, iridescence: 0.25 } });
scene.env = { intensity: 1 };
```

`material` fields: `metal`, `rough`, `transmission`, `ior` (1 to 2.5), `thickness`, `tint` and
`tintDistance` (Beer-Lambert absorption colour and distance), `clearcoat`, `clearcoatRough`, `sheen`,
`sheenColor`, `iridescence`.

**Rules.**
- **Metal reflects; give it something to reflect.** A part with `metal >= 0.7`, or any transmission, needs
  `env` (the validator says so). Without it metal renders black on dark and grey on light, which reads as
  paint. The environment is a procedural studio (a gradient dome and three soft boxes), the same for every
  figure, so figures match.
- **Transmission is for the subject's glass, at a size where it shows.** It is right for drops, lenses and a
  glass bed the reader looks through. It is wrong for a small crystal over printed numbers: three samples a
  downsampled copy of what is behind, and at that size the numerals blur away (the dial indicator's crystal
  is a faint clear glass instead). Never combine transmission with `opacity` or with metal.
- **Metals by what they are.** Steel 0.6–0.95 metal, 0.12–0.45 rough; copper and gold warm `color` with the
  same; anodised and painted parts are not metal (0–0.2). One finish per material across the figure.

## 6. Instances

```js
add({ id: "vents", kind: "instances", shape: "box", size: [1, 46, 1.8], items: Array.from({ length: 9 }, (_, i) => [x, 18, 128 + i * 4]), tone: "lo" });
```

`shape` is `box`, `cylinder` or `sphere`; each item is `[x, y, z]` or `[x, y, z, rz°]`; `tilt` rotates all
copies; `itemColors` colours them in turn.

**Rules.** Instances count as **one** solid: a row of identical slots is one feature, however many copies.
Use them for repetition the reader takes in at a glance (vents, louvres, rivet rows). Parts the reader
counts, or that move one at a time (keys, chips on a board, ribs that teach the grip), stay separate parts;
the arcade's chips stayed separate because as instances the cabinet fell below its hero minimum, and that
was the validator being right.

## 7. Checks

- `node build.mjs --check`: the validator covers every field above (kinds and options, uniforms and their
  types, ramp stops, material ranges, env for reflective parts, instances).
- Read both themes and the reduced-motion phone shot. For each look ask: is it legible at the figure's
  width, does it agree with the model, does it read in both themes?
- Drive every view: `["key", "h"]`, `["key", "s"]`, ignition, power-off (`node scripts/drive.mjs page.html
  '[["key","h"],["wait",1500],["shot","heat.png"]]'`). Zoom the shot on small looks (`["shot", out, null, 3,
  [x, y, w, h]]`).
- `window.__fig.shaders`, `window.__fig.parts.get(id).material` in an `eval` action to probe uniforms and
  materials.
- No console warnings: a shader that fails to compile logs one, and CI fails on it.
