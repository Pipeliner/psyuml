/**
 * Layout-quality invariants (ADR-0021) — the machine-checked geometric contract that goes beyond
 * non-overlap (ADR-0012):
 *
 *   A. CONTAINMENT — a node's text label is drawn INSIDE its node box ("inner text always fits its
 *      container"). Primitive: AABB-in-AABB containment (`contains`). Grounded in the deep-research
 *      Angle-5 metric "label-in-node"; the renderers guarantee it by compressing long labels to the
 *      box width via SVG `textLength` (`fitText`/`wrapLabel`), which `introspect` honours.
 *
 *   B. EDGE↔NODE — an edge never passes THROUGH a non-incident node ("arrows don't intersect
 *      nodes"); formally edge–vertex resolution > 0 (Angle-5). Primitive: segment–rectangle
 *      intersection (`segIntersectsBox`) over the edge's flattened polyline vs every node that is
 *      not its source/target.
 *
 * HONEST SCOPE (deep-research Angle-2 + ADR-0021): a *universal* zero-edge–node guarantee needs an
 * obstacle-avoiding router (visibility-graph / libavoid-class), which is disproportionate for a
 * small dependency-free renderer. So B is ENFORCED for the renderers whose deterministic layout
 * reserves clear channels, and the few renderer-routing cases that cannot meet it without such a
 * router are a documented gap (`EDGE_NODE_KNOWN_GAP`) — the same honesty ADR-0012 used for
 * label↔label. A is ENFORCED for label-in-box renderers; label-beside/below designs rely on the
 * overlap guards (#2 label↔non-owner-node, #4 in-frame) instead.
 *
 * Traceability: REQ-LAYOUT-QUALITY, REQ-ACCESSIBILITY, REQ-NOTATION (§D), REQ-CONFORMANCE (§J).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import * as render from '@psyuml/render';
import { contains, overlaps, segIntersectsBox } from './layout';
import { boxesFromSvg, edgeSegments, idOf, kindOf } from './introspect';

type Renderer = (m: PsyumlModel, o?: { layer?: 'clinician' | 'client' }) => { svg: string };
const RENDERERS: Record<string, Renderer> = {
  'state-map': render.renderStateMap,
  'parts-map': render.renderPartsMap,
  'mode-map': render.renderModeMap,
  'relational-field': render.renderRelationalField,
  'body-map': render.renderBodyMap,
  'process-loop': render.renderLoopMap,
  timeline: render.renderTimeline,
  'intervention-sequence': render.renderInterventionSeq,
  ritual: render.renderRitual,
  'decision-nav': render.renderDecisionChart,
  'resource-anchor': render.renderResourceMap,
  'two-triangles': render.renderTwoTriangles,
  ladder: render.renderLadder,
  'three-circles': render.renderThreeCircles,
  venn: render.renderVenn,
  bullseye: render.renderBullseye,
  'tree-of-life': render.renderTreeOfLife,
  'schema-grid': render.renderSchemaGrid,
  'decisional-balance': render.renderDecisionalBalance,
  'secure-base': render.renderSecureBase,
};
const load = (f: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../../examples/${f}`, import.meta.url), 'utf8'));
const files = readdirSync(new URL('../../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);

/** Containment tolerance: the shared `textWidth` metric (~0.58em/char) does not model bold weight
 * or sub-pixel glyph advances, so allow a few px before a label counts as escaping its box — the
 * "safety margin" the text-fitting research recommends. Real overflow (an uncompressed long label)
 * spills 10–48px, far above this, so it is still caught. */
const CONTAIN_SLOP = 3;
/** Edge↔node tolerance: shrink each node box by 1px so an edge merely grazing a border (or its own
 * boundary-clipped endpoint) is not counted as passing THROUGH the node. */
const EDGE_SLOP = 1;

/** Renderers whose node labels are drawn INSIDE the node box (containment applies). The rest draw
 * the label beside/below the glyph by design (body-map markers, relational-field genogram symbols,
 * parts-map circles, mode-map glyphs, resource-anchor chips). */
const LABEL_IN_BOX = new Set([
  'state-map',
  'timeline',
  'intervention-sequence',
  'ritual',
  'two-triangles',
  'decision-nav',
  'process-loop',
  'ladder',
  'three-circles',
  'schema-grid',
]);

