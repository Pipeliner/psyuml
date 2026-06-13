import { describe, expect, it } from 'vitest';
import { parseModel } from '@psyuml/model';
import { applySuggestions, assist, type Extractor } from './index';

const base = parseModel({
  version: '0.1.0',
  diagram: 'parts-map',
  meta: { disclaimer: 'x' },
  nodes: [{ id: 'self', kind: 'self', label: { clinician: { en: 'Self' } } }],
});

// Test doubles: an extractor that echoes what it was given, and one that yields two nodes.
const echo: Extractor = (narrative) => [{ kind: 'node', nodeKind: 'state', label: narrative }];
const twoNodes: Extractor = () => [
  { kind: 'node', nodeKind: 'state', label: 'A' },
  { kind: 'node', nodeKind: 'state', label: 'B' },
];

describe('assist guardrails', () => {
  it('refuses without consent and processes nothing', () => {
    const r = assist('anything', { model: base, consented: false }, twoNodes);
    expect(r.status).toBe('no-consent');
    expect(r.suggestions).toHaveLength(0);
    expect(r.redactions).toEqual([]);
  });

  it('ships no model call by default (no-op extractor)', () => {
    const r = assist('a long narrative', { model: base, consented: true });
    expect(r.status).toBe('ok');
    expect(r.suggestions).toHaveLength(0);
  });

  it('de-identifies the narrative before the extractor sees it', () => {
    const r = assist('reach jo@x.io and Jo', { model: base, consented: true, terms: ['Jo'] }, echo);
    expect(r.status).toBe('ok');
    const s = r.suggestions[0];
    expect(s.kind).toBe('node');
    if (s.kind === 'node') {
      expect(s.node.label.clinician.en).toBe('reach [email] and [name]');
      expect(s.node.label.clinician.en).not.toContain('jo@x.io');
    }
    expect(r.redactions.length).toBeGreaterThanOrEqual(2);
  });

  it('halts and escalates when the model carries a risk flag — before any extraction', () => {
    const flagged = parseModel({
      ...base,
      meta: { ...base.meta, safety: { acuteRiskFlag: true } },
    });
    const r = assist('benign text', { model: flagged, consented: true }, twoNodes);
    expect(r.status).toBe('escalated');
    expect(r.suggestions).toHaveLength(0);
  });

  it('halts on an acute-risk or psychosis marker in the narrative', () => {
    expect(assist('I want to kill myself', { model: base, consented: true }, twoNodes).status).toBe(
      'escalated',
    );
    expect(
      assist('hearing voices telling me things', { model: base, consented: true }, twoNodes).status,
    ).toBe('escalated');
  });

  it('wraps every suggestion low-confidence + inferred, with fresh ids', () => {
    const r = assist('x', { model: base, consented: true }, twoNodes);
    expect(r.suggestions).toHaveLength(2);
    for (const s of r.suggestions) {
      expect(s.kind).toBe('node');
      if (s.kind === 'node') {
        expect(s.node.properties.confidence).toBe('L');
        expect(s.node.properties.epistemicStatus).toBe('inferred');
      }
    }
    const ids = r.suggestions.flatMap((s) => (s.kind === 'node' ? [s.node.id] : []));
    expect(ids).toEqual(['ai_n1', 'ai_n2']);
  });

  it('never auto-applies; applySuggestions is the explicit, separate accept step', () => {
    const r = assist('x', { model: base, consented: true }, twoNodes);
    expect(base.nodes).toHaveLength(1); // assist did not touch the model
    const merged = applySuggestions(base, r.suggestions);
    expect(merged.nodes).toHaveLength(3);
    expect(base.nodes).toHaveLength(1); // still untouched after apply
  });

  it('wraps an edge suggestion and applies node + edge together', () => {
    const ext: Extractor = () => [
      { kind: 'node', id: 'a2', nodeKind: 'state', label: 'A' },
      { kind: 'edge', source: 'self', target: 'a2', edgeKind: 'sequential' },
    ];
    const r = assist('x', { model: base, consented: true }, ext);
    const edge = r.suggestions.find((s) => s.kind === 'edge');
    expect(edge?.kind).toBe('edge');
    if (edge?.kind === 'edge') expect(edge.edge.properties.confidence).toBe('L');
    const merged = applySuggestions(base, r.suggestions);
    expect(merged.edges).toHaveLength(1);
  });
});
