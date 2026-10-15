// Small builders for scene parts lists (kit/three-scene.mjs). Node and browser.

/** A parts collector: `const { parts, add } = collector()`; add returns the part. */
export function collector() {
  const parts = [];
  const add = (part) => (parts.push(part), part);
  return { parts, add };
}

/** Points of a coil spring of radius r from z0 to z1 about (x, y). */
export function coilPoints(x, y, r, z0, z1, turns, perTurn = 16) {
  const out = [];
  const n = Math.round(turns * perTurn);
  for (let i = 0; i <= n; i++) {
    const a = (i / perTurn) * Math.PI * 2;
    out.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z0 + ((z1 - z0) * i) / n]);
  }
  return out;
}

/** A coiled cord: a helix of radius r wound around a polyline, `pitch` units per turn. */
export function coilAlong(path, r, pitch, perTurn = 12) {
  const out = [];
  let travelled = 0;
  for (let s = 0; s < path.length - 1; s++) {
    const a = path[s], b = path[s + 1];
    const d = b.map((v, i) => v - a[i]);
    const length = Math.hypot(...d);
    const t = d.map((v) => v / length);
    const helper = Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm(cross(t, helper)), v = cross(t, u);
    const steps = Math.max(2, Math.round((length / pitch) * perTurn));
    for (let i = s ? 1 : 0; i <= steps; i++) {
      const along = (length * i) / steps;
      const angle = ((travelled + along) / pitch) * Math.PI * 2;
      out.push(a.map((p, k) => p + t[k] * along + (u[k] * Math.cos(angle) + v[k] * Math.sin(angle)) * r));
    }
    travelled += length;
  }
  return out;
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };

/** Four corner positions of a w x d rectangle centred on (cx, cy), inset by `inset`. */
export const cornersOf = (cx, cy, w, d, inset) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cx + sx * (w / 2 - inset), cy + sy * (d / 2 - inset)]);

/** Adds a screw head (small cylinder) with its ring, lying on a face at height z, to `add`. */
export function screw(add, id, x, y, z, { parent, r = 1.4 } = {}) {
  add({ id, kind: "cylinder", r, h: 0.5, at: [x, y, z], tone: "lo", edges: false, parent });
  add({ id: `${id}-ring`, kind: "torus", r: r + 0.7, tube: 0.16, at: [x, y, z + 0.05], tone: "lo", edges: false, parent });
}