/** Is point (cx,cy) inside box `b`? An INTERIOR label has its centre in its node box; a CAPTION
 * (drawn beside/below the glyph by design — the observing-eye eye, the crisis-resources line) has
 * its centre outside it, and is not subject to the containment check. */
const centreInside = (
  b: { x: number; y: number; w: number; h: number },
  cx: number,
  cy: number,
): boolean => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;

/** Renderers where a renderer-routed straight edge could cross a non-incident node. Now EMPTY:
 * every renderer that routed edges through channels/lanes (ritual, decision-nav, state-map) wires
 * the bespoke `EdgeRouter` (ADR-0024) to detour any crossing edge around the obstacle; the rest are
 * columnar/ring/hand-placed and clear by construction. So edge↔node is ENFORCED for EVERY tagged-
 * edge renderer (REQ-EDGE-ROUTER). Kept as the documented hook should a future renderer need it. */
const EDGE_NODE_KNOWN_GAP = new Set<string>();

/** Renderers where a node's OUTSIDE caption (centre beyond the node) is allowed to graze its own
 * node border — the documented gap for invariant C (ADR-0046). Now EMPTY: `decision-nav`'s crisis-
 * resources caption used to sit tight under the thick-bordered crisis node, but `wrapLabel` centres
 * its block, so a fixed offset rode the TOP line up under the border when the caption wrapped to 3
 * lines; shifting the block down by half its height (ADR-0050 follow-up) clears the border for every
 * line count, with room to spare (the depth-2 boxes are at the centre/right lanes, not below the
 * left crisis node). Every renderer now keeps its captions fully clear — invariant C is universal. */
const CAPTION_BISECT_KNOWN_GAP = new Set<string>();

describe('layout-quality A: a node label fits inside its container (ADR-0021)', () => {
  const inBox = files.filter((f) => LABEL_IN_BOX.has(load(f).diagram));
  describe.each(inBox)('%s', (f) => {
    const model = load(f);
    for (const layer of ['clinician', 'client'] as const) {
      it(`every interior node label is within its node box (${layer})`, () => {
        const all = boxesFromSvg(RENDERERS[model.diagram](model, { layer }).svg);
        const nodes = new Map(
          all.filter((b) => kindOf(b.el) === 'node').map((b) => [idOf(b.el), b]),
        );
        const labels = all.filter((b) => kindOf(b.el) === 'nodelabel');
        let checked = 0;
        for (const lab of labels) {
          const owner = nodes.get(idOf(lab.el));
          if (!owner) continue;
          // only INTERIOR labels (centre inside the node) are subject to containment; captions
          // drawn beside/below the glyph by design are skipped.
          if (!centreInside(owner, lab.x + lab.w / 2, lab.y + lab.h / 2)) continue;
          checked += 1;
          expect(
            contains(owner, lab, CONTAIN_SLOP),
            `${f}/${layer}: label ${lab.el} escapes its node box ` +
              `(label right ${(lab.x + lab.w).toFixed(1)} vs box right ${(owner.x + owner.w).toFixed(1)})`,
          ).toBe(true);
        }
        expect(checked, `${f}/${layer}: no interior node labels checked`).toBeGreaterThan(0);
      });
    }
  });
});

describe('layout-quality B: an edge never crosses a non-incident node (ADR-0021)', () => {
  const enforced = files.filter((f) => !EDGE_NODE_KNOWN_GAP.has(load(f).diagram));
  describe.each(enforced)('%s', (f) => {
    const model = load(f);
    const incident = new Map(model.edges.map((e) => [e.id, [e.source, e.target]] as const));
    for (const layer of ['clinician', 'client'] as const) {
      it(`no edge segment passes through a non-incident node (${layer})`, () => {
        const svg = RENDERERS[model.diagram](model, { layer }).svg;
        const nodes = boxesFromSvg(svg).filter((b) => kindOf(b.el) === 'node');
        for (const e of edgeSegments(svg)) {
          const [src, tgt] = incident.get(e.id) ?? ['', ''];
          for (const nb of nodes) {
            const nid = idOf(nb.el);
            if (nid === src || nid === tgt) continue;
            for (const [p, q] of e.segs) {
              expect(
                segIntersectsBox(p, q, nb, -EDGE_SLOP),
                `${f}/${layer}: edge ${e.id} (${src}->${tgt}) passes through node ${nid}`,
              ).toBe(false);
            }
          }
        }
      });
    }
  });
});

