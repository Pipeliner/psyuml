import { describe, expect, it } from 'vitest';
import { parseModel } from '@psyuml/model';
import { diffModels, isEmptyDiff, summarizeDiff } from './index';

// A tiny worked case ("R."): a dominant Punishing Parent, the Self, and a forming exit.
const base = {
  version: '0.1.0',
  diagram: 'parts-map',
  meta: { disclaimer: 'Supports, not replaces, care.' },
  nodes: [
    { id: 'self', kind: 'self', label: { clinician: { en: 'Self' } } },
    {
      id: 'punisher',
      kind: 'agent',
      stereotype: 'manager',
      label: { clinician: { en: 'Punishing Parent' } },
      properties: { dominance: 0.9, consolidation: 'consolidated' },
    },
    {
      id: 'exit',
      kind: 'intervention',
      label: { clinician: { en: 'Ask for help' } },
      properties: { consolidation: 'forming' },
    },
  ],
  edges: [
    { id: 'e1', kind: 'containment', source: 'punisher', target: 'self' },
    { id: 'e2', kind: 'sequential', source: 'exit', target: 'self' },
  ],
};

const before = parseModel(base);
// A later session: Punishing Parent recedes, the exit consolidates, a new resource appears.
const after = parseModel({
  ...base,
  nodes: [
    base.nodes[0],
    { ...base.nodes[1], properties: { dominance: 0.5, consolidation: 'consolidated' } },
    { ...base.nodes[2], properties: { consolidation: 'consolidated' } },
    { id: 'res', kind: 'resource', label: { clinician: { en: 'Walking' } } },
  ],
});

describe('diffModels', () => {
  it('reports no change when comparing a version with itself', () => {
    expect(isEmptyDiff(diffModels(before, before))).toBe(true);
  });

  it('detects a dominance decrease on a matched node', () => {
    const d = diffModels(before, after);
    const punisher = d.nodes.changed.find((c) => c.id === 'punisher');
    expect(punisher?.deltas.some((x) => x.field === 'dominance' && x.direction === 'down')).toBe(
      true,
    );
  });

  it('detects a forming → consolidated transition (dashed → solid)', () => {
    const d = diffModels(before, after);
    const exit = d.nodes.changed.find((c) => c.id === 'exit');
    expect(
      exit?.deltas.some((x) => x.field === 'consolidation' && x.after === 'consolidated'),
    ).toBe(true);
  });

  it('lists an added node', () => {
    const d = diffModels(before, after);
    expect(d.nodes.added.some((n) => n.id === 'res')).toBe(true);
  });

  it('reads a rename as a label change, not an add + remove', () => {
    const renamed = parseModel({
      ...base,
      nodes: [
        { ...base.nodes[0], label: { clinician: { en: 'Core self' } } },
        ...base.nodes.slice(1),
      ],
    });
    const d = diffModels(before, renamed);
    expect(d.nodes.added).toHaveLength(0);
    expect(d.nodes.removed).toHaveLength(0);
    const self = d.nodes.changed.find((c) => c.id === 'self');
    expect(self?.deltas.some((x) => x.field === 'label')).toBe(true);
  });

  it('tracks a removed node and its edge', () => {
    const trimmed = parseModel({
      ...base,
      nodes: [base.nodes[0], base.nodes[2]],
      edges: [base.edges[1]],
    });
    const d = diffModels(before, trimmed);
    expect(d.nodes.removed.some((n) => n.id === 'punisher')).toBe(true);
    expect(d.edges.removed.some((e) => e.id === 'e1')).toBe(true);
  });

  it('does not mutate its inputs', () => {
    const snap = JSON.stringify(before);
    diffModels(before, after);
    expect(JSON.stringify(before)).toBe(snap);
  });
});

describe('summarizeDiff', () => {
  it('produces readable progress lines (the M6 acceptance)', () => {
    const lines = summarizeDiff(diffModels(before, after));
    expect(lines.some((l) => /Punishing Parent: dominance ↓/.test(l))).toBe(true);
    expect(lines.some((l) => /now solid/.test(l))).toBe(true);
    expect(lines.some((l) => /Added resource .*Walking/.test(l))).toBe(true);
  });
});
