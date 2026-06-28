/**
 * Deterministic layered (Sugiyama) graph layout — the SOTA pipeline for directed/flow diagrams,
 * implemented dependency-free and golden-stable (ADR-0049).
 *
 * The four classic Sugiyama steps (see docs/research/layout-algorithms.md, Angle 4):
 *   1. cycle removal      — DFS back-edge classification, layer the forward DAG only;
 *   2. layer assignment   — longest-path ranking;
 *   3. crossing reduction — the median heuristic (Eades–Wei) + adjacent-transpose, the step the old
 *                           inline decision-nav layout SKIPPED (it ordered nodes by model order);
 *   4. coordinate assign  — median-aligned x (straighten edges) with separation enforced by the
 *                           1-D VPSC core `separate1D` (order-preserving, minimal-displacement).
 *
 * Determinism: every tie is broken by the node's ORIGINAL index, sorts are stable, sweeps are a
 * fixed count — so the same graph always yields the same layout (required for golden tests; the
 * research flags stochastic force-layout as unfit here). Honest scope: long edges spanning >1 layer
 * are connected endpoint-to-endpoint (no dummy-node chains), so crossing counts over multi-layer
 * edges are approximate; step 4 is a median/priority method, not full Brandes–Köpf (the gold-standard
 * coordinate step, named in the research as the future upgrade) — both noted in ADR-0049.
 */
import { separate1D } from './layout';

export interface LayeredEdge {
  source: string;
  target: string;
}

export interface LayeredOptions {
  /** Half-width (x-extent from centre) reserved for a node, so siblings never collide. */
  half: (id: string) => number;
  /** Minimum gap between adjacent nodes in a layer. */
  gap: number;
  /** Crossing-reduction sweeps (down+up counts as one); default 4. */
  sweeps?: number;
}

export interface LayeredResult {
  /** Longest-path layer (rank) of every node. */
  depth: Map<string, number>;
  /** Nodes per layer, in crossing-minimised left-to-right order. */
  layers: string[][];
  /** Assigned x-centre of every node (≥ its half; left-aligned to 0). */
  x: Map<string, number>;
  /** The edges classified as back-edges (point "up" — a cycle was broken here). */
  back: Set<LayeredEdge>;
}

/**
 * Step 1+2: break cycles (DFS back-edges) and longest-path layer the forward DAG. A cycle would
 * leave its nodes with in-degree>0 forever and collapse the rank; classifying edges that reach a
 * node still on the DFS stack as back-edges and ranking the rest is the standard handling.
 */
function rank(
  nodeIds: string[],
  edges: LayeredEdge[],
): { depth: Map<string, number>; back: Set<LayeredEdge> } {
  const adj = new Map<string, LayeredEdge[]>(nodeIds.map((id) => [id, []]));
  const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    adj.get(e.source)!.push(e);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const back = new Set<LayeredEdge>();
  const state = new Map<string, 0 | 1 | 2>(); // 0 unseen · 1 on-stack · 2 done
  const visit = (start: string): void => {
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    state.set(start, 1);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const out = adj.get(frame.id) ?? [];
      if (frame.i < out.length) {
        const e = out[frame.i];
        frame.i += 1;
        const s = state.get(e.target) ?? 0;
        if (s === 1) back.add(e);
        else if (s === 0) {
          state.set(e.target, 1);
          stack.push({ id: e.target, i: 0 });
        }
      } else {
        state.set(frame.id, 2);
        stack.pop();
      }
    }
  };
  const roots = nodeIds.filter((id) => (indeg.get(id) ?? 0) === 0);
  for (const id of roots.length ? roots : nodeIds.slice(0, 1))
    if ((state.get(id) ?? 0) === 0) visit(id);
  for (const id of nodeIds) if ((state.get(id) ?? 0) === 0) visit(id); // separate components

  const fAdj = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const fIndeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const e of edges) {
    if (back.has(e) || !fAdj.has(e.source) || !fAdj.has(e.target)) continue;
    fAdj.get(e.source)!.push(e.target);
    fIndeg.set(e.target, (fIndeg.get(e.target) ?? 0) + 1);
  }
  const depth = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const work = new Map(fIndeg);
  const queue = nodeIds.filter((id) => (fIndeg.get(id) ?? 0) === 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const t of fAdj.get(id) ?? []) {
      depth.set(t, Math.max(depth.get(t) ?? 0, (depth.get(id) ?? 0) + 1));
      work.set(t, (work.get(t) ?? 0) - 1);
      if ((work.get(t) ?? 0) === 0) queue.push(t);
    }
  }
  return { depth, back };
}

