/**
 * The `EdgeRouter` contract (ADR-0023), held identically by BOTH backends (bespoke grid-A* and the
 * libavoid WASM port): every routed edge avoids every non-incident node box (edge–vertex resolution
 * > 0, the same property `layout-quality.test.ts` asserts on rendered SVGs), connects its endpoints
 * to the source/target boxes, and is deterministic. Proving both against one contract is what makes
 * them swappable (the whole point of the interface).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { type Box, segIntersectsBox } from './layout';
import { type EdgeRouter, type RouterObstacle, type RouterEdge } from './router';
import { BespokeRouter } from './router-bespoke';
import { LibavoidRouter } from './router-libavoid';

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const grow = (b: Box, m: number): Box => ({
  x: b.x - m,
  y: b.y - m,
  w: b.w + 2 * m,
  h: b.h + 2 * m,
});

/** Assert every edge's polyline clears every NON-incident obstacle box (the core invariant). */
function assertClears(
  router: EdgeRouter,
  obstacles: RouterObstacle[],
  edges: RouterEdge[],
  margin = 8,
): void {
  const byId = new Map(obstacles.map((o) => [o.id, o]));
  const routed = router.route(obstacles, edges, { obstacleMargin: margin });
  for (const r of routed) {
    const e = edges.find((x) => x.id === r.id)!;
    expect(r.points.length, `${router.name}/${r.id}: a route was produced`).toBeGreaterThanOrEqual(
      2,
    );
    for (const o of obstacles) {
      if (o.id === e.source || o.id === e.target) continue;
      for (let i = 0; i < r.points.length - 1; i += 1) {
        expect(
          segIntersectsBox(r.points[i], r.points[i + 1], o.box, -0.5),
          `${router.name}: edge ${r.id} (${e.source}->${e.target}) passes through node ${o.id}`,
        ).toBe(false);
      }
    }
    // endpoints connect to source/target (within margin + slop of their boxes)
    const s = byId.get(e.source)!.box;
    const t = byId.get(e.target)!.box;
    expect(segIntersectsBox(r.points[0], r.points[0], grow(s, margin + 3))).toBe(true);
    expect(
      segIntersectsBox(
        r.points[r.points.length - 1],
        r.points[r.points.length - 1],
        grow(t, margin + 3),
      ),
    ).toBe(true);
  }
}

const ROUTERS: EdgeRouter[] = [new BespokeRouter(), new LibavoidRouter()];

describe.each(ROUTERS)('EdgeRouter contract — $name', (router) => {
  beforeAll(async () => {
    await router.init?.();
  });

  it('routes a straight shot when nothing is in the way', () => {
    const obstacles = [
      { id: 'a', box: box(0, 0, 40, 40) },
      { id: 'b', box: box(200, 0, 40, 40) },
    ];
    assertClears(router, obstacles, [{ id: 'e', source: 'a', target: 'b' }]);
  });

  it('detours around a node placed directly between source and target', () => {
    const obstacles = [
      { id: 'a', box: box(0, 0, 40, 40) },
      { id: 'mid', box: box(100, 0, 40, 40) }, // squarely on the a→b line
      { id: 'b', box: box(200, 0, 40, 40) },
    ];
    assertClears(router, obstacles, [{ id: 'e', source: 'a', target: 'b' }]);
  });

  it('reconstructed gap: a 3-node band, edge skips the middle node (state-map style)', () => {
    // three nodes in one horizontal band; the edge from the first to the third must clear the second
    const obstacles = [
      { id: 'n1', box: box(0, 100, 90, 40) },
      { id: 'n2', box: box(140, 100, 90, 40) },
      { id: 'n3', box: box(280, 100, 90, 40) },
      { id: 'n4', box: box(140, 220, 90, 40) },
    ];
    const edges = [
      { id: 'e13', source: 'n1', target: 'n3' }, // must avoid n2
      { id: 'e14', source: 'n1', target: 'n4' }, // diagonal, must avoid n2
    ];
    assertClears(router, obstacles, edges);
  });

  it('is deterministic — identical input yields identical output', () => {
    const obstacles = [
      { id: 'a', box: box(0, 0, 40, 40) },
      { id: 'mid', box: box(100, 0, 40, 40) },
      { id: 'b', box: box(200, 0, 40, 40) },
    ];
    const edges = [{ id: 'e', source: 'a', target: 'b' }];
    const r1 = router.route(obstacles, edges, { obstacleMargin: 8 });
    const r2 = router.route(obstacles, edges, { obstacleMargin: 8 });
    expect(r1).toEqual(r2);
  });
});
