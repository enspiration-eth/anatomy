// Marching squares, as a small pure model. The figure, its readout, its plotter and the tests all run this.
// Corners: TL = 8, TR = 4, BR = 2, BL = 1 (a corner is "inside" when its sample >= iso).
// Edges of a cell: T (TL-TR), R (TR-BR), B (BR-BL), L (BL-TL).

/** The 16-case lookup table: segments as pairs of edges. Saddles 5 and 10 have two readings. */
export const CASES = [
  [], [["L", "B"]], [["B", "R"]], [["L", "R"]],
  [["T", "R"]], null, [["T", "B"]], [["L", "T"]],
  [["L", "T"]], [["T", "B"]], null, [["T", "R"]],
  [["L", "R"]], [["B", "R"]], [["L", "B"]], [],
];
/** Saddle readings: `split` when the centre is outside (the two inside corners stay apart), `joined` when it is inside. */
export const SADDLES = {
  5: { split: [["L", "B"], ["T", "R"]], joined: [["L", "T"], ["B", "R"]] },
  10: { split: [["L", "T"], ["B", "R"]], joined: [["L", "B"], ["T", "R"]] },
};
export const BIT_NAMES = ["TL", "TR", "BR", "BL"];

/** The metaball field: the sum of r^2 / d^2 over sources [x, y, r]. Capped so a sample on a source stays finite. */
export function fieldAt(sources, x, y) {
  let f = 0;
  for (const [sx, sy, r] of sources) f += (r * r) / Math.max((x - sx) ** 2 + (y - sy) ** 2, 1);
  return f;
}

/** Samples the field at the (n + 1)^2 grid corners over a square of side `size` centred on 0. vals[j * (n + 1) + i]. */
export function sampleGrid(sources, n, size) {
  const vals = new Float64Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) vals[j * (n + 1) + i] = fieldAt(sources, -size / 2 + (i * size) / n, -size / 2 + (j * size) / n);
  return vals;
}

/** The 4-bit case index of four corner samples. */
export function caseIndex(tl, tr, br, bl, iso) {
  return (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);
}

/** Where along an edge from sample a to sample b the field crosses iso: 0..1 (linear), or 0.5 with interpolation off. */
export function crossing(a, b, iso, interp = true) {
  if (!interp) return 0.5;
  const d = b - a;
  if (Math.abs(d) < 1e-12) return 0.5;
  return Math.min(1, Math.max(0, (iso - a) / d));
}

/** The segments for one cell's case (saddles resolved by the centre sample: the mean of the four corners). */
export function segmentsFor(idx, centre, iso) {
  if (idx === 5 || idx === 10) return centre >= iso ? SADDLES[idx].joined : SADDLES[idx].split;
  return CASES[idx];
}

/**
 * Everything about one cell (i, j): its corner samples, bits, case, saddle reading and segments,
 * each segment end as { key, t, x, y } on a shared edge so neighbouring cells meet exactly.
 */
export function cell(vals, n, size, i, j, iso, interp = true) {
  const at = (a, b) => vals[b * (n + 1) + a];
  const bl = at(i, j), br = at(i + 1, j), tr = at(i + 1, j + 1), tl = at(i, j + 1);
  const idx = caseIndex(tl, tr, br, bl, iso);
  const centre = (tl + tr + br + bl) / 4;
  const h = size / n, x0 = -size / 2 + i * h, y0 = -size / 2 + j * h;
  // Each edge runs in +x or +y from its lower corner, so the key and t are the same seen from both cells.
  const edge = {
    B: () => { const t = crossing(bl, br, iso, interp); return { key: `h${i},${j}`, t, x: x0 + t * h, y: y0 }; },
    T: () => { const t = crossing(tl, tr, iso, interp); return { key: `h${i},${j + 1}`, t, x: x0 + t * h, y: y0 + h }; },
    L: () => { const t = crossing(bl, tl, iso, interp); return { key: `v${i},${j}`, t, x: x0, y: y0 + t * h }; },
    R: () => { const t = crossing(br, tr, iso, interp); return { key: `v${i + 1},${j}`, t, x: x0 + h, y: y0 + t * h }; },
  };
  const pairs = segmentsFor(idx, centre, iso);
  return {
    i, j, idx, bits: idx.toString(2).padStart(4, "0"), corners: { tl, tr, br, bl }, centre,
    saddle: idx === 5 || idx === 10, joined: (idx === 5 || idx === 10) && centre >= iso,
    pairs, segs: pairs.map(([a, b]) => [edge[a](), edge[b]()]),
  };
}

/** Marches every cell, row by row (j outer), and returns the cells and all segments in that order. */
export function march(vals, n, size, iso, interp = true) {
  const cells = [], segs = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = cell(vals, n, size, i, j, iso, interp);
    cells.push(c);
    for (const s of c.segs) segs.push(s);
  }
  return { cells, segs };
}

/**
 * Stitches segments into contours by their shared edge keys. Every interior crossing is used by exactly two
 * segments, so each walk either returns to its start (closed) or ends on the grid's border (open).
 */
export function stitch(segs) {
  const by = new Map();
  segs.forEach((s, k) => { for (const e of s) { if (!by.has(e.key)) by.set(e.key, []); by.get(e.key).push(k); } });
  const used = new Uint8Array(segs.length), lines = [];
  const walk = (k, fromKey) => {
    const out = [];
    let key = fromKey;
    while (k !== undefined && !used[k]) {
      used[k] = 1;
      const [a, b] = segs[k], next = a.key === key ? b : a;
      out.push(next);
      key = next.key;
      k = by.get(key).find((m) => !used[m]);
    }
    return out;
  };
  // Open lines first, starting from a border crossing (used once), then the closed loops.
  const order = [...segs.keys()].sort((p, q) => Math.min(...segs[p].map((e) => by.get(e.key).length)) - Math.min(...segs[q].map((e) => by.get(e.key).length)));
  for (const k of order) {
    if (used[k]) continue;
    const [a] = segs[k];
    const start = by.get(a.key).length === 1 ? a : segs[k][by.get(segs[k][1].key).length === 1 ? 1 : 0];
    const pts = [start, ...walk(k, start.key)];
    const closed = pts.length > 2 && pts[pts.length - 1].key === pts[0].key;
    if (closed) pts.pop();
    lines.push({ points: pts, closed });
  }
  return lines;
}
