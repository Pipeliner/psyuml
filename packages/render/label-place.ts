/**
 * Edge-label placement + single-bend detours (ADR-0062, issues #6 / #8).
 *
 * Two small, deterministic helpers for the FREE-geometry renderers (state-map routed edges,
 * mode-map, relational-field), where an edge label used to sit blindly at the path midpoint — behind
 * a node box, on top of another label, or right on another edge's crossing — and a straight edge
 * could run through a third node:
 *
 *   - `placeLabelOnPath` tries a fixed list of candidate spots ALONG the edge (from the midpoint
 *     outward), first centred on the line, then pushed to either side of it, and keeps the first one
 *     whose box clears every obstacle box AND every other edge's segments (and stays in the frame).
 *     If no spot clears the segments it settles for one that clears the boxes; if nothing clears,
 *     it falls back to the midpoint (the overlap invariants are the backstop that would flag it).
 *   - `detourWaypoint` returns one bend point so that source→bend→target clears every blocker box,
 *     trying offsets perpendicular to the straight line at growing distances; ties between the two
 *     sides go to the caller's `score` (higher is better), then to the positive side.
 *
 * The label box is the same AABB `introspect.textLineBox` reconstructs for a `text-anchor="middle"`
 * label (ascent 0.8em above the baseline, `layout.textWidth` wide), so what is placed here is exactly
 * what the overlap invariants measure.
 */
import { type Box, type Pt, overlaps, segIntersectsBox, segSegCross, textWidth } from './layout';

/** The AABB of a centred one-line label whose baseline is `by` (matches `textLineBox`). */
export function centredLabelBox(cx: number, by: number, w: number, size: number): Box {
  return { x: cx - w / 2, y: by - size * 0.8, w, h: size };
}

export interface LabelSpot {
  /** Centre x (`text-anchor="middle"`). */
  x: number;
  /** Baseline y. */
  y: number;
  box: Box;
}

export interface LabelAvoid {
  /** Boxes the label must not overlap (node boxes, node labels, titles, labels already placed). */
  boxes: Box[];
  /** Line segments the label should not sit on (OTHER edges — never its own). */
  segs?: [Pt, Pt][];
  /** Keep the label inside this box when set. */
  frame?: Box;
}

/** Fractions along the path, from the midpoint outward. */
const FRACTIONS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82];

/** Point + unit direction at fraction `f` of a polyline's length. */
function along(pts: Pt[], f: number): { p: Pt; dir: Pt } {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1)
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= total * f || i === pts.length - 2) {
      const t = seg === 0 ? 0 : Math.min(1, Math.max(0, (total * f - acc) / seg));
      return {
        p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        dir: seg === 0 ? { x: 1, y: 0 } : { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg },
      };
    }
    acc += seg;
  }
  return { p: pts[0] ?? { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
}

const inside = (b: Box, f: Box): boolean =>
  b.x >= f.x && b.y >= f.y && b.x + b.w <= f.x + f.w && b.y + b.h <= f.y + f.h;

/**
 * Place a centred one-line label of `text` (font `size`) along the polyline `pts`, clear of `avoid`.
 * Deterministic: the candidate order is fixed, so identical input gives identical output.
 */
export function placeLabelOnPath(
  pts: Pt[],
  text: string,
  size: number,
  avoid: LabelAvoid,
  gap = 2,
): LabelSpot {
  const w = textWidth(text, size);
  const at = (c: Pt): LabelSpot => {
    // centre the glyph box on the point: baseline = centre + (0.8 - 0.5)·size
    const by = c.y + size * 0.3;
    return { x: c.x, y: by, box: centredLabelBox(c.x, by, w, size) };
  };
  const candidates: LabelSpot[] = [];
  for (const side of [0, 1, -1]) {
    for (const f of FRACTIONS) {
      const { p, dir } = along(pts, f);
      if (side === 0) {
        candidates.push(at(p));
        continue;
      }
      // push the box just off the line: half its extent along the normal, plus a small gap
      const n = { x: -dir.y * side, y: dir.x * side };
      const d = Math.abs(n.x) * (w / 2) + Math.abs(n.y) * (size / 2) + 4;
      candidates.push(at({ x: p.x + n.x * d, y: p.y + n.y * d }));
    }
  }
  const clearOfBoxes = (s: LabelSpot): boolean =>
    avoid.boxes.every((b) => !overlaps(s.box, b, gap)) &&
    (!avoid.frame || inside(s.box, avoid.frame));
  const clearOfSegs = (s: LabelSpot): boolean =>
    (avoid.segs ?? []).every(([p, q]) => !segIntersectsBox(p, q, s.box, gap));
  return (
    candidates.find((s) => clearOfBoxes(s) && clearOfSegs(s)) ??
    candidates.find(clearOfBoxes) ??
    candidates[0]
  );
}

/** `b` grown by `m` px on every side. */
export function growBox(b: Box, m: number): Box {
  return { x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m };
}

/** Flatten polylines into their consecutive segments. */
export function pathSegs(paths: Pt[][]): [Pt, Pt][] {
  return paths.flatMap((pts) => pts.slice(1).map((q, i): [Pt, Pt] => [pts[i], q]));
}

/** Does the polyline `pts` stay clear of every box? */
export function polylineClear(pts: Pt[], boxes: Box[]): boolean {
  for (let i = 0; i < pts.length - 1; i += 1)
    for (const b of boxes) if (segIntersectsBox(pts[i], pts[i + 1], b)) return false;
  return true;
}

/** How a candidate detour is judged: proper crossings with other edges (fewer is better), then
 * clearance from them (more is better). */
export interface DetourRank {
  crossings: number;
  clearance: number;
}

/** Distance from point `p` to segment a→b. */
function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy);
}

