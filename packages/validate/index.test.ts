import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { requiresHumanEscalation, validate } from './index';

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

  it('gates a process-loop (shown to clients) on a disclaimer too', () => {
    const m = read('process-loop.psyuml');
    expect(validate(m).ok).toBe(true);
    const noDisclaimer = parseModel({ ...m, meta: { ...m.meta, disclaimer: '' } });
    expect(validate(noDisclaimer).issues.some((i) => i.rule === 'ethics.disclaimer')).toBe(true);
  });

  it('flags an over-long label (info, accessibility)', () => {
    const m = read('state-map.psyuml');
    const long = parseModel({
      ...m,
      nodes: m.nodes.map((n, i) =>
        i === 0 ? { ...n, label: { clinician: { en: 'x'.repeat(60) } } } : n,
      ),
    });
    expect(
      validate(long).issues.some(
        (iss) => iss.rule === 'a11y.label-length' && iss.severity === 'info',
      ),
    ).toBe(true);
  });

  it('flags a floating (unattached) intervention (§A.2-r4)', () => {
    const m = read('state-map.psyuml');
    const orphan = parseModel({
      ...m,
      nodes: [
        ...m.nodes,
        { id: 'iv1', kind: 'intervention', label: { clinician: { en: 'Breathe' } } },
      ],
    });
    expect(validate(orphan).issues.some((i) => i.rule === 'wf.intervention-attached')).toBe(true);
  });

  it('flags a relation that touches a non-social node (§A.2-r3)', () => {
    const m = read('state-map.psyuml');
    const bad = parseModel({
      ...m,
      edges: [...m.edges, { id: 'rel', kind: 'close', source: 'calm', target: 'numb' }],
    });
    expect(validate(bad).issues.some((i) => i.rule === 'wf.relation-endpoints')).toBe(true);
  });

  it('flags a dissociative barrier on a non-part/state node (§A.2-r6)', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'parts-map',
      meta: { disclaimer: 'Supports, not replaces, care.' },
      nodes: [
        { id: 'a', kind: 'agent', label: { clinician: { en: 'Protector' } } },
        { id: 'res', kind: 'resource', label: { clinician: { en: 'Anchor' } } },
      ],
      edges: [{ id: 'b', kind: 'barrier', source: 'a', target: 'res' }],
    });
    expect(validate(m).issues.some((i) => i.rule === 'wf.barrier-endpoints')).toBe(true);
  });

  it('requires honest framing + a secular variant on a ritual diagram', () => {
    const r = read('ritual.psyuml');
    expect(validate(r).ok).toBe(true);
    const noFraming = parseModel({
      ...r,
      meta: { ...r.meta, ritual: { secularVariant: r.meta.ritual?.secularVariant } },
    });
    const res = validate(noFraming);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.rule === 'ethics.ritual-framing')).toBe(true);
  });

  it('escalates an acute-risk flag and requires crisis resources (REQ-SAFETY-TRIAGE)', () => {
    const m = read('state-map.psyuml');
    expect(requiresHumanEscalation(m)).toBe(false);
    // Flag acute risk and strip the crisis resources → hard error + escalation warning.
    const flagged = parseModel({
      ...m,
      meta: { ...m.meta, crisisResources: '', safety: { acuteRiskFlag: true } },
    });
    const r = validate(flagged);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'safety.acute-risk-escalation')).toBe(true);
    expect(r.issues.some((i) => i.rule === 'safety.acute-risk-resources')).toBe(true);
    expect(requiresHumanEscalation(flagged)).toBe(true);

    // With crisis resources recorded, the hard error clears; the escalation warning stays.
    const withResources = parseModel({
      ...flagged,
      meta: { ...flagged.meta, crisisResources: 'Call/text a local crisis line' },
    });
    const r2 = validate(withResources);
    expect(r2.issues.some((i) => i.rule === 'safety.acute-risk-resources')).toBe(false);
    expect(r2.issues.some((i) => i.rule === 'safety.acute-risk-escalation')).toBe(true);
  });

  it('escalates a psychosis flag and contraindicates ritual (REQ-SAFETY-TRIAGE)', () => {
    const base = read('state-map.psyuml');
    const s = parseModel({ ...base, meta: { ...base.meta, safety: { psychosisFlag: true } } });
    const sr = validate(s);
    expect(sr.ok).toBe(true); // a warning, not an export block, off-ritual
    expect(sr.issues.some((i) => i.rule === 'safety.psychosis-escalation')).toBe(true);
    expect(sr.issues.some((i) => i.rule === 'safety.psychosis-ritual')).toBe(false);

    const r = read('ritual.psyuml');
    const flagged = parseModel({ ...r, meta: { ...r.meta, safety: { psychosisFlag: true } } });
    const res = validate(flagged);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.rule === 'safety.psychosis-ritual')).toBe(true);
  });

  it('flags mixed-school provenance as info (§G.2)', () => {
    const m = read('state-map.psyuml');
    const mixed = parseModel({
      ...m,
      nodes: m.nodes.map((n, i) => ({
        ...n,
        properties: { ...n.properties, provenance: [i === 0 ? 'school:cbt' : 'school:cat'] },
      })),
    });
    const r = validate(mixed);
    expect(
      r.issues.some((i) => i.rule === 'provenance.mixed-school' && i.severity === 'info'),
    ).toBe(true);
    // info only — it must not block export.
    expect(
      r.issues.some((i) => i.rule === 'provenance.mixed-school' && i.severity === 'error'),
    ).toBe(false);
  });

  it('surfaces opposed origin-claims on a single node (§G.2, info)', () => {
    const m = read('state-map.psyuml');
    const opposed = parseModel({
      ...m,
      nodes: m.nodes.map((n, i) =>
        i === 0
          ? {
              ...n,
              properties: {
                ...n.properties,
                provenance: ['school:ifs', 'school:structural-dissociation'],
              },
            }
          : n,
      ),
    });
    const r = validate(opposed);
    const issue = r.issues.find((i) => i.rule === 'provenance.node-mixed-school');
    expect(issue?.severity).toBe('info');
    expect(issue?.nodeId).toBe(opposed.nodes[0]?.id);
    expect(r.ok).toBe(true); // info only, never blocks
  });
});

// CI corpus lint: every committed example must validate clean in both layers.
const corpus = readdirSync(new URL('../../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);

describe('examples corpus lint', () => {
  it('has the expected examples', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(4);
  });

  it.each(corpus)('%s validates clean in both layers', (name) => {
    const m = read(name);
    expect(validate(m, { layer: 'clinician' }).ok).toBe(true);
    expect(validate(m, { layer: 'client' }).ok).toBe(true);
  });
});
