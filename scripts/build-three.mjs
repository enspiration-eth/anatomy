// Shared page builder for three.js figures.
//   node examples/<name>/build.mjs [--light] [--three=inline|cdn|<url>] [--check]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as k from "../kit/iso-kit.mjs";
import { assertScene, solidCount } from "../kit/three-scene.mjs";
import { threeImportMap, threeModule } from "./inline-three.mjs";

export const argsOf = (argv = process.argv.slice(2)) => ({
  theme: argv.includes("--light") ? "light" : "dark",
  three: argv.find((a) => a.startsWith("--three="))?.slice(8) ?? "inline",
  check: argv.includes("--check"),
});

/**
 * Validates `scene`, then writes `<name>.html` (or `<name>-light.html`) into `dir`.
 * `live` is the figure's code (fig, spec, stage in scope); `extra` is module source
 * placed before it (models, helpers); `stage` sets the stage's role and label;
 * `after` is HTML placed after the stage inside the card (controls, status).
 */
export function writeThreeFigure({ dir, name, scene, live, extra = "", keys = [], caption, stage, after = "", width = 650, css = "" }) {
  const { theme, three, check } = argsOf();
  assertScene(scene);
  if (check) {
    console.log(`scene ok: ${solidCount(scene)} solid parts`);
    return;
  }
  const attrs = Object.entries(stage.attrs ?? {}).map(([key, value]) => ` ${key}="${String(value).replace(/"/g, "&quot;")}"`).join("");
  const body = k.plateHtml({
    fig: scene.fig,
    title: scene.title,
    hint: scene.hint,
    readout: scene.readout,
    keys,
    caption,
    body: `<div class="iso-stage" tabindex="0" role="${stage.role ?? "group"}" aria-label="${stage.label.replace(/"/g, "&quot;")}"${attrs}></div>${after}`,
  });
  const file = theme === "light" ? `${name}-light.html` : `${name}.html`;
  const page = k
    .pageHtml({ title: scene.title, theme, body: (css ? `<style>${css}</style>` : "") + body, width })
    .replace("</head>", `${threeImportMap(three)}</head>`)
    .replace("</body>", `${threeModule({ spec: scene, theme, live, extra })}</body>`);
  writeFileSync(join(dir, file), page);
  console.log(`wrote ${file} (${solidCount(scene)} solid parts, three ${three})`);
}
