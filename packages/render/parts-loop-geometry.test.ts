/**
 * Parts-map label layout (issue #4, ADR-0063) + process-loop geometry (issue #5, ADR-0064).
 *
 * Each `describe` pins one numbered point of an issue as a geometric invariant over the issue's
 * synthetic repro AND every corpus example of that diagram type (both audience layers), so the
 * defect can't silently come back on a different model:
 *
 * parts-map (#4)
 *   1. a barrier edge's own label is drawn (the fixed "dissociative barrier" is only the default);
 *   2. the Self label wraps and stays clear of every part circle;
 *   3. every part's name label lies INSIDE its circle;
 *   4. every containment label sits ON its own edge, nearer to it than to any other edge.
 *
 * process-loop (#5)
 *   1. the loop-closing edge stays on the ring: it never crosses the centre markers, and its label
 *      never sits on them;
 *   2. every arrow starts and ends ON its nodes' outlines (no floating stubs);
 *   3. a resource (exit) diamond holds its label inside;
 *   4. no edge label sits on another edge's line.
 *
 * Synthetic content only. Geometry is reconstructed from the `data-el`-tagged SVG with the same
 * introspection the overlap invariant uses (`introspect.ts`).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { renderLoopMap, renderPartsMap } from '@psyuml/render';
import {
  attrs,
  boxesFromSvg,
  edgeSegments,
  idOf,
  kindOf,
  textBoxesFromSvg,
  textLineBox,
} from './introspect';
import { type Box, overlaps, type Pt, segIntersectsBox } from './layout';
import { loopRepro, partsRepro } from './issue-repros';

const partsReproDefault = partsRepro();
const loopReproModel = loopRepro();

const load = (f: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../../examples/${f}`, import.meta.url), 'utf8'));
const corpus = readdirSync(new URL('../../examples/', import.meta.url))
  .filter((f) => f.endsWith('.psyuml'))
  .map((f) => ({ name: f, model: load(f) }));

const cases = (diagram: string, repro: PsyumlModel): { name: string; model: PsyumlModel }[] => [
  { name: 'issue-repro', model: repro },
  ...corpus.filter((c) => c.model.diagram === diagram),
];
const LAYERS = ['clinician', 'client'] as const;

// ---- geometry helpers ------------------------------------------------------------------------

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Distance from a point to a segment. */
function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}
const distToPoly = (p: Pt, segs: [Pt, Pt][]): number =>
  Math.min(...segs.map(([a, b]) => distToSeg(p, a, b)));

const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const corners = (b: Box): Pt[] => [
  { x: b.x, y: b.y },
  { x: b.x + b.w, y: b.y },
  { x: b.x, y: b.y + b.h },
  { x: b.x + b.w, y: b.y + b.h },
];

/** Undo the renderer's XML escaping so a line is measured by its visible characters. */
const unesc = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

/** Every `<text data-el=…>` as its individual LINE boxes (one per `<tspan>`, or the one line). */
function labelLines(svg: string, el: string): { content: string; box: Box }[] {
  const out: { content: string; box: Box }[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = attrs(m[1]);
    if (a['data-el'] !== el) continue;
    const size = Number(a['font-size'] ?? 11);
    const anchor = a['text-anchor'] ?? 'start';
    const tspans = [...m[2].matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)];
    if (tspans.length) {
      for (const ts of tspans) {
        const ta = attrs(ts[1]);
        out.push({
          content: unesc(ts[2]),
          box: textLineBox(unesc(ts[2]), Number(ta.x), Number(ta.y), size, anchor, ta.textLength),
        });
      }
    } else {
      out.push({
        content: unesc(m[2]),
        box: textLineBox(unesc(m[2]), Number(a.x), Number(a.y), size, anchor, a.textLength),
      });
    }
  }
  return out;
}

/** The outline of each `node:*` shape, so an endpoint can be measured against the real boundary. */
interface Shape {
  id: string;
  kind: 'rect' | 'circle' | 'ellipse' | 'polygon';
  a: Record<string, string>;
}
function shapes(svg: string): Map<string, Shape> {
  const out = new Map<string, Shape>();
  for (const m of svg.matchAll(/<(rect|circle|ellipse|polygon)\b([^>]*?)\/?>/g)) {
    const a = attrs(m[2]);
    const el = a['data-el'];
    if (!el || kindOf(el) !== 'node') continue;
    out.set(idOf(el), { id: idOf(el), kind: m[1] as Shape['kind'], a });
  }
  return out;
}
/** Distance from a point to a node's outline (0 = exactly on it). */
function distToOutline(p: Pt, s: Shape): number {
  const n = (k: string): number => Number(s.a[k]);
  if (s.kind === 'circle') return Math.abs(dist(p, { x: n('cx'), y: n('cy') }) - n('r'));
  if (s.kind === 'ellipse') {
    // Sample the ellipse (exact enough for a 2.5px tolerance).
    let best = Infinity;
    for (let k = 0; k < 360; k += 1) {
      const t = (k * Math.PI) / 180;
      best = Math.min(
        best,
        dist(p, { x: n('cx') + n('rx') * Math.cos(t), y: n('cy') + n('ry') * Math.sin(t) }),
      );
    }
    return best;
  }
  if (s.kind === 'polygon') {
    const pts = (s.a.points ?? '')
      .trim()
      .split(/\s+/)
      .map((pr) => {
        const [x, y] = pr.split(',').map(Number);
        return { x, y };
      });
    return Math.min(...pts.map((q, i) => distToSeg(p, q, pts[(i + 1) % pts.length])));
  }
  const x = n('x');
  const y = n('y');
  const w = n('width');
  const h = n('height');
  return Math.min(
    distToSeg(p, { x, y }, { x: x + w, y }),
    distToSeg(p, { x: x + w, y }, { x: x + w, y: y + h }),
    distToSeg(p, { x, y: y + h }, { x: x + w, y: y + h }),
    distToSeg(p, { x, y }, { x, y: y + h }),
  );
}

