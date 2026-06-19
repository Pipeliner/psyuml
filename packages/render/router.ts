/**
 * The `EdgeRouter` interface (REQ-EDGE-ROUTER, ADR-0023) — a swappable backend that routes edges
 * AROUND non-incident nodes, so PsyUML can close the documented `EDGE_NODE_KNOWN_GAP` (ADR-0021)
 * without replacing its renderer (ADR-0023: keep the bespoke renderer; adopt a router, not an
 * engine). Two implementations satisfy this contract:
 *   - `BespokeRouter` (`router-bespoke.ts`) — dependency-free, deterministic grid A* (default);
 *   - `LibavoidRouter` (`router-libavoid.ts`) — the LGPL `libavoid-js` WASM port (orthogonal),
 *     behind the SAME interface, swappable without touching the renderer.
 *
 * THE CONTRACT (machine-checked in `router.test.ts` with `segIntersectsBox`):
 *   1. for every routed edge, no segment of its polyline passes through a NON-incident obstacle box
 *      (grown by `obstacleMargin`) — i.e. edge–vertex resolution > 0;
 *   2. the polyline's first/last points lie on (near) the source/target boxes;
 *   3. `route` is DETERMINISTIC — identical input → identical output (golden-test safe).
 *
 * `route` is synchronous so the renderers stay synchronous; a backend that needs async setup (the
 * WASM load) does it once in `init()`, which the caller awaits at startup.
 */
import type { Box, Pt } from './layout';

/** A node the router must keep clear of: an id + its box. */
export interface RouterObstacle {
  id: string;
  box: Box;
}

/** One edge to route, named by the obstacle ids it connects (its endpoints are NOT avoided). */
export interface RouterEdge {
  id: string;
  source: string;
  target: string;
}

export interface RouteOptions {
  /** Keep-out distance the route must maintain from every non-incident obstacle (px). Default 8. */
  obstacleMargin?: number;
  /** Routed shape. `orthogonal` = axis-aligned segments (default); `polyline` = direct corners. */
  shape?: 'orthogonal' | 'polyline';
}

/** The routed geometry for one edge: a polyline from the source boundary to the target boundary. */
export interface RoutedEdge {
  id: string;
  points: Pt[];
}

export interface EdgeRouter {
  /** Stable name for diagnostics/tests (e.g. `"bespoke"`, `"libavoid"`). */
  readonly name: string;
  /** One-time async setup (e.g. load the WASM). Optional; a no-op for the bespoke router. */
  init?(): Promise<void>;
  /** Route every edge around all NON-incident obstacles. Pure + deterministic after `init`. */
  route(obstacles: RouterObstacle[], edges: RouterEdge[], options?: RouteOptions): RoutedEdge[];
}

export const DEFAULT_OBSTACLE_MARGIN = 8;

/** Render a routed polyline to an SVG path `d` (the renderers draw this; tagged `data-el="edge:…"`
 * so the existing edge↔node invariant reads it back). */
export function routeToPath(points: Pt[]): string {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)},${round(p.y)}`).join(' ');
}

const round = (n: number): number => Math.round(n * 10) / 10;
