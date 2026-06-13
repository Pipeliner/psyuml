import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { validate } from './index';

const read = (name: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../../examples/${name}`, import.meta.url), 'utf8'));

describe('validate', () => {
  it('passes the canonical examples', () => {
    expect(validate(read('state-map.psyuml')).ok).toBe(true);
    expect(validate(read('parts-map.psyuml')).ok).toBe(true);
    expect(validate(read('decision-nav.psyuml')).ok).toBe(true);
    expect(validate(read('resource-anchor.psyuml')).ok).toBe(true);
  });

  it('flags a dangling edge endpoint as an error', () => {
    const m = read('state-map.psyuml');
    const broken = parseModel({
      ...m,
      edges: [...m.edges, { id: 'x', kind: 'sequential', source: 'calm', target: 'ghost' }],
    });
    const r = validate(broken);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'wf.edge-endpoints')).toBe(true);
  });

  it('warns (clinician) / errors (client) when a state map shows no way out', () => {
    const m = read('state-map.psyuml');
    const hopeless = parseModel({ ...m, edges: m.edges.filter((e) => e.kind !== 'exit') });
    const clin = validate(hopeless, { layer: 'clinician' });
    expect(clin.issues.some((i) => i.rule === 'safety.path-of-hope' && i.severity === 'warn')).toBe(
      true,
    );
    const client = validate(hopeless, { layer: 'client' });
    expect(client.ok).toBe(false);
    expect(
      client.issues.some((i) => i.rule === 'safety.path-of-hope' && i.severity === 'error'),
    ).toBe(true);
  });

  it('flags a crisis-chart dead-end', () => {
    const m = read('decision-nav.psyuml');
    const deadEnd = parseModel({ ...m, edges: m.edges.filter((e) => e.source !== 'q_stuck') });
    const r = validate(deadEnd);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'safety.no-dead-ends')).toBe(true);
  });

  it('requires a disclaimer on a client-facing diagram', () => {
    const m = read('state-map.psyuml');
    const noDisclaimer = parseModel({ ...m, meta: { ...m.meta, disclaimer: '' } });
    expect(validate(noDisclaimer).issues.some((i) => i.rule === 'ethics.disclaimer')).toBe(true);
  });
});
