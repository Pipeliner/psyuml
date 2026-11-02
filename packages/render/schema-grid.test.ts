/**
 * Schema-domains grid (issue #7, ADR-0060): intensity is GRADED, not a binary bold-at-0.5.
 *
 * Every schema with a `properties.intensity` gets three redundant, colour-free channels that scale
 * with the value — outline weight, a small meter bar inside the cell, and the printed number — while
 * the existing ACTIVE marker (corner wedge + bold name, intensity ≥ 0.5) is kept as the threshold
 * cue. Unscored schemas keep the plain thin outline and no meter. Synthetic content only.
 *
 * Traceability: REQ-NEW-DIAGRAM-TYPES, REQ-NOTATION (§D redundancy), REQ-ACCESSIBILITY.
 */
import { describe, expect, it } from 'vitest';
import { parseModel, SCHEMA_DOMAINS, type PsyumlModel } from '@psyuml/model';
import { attrs } from './introspect';
import { renderSchemaGrid } from './index';

const model = (nodes: { id: string; st: string; i?: number }[]): PsyumlModel =>
  parseModel({
    version: '0.1.0',
    diagram: 'schema-grid',
    meta: { title: 'Graded intensity (synthetic)', disclaimer: 'Synthetic. Not a diagnosis.' },
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: 'state',
      stereotype: n.st,
      label: { clinician: { en: `Schema ${n.id.toUpperCase()}` } },
      properties: n.i === undefined ? {} : { intensity: n.i },
    })),
  });

const m = model([
  { id: 'a', st: 'disconnection', i: 0.95 },
  { id: 'b', st: 'disconnection', i: 0.55 },
  { id: 'c', st: 'autonomy', i: 0.2 },
  { id: 'd', st: 'limits', i: 0.6 },
  { id: 'g', st: 'overvigilance' },
]);
const { svg, altText } = renderSchemaGrid(m);

/** The attribute map of the first element whose tag carries `marker`. */
const tagWith = (marker: string): Record<string, string> | undefined => {
  const t = svg.split('<').find((s) => s.includes(marker));
  return t ? attrs(`<${t}`) : undefined;
};
const strokeOf = (id: string): number => Number(tagWith(`data-el="node:${id}"`)?.['stroke-width']);

describe('schema-grid graded intensity (issue #7)', () => {
  it('outline weight grows monotonically with intensity; unscored stays the thin default', () => {
    expect(strokeOf('a')).toBeGreaterThan(strokeOf('d'));
    expect(strokeOf('d')).toBeGreaterThan(strokeOf('b'));
    expect(strokeOf('b')).toBeGreaterThan(strokeOf('c'));
    expect(strokeOf('g')).toBe(1.3);
  });

  it('draws a meter whose filled share equals the intensity, for scored schemas only', () => {
    for (const [id, v] of [
      ['a', 0.95],
      ['b', 0.55],
      ['c', 0.2],
      ['d', 0.6],
    ] as const) {
      const track = tagWith(`data-meter-track="${id}"`);
      const fill = tagWith(`data-meter="${id}"`);
      expect(track, id).toBeDefined();
      expect(fill, id).toBeDefined();
      expect(Number(fill!.width) / Number(track!.width)).toBeCloseTo(v, 2);
    }
    expect(tagWith('data-meter="g"')).toBeUndefined();
  });

  it('prints the value beside the meter (colour is never the only channel)', () => {
    expect(svg).toMatch(/data-intensity-value="a"[^>]*>0\.95</);
    expect(svg).toMatch(/data-intensity-value="d"[^>]*>0\.6</);
    expect(svg).toMatch(/data-intensity-value="c"[^>]*>0\.2</);
    expect(svg).not.toContain('data-intensity-value="g"');
  });

  it('keeps the active (≥ 0.5) corner wedge as the threshold cue, not the only signal', () => {
    // a, b, d are active; c (0.2) and g (unscored) are not.
    const wedges = svg.match(/data-active="[a-z]+"/g) ?? [];
    expect(wedges.sort()).toEqual(['data-active="a"', 'data-active="b"', 'data-active="d"']);
  });

  it('reads every intensity in the alt-text', () => {
    expect(altText).toContain('Schema A (active, intensity 0.95)');
    expect(altText).toContain('Schema C (intensity 0.2)');
    expect(altText).toContain('Schema G');
    expect(altText).not.toContain('Schema G (');
  });

  it('the legend explains the graded mark in every locale', () => {
    expect(svg).toContain('intensity');
    const ru = renderSchemaGrid(m, { lang: 'ru' }).svg;
    expect(ru).toContain('интенсивность');
  });

  it('places by the shared SCHEMA_DOMAINS keys (the same list the lint checks)', () => {
    const all = model(SCHEMA_DOMAINS.map((st, i) => ({ id: `n${i}`, st, i: 0.5 })));
    const out = renderSchemaGrid(all).svg;
    SCHEMA_DOMAINS.forEach((_, i) => expect(out).toContain(`data-el="node:n${i}"`));
  });
});