/** The median of a sorted-ascending number list (lower median for even counts; -1 if empty — the
 * standard "leave the node where it is" sentinel). */
function median(sorted: number[]): number {
  if (!sorted.length) return -1;
  const m = Math.floor((sorted.length - 1) / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m] + sorted[m + 1]) / 2;
}

/** Crossings between two adjacent layers, counting edge-pair inversions over the upper order and the
 * lower index map (downward adjacency captures every inter-layer edge from the upper side). */
function layerCrossings(
  upper: string[],
  nbr: Map<string, string[]>,
  idxLower: Map<string, number>,
): number {
  const seq: number[] = [];
  for (const u of upper)
    for (const v of nbr.get(u) ?? []) {
      const j = idxLower.get(v);
      if (j !== undefined) seq.push(j);
    }
  let c = 0;
  for (let i = 0; i < seq.length; i += 1)
    for (let k = i + 1; k < seq.length; k += 1) if (seq[i] > seq[k]) c += 1;
  return c;
}

/** Total crossings over all adjacent layer pairs (uses downward adjacency). */
function totalCrossings(layers: string[][], down: Map<string, string[]>): number {
  let total = 0;
  for (let d = 0; d + 1 < layers.length; d += 1) {
    const idx = new Map(layers[d + 1].map((id, i) => [id, i]));
    total += layerCrossings(layers[d], down, idx);
  }
  return total;
}

/**
 * The full pipeline. Returns layer ranks, crossing-minimised per-layer order, and aligned x-centres.
 */
