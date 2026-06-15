/**
 * @psyuml/render layout — the shared geometry layer (ADR-0012).
 *
 * A single source of truth for the two things every overlap guarantee depends on:
 *   1. how wide a piece of text is (`textWidth`), and
 *   2. how to spread a row/column of sized items so they never collide (`separate1D`).
 *
 * The renderers AND the machine-checked overlap invariant (`overlap.test.ts`) both import
 * from here, so the geometry they reason about is self-consistent: the test measures a label
 * with exactly the metric the renderer used to size its slot. The guarantee therefore holds
 * "under the shared text-metric model" — it is not a claim about a specific font's true glyph
 * advances, which we cannot know without a layout engine (server-side string SVG, spec §D).
 *
 * `separate1D` is the one-dimensional core of VPSC / "Fast Node Overlap Removal"
 * (Dwyer, Marriott & Stuckey, GD'05): given ordered items each with a center and a half-size
 * on one axis, shift them minimally so consecutive items are >= `gap` apart, preserving order.
 *
 * Traceability: REQ-ACCESSIBILITY, REQ-NOTATION (§D).
 */

/** Mean glyph advance as a fraction of the font size for the sans-serif we render with.
 * ~0.58.em is a safe over-estimate for a proportional sans-serif and MATCHES the constant
 * `fitText`/`wrapLabel` already use to decide wrapping/compression — keep them identical. */
export const CHAR_W = 0.58;

/**
 * The ONE text-width estimate (in px) for a string at a given font size. Both the renderers
 * (to size slots/boxes) and the overlap test (to build label AABBs) call this, so a label can
 * never be measured one way when drawn and another way when checked.
 */
export function textWidth(s: string, size: number): number {
  return s.length * size * CHAR_W;
}

/** An axis-aligned bounding box (top-left origin, SVG coordinates, y grows downward). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * AABB intersection with a tolerance. `pad` is added to each box's extent before testing:
 * a NEGATIVE `pad` (the slop-friendly case) lets boxes that merely touch — or overlap by less
 * than |pad| px — count as non-overlapping, which is what we want for <=1px slop and for shapes
 * that share an edge (a node sitting exactly on a band boundary). A positive `pad` requires
 * clear separation. Returns true when the (padded) boxes truly overlap.
 */
export function overlaps(a: Box, b: Box, pad = 0): boolean {
  return (
    a.x + a.w + pad > b.x && b.x + b.w + pad > a.x && a.y + a.h + pad > b.y && b.y + b.h + pad > a.y
  );
}

/** The smallest AABB containing every box (used for content-fit framing). */
export function union(boxes: Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** An item on one axis: a center coordinate and the half-extent of its box on that axis. */
export interface Span1D {
  center: number;
  half: number;
}

/**
 * One-dimensional overlap removal (the VPSC / Fast-Node-Overlap-Removal core, in 1-D).
 *
 * Given items IN ORDER along an axis (each a center + half-size), return new centers such that
 * for every consecutive pair `right.center - left.center >= left.half + right.half + gap`,
 * moving items as little as possible and never reordering them.
 *
 * Method (the exact total-order solution): a forward sweep packs each item to the RIGHT of its
 * original position where a left neighbour forces it; a symmetric backward sweep packs to the
 * LEFT. Each sweep alone is feasible (satisfies every gap) and never reorders; taking the
 * *midpoint* of the two centres the whole block on the items' original mean, so no single side
 * absorbs all the spreading (minimal, symmetric movement). A final forward sweep repairs any
 * residual sub-gap the averaging can introduce, guaranteeing every constraint holds. Fully
 * deterministic.
 */
export function separate1D(items: Span1D[], gap: number): number[] {
  const n = items.length;
  if (n === 0) return [];
  if (n === 1) return [items[0].center];

  // Forward sweep: lower[i] is the leftmost center item i may take given its left neighbour,
  // but never left of where it already is (we only ever push items apart, never pull them in).
  const lower: number[] = new Array(n);
  lower[0] = items[0].center;
  for (let i = 1; i < n; i += 1) {
    const minFromPrev = lower[i - 1] + items[i - 1].half + gap + items[i].half;
    lower[i] = Math.max(items[i].center, minFromPrev);
  }

  // Backward sweep: upper[i] is the rightmost center item i may take given its right neighbour,
  // but never right of where it already is.
  const upper: number[] = new Array(n);
  upper[n - 1] = items[n - 1].center;
  for (let i = n - 2; i >= 0; i -= 1) {
    const maxFromNext = upper[i + 1] - items[i + 1].half - gap - items[i].half;
    upper[i] = Math.min(items[i].center, maxFromNext);
  }

  // Average the two feasible packings: an item already spaced from both neighbours keeps its
  // original center; otherwise it takes the midpoint of the forced bounds, which centres the
  // spread symmetrically about the original mean.
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] =
      lower[i] === items[i].center && upper[i] === items[i].center
        ? items[i].center
        : (lower[i] + upper[i]) / 2;
  }

  // Final exact pass: the averaging can leave a sub-gap violation when the two bounds disagree;
  // one deterministic forward sweep that only ever pushes right guarantees every gap is met.
  for (let i = 1; i < n; i += 1) {
    const minC = out[i - 1] + items[i - 1].half + gap + items[i].half;
    if (out[i] < minC) out[i] = minC;
  }
  return out;
}
