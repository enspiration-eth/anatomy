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
| `open: true` | cylinder | no caps, 24 rows along its height | plumes, steam and sleeves |
| `cut: "solid"`, `hatch` | a cut part | a filled, uncapped clip; a coloured hatch | blood and coolant in a section; material-coded cut faces (§8) |

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

## 8. Living systems and plant: flow, Cherenkov, steam, fibre, concrete, sections with fill

Added for the heart (Fig 6) and the reactor (Fig 7). Each one follows the same rule as the rest of the kit: a look
carries a quantity, and the live code drives that quantity through a uniform or a repaint.

### Textures

| Kind | Draws | Options | Use on | Fails when |
|---|---|---|---|---|
| `fiber` | wavy fibre bundles with dark clefts, a pale sheen and a strong bump, wide enough to read at figure scale | `seed`, `color` (default `#8e3030`), `waves` (bend count, 3) | myocardium, tendon, woven cable | it goes on a part that is also painted: `fig.paint` clones the material to white and the striations then tint the ramp, so keep painted parts untextured |
| `concrete` | theme grey with aggregate flecks and pore bump | `seed` | containments, basemats, pedestals, towers | it covers metal: rough 0.9 kills the environment's reflections, which is the point on concrete and wrong on steel |

### Shaders

| Name | On | Uniforms | What it means |
|---|---|---|---|
| `flow` | `tube` (uv.x runs along the path) | `uTime`, `uLevel` (0 still … 1 full flow), `uSpeed`, `uStripes`, `uA` → `uB` (colour from the first point to the last), `uBand` | a lit pipe whose bands travel at `uSpeed × uLevel`. Colour along the tube shows what the fluid carries: temperature from `fig.rampColor("heat", t)` in the reactor's legs and U-tubes, oxygen saturation in the heart's vessels |
| `cherenkov` | `cylinder` or `sphere` (an effect) | `uTime`, `uLevel`, `uColor` | blue light from charged particles faster than light in water. Additive in the dark theme. Tie `uLevel` to power: it fades out at shutdown |
| `steam` | open `cylinder`, uv.y = 0 at the outlet (an effect) | `uTime`, `uLevel` (density), `uRise` (speed) | puffs that rise, swell and thin out. The noise is blended across the seam, so the open cylinder shows none. CylinderGeometry puts uv.y = 0 at the top, so for a rising plume give the part `rot: [180, 0, 0]` and swap `r`/`r2` |

`flow` takes colours as uniforms because a tube's vertex colours are already used for the bands. Copy into the
uniform (`g.uniforms.uA.value.copy(colour)`) rather than reassigning it: the shader holds the Color object.

### Ramps

- `oxygen`: 60 % (`#3c1838`) to 100 % (`#d8322c`) saturation, so `t = (sat − 60) / 40`. Venous blood is dark red,
  not blue. A legend that says blue is wrong.
- `activation`: resting (`#3a1418`) → depolarising (`#d0603a`) → peak (`#fff0b0`) for electrical waves.
  Prefer an emissive pulse on textured walls (see the fiber row above) and the ramp on untextured parts.

### Sections with fill, coloured hatching, extrude holes

