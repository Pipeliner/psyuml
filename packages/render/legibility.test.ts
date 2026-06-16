import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { render } from './index';

// Tier-A legibility + safety guards motivated (NOT validated) by the simulated comprehension
// dry-runs (docs/evaluation-suite-pilot-2.md, -3.md): nothing here is evidence — these are
// machine-checked invariants the pilots pointed at.

const exDir = new URL('../../examples/', import.meta.url);
const models: [string, PsyumlModel][] = readdirSync(fileURLToPath(exDir))
  .filter((f) => f.endsWith('.psyuml'))
  .map((f) => [f, parseModel(readFileSync(new URL(f, exDir), 'utf8'))]);

const fontSizes = (svg: string): number[] =>
  [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));

describe('Tier-A legibility floor (pilot 3 flagged small State-Map text)', () => {
  it.each(models)('%s emits no microtext below the 8px floor (both layers)', (_f, model) => {
    for (const audience of ['clinician', 'client'] as const) {
      const sizes = fontSizes(render(model, { audience }).svg);
      const min = sizes.length ? Math.min(...sizes) : Infinity;
      expect(min).toBeGreaterThanOrEqual(8);
    }
  });

  it('the State-Map trigger/exit labels are sized for legibility (≥12)', () => {
    const stateMap = models.find(([f]) => f === 'state-map.psyuml')![1];
    const svg = render(stateMap).svg;
    const edgeLabelSizes = [
      ...svg.matchAll(/data-el="edgelabel:[^"]*"[^>]*font-size="([\d.]+)"/g),
    ].map((m) => Number(m[1]));
    expect(edgeLabelSizes.length).toBeGreaterThan(0);
    for (const s of edgeLabelSizes) expect(s).toBeGreaterThanOrEqual(12);
  });
});

describe('Tier-A safety dual-coding (pilots 2+3: the way-out is unsafe glyph-only)', () => {
  // The bare exit arrow read as "escape/avoidance"; with its word it read as "the way out". So a
  // renderer MUST NOT draw a way-out (`exit` edge) without its word (v0.2 §5).
  const withExit = models.filter(([, m]) => m.edges.some((e) => e.kind === 'exit'));

  it('there is at least one exit-bearing example to check', () => {
    expect(withExit.length).toBeGreaterThan(0);
  });

  it.each(withExit)('%s renders every way-out with its word (never a bare arrow)', (_f, model) => {
    for (const audience of ['clinician', 'client'] as const) {
      expect(render(model, { audience }).svg).toContain('EXIT');
    }
  });
});