/**
 * Rank a candidate polyline against the `others` (the other edges' polylines): its proper crossings
 * with them, and its clearance from them sampled every 6px — ignoring the first/last `nearEnds` px,
 * where ties sharing a node necessarily converge.
 */
export function rankAgainst(pts: Pt[], others: Pt[][], nearEnds = 45): DetourRank {
  const segs = pathSegs(others);
  let crossings = 0;
  let clearance = Infinity;
  const s = pts[0];
  const t = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    for (const [p, q] of segs) if (segSegCross(a, b, p, q)) crossings += 1;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    for (let k = 0; k <= n; k += 1) {
      const c = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
      if (Math.hypot(c.x - s.x, c.y - s.y) < nearEnds) continue;
      if (Math.hypot(c.x - t.x, c.y - t.y) < nearEnds) continue;
      for (const [p, q] of segs) clearance = Math.min(clearance, distToSeg(c, p, q));
    }
  }
  return { crossings, clearance };
}

/**
 * The smooth single-bend detour s→t through apex `w`: the quadratic Bézier whose control point is
 * 2·w − (s+t)/2 (so it passes through `w` at its midpoint), sampled into `n` chords. Sampled rather
 * than emitted as a `Q` so every line style (zigzag, triple, dotted) can follow it and the invariants
 * test exactly what is drawn.
 */
export function bendCurve(s: Pt, w: Pt, t: Pt, n = 24): Pt[] {
  const c = { x: 2 * w.x - (s.x + t.x) / 2, y: 2 * w.y - (s.y + t.y) / 2 };
  const out: Pt[] = [];
  for (let i = 0; i <= n; i += 1) {
    const u = i / n;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const d = u * u;
    out.push({ x: a * s.x + b * c.x + d * t.x, y: a * s.y + b * c.y + d * t.y });
  }
  return out;
}

/** Cut a polyline where it leaves the circle of radius `d0` around its start and where it enters the
 * circle of radius `d1` around its end — stop a connector on a glyph's rim instead of its centre. */
export function trimEnds(pts: Pt[], d0: number, d1: number): Pt[] {
  const cut = (ps: Pt[], d: number): Pt[] => {
    const o = ps[0];
    for (let i = 1; i < ps.length; i += 1) {
      const r = Math.hypot(ps[i].x - o.x, ps[i].y - o.y);
      if (r < d) continue;
      const a = ps[i - 1];
      const ra = Math.hypot(a.x - o.x, a.y - o.y);
      const f = r === ra ? 0 : (d - ra) / (r - ra);
      return [{ x: a.x + (ps[i].x - a.x) * f, y: a.y + (ps[i].y - a.y) * f }, ...ps.slice(i)];
    }
    return ps.slice(-2);
  };
  return cut(cut(pts, d0).reverse(), d1).reverse();
}

/**
 * One bend point (the apex of a smooth `bendCurve`) that takes the edge s→t around every blocker box
 * (already grown by the caller's margin), or `null` when the straight line is already clear. Tries
 * perpendicular offsets from the midpoint of `step`, 2·`step`, … up to `maxSteps`, both sides at each
 * distance. The nearest clearing bend wins unless it crosses another edge — then up to `slack` further
 * steps are tried for a crossing-free one (a slightly longer detour beats a new crossing, a much
 * longer one does not). Ties go to fewer crossings, then the shorter detour, then more clearance, then
 * the positive side. Returns `undefined` when no single bend clears (the caller falls back to the
 * orthogonal router).
 */
export function detourWaypoint(
  s: Pt,
  t: Pt,
  blockers: Box[],
  rank: (pts: Pt[]) => DetourRank = () => ({ crossings: 0, clearance: 0 }),
  step = 18,
  maxSteps = 16,
  slack = 4,
): Pt | null | undefined {
  if (polylineClear([s, t], blockers)) return null;
  const len = Math.hypot(t.x - s.x, t.y - s.y) || 1;
  const n = { x: -(t.y - s.y) / len, y: (t.x - s.x) / len };
  const m = { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
  let best: { w: Pt; k: number; r: DetourRank } | undefined;
  const better = (a: { k: number; r: DetourRank }, b: { k: number; r: DetourRank }): boolean =>
    a.r.crossings !== b.r.crossings
      ? a.r.crossings < b.r.crossings
      : a.k !== b.k
        ? a.k < b.k
        : a.r.clearance > b.r.clearance;
  for (let k = 1; k <= maxSteps; k += 1) {
    if (best && (best.r.crossings === 0 || k > best.k + slack)) break;
    for (const side of [1, -1]) {
      const w = {
        x: Math.round((m.x + n.x * step * k * side) * 10) / 10,
        y: Math.round((m.y + n.y * step * k * side) * 10) / 10,
      };
      const path = bendCurve(s, w, t);
      if (!polylineClear(path, blockers)) continue;
      const cand = { w, k, r: rank(path) };
      if (!best || better(cand, best)) best = cand;
    }
  }
  return best?.w;
}
