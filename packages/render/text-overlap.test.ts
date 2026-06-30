/**
 * The "no two words collide" invariant (ADR-0045) — text-legibility, machine-checked.
 *
 * `overlap.test.ts` (ADR-0012) guarantees that the `data-el` NODE and LABEL boxes never collide, but
 * it is deliberately blind to UNTAGGED chrome text — the diagram title, band/lane headers, per-region
 * contents summaries, captions, provenance footnotes and legends carry no `data-el`, so a title that
 * overlapped a lane header, or two region-contents lines that ran into each other, passed CI unseen.
 * This closes that gap: for every corpus example (both audience layers) it reconstructs the AABB of
 * EVERY `<text>` element (`introspect.textBoxesFromSvg`) and asserts no two overlap.
 *
 * Honest scope (ADR-0045): this checks text↔text only. Text drawn OVER decoration — a region banner on
 * a circle, a sensation label on a body outline, an edge label on its own connector — is intentional
 * labelling and is NOT a collision (decoration is not a `<text>`, so it never enters this check). Text
 * staying INSIDE its own container shape is a separate guarantee (the containment invariant, ADR-0046).
 * Both layers are checked because audience vocabulary changes label widths.
 *
 * Traceability: REQ-TEXT-LEGIBILITY, REQ-ACCESSIBILITY, REQ-NOTATION (§D), REQ-CONFORMANCE (§J).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import * as render from '@psyuml/render';
import { overlaps } from './layout';
import { textBoxesFromSvg } from './introspect';

/** The shared text metric is an estimate; tolerate <=1px of slop before calling it a collision. */
const SLOP = 1;

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

function assertNoTextCollision(label: string, svg: string): void {
  const texts = textBoxesFromSvg(svg).filter((t) => t.content.length > 0);
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      expect(
        overlaps(texts[i], texts[j], -SLOP),
        `${label}: text "${texts[i].content.slice(0, 30)}" overlaps text "${texts[j].content.slice(0, 30)}"`,
      ).toBe(false);
    }
  }
}

describe('text-legibility invariant — no two words collide (ADR-0045)', () => {
  describe.each(files)('%s', (f) => {
    const model = load(f);
    const renderer = RENDERERS[model.diagram];
    for (const layer of ['clinician', 'client'] as const) {
      it(`no text overlaps any other text (${layer})`, () => {
        assertNoTextCollision(`${f}/${layer}`, renderer(model, { layer }).svg);
      });
    }
  });
});

/**
 * Companion in-frame guarantee for ALL text (ADR-0052). `overlap.test.ts`'s in-frame check only
 * covers `data-el` boxes, so UNTAGGED chrome text — a long title, a guidance caption, the disclaimer —
 * could spill past the viewBox and be clipped on export / in an embed (found: the body-map title +
 * caption + disclaimer overflowing its fixed 460px frame by up to ~220px). This asserts every
 * reconstructed `<text>` AABB sits inside the SVG's own viewBox, for every example × both layers.
 * Tolerance is a few px: the shared text metric is an estimate, while real overflow is tens of px.
 */
const FRAME_SLOP = 4;
function viewBoxOf(svg: string): { x: number; y: number; w: number; h: number } {
  const m = svg.match(/viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/)!;
  return { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) };
}
function assertTextInFrame(label: string, svg: string): void {
  const vb = viewBoxOf(svg);
  for (const t of textBoxesFromSvg(svg).filter((b) => b.content.length > 0)) {
    const within =
      t.x >= vb.x - FRAME_SLOP &&
      t.y >= vb.y - FRAME_SLOP &&
      t.x + t.w <= vb.x + vb.w + FRAME_SLOP &&
      t.y + t.h <= vb.y + vb.h + FRAME_SLOP;
    expect(
      within,
      `${label}: text "${t.content.slice(0, 30)}" at (${t.x.toFixed(0)},${t.y.toFixed(0)} ${t.w.toFixed(0)}x${t.h.toFixed(0)}) spills outside viewBox ${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
    ).toBe(true);
  }
}

describe('text-in-frame invariant — no text spills past the viewBox (ADR-0052)', () => {
  describe.each(files)('%s', (f) => {
    const model = load(f);
    const renderer = RENDERERS[model.diagram];
    for (const layer of ['clinician', 'client'] as const) {
      it(`every text box is inside the frame (${layer})`, () => {
        assertTextInFrame(`${f}/${layer}`, renderer(model, { layer }).svg);
      });
    }
  });

  // A long user title must not clip in the live editor (where no in-frame test runs). The corpus
  // titles are short, so this plants a pathologically long one on each CONTENT-FIT renderer (whose
  // frame is sized to its nodes and would otherwise ignore the title row) and asserts it still fits.
  // The renderers achieve that differently — decision-nav GROWS + re-centres (ADR-0052); the loop-map
  // and body-map WRAP within the content width; state-map/parts-map/mode-map/two-triangles SHRINK the
  // title to fit (ADR-0054) — all so the body stays centred. The contract this guards is the same: a
  // long title never spills past the viewBox.
  const LONG_TITLE =
    'A very long diagnostic formulation title that a clinician might plausibly type out in full here';
  const CONTENT_FIT: [string, string][] = [
    ['state-map', 'state-map.psyuml'],
    ['parts-map', 'parts-map.psyuml'],
    ['mode-map', 'mode-map.psyuml'],
    ['relational-field', 'relational-field.psyuml'],
    ['process-loop', 'panic-cycle.psyuml'],
    ['two-triangles', 'two-triangles.psyuml'],
    ['decision-nav', 'decision-nav.psyuml'],
    ['body-map', 'body-map.psyuml'],
  ];
  it.each(CONTENT_FIT)('%s grows its frame so a long title never clips', (_diagram, file) => {
    const model = load(file);
    model.meta = { ...model.meta, title: LONG_TITLE };
    const renderer = RENDERERS[model.diagram];
    for (const layer of ['clinician', 'client'] as const) {
      assertTextInFrame(`${file}/${layer} (long title)`, renderer(model, { layer }).svg);
    }
  });
});
