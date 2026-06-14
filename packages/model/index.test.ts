import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createEmptyModel,
  getText,
  parseModel,
  PSYUML_MODEL_VERSION,
  schoolClaims,
  serializeModel,
} from './index';

const example = readFileSync(new URL('../../examples/state-map.psyuml', import.meta.url), 'utf8');

describe('model', () => {
  it('creates an empty, versioned model', () => {
    const m = createEmptyModel('state-map');
    expect(m.version).toBe(PSYUML_MODEL_VERSION);
    expect(m.diagram).toBe('state-map');
    expect(m.nodes).toHaveLength(0);
  });

  it('parses the canonical State Map example', () => {
    const m = parseModel(example);
    expect(m.diagram).toBe('state-map');
    expect(m.bands).toHaveLength(3);
    expect(m.nodes).toHaveLength(3);
    expect(m.edges).toHaveLength(4);
    expect(m.nodes[0]?.properties.epistemicStatus).toBe('reported');
  });

  it('round-trips model -> JSON -> model losslessly', () => {
    const m = parseModel(example);
    const again = parseModel(serializeModel(m));
    expect(again).toEqual(m);
  });

  it('resolves dual-audience, i18n labels with fallback', () => {
    const m = parseModel(example);
    const numb = m.nodes.find((n) => n.id === 'numb');
    expect(numb).toBeDefined();
    expect(getText(numb!.label, 'clinician')).toBe('Numb / shutdown');
    expect(getText(numb!.label, 'client')).toBe('Foggy');
    // a missing language falls back to the first available entry
    expect(getText(numb!.label, 'clinician', 'fr')).toBe('Numb / shutdown');
  });

  it('rejects an invalid model (missing required diagram)', () => {
    expect(() => parseModel({ version: '0.1.0' })).toThrow();
  });

  it('reads school-origin claims from both bare and prefixed provenance (§G.2)', () => {
    // bare tags (the example form) and explicit `school:` tags both count
    expect(schoolClaims(['IFS', 'schema', 'SD'])).toEqual(['IFS', 'schema', 'SD']);
    expect(schoolClaims(['school:ifs', 'school:structural-dissociation'])).toEqual([
      'ifs',
      'structural-dissociation',
    ]);
    // case-insensitive de-dup keeps first-seen casing; non-school namespaces are skipped
    expect(schoolClaims(['IFS', 'ifs', 'source:notes'])).toEqual(['IFS']);
    expect(schoolClaims([])).toEqual([]);
    expect(schoolClaims(undefined)).toEqual([]);
  });
});