describe('layout-quality C: a node caption is not bisected by its own border (ADR-0046)', () => {
  // Companion to A (interior labels fit) for the OTHER containment defect: a caption whose centre is
  // OUTSIDE its node must also be DISJOINT from it — a node border cutting through its own caption
  // (the mode-map name overflowing its dominance circle; a box bisecting its crisis caption) is a
  // clipping defect. Interior labels (centre inside) are A's job and are skipped here.
  const enforced = files.filter((f) => !CAPTION_BISECT_KNOWN_GAP.has(load(f).diagram));
  describe.each(enforced)('%s', (f) => {
    const model = load(f);
    for (const layer of ['clinician', 'client'] as const) {
      it(`every node caption is clear of its node border (${layer})`, () => {
        const all = boxesFromSvg(RENDERERS[model.diagram](model, { layer }).svg);
        const nodes = new Map(
          all.filter((b) => kindOf(b.el) === 'node').map((b) => [idOf(b.el), b]),
        );
        for (const lab of all.filter((b) => kindOf(b.el) === 'nodelabel')) {
          const owner = nodes.get(idOf(lab.el));
          if (!owner) continue;
          // only OUTSIDE captions (centre beyond the node) are checked here; interior labels are A's.
          if (centreInside(owner, lab.x + lab.w / 2, lab.y + lab.h / 2)) continue;
          expect(
            overlaps(owner, lab, -CONTAIN_SLOP),
            `${f}/${layer}: caption ${lab.el} is bisected by its own node border`,
          ).toBe(false);
        }
      });
    }
  });
});

describe('layout-quality: the corpus actually exercises both invariants', () => {
  it('covers label-in-box renderers and edges are machine-readable (data-el tagged)', () => {
    const diagrams = new Set(files.map((f) => load(f).diagram));
    expect([...diagrams].some((d) => LABEL_IN_BOX.has(d))).toBe(true);
    // an enforced edge↔node renderer renders tagged edges the test can read
    const f = files.find((x) => load(x).diagram === 'intervention-sequence')!;
    const model = load(f);
    expect(edgeSegments(RENDERERS[model.diagram](model).svg).length).toBeGreaterThan(0);
  });
});

describe('layout-quality D: the loop-map ring is horizontally centred (ADR-0054)', () => {
  // A process-loop is a content-fit RING, centred by construction. Its title now WRAPS within the
  // content width and never widens the frame — an earlier title-growth left the ring off-centre with
  // a big empty right margin (a real lopsidedness a visual audit caught). This guards that the ring
  // node bbox stays centred in the frame, so re-growing the frame for chrome can't recur unseen.
  // Tolerance separates the real bug (the title-growth shifted rings 32–61px) from the small
  // STRUCTURAL asymmetry a few SDR rings carry (cat-sdr's observing-eye + assert sit on one side,
  // ~18px) — 24px passes those, catches a re-grown frame.
  const TOL = 24;
  const loops = files.filter((f) => load(f).diagram === 'process-loop');

  it('the corpus has loop-maps to check', () => {
    expect(loops.length).toBeGreaterThan(0);
  });

  describe.each(loops)('%s', (f) => {
    const model = load(f);
    for (const layer of ['clinician', 'client'] as const) {
      it(`ring is centred in the frame (${layer})`, () => {
        const svg = render.renderLoopMap(model, { layer }).svg;
        const nodes = boxesFromSvg(svg).filter((b) => kindOf(b.el) === 'node');
        expect(nodes.length, 'ring nodes are tagged').toBeGreaterThan(0);
        const minX = Math.min(...nodes.map((b) => b.x));
        const maxX = Math.max(...nodes.map((b) => b.x + b.w));
        const vb = svg
          .match(/viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/)!
          .slice(1)
          .map(Number);
        const off = (minX + maxX) / 2 - (vb[0] + vb[2] / 2);
        expect(
          Math.abs(off),
          `${f}/${layer}: ring off-centre by ${off.toFixed(0)}px`,
        ).toBeLessThanOrEqual(TOL);
      });
    }
  });
});