export function layeredLayout(
  nodeIds: string[],
  edges: LayeredEdge[],
  opts: LayeredOptions,
): LayeredResult {
  const { half, gap } = opts;
  const sweeps = opts.sweeps ?? 4;
  const { depth, back } = rank(nodeIds, edges);

  // Forward (non-back) edges as up/down adjacency for ordering + coordinates.
  const down = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const up = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  for (const e of edges) {
    if (back.has(e)) continue;
    if ((depth.get(e.source) ?? 0) === (depth.get(e.target) ?? 0)) continue; // same-rank: not cross-layer
    down.get(e.source)?.push(e.target);
    up.get(e.target)?.push(e.source);
  }

  // Initial order: by original index within each rank (deterministic, mirrors the old model order).
  const maxDepth = Math.max(0, ...nodeIds.map((id) => depth.get(id) ?? 0));
  let layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const id of nodeIds) layers[depth.get(id) ?? 0].push(id);

  // Step 3 — crossing reduction: median heuristic sweeps, keep the best order seen; then transpose.
  const orderByMedian = (layer: string[], nbr: Map<string, string[]>, ref: Map<string, number>) => {
    const keyed = layer.map((id) => {
      const ps = (nbr.get(id) ?? [])
        .map((n) => ref.get(n))
        .filter((p): p is number => p !== undefined)
        .sort((a, b) => a - b);
      return { id, med: median(ps) };
    });
    // nodes with no neighbour (med -1) keep their current relative position (stable sort, fixed key)
    keyed.forEach((k, i) => {
      if (k.med < 0) k.med = i;
    });
    return keyed
      .map((k, i) => ({ ...k, i }))
      .sort((a, b) => a.med - b.med || a.i - b.i)
      .map((k) => k.id);
  };
  let best = layers.map((l) => [...l]);
  let bestCross = totalCrossings(layers, down);
  for (let s = 0; s < sweeps; s += 1) {
    const downSweep = s % 2 === 0;
    if (downSweep)
      for (let d = 1; d <= maxDepth; d += 1) {
        const ref = new Map(layers[d - 1].map((id, i) => [id, i]));
        layers[d] = orderByMedian(layers[d], up, ref);
      }
    else
      for (let d = maxDepth - 1; d >= 0; d -= 1) {
        const ref = new Map(layers[d + 1].map((id, i) => [id, i]));
        layers[d] = orderByMedian(layers[d], down, ref);
      }
    transpose(layers, down);
    const c = totalCrossings(layers, down);
    if (c < bestCross) {
      bestCross = c;
      best = layers.map((l) => [...l]);
    }
  }
  layers = best;

  // Step 4 — coordinate assignment: median-aligned x with separation via the VPSC 1-D core. Pack
  // each layer, then sweep down+up pulling each node toward the median x of its neighbours, with
  // `separate1D` restoring order + gap at minimal displacement. Deterministic, straightens edges.
  const x = new Map<string, number>();
  for (const layer of layers) {
    let cur = 0;
    for (const id of layer) {
      cur += half(id);
      x.set(id, cur);
      cur += half(id) + gap;
    }
  }
  const align = (layer: string[], nbr: Map<string, string[]>) => {
    const desired = layer.map((id) => {
      const ns = (nbr.get(id) ?? []).map((n) => x.get(n)!).filter((v) => v !== undefined);
      return ns.length ? median([...ns].sort((a, b) => a - b)) : x.get(id)!;
    });
    const sep = separate1D(
      layer.map((id, i) => ({ center: desired[i], half: half(id) })),
      gap,
    );
    layer.forEach((id, i) => x.set(id, sep[i]));
  };
  for (let s = 0; s < sweeps; s += 1) {
    if (s % 2 === 0) for (let d = 1; d <= maxDepth; d += 1) align(layers[d], up);
    else for (let d = maxDepth - 1; d >= 0; d -= 1) align(layers[d], down);
  }
  // Left-align so the smallest (centre − half) sits at 0.
  let minLeft = Infinity;
  for (const [id, cx] of x) minLeft = Math.min(minLeft, cx - half(id));
  if (Number.isFinite(minLeft)) for (const [id, cx] of x) x.set(id, cx - minLeft);

  return { depth, layers, x, back };
}

/** Adjacent-transpose improvement: swap neighbours in a layer while it lowers total crossings. */
function transpose(layers: string[][], down: Map<string, string[]>): void {
  let improved = true;
  let guard = 0;
  while (improved && guard < 8) {
    improved = false;
    guard += 1;
    for (let d = 0; d < layers.length; d += 1) {
      const layer = layers[d];
      for (let i = 0; i + 1 < layer.length; i += 1) {
        const before = localCrossings(layers, d, down);
        [layer[i], layer[i + 1]] = [layer[i + 1], layer[i]];
        const after = localCrossings(layers, d, down);
        if (after < before) improved = true;
        else [layer[i], layer[i + 1]] = [layer[i + 1], layer[i]]; // revert (≥ keeps determinism)
      }
    }
  }
}

/** Crossings on the layer-pairs touching layer d (above + below); downward adjacency suffices. */
function localCrossings(layers: string[][], d: number, down: Map<string, string[]>): number {
  let c = 0;
  if (d > 0) {
    const idx = new Map(layers[d].map((id, i) => [id, i]));
    c += layerCrossings(layers[d - 1], down, idx);
  }
  if (d + 1 < layers.length) {
    const idx = new Map(layers[d + 1].map((id, i) => [id, i]));
    c += layerCrossings(layers[d], down, idx);
  }
  return c;
}

export { totalCrossings as _totalCrossings };
