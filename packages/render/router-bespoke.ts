/**
 * BespokeRouter (ADR-0023, default) — a small, dependency-free, DETERMINISTIC obstacle-avoiding
 * edge router. Per edge it runs orthogonal A* over a sparse grid of "interesting" lines (the
 * non-incident obstacle boundaries, grown by the margin, plus the endpoints and the channels
 * between them) — the classic Hightower/grid routing idea, scoped to PsyUML's small, structured
 * diagrams rather than a general libavoid clone. Endpoints are clipped to the source/target box
 * borders; the route avoids every non-incident obstacle box (validated by `segIntersectsBox`).
 *
 * Determinism: no RNG; a linear-scan priority queue with a total-order tie-break (f, then g, then
 * grid indices, then direction) → identical input yields identical output (golden-test safe).
 */
import { type Box, type Pt, clipToBox, segIntersectsBox } from './layout';
import {
  DEFAULT_OBSTACLE_MARGIN,
  type EdgeRouter,
  type RouteOptions,
  type RoutedEdge,
  type RouterEdge,
  type RouterObstacle,
} from './router';

const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const grow = (b: Box, m: number): Box => ({
  x: b.x - m,
  y: b.y - m,
  w: b.w + 2 * m,
  h: b.h + 2 * m,
});

/** Sorted-unique axis values + the midpoints between consecutive ones (channel tracks). */
function axis(values: number[]): number[] {
  const uniq = [...new Set(values.map((v) => Math.round(v * 10) / 10))].sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 0; i < uniq.length; i += 1) {
    out.push(uniq[i]);
    if (i + 1 < uniq.length) out.push((uniq[i] + uniq[i + 1]) / 2);
  }
  return out;
}

/** Does segment p→q stay clear of every blocker box? (a small negative pad lets a route run along a
 * box border without counting as passing through it). */
function clear(p: Pt, q: Pt, blockers: Box[]): boolean {
  for (const b of blockers) if (segIntersectsBox(p, q, b, -0.5)) return false;
  return true;
}

/** Merge consecutive collinear points so the polyline is minimal. */
function simplify(pts: Pt[]): Pt[] {
  if (pts.length <= 2) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const collinear = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) === 0;
    if (!collinear) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const TURN = 12; // penalty per bend, to prefer straighter routes

/** Orthogonal A* for one edge over the (xs × ys) grid; returns grid points start→goal or null. */
function search(start: Pt, goal: Pt, xs: number[], ys: number[], blockers: Box[]): Pt[] | null {
  const sx = xs.indexOf(start.x);
  const sy = ys.indexOf(start.y);
  const gx = xs.indexOf(goal.x);
  const gy = ys.indexOf(goal.y);
  if (sx < 0 || sy < 0 || gx < 0 || gy < 0) return null;
  const W = xs.length;
  // state = grid node (ix,iy) + incoming direction (0=H,1=V,2=start). key packs all three.
  const key = (ix: number, iy: number, d: number): number => (iy * W + ix) * 3 + d;
  const h = (ix: number, iy: number): number =>
    Math.abs(xs[ix] - goal.x) + Math.abs(ys[iy] - goal.y);
  interface Node {
    ix: number;
    iy: number;
    d: number;
    g: number;
    f: number;
    prev: number;
  }
  const open = new Map<number, Node>();
  const best = new Map<number, number>(); // key → best g
  const came = new Map<number, Node>();
  const startNode: Node = { ix: sx, iy: sy, d: 2, g: 0, f: h(sx, sy), prev: -1 };
  open.set(key(sx, sy, 2), startNode);
  best.set(key(sx, sy, 2), 0);

  while (open.size) {
    // pop min by (f, g, iy, ix, d) — fully deterministic
    let cur: Node | null = null;
    let curKey = -1;
    for (const [k, n] of open) {
      if (
        !cur ||
        n.f < cur.f ||
        (n.f === cur.f && (n.g < cur.g || (n.g === cur.g && k < curKey)))
      ) {
        cur = n;
        curKey = k;
      }
    }
    if (!cur) break;
    open.delete(curKey);
    came.set(curKey, cur);
    if (cur.ix === gx && cur.iy === gy) {
      // reconstruct
      const path: Pt[] = [];
      let n: Node | undefined = cur;
      while (n) {
        path.push({ x: xs[n.ix], y: ys[n.iy] });
        n = n.prev >= 0 ? came.get(n.prev) : undefined;
      }
      return path.reverse();
    }
    const moves: [number, number, number][] = [
      [cur.ix + 1, cur.iy, 0],
      [cur.ix - 1, cur.iy, 0],
      [cur.ix, cur.iy + 1, 1],
      [cur.ix, cur.iy - 1, 1],
    ];
    for (const [nx, ny, nd] of moves) {
      if (nx < 0 || nx >= W || ny < 0 || ny >= ys.length) continue;
      const a = { x: xs[cur.ix], y: ys[cur.iy] };
      const b = { x: xs[nx], y: ys[ny] };
      if (!clear(a, b, blockers)) continue;
      const step = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      const g = cur.g + step + (cur.d !== 2 && cur.d !== nd ? TURN : 0);
      const k = key(nx, ny, nd);
      if (g < (best.get(k) ?? Infinity)) {
        best.set(k, g);
        open.set(k, { ix: nx, iy: ny, d: nd, g, f: g + h(nx, ny), prev: curKey });
      }
    }
  }
  return null;
}

export class BespokeRouter implements EdgeRouter {
  readonly name = 'bespoke';

  route(
    obstacles: RouterObstacle[],
    edges: RouterEdge[],
    options: RouteOptions = {},
  ): RoutedEdge[] {
    const margin = options.obstacleMargin ?? DEFAULT_OBSTACLE_MARGIN;
    const byId = new Map(obstacles.map((o) => [o.id, o.box]));
    return edges.map((e) => {
      const sBox = byId.get(e.source);
      const tBox = byId.get(e.target);
      if (!sBox || !tBox) return { id: e.id, points: [] };
      // Round endpoints to the same 0.1 grid `axis` snaps to, so the A* start/goal nodes exist in
      // the grid (an unrounded clipped coord would miss `xs.indexOf`/`ys.indexOf` → spurious fallback).
      const r1 = (n: number): number => Math.round(n * 10) / 10;
      const s0 = clipToBox(centre(tBox), centre(sBox), sBox);
      const g0 = clipToBox(centre(sBox), centre(tBox), tBox);
      const start = { x: r1(s0.x), y: r1(s0.y) };
      const goal = { x: r1(g0.x), y: r1(g0.y) };
      const blockers = obstacles
        .filter((o) => o.id !== e.source && o.id !== e.target)
        .map((o) => grow(o.box, margin));
      // No blocker in the way → the straight segment is already clean.
      if (clear(start, goal, blockers)) return { id: e.id, points: [start, goal] };
      const xs = axis([...blockers.flatMap((b) => [b.x, b.x + b.w]), start.x, goal.x]);
      const ys = axis([...blockers.flatMap((b) => [b.y, b.y + b.h]), start.y, goal.y]);
      const path = search(start, goal, xs, ys, blockers);
      return { id: e.id, points: path ? simplify(path) : [start, goal] };
    });
  }
}