- A textured wall you want to read as its material in section (the heart's fibre-textured muscle) can also take `cut: "solid"`. The cut then shows the lit, textured inside of the shell. A hatch would hide the texture.
- `cut: "solid"`: a volume such as blood, coolant or a core is clipped at the section with no hatch cap and with lit
  backfaces, so its inside reads as filled. Use it for what flows inside a hatched wall; hatching blood would
  read as a solid.
- `hatch: "#hex"` (with `cut: true` only) colours the hatch lines: muscle `#b0484a`, fibrous skeleton `#d9c7a0`,
  concrete `#8a8a84`, steel `#c9ced4`. One hatch colour per material across the figure, so a cut face says what
  it is made of.
- `extrude` takes `holes: [[[a, b], …], …]`: the heart's fibrous skeleton is one plate with four valve rings.
  Holes must lie inside the outline and not touch each other. The validator checks the shape only, so look at
  the cap.

### Checks for these looks

- Close-up shots at scale 3 of each cut face: the hatch must stop at the clip line, and a `"solid"` fill must
  not show a cap.
- Drive the quantity across its range and shoot both ends (rods in and out; diastole and ejection). The flow
  bands must slow down, the Cherenkov glow must fade, and the steam must thin out.
- Reduced motion: `fig.time` is not called, so the bands and puffs freeze where they are, and the levels still
  show the state.

### Mechanisms: meshing teeth, jewels, blued steel (the watch, Fig 8)

- Gears are `extrude` outlines (trapezoid teeth from `N` and module `m`) with crossings cut as `holes`. Place
  each arbor at exactly wheel pitch radius + pinion pitch radius, and give a wheel and the pinion it drives the
  same module. The watch test checks both.
- Phase the teeth so they interleave. Given the next arbor's angle θb, the line of centres φ and the counts Nw
  and Np, set θa = φ − (Np/Nw)(θb − φ − π − π/Np). Drive the train from the escape wheel backwards, so its
  stepped motion (half a tooth per beat) reaches every wheel. Unphased teeth visibly pass through each other in
  a close-up.
- Jewels: `glass: true` with `material: { transmission ≈ 0.55, ior: 1.76, thickness }` and a deep red. Below
  thickness 3 at this scale they read as plastic, and above transmission 0.8 they go pink.
- Blued steel: `#24357a`, metal 0.85, `material: { clearcoat: 0.6, iridescence: 0.4 }`. The iridescence is the
  thin oxide film that gives blued screws their colour.
- Brushed rhodium bridges: set the texture's `color` (`#d4d8de`). The theme-aware default is a dark grey meant
  for machinery, and it makes a movement look like cast iron.

## 9. Organic forms and fields: implicit surfaces, field lines, potential maps (the body, Fig 9)

### `kind: "implicit"`: high-poly smooth bodies

```js
add({ id: "body", kind: "implicit", cell: 4, blend: 20, relax: 2, shapes: [
  ["ellipsoid", [0, 4, 1638], [74, 92, 106], 18],      // centre, radii, own blend
  ["cone", [0, 14, 1545], [0, 8, 1420], 50, 58, 30],   // round cone: a, b, ra, rb, own blend
  ... ], color: "#e2bfa3", rough: 0.48, material: { sheen: 0.6, clearcoat: 0.06 }, edges: false });
```

- How it's built: the shapes are combined into one signed distance field with a smooth minimum (`blend` in
  mm), sampled on a grid of `cell` mm and meshed with surface nets. The mesh is relaxed `relax` times, then
  projected back onto the surface. Normals come from the field's gradient, so shading is smooth at every
  vertex and there are no facets.
- Resolution: `cell` 4 on a 1.75 m body gives about 150,000 vertices and 300,000 triangles in about 1 s.
  `cell` 3.5 doubles that. Keep `cell` at no more than a fifth of the thinnest feature: fingers at 7–9 mm
  radius need ≤ 4.
- Each shape only touches the grid cells near its own box, so cost grows with surface area, not volume.
- Use it for anything organic: bodies, hands, bones, fruit. Don't use it for machined parts; lathe and
  extrude give exact edges.
- Fails when:
  - blends are too wide (above ~40 mm), which melts joints into blobs;
  - a cone's radius is smaller than `cell`, so it vanishes;
  - shapes leave gaps larger than the blend, so the body splits.
  Check with a scale-3 close-up of a shoulder, a hand and the face, with the field effects turned off.
- To place things on the skin, march a ray through the same field (`skinDistance`, `onSkin` in the biofield
  example). The test checks that every electrode sits within 1 mm of the surface.
- Paint works on it: `fig.paint` on 150,000 vertices costs a few milliseconds, so repaint every third frame.

### `fieldline` shader

An additive glowing line on a `tube` (uv.x runs along it) with dashes that travel in the field's direction.
Uniforms: `uLevel` (display strength, 0 hides it), `uSpeed`, `uDash`, `uColor`. It's an effect, so it doesn't
count as a solid.