// ============================================================================================
// Issue #4 — parts-map label layout
// ============================================================================================

describe('parts-map #4.1: a barrier edge label replaces the fixed default', () => {
  it('the repro prints its own barrier label, not "dissociative barrier"', () => {
    const svg = renderPartsMap(partsReproDefault).svg;
    const lab = textBoxesFromSvg(svg).find((t) => t.el === 'edgelabel:b1');
    expect(lab, 'barrier label is tagged edgelabel:b1').toBeDefined();
    expect(lab!.content).toBe('walls the young part off');
  });

  it('an unlabelled barrier keeps the localized default', () => {
    const m = partsRepro(null);
    const lab = textBoxesFromSvg(renderPartsMap(m).svg).find((t) => t.el === 'edgelabel:b1');
    expect(lab?.content).toBe('dissociative barrier');
    const ru = textBoxesFromSvg(renderPartsMap(m, { lang: 'ru' }).svg).find(
      (t) => t.el === 'edgelabel:b1',
    );
    expect(ru?.content).not.toBe('dissociative barrier');
  });

  it('the barrier label is echoed in the alt text', () => {
    expect(renderPartsMap(partsReproDefault).altText).toContain('walls the young part off');
  });
});

describe.each(cases('parts-map', partsReproDefault))(
  'parts-map geometry — $name',
  ({ name, model }) => {
    for (const layer of LAYERS) {
      const svg = renderPartsMap(model, { layer }).svg;
      const boxes = boxesFromSvg(svg);
      const circles = [...shapes(svg).values()].filter((s) => s.kind === 'circle');
      const self = model.nodes.find((n) => n.kind === 'self');

      it(`#4.2 the Self label wraps and clears every part circle (${layer})`, () => {
        if (!self) return;
        const lines = labelLines(svg, `nodelabel:${self.id}`);
        expect(lines.length).toBeGreaterThan(0);
        for (const ln of lines) {
          for (const c of circles) {
            if (c.id === self.id) continue;
            const r = Number(c.a.r);
            const cb = { x: Number(c.a.cx) - r, y: Number(c.a.cy) - r, w: 2 * r, h: 2 * r };
            expect(
              overlaps(ln.box, cb, -1),
              `${name}/${layer}: Self label line "${ln.content}" runs into part ${c.id}`,
            ).toBe(false);
          }
        }
      });

      it(`#4.3 every part name label lies inside its circle (${layer})`, () => {
        for (const c of circles) {
          if (c.id === self?.id) continue;
          const cx = Number(c.a.cx);
          const cy = Number(c.a.cy);
          const r = Number(c.a.r);
          // The name label is the one centred in the circle (the role tag sits above it, the
          // provenance below it — both outside, by design).
          const inside = labelLines(svg, `nodelabel:${c.id}`).filter(
            (ln) => Math.abs(centre(ln.box).y - cy) < r,
          );
          expect(inside.length, `${name}/${layer}: ${c.id} has a name label`).toBeGreaterThan(0);
          for (const ln of inside) {
            for (const p of corners(ln.box)) {
              expect(
                dist(p, { x: cx, y: cy }),
                `${name}/${layer}: "${ln.content}" pokes out of part ${c.id}`,
              ).toBeLessThanOrEqual(r + 1);
            }
          }
        }
      });

      it(`#4.4 every containment label sits on its own edge (${layer})`, () => {
        const edges = edgeSegments(svg);
        for (const e of model.edges.filter((x) => x.kind === 'containment' && x.label)) {
          const lab = boxes.find((b) => b.el === `edgelabel:${e.id}`);
          expect(lab, `${name}/${layer}: ${e.id} label drawn`).toBeDefined();
          const c = centre(lab!);
          const own = edges.find((x) => x.id === e.id)!;
          const dOwn = distToPoly(c, own.segs);
          expect(dOwn, `${name}/${layer}: ${e.id} label is ${dOwn.toFixed(0)}px off its edge`).toBe(
            Math.min(dOwn, 10),
          );
          for (const other of edges) {
            if (other.id === e.id) continue;
            expect(
              distToPoly(c, other.segs),
              `${name}/${layer}: ${e.id} label is nearer to edge ${other.id} than to its own`,
            ).toBeGreaterThan(dOwn);
          }
        }
      });
    }
  },
);

