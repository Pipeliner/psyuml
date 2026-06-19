/**
 * LibavoidRouter (ADR-0023, alternative) — the reference obstacle-avoiding orthogonal router
 * (Wybrow–Marriott–Stuckey, GD'09) via the LGPL-2.1 `libavoid-js` WASM port, behind the SAME
 * `EdgeRouter` interface as `BespokeRouter` (swappable without touching the renderer). libavoid is
 * deterministic by design (no random seed), which keeps golden output stable.
 *
 * `libavoid-js` is loaded by a DYNAMIC import inside `init()`, so the WASM payload is only pulled in
 * if this backend is actually selected — the bespoke router stays the zero-binary-dependency default.
 * Each edge is routed in its own transaction over the NON-incident obstacles only, so the contract
 * ("avoid every non-incident node") holds exactly; the router is freed per edge.
 */
import { type Box, type Pt, clipToBox } from './layout';
import {
  DEFAULT_OBSTACLE_MARGIN,
  type EdgeRouter,
  type RouteOptions,
  type RoutedEdge,
  type RouterEdge,
  type RouterObstacle,
} from './router';

const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

// A minimal typed facade over the embind surface we use (the shipped .d.ts is loose/partly wrong;
// verified against libavoid-js 0.5.x at runtime).
interface AvPoint {
  x: number;
  y: number;
}
interface AvRouter {
  setRoutingParameter(param: unknown, value: number): void;
  processTransaction(): void;
  delete(): void;
}
interface AvConn {
  displayRoute(): { size(): number; at(i: number): AvPoint };
}
interface Avoid {
  RouterFlag: { OrthogonalRouting: { value: number } };
  RoutingParameter: { shapeBufferDistance: unknown };
  Router: new (flags: number) => AvRouter;
  Point: new (x: number, y: number) => AvPoint;
  Rectangle: new (topLeft: AvPoint, bottomRight: AvPoint) => unknown;
  ShapeRef: new (router: AvRouter, rect: unknown) => unknown;
  ConnEnd: new (point: AvPoint) => unknown;
  ConnRef: new (router: AvRouter, src: unknown, dst: unknown) => AvConn;
}

export class LibavoidRouter implements EdgeRouter {
  readonly name = 'libavoid';
  private avoid: Avoid | null = null;

  async init(): Promise<void> {
    if (this.avoid) return;
    const { AvoidLib } = await import('libavoid-js');
    await AvoidLib.load(); // Node: resolves the bundled libavoid.wasm itself
    this.avoid = AvoidLib.getInstance() as unknown as Avoid;
  }

  route(
    obstacles: RouterObstacle[],
    edges: RouterEdge[],
    options: RouteOptions = {},
  ): RoutedEdge[] {
    const A = this.avoid;
    if (!A) throw new Error('LibavoidRouter.init() must be awaited before route()');
    const margin = options.obstacleMargin ?? DEFAULT_OBSTACLE_MARGIN;
    const orthogonal = A.RouterFlag.OrthogonalRouting.value; // 2
    const byId = new Map(obstacles.map((o) => [o.id, o.box]));

    return edges.map((e) => {
      const sBox = byId.get(e.source);
      const tBox = byId.get(e.target);
      if (!sBox || !tBox) return { id: e.id, points: [] };
      const start = clipToBox(centre(tBox), centre(sBox), sBox);
      const goal = clipToBox(centre(sBox), centre(tBox), tBox);

      const router = new A.Router(orthogonal);
      router.setRoutingParameter(A.RoutingParameter.shapeBufferDistance, margin);
      for (const o of obstacles) {
        if (o.id === e.source || o.id === e.target) continue; // incident → not an obstacle
        const b = o.box;
        new A.ShapeRef(
          router,
          new A.Rectangle(new A.Point(b.x, b.y), new A.Point(b.x + b.w, b.y + b.h)),
        );
      }
      const conn = new A.ConnRef(
        router,
        new A.ConnEnd(new A.Point(start.x, start.y)),
        new A.ConnEnd(new A.Point(goal.x, goal.y)),
      );
      router.processTransaction();
      const rl = conn.displayRoute();
      const points: Pt[] = [];
      for (let i = 0; i < rl.size(); i += 1) {
        const p = rl.at(i);
        points.push({ x: p.x, y: p.y });
      }
      router.delete(); // frees this edge's shapes/connectors
      return { id: e.id, points: points.length >= 2 ? points : [start, goal] };
    });
  }
}
