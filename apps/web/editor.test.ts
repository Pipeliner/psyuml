import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';
import { addNode, nextId } from './editor';

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
});
