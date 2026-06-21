import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  caseFileFrom,
  createEmptyModel,
  getText,
  INTERPRETIVE_STATUSES,
  isInterpretive,
  parseCaseFile,
  parseModel,
  PSYUML_MODEL_VERSION,
  schoolClaims,
  serializeCaseFile,
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

  it('accepts the v0.2 §3 provenance values + §4 loop-topology / as-if fields, and round-trips them', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'process-loop',
      meta: { disclaimer: 'x' },
      nodes: [
        {
          id: 'critic',
          kind: 'agent',
          label: { clinician: { en: 'Inner critic' } },
          // a v0.2 §3 contested standing + confidence and a §4 ontology-neutral as-if flag
          properties: { epistemicStatus: 'contested', confidence: 'L', asIf: true },
        },
        {
          id: 'agreed',
          kind: 'state',
          label: { clinician: { en: 'What we both see' } },
          properties: { epistemicStatus: 'jointly-agreed' },
        },
        { id: 'out', kind: 'resource', label: { clinician: { en: 'Ask directly' } } },
      ],
      edges: [
        {
          id: 'loop',
          kind: 'sequential',
          source: 'agreed',
          target: 'critic',
          loop: 'R',
          loopTopology: 'trap',
        },
        { id: 'x', kind: 'exit', source: 'critic', target: 'out' },
      ],
    });
    expect(m.nodes[0]?.properties.epistemicStatus).toBe('contested');
    expect(m.nodes[0]?.properties.asIf).toBe(true);
    expect(m.nodes[1]?.properties.epistemicStatus).toBe('jointly-agreed');
    expect(m.edges[0]?.loopTopology).toBe('trap');
    // additive + backward-compatible: still round-trips losslessly
    expect(parseModel(serializeModel(m))).toEqual(m);
  });

  it('distinguishes interpretive from descriptive standing (v0.2 §3)', () => {
    // interpretive: arrived at by inference / clinician judgment / dispute / non-literal framing
    expect(isInterpretive('inferred')).toBe(true);
    expect(isInterpretive('clinician-inferred')).toBe(true);
    expect(isInterpretive('contested')).toBe(true);
    expect(isInterpretive('symbolic')).toBe(true);
    // descriptive: directly given
    expect(isInterpretive('reported')).toBe(false);
    expect(isInterpretive('observed')).toBe(false);
    expect(isInterpretive('jointly-agreed')).toBe(false);
    expect(isInterpretive('planned')).toBe(false);
    expect(isInterpretive(undefined)).toBe(false);
    expect(INTERPRETIVE_STATUSES.has('contested')).toBe(true);
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

describe('case file (REQ-CASE-FILE, ADR-0039)', () => {
  const m1 = createEmptyModel('state-map');
  const m2 = createEmptyModel('parts-map');

  it('round-trips losslessly through serialize → parse', () => {
    const cf = caseFileFrom([m1, m2], { title: 'R. — a case', note: 'two views' });
    const round = parseCaseFile(serializeCaseFile(cf));
    expect(round).toEqual(cf);
    expect(round.kind).toBe('case-file');
    expect(round.documents).toHaveLength(2);
    expect(round.documents.map((d) => d.diagram)).toEqual(['state-map', 'parts-map']);
    expect(round.meta.title).toBe('R. — a case');
  });

  it('parses documents as full models (zod defaults applied) — a case file is just a container', () => {
    const cf = parseCaseFile({
      kind: 'case-file',
      documents: [{ version: PSYUML_MODEL_VERSION, diagram: 'state-map' }],
    });
    // top-level case-file version + meta default; each document is validated as a full model
    expect(cf.version).toBe(PSYUML_MODEL_VERSION);
    expect(cf.meta).toEqual({});
    expect(cf.documents[0].nodes).toEqual([]);
    expect(cf.documents[0].edges).toEqual([]);
  });

  it('rejects a single model (no kind discriminator) so an opener can tell them apart', () => {
    expect(() => parseCaseFile(serializeModel(m1))).toThrow();
    expect(() => parseCaseFile({ kind: 'not-a-case', documents: [] })).toThrow();
  });
});
