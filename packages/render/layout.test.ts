/**
 * Unit tests for the shared geometry layer (ADR-0012): the text metric, AABB helpers, and the
 * `separate1D` VPSC / Fast-Node-Overlap-Removal core. The overlap *invariant* (overlap.test.ts)
 * leans on these being correct, so we pin them directly here.
 */
import { describe, expect, it } from 'vitest';
import {
  CHAR_W,
  clipToBox,
  contains,
  overlaps,
  segIntersectsBox,
  separate1D,
  textWidth,
  union,
  type Span1D,
} from './layout';

describe('textWidth', () => {
  it('is length × size × CHAR_W (the one shared metric)', () => {
    expect(textWidth('abcd', 10)).toBeCloseTo(4 * 10 * CHAR_W);
    expect(textWidth('', 12)).toBe(0);
  });
});

describe('contains (label-in-box, ADR-0021)', () => {
  const box = { x: 0, y: 0, w: 100, h: 40 };
  it('accepts an inner box, rejects one that pokes out on any side', () => {
    expect(contains(box, { x: 10, y: 10, w: 50, h: 10 })).toBe(true);
    expect(contains(box, { x: -5, y: 10, w: 20, h: 10 })).toBe(false); // left
    expect(contains(box, { x: 90, y: 10, w: 20, h: 10 })).toBe(false); // right
    expect(contains(box, { x: 10, y: 35, w: 20, h: 20 })).toBe(false); // bottom
  });
  it('tolerates a poke within `slop`', () => {
    expect(contains(box, { x: 98, y: 10, w: 4, h: 10 })).toBe(false); // 2px over right
    expect(contains(box, { x: 98, y: 10, w: 4, h: 10 }, 3)).toBe(true); // within 3px slop
  });
});

describe('segIntersectsBox (edge↔node, ADR-0021)', () => {
  const box = { x: 100, y: 100, w: 100, h: 100 }; // [100..200] x [100..200]
  it('detects a segment passing straight through', () => {
    expect(segIntersectsBox({ x: 0, y: 150 }, { x: 300, y: 150 }, box)).toBe(true);
  });
  it('detects a segment with one endpoint inside', () => {
    expect(segIntersectsBox({ x: 150, y: 150 }, { x: 300, y: 150 }, box)).toBe(true);
  });
  it('detects a segment fully inside', () => {
    expect(segIntersectsBox({ x: 120, y: 120 }, { x: 180, y: 180 }, box)).toBe(true);
  });
  it('misses a segment that clears the box', () => {
    expect(segIntersectsBox({ x: 0, y: 0 }, { x: 50, y: 300 }, box)).toBe(false);
    expect(segIntersectsBox({ x: 0, y: 250 }, { x: 300, y: 250 }, box)).toBe(false);
  });
  it('a grazing/touching edge is excluded by a negative pad (the EDGE_SLOP convention)', () => {
    // a segment running exactly along the top border at y=100 touches but should not count
    expect(segIntersectsBox({ x: 0, y: 100 }, { x: 300, y: 100 }, box, -1)).toBe(false);
    // …while a clear 2px penetration still counts
    expect(segIntersectsBox({ x: 0, y: 102 }, { x: 300, y: 102 }, box, -1)).toBe(true);
  });
});

describe('clipToBox (boundary clipping, ADR-0021)', () => {
  const box = { x: 100, y: 100, w: 100, h: 100 };
  it('stops the segment on the box boundary nearest `to`', () => {
    const p = clipToBox({ x: 0, y: 150 }, { x: 150, y: 150 }, box); // into the box from the left
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(150);
  });
  it('leaves a segment that never reaches the box unchanged', () => {
    const to = { x: 50, y: 150 };
    expect(clipToBox({ x: 0, y: 150 }, to, box)).toEqual(to);
  });
});

describe('overlaps', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  it('detects a clear overlap and a clear miss', () => {
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('treats mere touching as non-overlap with a small negative pad (slop)', () => {
    const touching = { x: 10, y: 0, w: 10, h: 10 };
    expect(overlaps(a, touching)).toBe(false); // share an edge → not overlapping
    expect(overlaps(a, { x: 9.5, y: 0, w: 10, h: 10 }, -1)).toBe(false); // 0.5px overlap < 1px slop
    expect(overlaps(a, { x: 8, y: 0, w: 10, h: 10 }, -1)).toBe(true); // 2px overlap > 1px slop
  });
});

describe('union', () => {
  it('is the empty box for no inputs', () => {
    expect(union([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
  it('is the bounding box of all inputs', () => {
    expect(
      union([
        { x: 0, y: 0, w: 10, h: 5 },
        { x: 20, y: -3, w: 4, h: 4 },
      ]),
    ).toEqual({
      x: 0,
      y: -3,
      w: 24,
      h: 8,
    });
  });
});

/** Deterministic LCG so the random property test is reproducible. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe('separate1D (VPSC / Fast Node Overlap Removal, 1-D)', () => {
  it('returns inputs unchanged for 0 or 1 items', () => {
    expect(separate1D([], 5)).toEqual([]);
    expect(separate1D([{ center: 42, half: 3 }], 5)).toEqual([42]);
  });

  it('leaves already-spaced items exactly where they were', () => {
    const items: Span1D[] = [
      { center: 0, half: 5 },
      { center: 100, half: 5 },
      { center: 200, half: 5 },
    ];
    expect(separate1D(items, 4)).toEqual([0, 100, 200]);
  });

  it('is deterministic (same input → same output)', () => {
    const items: Span1D[] = [
      { center: 0, half: 10 },
      { center: 5, half: 10 },
      { center: 40, half: 5 },
    ];
    expect(separate1D(items, 4)).toEqual(separate1D(items, 4));
  });

  it('over many random cases: no residual overlap, order preserved, mean within bounds', () => {
    const rnd = lcg(1234);
    for (let trial = 0; trial < 5000; trial += 1) {
      const n = 1 + Math.floor(rnd() * 8);
      const items: Span1D[] = [];
      let c = 0;
      for (let i = 0; i < n; i += 1) {
        c += rnd() * 60;
        items.push({ center: c, half: 4 + rnd() * 30 });
      }
      const gap = rnd() * 20;
      const out = separate1D(items, gap);

      for (let i = 1; i < n; i += 1) {
        // (1) no residual overlap: consecutive centres are >= sum of halves + gap
        const need = items[i - 1].half + items[i].half + gap;
        expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(need - 1e-6);
        // (2) order preserved
        expect(out[i]).toBeGreaterThanOrEqual(out[i - 1] - 1e-9);
      }

      // (3) minimal-ish, balanced movement: the output block's mean stays inside the original
      // centre range (the algorithm spreads symmetrically, never runs away to one side).
      const meanOut = out.reduce((s, v) => s + v, 0) / n;
      const lo = Math.min(...items.map((it) => it.center));
      const hi = Math.max(...items.map((it) => it.center));
      const totalHalf = items.reduce((s, it) => s + it.half, 0) + (n - 1) * gap;
      expect(meanOut).toBeGreaterThanOrEqual(lo - totalHalf);
      expect(meanOut).toBeLessThanOrEqual(hi + totalHalf);
    }
  });
});
