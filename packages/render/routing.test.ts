/**
 * Edge-routing quality invariant (ADR-0024/0049, REQ-EDGE-ROUTER).
 *
 * The obstacle-avoiding `EdgeRouter` (ADR-0023/0024) detours any edge whose straight path would cross
 * a non-incident node, emitting an ORTHOGONAL polyline (grid A*). Two machine-checked guarantees here,
 * complementing the edge↔node invariant (layout-quality B, which already proves routed edges avoid
 * non-incident nodes):
 *   1. every ROUTED detour is clean — a pure `M/L` polyline with ≥3 vertices has only axis-aligned
 *      segments (no diagonal jogs); a SOTA orthogonal router must never emit a slanted bend;
 *   2. the corpus actually EXERCISES the router — at least one example produces such a detour, so the
 *      routing path is covered, not dead.
 *
 * Curved decorative edges (parts-map containment / loop-map ring chords use `Q`/`C`) and plain
 * straight edges (2 vertices) are out of scope — only orthogonal-router output is asserted.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import * as render from './index';

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

// Only the renderers that use the obstacle-avoiding `EdgeRouter` (ADR-0024) draw multi-vertex
// polyline edges as ROUTER output. Other renderers draw decorative bows/zigzags as `M/L` polylines
// too (parts-map containment, loop-map ring chords), which are intentionally NOT orthogonal — so the
// orthogonality guarantee is scoped to the router-using diagram types.
const ROUTED_DIAGRAMS = new Set(['state-map', 'decision-nav', 'ritual']);
const files = readdirSync(new URL('../../examples/', import.meta.url)).filter(
  (f) => f.endsWith('.psyuml') && ROUTED_DIAGRAMS.has(load(f).diagram),
);

/** The `d` attribute of every `data-el="edge:*"` `<path>`. */
function edgePathDs(svg: string): string[] {
  return [...svg.matchAll(/<path\b[^>]*\bdata-el="edge:[^"]*"[^>]*\bd="([^"]*)"/g)].map(
    (m) => m[1],
  );
}

/** Vertices of a pure `M/L` polyline (returns null if the path uses curves/arcs — out of scope). */
function polylineVertices(d: string): { x: number; y: number }[] | null {
  if (/[QqCcAaSsTt]/.test(d)) return null; // curved — not router output
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return null;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2)
    pts.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  return pts;
}

const EPS = 1; // grid/clip rounding tolerance

describe('routing-quality invariant — orthogonal router output (ADR-0024)', () => {
  let detoursSeen = 0;
  describe.each(files)('%s', (f) => {
    const model = load(f);
    const renderer = RENDERERS[model.diagram];
    for (const layer of ['clinician', 'client'] as const) {
      it(`every routed detour is a clean orthogonal polyline (${layer})`, () => {
        for (const d of edgePathDs(renderer(model, { layer }).svg)) {
          const pts = polylineVertices(d);
          if (!pts || pts.length < 3) continue; // straight edge or curved decoration — out of scope
          detoursSeen += 1;
          for (let i = 0; i + 1 < pts.length; i += 1) {
            const a = pts[i];
            const b = pts[i + 1];
            const axisAligned = Math.abs(a.x - b.x) < EPS || Math.abs(a.y - b.y) < EPS;
            expect(
              axisAligned,
              `${f}/${layer}: routed edge has a slanted segment (${a.x},${a.y})→(${b.x},${b.y}) in "${d}"`,
            ).toBe(true);
          }
        }
      });
    }
  });

  it('the corpus exercises the obstacle-avoiding router (≥1 routed detour exists)', () => {
    expect(detoursSeen).toBeGreaterThan(0);
  });
});
