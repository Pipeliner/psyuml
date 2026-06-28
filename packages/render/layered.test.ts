/**
 * Unit tests for the deterministic layered (Sugiyama) layout (ADR-0049): layer assignment, cycle
 * handling, crossing reduction (the SOTA step the old inline layout lacked), edge-aligned
 * coordinates, separation, and determinism.
 */
import { describe, expect, it } from 'vitest';
import { layeredLayout, type LayeredEdge } from './layered';

const half = () => 10;
const opts = { half, gap: 8 };
const e = (source: string, target: string): LayeredEdge => ({ source, target });

/** Count edge crossings of a laid-out result (inversions over adjacent layer pairs). */
function crossings(layers: string[][], edges: LayeredEdge[]): number {
  let c = 0;
  for (let d = 0; d + 1 < layers.length; d += 1) {
    const idxL = new Map(layers[d + 1].map((id, i) => [id, i]));
    const seq: number[] = [];
    for (const u of layers[d])
      for (const ed of edges)
        if (ed.source === u && idxL.has(ed.target)) seq.push(idxL.get(ed.target)!);
    for (let i = 0; i < seq.length; i += 1)
      for (let k = i + 1; k < seq.length; k += 1) if (seq[i] > seq[k]) c += 1;
  }
  return c;
}

describe('layeredLayout (Sugiyama, ADR-0049)', () => {
  it('longest-path layers a DAG (a transitive edge does not pull a node up)', () => {
    const r = layeredLayout(['a', 'b', 'c'], [e('a', 'b'), e('b', 'c'), e('a', 'c')], opts);
    expect(r.depth.get('a')).toBe(0);
    expect(r.depth.get('b')).toBe(1);
    expect(r.depth.get('c')).toBe(2); // longest path a→b→c, not the a→c shortcut
  });

  it('breaks a cycle (no hang) and still ranks the forward part', () => {
    const r = layeredLayout(['a', 'b', 'c'], [e('a', 'b'), e('b', 'c'), e('c', 'a')], opts);
    expect(r.back.size).toBe(1);
    expect(r.depth.get('a')).toBe(0);
    expect(r.depth.get('c')).toBe(2);
  });

  it('reduces crossings — an X-pattern is reordered to planar (the SOTA step)', () => {
    // a,b on layer 0; c,d on layer 1; a→d and b→c cross under model order [a,b]/[c,d].
    const edges = [e('a', 'd'), e('b', 'c')];
    const r = layeredLayout(['a', 'b', 'c', 'd'], edges, opts);
    expect(crossings(r.layers, edges)).toBe(0);
    // a naïve (model-order) layout of the same graph would have crossed:
    expect(
      crossings(
        [
          ['a', 'b'],
          ['c', 'd'],
        ],
        edges,
      ),
    ).toBe(1);
  });

  it('aligns a straight chain so every node shares an x (edge straightening)', () => {
    const r = layeredLayout(['a', 'b', 'c'], [e('a', 'b'), e('b', 'c')], opts);
    const [xa, xb, xc] = ['a', 'b', 'c'].map((id) => r.x.get(id)!);
    expect(Math.abs(xa - xb)).toBeLessThan(1);
    expect(Math.abs(xb - xc)).toBeLessThan(1);
  });

  it('respects within-layer separation (no node overlap)', () => {
    const r = layeredLayout(['x', 'a', 'b', 'c'], [e('x', 'a'), e('x', 'b'), e('x', 'c')], {
      half: () => 10,
      gap: 8,
    });
    const xs = ['a', 'b', 'c'].map((id) => r.x.get(id)!).sort((p, q) => p - q);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(28 - 0.01); // half+gap+half = 10+8+10
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(28 - 0.01);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(10 - 0.01); // every centre ≥ its half (in-frame)
  });

  it('is deterministic — same input yields identical output', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const edges = [e('a', 'd'), e('b', 'c'), e('a', 'c')];
    const r1 = layeredLayout(ids, edges, opts);
    const r2 = layeredLayout(ids, edges, opts);
    expect(r1.layers).toEqual(r2.layers);
    expect([...r1.x.entries()]).toEqual([...r2.x.entries()]);
  });
});