- Draw the physics of the source. A current dipole (heart, cortex) has magnetic field lines that are circles
  about its axis (Biot–Savart), so build rings in a group and turn the group to the dipole with a quaternion.
  A uniform field (the Earth's) is drawn as parallel lines at its dip angle.
- Brightness is a display scale. Say so, and put the true ratios on a log chart.

### `potential` ramp

Diverging blue (−) → skin tone (0) → red (+), so a body with no potential just reads as skin. For an ECG map,
use V ∝ p·r/|r|³ from the heart dipole, put through `0.5 + 0.5·tanh(V/scale)`.

### Kit fix: grouped parts and framing

The fit box and shadow floor were computed before parents' world matrices were updated, so parts inside
moved groups were boxed at their local positions. That dropped the floor and left empty space under some
figures. The runtime now calls `scene.updateMatrixWorld(true)` first.

## 10. Algorithms as machines: live heightfields, contour ribbons, lookup tables (marching squares, Fig 10)

Use these when the subject is an algorithm over a field: contouring, thresholds, sampling, interpolation.

- **The data is the terrain.** Show a scalar field as a `heightfield` lifted by a *monotone* height function
  of the value, `fig.heights(id, (x, y) => g(f(x, y)))`. Paint it with `fig.paint(id, fn, "field")`, where
  the `field` ramp steps from cool to warm at t = 0.5. Map f < iso to t < 0.49 and f ≥ iso to t > 0.51, so
  "inside" is a colour. Because g is monotone, a flat plane at g(iso) (water) meets the terrain exactly on
  the true iso-contour: the threshold becomes a physical level the reader can see.
- **Samples are separate objects.** Draw the grid corners as `instances` (pins with per-instance colour),
  and update their matrices and `setColorAt` for each resolution. Size `items` for the finest grid and set
  `mesh.count` for coarser ones. The reader has to see that the algorithm knows only these samples.
- **Results as live ribbons.** `fig.ribbon(id, lines)` lays mitred strips along polylines. Closed loops have no
  seam, and uv.x is arc length / 100. The `contour` shader runs dashes along uv.x, so the order in which
  the segments were stitched, and that a loop closes, is visible. Rebuild ribbons only when the data changes,
  not every frame.
- **A lookup table is a physical case of stencils.** Give each entry a tile with a small `plane` + `screen`
  (256 px is legible at 4×). Redraw only the tiles whose state changed, and lift the current one with a
  follow.
- **Show the arithmetic once, on an instrument.** An inspector `screen` with the inputs and the formula
  (`t = (iso − a)/(b − a) = 0.37`) teaches more than labels in the drawing, and the card readout stays one line.
- **Keep the model pure.** Write it as a module (`march.mjs`) that is inlined into the page with its exports
  stripped and imported by the tests. Test the table exhaustively, interpolation on a linear field, closure
  and convergence.
- **Framing.** A wide bench with a few tall parts wastes the top of the card under the default box fit. Use
  `fit: "parts"` to frame each part's own box.

## 11. Explorable models: orbit, live sections, cards on top (the walker, Fig 11)

- **Orbit.** `fig.view(azimuth, elevation, zoom, target)` places the orthographic camera at any azimuth, keeping
  the fitted width centred on `target`. Drag changes azimuth and elevation, scroll changes zoom. Treat a
  pointer that moves less than 4 px as a click, so that orbiting never opens a card. Provide side, front and
  iso presets.
- **Live section.** Declare `section: { axis, at }` with `at` far outside the model (off). Call
  `fig.setSection(at)` to move it. Mark *everything* in the model `cut: true` (the near legs too), because a
  true section removes all that lies in front of it. Build hulls from thick plates, so the cut shows wall
  thickness and the rooms inside read as rooms. When picking, skip ray hits on the clipped side
  (`hit.point[axis] < at`): the raycaster still sees clipped geometry.
- **Cards on top.** An HTML card inside the stage (`position: absolute`), plus an SVG leader whose end is the
  department's anchor. The anchor is in the moving group's frame: `group.localToWorld(v).project(camera)`.
  Re-place the card every frame, because the walk, the orbit and the slice all move the anchor. Hover only
  highlights (emissive on the department's own cut materials). A click opens the card; ×, Esc and a click on
  empty scene close it. Offer a department list for keyboard users and use number keys as shortcuts. On a
  phone, dock the card along the bottom.
- **Footprints in snow.** Use a `heightfield` with a depression and a raised rim per footprint. Update it every
  third frame, and paint it from its own height so the hollows read blue. Scroll the footprints with the ground
  speed and age them out with an exponential fill. With IK, a planted foot moves back at exactly the ground
  speed, so it never slides. Test that.

- `armor` texture: `{ kind: "armor", seed, color, panels, grime, rivets, project: "box", tile }`. It adds panel lines, rivets, grime streaks and chipped edges as colour, roughness and bump maps. Use it on hard-surface machines. Extrude `bevel: n` rounds the edges (the outline is inset first, so the size stays the same), and `plane: "yz"` extrudes along +x.