// ============================================================================================
// Issue #5 — process-loop geometry
// ============================================================================================

describe('process-loop #5.1: the loop-closing edge stays on the ring (issue repro)', () => {
  for (const layer of LAYERS) {
    it(`the return edge runs along the ring, not through the centre (${layer})`, () => {
      const svg = renderLoopMap(loopReproModel, { layer }).svg;
      const badge = boxesFromSvg(svg).find((b) => b.el === 'badge:centre');
      expect(badge, 'the centre markers are tagged badge:centre').toBeDefined();
      const c = centre(badge!);
      const ret = edgeSegments(svg).find((e) => e.id === 'e4')!;
      const s1 = boxesFromSvg(svg).find((b) => b.el === 'node:s1')!;
      const ringR = dist(centre(s1), c);
      // Every point of the return edge stays near the ring radius — it's an arc, not a chord.
      for (const [p] of ret.segs) {
        expect(dist(p, c), `e4 dips to ${dist(p, c).toFixed(0)}px of ${ringR.toFixed(0)}`).toBe(
          Math.max(dist(p, c), ringR * 0.85),
        );
      }
    });
  }
});

describe.each(cases('process-loop', loopReproModel))(
  'process-loop geometry — $name',
  ({ name, model }) => {
    for (const layer of LAYERS) {
      const svg = renderLoopMap(model, { layer }).svg;
      const boxes = boxesFromSvg(svg);
      const edges = edgeSegments(svg);
      const shp = shapes(svg);
      const labels = boxes.filter((b) => kindOf(b.el) === 'edgelabel');

      it(`#5.1 no edge or edge label crosses the centre markers (${layer})`, () => {
        const badge = boxes.find((b) => b.el === 'badge:centre');
        if (!badge) return; // no loop / topology marker on this model
        for (const e of edges) {
          for (const [p, q] of e.segs) {
            expect(
              segIntersectsBox(p, q, badge, -1),
              `${name}/${layer}: edge ${e.id} crosses the centre markers`,
            ).toBe(false);
          }
        }
        for (const l of labels) {
          expect(
            overlaps(l, badge, -1),
            `${name}/${layer}: ${l.el} sits on the centre markers`,
          ).toBe(false);
        }
      });

      it(`#5.2 every arrow touches its source and target outlines (${layer})`, () => {
        for (const e of model.edges) {
          const drawn = edges.find((x) => x.id === e.id);
          if (!drawn || !drawn.segs.length) continue;
          const start = drawn.segs[0][0];
          const end = drawn.segs[drawn.segs.length - 1][1];
          const s = shp.get(e.source)!;
          const t = shp.get(e.target)!;
          expect(
            distToOutline(start, s),
            `${name}/${layer}: ${e.id} starts ${distToOutline(start, s).toFixed(1)}px off ${e.source}`,
          ).toBeLessThanOrEqual(2.5);
          expect(
            distToOutline(end, t),
            `${name}/${layer}: ${e.id} ends ${distToOutline(end, t).toFixed(1)}px off ${e.target}`,
          ).toBeLessThanOrEqual(2.5);
        }
      });

      it(`#5.3 a resource diamond holds its label inside (${layer})`, () => {
        for (const node of model.nodes.filter((n) => n.kind === 'resource')) {
          const d = shp.get(node.id);
          expect(d?.kind, `${name}/${layer}: ${node.id} is a diamond`).toBe('polygon');
          const pts = d!.a.points
            .trim()
            .split(/\s+/)
            .map((pr) => pr.split(',').map(Number));
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const hw = (Math.max(...xs) - Math.min(...xs)) / 2;
          const hh = (Math.max(...ys) - Math.min(...ys)) / 2;
          const lines = labelLines(svg, `nodelabel:${node.id}`);
          expect(lines.length).toBeGreaterThan(0);
          for (const ln of lines) {
            for (const p of corners(ln.box)) {
              expect(
                Math.abs(p.x - cx) / hw + Math.abs(p.y - cy) / hh,
                `${name}/${layer}: "${ln.content}" is not inside the ${node.id} diamond`,
              ).toBeLessThanOrEqual(1.02);
            }
          }
        }
      });

      it(`#5.4 no edge label sits on another edge's line (${layer})`, () => {
        for (const l of labels) {
          for (const e of edges) {
            if (e.id === idOf(l.el)) continue;
            for (const [p, q] of e.segs) {
              expect(
                segIntersectsBox(p, q, l, -1),
                `${name}/${layer}: ${l.el} sits on edge ${e.id}`,
              ).toBe(false);
            }
          }
        }
      });
    }
  },
);
