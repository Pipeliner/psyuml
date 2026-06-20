/**
 * The edge↔edge crossing invariant (ADR-0025) — crossings are MEASURED + BOUNDED, not ignored.
 *
 * ADR-0012 honestly scoped edge line/path crossings OUT of the "nothing overlaps" guarantee: a
 * genogram or a maintaining loop has relations that genuinely cross, and clinical node order (a
 * cycle's sequence, a parts arc) is meaningful, so universal PLANARITY is impossible. This test
 * brings crossings into scope the way the other gaps were closed — it COUNTS the proper crossings
 * between non-incident edges in every rendered example and asserts the count never exceeds a pinned
 * per-file baseline. So:
 *   • a layout change that introduces a NEW (gratuitous) crossing fails CI — the regression guard;
 *   • the few STRUCTURAL crossings that remain (a cross-ring exit chord, a cross-map polarization
 *     tie) are pinned + documented here, and made legible by the bridge/casing pass (ADR-0025).
 *
 * Incident edges (sharing a source/target node) meet AT the node and are not crossings; they are
 * filtered using the model. Geometry is layer-invariant (profiles hide labels/dashes, never edges),
 * so a single layer is measured. Traceability: REQ-EDGE-CROSSING, REQ-ACCESSIBILITY (§D, §J).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import * as render from '@psyuml/render';
import { edgeCrossings } from './introspect';

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
};

/** Count proper crossings between NON-incident edges (edges sharing a node meet, they don't cross). */
function nonIncidentCrossings(model: PsyumlModel, svg: string): string[] {
  const inc = new Map(model.edges.map((e) => [e.id, [e.source, e.target]] as const));
  return edgeCrossings(svg)
    .filter(({ a, b }) => {
      const A: readonly string[] = inc.get(a) ?? [];
      const B: readonly string[] = inc.get(b) ?? [];
      return !A.some((x) => B.includes(x));
    })
    .map(({ a, b }) => `${a}×${b}`);
}

/**
 * STRUCTURAL crossings, pinned per example file (everything not listed MUST be crossing-free). Each is
 * a relation that spans the diagram's clinically-meaningful layout and unavoidably cuts another:
 *   • process-loop — the dashed EXIT chord escapes across the ring to a resource on the far side and
 *     crosses one cycle chord (the ring order is the cycle's semantics — not reorderable);
 *   • parts-map — the POLARIZATION tie between two parts on opposite sides of the protector arc
 *     crosses their containment lines down to the exile.
 * All are made legible by the bridge/casing pass (ADR-0025). Reduce one → update its baseline.
 */
const CROSSING_BASELINE = new Map<string, number>([
  ['showcase-parts-map.psyuml', 2],
  ['cat-sdr.psyuml', 1],
  ['depression-flower.psyuml', 1],
  ['showcase-process-loop.psyuml', 1],
]);

const load = (f: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../../examples/${f}`, import.meta.url), 'utf8'));
const files = readdirSync(new URL('../../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);

describe('edge↔edge crossing invariant — corpus (ADR-0025)', () => {
  describe.each(files)('%s', (f) => {
    const model = load(f);
    const renderer = RENDERERS[model.diagram];
    const baseline = CROSSING_BASELINE.get(f) ?? 0;
    for (const layer of ['clinician', 'client'] as const) {
      it(`non-incident crossings <= pinned baseline (${baseline}) (${layer})`, () => {
        const crossings = nonIncidentCrossings(model, renderer(model, { layer }).svg);
        expect(
          crossings.length,
          `${f}/${layer}: crossings [${crossings.join(', ')}] exceed baseline ${baseline}`,
        ).toBeLessThanOrEqual(baseline);
      });
    }
  });
});
