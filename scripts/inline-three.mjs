import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "kit");
const require = createRequire(import.meta.url);
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

/** The installed three.js version (from node_modules). */
export const threeVersion = () => JSON.parse(readFileSync(join(dirname(require.resolve("three")), "..", "package.json"), "utf8")).version;

/**
 * An import map that resolves "three". mode "inline" embeds the installed
 * three.js as data URLs, so a single HTML file opens offline (also from file://).
 * mode "cdn" points at the same version on jsDelivr; any other string is used as the URL.
 */
export function threeImportMap(mode = "inline") {
  let url;
  if (mode === "inline") {
    const build = dirname(require.resolve("three"));
    const core = readFileSync(join(build, "three.core.js"), "utf8");
    const module = readFileSync(join(build, "three.module.js"), "utf8").replaceAll("'./three.core.js'", "'three/core'");
    return `<script type="importmap">${JSON.stringify({ imports: { three: dataUrl(module), "three/core": dataUrl(core) } })}</script>`;
  }
  url = mode === "cdn" ? `https://cdn.jsdelivr.net/npm/three@${threeVersion()}/build/three.module.js` : mode;
  return `<script type="importmap">${JSON.stringify({ imports: { three: url } })}</script>`;
}

/** The browser runtime (kit/three-runtime.js) as module source, with its import kept. */
export const threeRuntime = () =>
  [readFileSync(join(KIT, "three-looks.js"), "utf8").replace(/^import \* as THREE from "three";\n/m, ""), readFileSync(join(KIT, "three-runtime.js"), "utf8").replace(/^import \{[^}]*\} from "\.\/three-looks\.js";\n/m, "")]
    .map((source) => source.replace(/^export /gm, ""))
    .reverse()
    .join("\n");

/**
 * The module script for a figure: the runtime, the scene and the figure's live code.
 * `live` runs with `fig` (the mountScene handle, or null without WebGL), `spec` and `stage` in scope.
 */
/** The motion helpers (kit/three-live.js) as module source. */
export const threeLive = () => readFileSync(join(KIT, "three-live.js"), "utf8").replace(/^export /gm, "");

export function threeModule({ spec, theme, live = "", stage = ".iso-stage", extra = "" }) {
  return `<script type="module">
${threeRuntime()}
${threeLive()}
${extra}
const spec = ${JSON.stringify(spec)};
const stage = document.querySelector(${JSON.stringify(stage)});
const fig = mountScene(stage, spec, { theme: ${JSON.stringify(theme)} });
window.__fig = fig;
if (fig) {
${live}
}
</script>`;
}
