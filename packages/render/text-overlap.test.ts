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
