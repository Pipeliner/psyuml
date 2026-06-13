import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { fromDSL, toDSL } from './index';

const load = (f: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../../examples/${f}`, import.meta.url), 'utf8'));
const corpus = readdirSync(new URL('../../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);

describe('grammar round-trip', () => {
  it('has the corpus to test against', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(12);
  });

  it.each(corpus)('%s round-trips model → DSL → model losslessly', (f) => {
    const model = load(f);
    expect(fromDSL(toDSL(model))).toEqual(model);
  });
});

describe('grammar specifics', () => {
  it('emits a readable, line-oriented surface', () => {
    const dsl = toDSL(load('state-map.psyuml'));
    expect(dsl).toContain('diagram state-map');
    expect(dsl.split('\n').some((l) => l.startsWith('node '))).toBe(true);
    expect(dsl.split('\n').some((l) => l.startsWith('band '))).toBe(true);
  });

  it('keeps the client (plain-language) variant of a label', () => {
    const dsl = toDSL(load('state-map.psyuml'));
    expect(dsl).toContain('client=');
    const back = fromDSL(dsl);
    const withClient = back.nodes.find((n) => n.label.client);
    expect(withClient).toBeDefined();
  });

  it('ignores comments and blank lines', () => {
    const dsl = `# a comment\n\ndiagram state-map\n\n  # indented comment\nnode a state label="Hi"\n`;
    const m = fromDSL(dsl);
    expect(m.diagram).toBe('state-map');
    expect(m.nodes).toHaveLength(1);
    expect(m.nodes[0]?.label.clinician.en).toBe('Hi');
  });

  it('escapes and restores quotes inside free text', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { disclaimer: 'Call the "crisis" line.' },
      nodes: [{ id: 'a', kind: 'state', label: { clinician: { en: 'A "quoted" state' } } }],
    });
    expect(fromDSL(toDSL(m))).toEqual(m);
  });

  it('falls back to labeljson for a multi-language label (stays lossless)', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      nodes: [{ id: 'a', kind: 'state', label: { clinician: { en: 'Calm', fr: 'Calme' } } }],
    });
    const dsl = toDSL(m);
    expect(dsl).toContain('labeljson=');
    expect(fromDSL(dsl)).toEqual(m);
  });

  it('preserves a position, provenance list, loop marker and trigger', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'process-loop',
      meta: { disclaimer: 'x' },
      nodes: [
        {
          id: 'a',
          kind: 'state',
          position: { x: 12, y: 34 },
          label: { clinician: { en: 'A' } },
          properties: { dominance: 0.5, provenance: ['school:cat', 'school:cbt'], index: true },
        },
        { id: 'b', kind: 'resource', label: { clinician: { en: 'B' } } },
      ],
      edges: [
        {
          id: 'e1',
          kind: 'sequential',
          source: 'a',
          target: 'b',
          loop: 'R',
          trigger: { clinician: { en: 'a cue' } },
        },
      ],
    });
    expect(fromDSL(toDSL(m))).toEqual(m);
  });

  it('throws on an unknown statement', () => {
    expect(() => fromDSL('wibble foo bar')).toThrow();
  });
});
