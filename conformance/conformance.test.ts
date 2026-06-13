/**
 * PsyUML conformance suite (spec §J) — executable spec-level invariants over the whole
 * example corpus, across every diagram type. This is the capstone that the spec's
 * self-evaluation rubric describes; it gates leaving v0.x (with the clinical Stage-4
 * evidence still required outside the code — see ROADMAP M10).
 *
 * Traceability: REQ-CONFORMANCE (§J), REQ-CROSS-SCHOOL (round-trip), REQ-ACCESSIBILITY.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, serializeModel, type PsyumlModel } from '@psyuml/model';
import { validate } from '@psyuml/validate';
import * as render from '@psyuml/render';

type Renderer = (
  m: PsyumlModel,
  o?: { layer?: 'clinician' | 'client' },
) => { svg: string; altText: string };

/** One renderer per diagram type (the 9 §E types + the Mode Map, Body Map, and Two-Triangles profiles). */
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
};

const load = (f: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../examples/${f}`, import.meta.url), 'utf8'));
const files = readdirSync(new URL('../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);

/** Okabe–Ito hues — must NOT appear in a default (monochrome) render (§D). */
const HUES = /#(009e73|e69f00|d55e00|56b4e9|cc79a7|f0e442|0072b2)/;

describe('PsyUML conformance (§J)', () => {
  it('every renderer-backed diagram type has an example', () => {
    const present = new Set(files.map((f) => load(f).diagram));
    for (const type of Object.keys(RENDERERS)) {
      expect([...present]).toContain(type);
    }
  });

  describe.each(files)('%s', (f) => {
    const model = load(f);

    it('round-trips model → JSON → model losslessly', () => {
      expect(parseModel(serializeModel(model))).toEqual(model);
    });

    it('validates clean in both layers', () => {
      expect(validate(model, { layer: 'clinician' }).ok).toBe(true);
      expect(validate(model, { layer: 'client' }).ok).toBe(true);
    });

    it('renders an accessible SVG (role=img + aria-label + alt text) in both layers', () => {
      const renderer = RENDERERS[model.diagram];
      expect(renderer).toBeDefined();
      for (const layer of ['clinician', 'client'] as const) {
        const { svg, altText } = renderer(model, { layer });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain('role="img"');
        expect(svg).toContain('aria-label="');
        expect(altText.trim().length).toBeGreaterThan(10);
      }
    });

    it('default render carries no colour hue (monochrome, §D)', () => {
      expect(RENDERERS[model.diagram](model).svg.toLowerCase()).not.toMatch(HUES);
    });
  });
});
