import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';
import {
  addEdge,
  addNode,
  edgeAriaLabel,
  nextId,
  removeEdge,
  removeNode,
  restoreVersion,
  setMeta,
  setNodeEpistemic,
  setNodeHidden,
  setNodeLabel,
  setNodePosition,
  setNodeProvenance,
  setNodeStereotype,
  setSafetyFlag,
  snapshotModel,
} from './editor';

const read = (name: string) =>
  parseModel(readFileSync(new URL(`../../examples/${name}`, import.meta.url), 'utf8'));
const stateModel = read('state-map.psyuml');
const partsModel = read('parts-map.psyuml');

describe('editor', () => {
  it('nextId returns an unused id', () => {
    expect(nextId('state', stateModel)).toBe('state1');
  });

  it('addNode appends a state to the first band on a state map', () => {
    const m = addNode(stateModel, 'New state');
    expect(m.nodes).toHaveLength(stateModel.nodes.length + 1);
    const added = m.nodes[m.nodes.length - 1];
    expect(added?.kind).toBe('state');
    expect(added?.bandId).toBe('ventral');
    expect(added?.label.clinician.en).toBe('New state');
  });

  it('addNode appends an agent (protector) on a parts map', () => {
    const m = addNode(partsModel, 'New part');
    const added = m.nodes[m.nodes.length - 1];
    expect(added?.kind).toBe('agent');
    expect(added?.stereotype).toBe('manager');
  });

  it('does not mutate the input model', () => {
    const before = stateModel.nodes.length;
    addNode(stateModel, 'x');
    expect(stateModel.nodes).toHaveLength(before);
  });

  it('setNodeLabel updates the clinician label', () => {
    const m = setNodeLabel(stateModel, 'calm', 'Renamed', 'clinician');
    expect(m.nodes.find((x) => x.id === 'calm')?.label.clinician.en).toBe('Renamed');
  });

  it('setNodeLabel sets the client label without touching the clinician label', () => {
    const m = setNodeLabel(stateModel, 'calm', 'My word', 'client');
    const n = m.nodes.find((x) => x.id === 'calm');
    expect(n?.label.client?.en).toBe('My word');
    expect(n?.label.clinician.en).toBe('Calm / connected');
  });

  it('setNodeHidden hides a node (and is reversible)', () => {
    const hidden = setNodeHidden(stateModel, 'numb', true);
    expect(hidden.nodes.find((x) => x.id === 'numb')?.hidden).toBe(true);
    const shown = setNodeHidden(hidden, 'numb', false);
    expect(shown.nodes.find((x) => x.id === 'numb')?.hidden).toBe(false);
  });

  it('setNodeEpistemic marks a node as a guess, and clears it with ""', () => {
    const guessed = setNodeEpistemic(stateModel, 'numb', 'inferred');
    expect(guessed.nodes.find((x) => x.id === 'numb')?.properties.epistemicStatus).toBe('inferred');
    const cleared = setNodeEpistemic(guessed, 'numb', '');
    expect(cleared.nodes.find((x) => x.id === 'numb')?.properties.epistemicStatus).toBeUndefined();
  });

  it('removeNode drops the node and every edge touching it (and does not mutate input)', () => {
    const before = stateModel.nodes.length;
    const m = removeNode(stateModel, 'calm');
    expect(m.nodes.some((n) => n.id === 'calm')).toBe(false);
    expect(m.edges.every((e) => e.source !== 'calm' && e.target !== 'calm')).toBe(true);
    expect(stateModel.nodes).toHaveLength(before); // input untouched
  });

  it('addNode can create a node of a chosen kind/stereotype (not just the diagram default)', () => {
    const m = addNode(stateModel, 'A way out', { kind: 'resource' });
    const added = m.nodes[m.nodes.length - 1];
    expect(added?.kind).toBe('resource');
    const part = addNode(partsModel, 'Hurt Child', { kind: 'agent', stereotype: 'exile' });
    expect(part.nodes[part.nodes.length - 1]?.stereotype).toBe('exile');
  });

  it('addNode can set a client-language label and provenance (full GUI authoring)', () => {
    const m = addNode(partsModel, 'Inner critic', {
      kind: 'agent',
      stereotype: 'manager',
      client: 'the harsh voice',
      provenance: ['IFS', 'schema'],
    });
    const added = m.nodes[m.nodes.length - 1];
    expect(added?.label.client?.en).toBe('the harsh voice');
    expect(added?.properties.provenance).toEqual(['IFS', 'schema']);
  });

  it('setNodeStereotype sets and clears a stereotype (e.g. a decision diamond)', () => {
    const q = setNodeStereotype(stateModel, 'calm', 'question');
    expect(q.nodes.find((x) => x.id === 'calm')?.stereotype).toBe('question');
    const cleared = setNodeStereotype(q, 'calm', '');
    expect(cleared.nodes.find((x) => x.id === 'calm')?.stereotype).toBeUndefined();
  });

  it('setNodeProvenance parses a comma list and clears on empty', () => {
    const p = setNodeProvenance(partsModel, 'self', 'IFS, structural-dissociation');
    expect(p.nodes.find((x) => x.id === 'self')?.properties.provenance).toEqual([
      'IFS',
      'structural-dissociation',
    ]);
    const cleared = setNodeProvenance(p, 'self', '  ');
    expect(cleared.nodes.find((x) => x.id === 'self')?.properties.provenance).toBeUndefined();
  });

  it('setNodePosition persists a rounded manual position (drag-to-reposition)', () => {
    const m = setNodePosition(stateModel, 'calm', 142.6, 40.2);
    expect(m.nodes.find((x) => x.id === 'calm')?.position).toEqual({ x: 143, y: 40 });
    expect(stateModel.nodes.find((x) => x.id === 'calm')?.position).toBeUndefined(); // input untouched
  });

  it('addEdge can attach a trigger (⚑ precipitant) distinct from a free label', () => {
    const m = addEdge(stateModel, {
      source: 'calm',
      target: 'numb',
      kind: 'sequential',
      trigger: 'criticism',
    });
    const added = m.edges[m.edges.length - 1];
    expect(added?.trigger?.clinician.en).toBe('criticism');
    expect(added?.label).toBeUndefined();
  });

  it('addEdge connects two nodes with a typed, optionally-labelled link', () => {
    const before = stateModel.edges.length;
    const m = addEdge(stateModel, {
      source: 'calm',
      target: 'numb',
      kind: 'exit',
      label: 'breathe',
    });
    const added = m.edges[m.edges.length - 1];
    expect(m.edges).toHaveLength(before + 1);
    expect(added?.kind).toBe('exit');
    expect(added?.source).toBe('calm');
    expect(added?.target).toBe('numb');
    expect(added?.label?.clinician.en).toBe('breathe');
    expect(stateModel.edges).toHaveLength(before); // input untouched
  });

  it('removeEdge drops a link by id', () => {
    const linked = addEdge(stateModel, { source: 'calm', target: 'numb', kind: 'sequential' });
    const id = linked.edges[linked.edges.length - 1]!.id;
    const m = removeEdge(linked, id);
    expect(m.edges.some((e) => e.id === id)).toBe(false);
  });

  it('setMeta lets a user add the disclaimer the client gate requires', () => {
    const m = setMeta(stateModel, { disclaimer: 'My own note: supports, not replaces, care.' });
    expect(m.meta.disclaimer).toContain('supports, not replaces');
    expect(setMeta(stateModel, { title: 'R., session 3' }).meta.title).toBe('R., session 3');
  });

  it('snapshotModel captures an immutable version that restores losslessly', () => {
    const v = snapshotModel(stateModel, 'before session 2', '2026-06-13T10:00:00Z');
    expect(v.label).toBe('before session 2');
    expect(v.at).toBe('2026-06-13T10:00:00Z');
    expect(restoreVersion(v)).toEqual(stateModel);
    // mutating the live model afterwards does not change the snapshot
    addNode(stateModel, 'later');
    expect(restoreVersion(v)).toEqual(stateModel);
  });

  it('setSafetyFlag toggles a triage flag without disturbing the other', () => {
    const flagged = setSafetyFlag(stateModel, 'acuteRiskFlag', true);
    expect(flagged.meta.safety.acuteRiskFlag).toBe(true);
    expect(flagged.meta.safety.psychosisFlag).toBe(false);
    expect(stateModel.meta.safety.acuteRiskFlag).toBe(false); // input untouched
    const cleared = setSafetyFlag(flagged, 'acuteRiskFlag', false);
    expect(cleared.meta.safety.acuteRiskFlag).toBe(false);
  });

  it('edgeAriaLabel words the relationship + resolves node names per layer (ADR-0025)', () => {
    // e1: calm --sequential--> anxious. Names resolve in the requested audience layer.
    expect(edgeAriaLabel(stateModel, 'e1', 'clinician')).toBe(
      'Link: Calm / connected leads to Anxious / fight-flight',
    );
    expect(edgeAriaLabel(stateModel, 'e1', 'client')).toContain('Calm and connected');
    // an EXIT edge is worded as a "way out", never the raw kind.
    expect(edgeAriaLabel(stateModel, 'x1')).toContain('way out to');
    // a missing edge id degrades to the id, never throws.
    expect(edgeAriaLabel(stateModel, 'nope')).toBe('nope');
  });
});
