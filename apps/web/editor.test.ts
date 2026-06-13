import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';
import {
  addNode,
  nextId,
  removeNode,
  restoreVersion,
  setMeta,
  setNodeEpistemic,
  setNodeHidden,
  setNodeLabel,
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
});
