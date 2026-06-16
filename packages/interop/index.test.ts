import { describe, expect, it } from 'vitest';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { toFhir, validateFhirBundle, FhirBundle } from './index';

const partsModel = (): PsyumlModel =>
  parseModel({
    version: '0.1.0',
    diagram: 'parts-map',
    meta: { title: 'Parts', disclaimer: 'x' },
    nodes: [
      { id: 'self', kind: 'self', label: { clinician: { en: 'Self' } } },
      { id: 'critic', kind: 'agent', label: { clinician: { en: 'Inner critic' } } },
      { id: 'shame', kind: 'state', label: { clinician: { en: 'Shame' } } },
      { id: 'skill', kind: 'intervention', label: { clinician: { en: 'Self-compassion break' } } },
      { id: 'anchor', kind: 'resource', label: { clinician: { en: 'Walking outdoors' } } },
    ],
    edges: [{ id: 'e', kind: 'containment', source: 'self', target: 'critic' }],
  });

const genoModel = (): PsyumlModel =>
  parseModel({
    version: '0.1.0',
    diagram: 'relational-field',
    meta: { title: 'Family' },
    nodes: [
      {
        id: 'me',
        kind: 'self',
        label: { clinician: { en: 'Index' } },
        properties: { index: true },
      },
      { id: 'mum', kind: 'agent', label: { clinician: { en: 'Mother' } } },
      { id: 'dad', kind: 'agent', label: { clinician: { en: 'Father' } } },
    ],
    edges: [
      { id: 'c', kind: 'cutoff', source: 'me', target: 'dad' },
      { id: 'f', kind: 'fused', source: 'me', target: 'mum' },
    ],
  });

const types = (b: FhirBundle): string[] => b.entry.map((e) => e.resource.resourceType);

describe('@psyuml/interop — lossy FHIR export (v0.2 §7)', () => {
  it('emits a valid FHIR document Bundle (Composition first, references resolve)', () => {
    const { bundle } = toFhir(partsModel());
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('document');
    expect(bundle.entry[0]?.resource.resourceType).toBe('Composition');
    const v = validateFhirBundle(bundle);
    expect(v.ok).toBe(true);
    expect(v.issues).toEqual([]);
  });

  it('maps the formulation onto the §7 resource set (non-diagnostic: Observation, never Condition)', () => {
    const t = types(toFhir(partsModel()).bundle);
    expect(t).toContain('Composition');
    expect(t).toContain('ClinicalImpression');
    expect(t).toContain('Observation'); // self / part / state
    expect(t).toContain('CarePlan'); // intervention
    expect(t).toContain('Goal'); // resource
    // never asserts a diagnosis
    expect(t).not.toContain('Condition');
    // PsyUML node-typing rides an Observation category, not a native FHIR type
    const obs = toFhir(partsModel()).bundle.entry.find(
      (e) => e.resource.resourceType === 'Observation',
    );
    expect((obs?.resource as { category?: { text?: string }[] }).category?.[0]?.text).toMatch(
      /^psyuml:/,
    );
  });

  it('genogram → FamilyMemberHistory + List, and records the edge-semantics loss', () => {
    const { bundle, loss } = toFhir(genoModel());
    const t = types(bundle);
    expect(t.filter((x) => x === 'FamilyMemberHistory')).toHaveLength(2); // mother + father (index is the subject)
    expect(t).toContain('List');
    expect(validateFhirBundle(bundle).ok).toBe(true);
    // the cutoff/fused edge semantics do NOT survive — and we say so
    expect(loss.roundTrip).toBe(false);
    expect(loss.items.some((i) => i.what === 'relational-edge-semantics')).toBe(true);
  });

  it('is de-identified by default (pseudonymous subject) and redacts named terms', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { disclaimer: 'x' },
      nodes: [{ id: 'a', kind: 'state', label: { clinician: { en: 'Rachel feels calm' } } }],
    });
    const { bundle, deidentified } = toFhir(m, { redactTerms: ['Rachel'] });
    expect(deidentified).toBe(true);
    const json = JSON.stringify(bundle);
    expect(json).not.toContain('Rachel');
    expect(json).toContain('Patient/anonymous');
  });

  it('documents loss for topology / bands / provenance / triggers when present', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'process-loop',
      meta: { disclaimer: 'x' },
      bands: [{ id: 'b', label: { clinician: { en: 'Zone' } }, order: 0 }],
      nodes: [
        {
          id: 'a',
          kind: 'state',
          label: { clinician: { en: 'A' } },
          properties: { confidence: 'L', provenance: ['school:cat'] },
        },
        { id: 'b2', kind: 'state', label: { clinician: { en: 'B' } } },
        { id: 'out', kind: 'resource', label: { clinician: { en: 'Way out' } } },
      ],
      edges: [
        {
          id: 'e1',
          kind: 'sequential',
          source: 'a',
          target: 'b2',
          trigger: { clinician: { en: 'trigger' } },
        },
        {
          id: 'e2',
          kind: 'sequential',
          source: 'b2',
          target: 'a',
          loop: 'R',
          loopTopology: 'trap',
        },
        { id: 'x', kind: 'exit', source: 'b2', target: 'out' },
      ],
    });
    const { loss } = toFhir(m);
    const whats = loss.items.map((i) => i.what);
    expect(whats).toContain('loop-topology');
    expect(whats).toContain('bands-phases');
    expect(whats).toContain('provenance-confidence-standing');
    expect(whats).toContain('edge-triggers');
  });

  it('client scope renders the client layer', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { disclaimer: 'x' },
      nodes: [
        {
          id: 'a',
          kind: 'state',
          label: { clinician: { en: 'Dissociation' }, client: { en: 'Foggy' } },
        },
      ],
    });
    const recordJson = JSON.stringify(toFhir(m, { deidentify: false, scope: 'record' }).bundle);
    const clientJson = JSON.stringify(toFhir(m, { deidentify: false, scope: 'client' }).bundle);
    expect(recordJson).toContain('Dissociation');
    expect(clientJson).toContain('Foggy');
    expect(clientJson).not.toContain('Dissociation');
  });

  it('validateFhirBundle catches a dangling intra-bundle reference', () => {
    const { bundle } = toFhir(partsModel());
    const ci = bundle.entry.find((e) => e.resource.resourceType === 'ClinicalImpression')!;
    (ci.resource as { finding?: { itemReference?: { reference?: string } }[] }).finding = [
      { itemReference: { reference: 'https://psyuml.example/fhir/Observation/does-not-exist' } },
    ];
    const v = validateFhirBundle(bundle);
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.rule === 'fhir.dangling-reference')).toBe(true);
  });

  it('carries consent status and never offers a round-trip', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { disclaimer: 'x', consent: { obtained: true, scope: 'share with GP' } },
      nodes: [{ id: 'a', kind: 'state', label: { clinician: { en: 'A' } } }],
    });
    const res = toFhir(m);
    expect(res.consent.obtained).toBe(true);
    expect(res.consent.scope).toBe('share with GP');
    expect(res.loss.roundTrip).toBe(false);
  });

  it('binds caller-supplied SNOMED/LOINC codings to a node CodeableConcept (never fabricated)', () => {
    // by default, concepts are text-only — no codes invented
    const plain = toFhir(partsModel());
    const obs0 = plain.bundle.entry.find((e) => e.resource.resourceType === 'Observation')!
      .resource as { code: { coding?: unknown[] } };
    expect(obs0.code.coding).toBeUndefined();
    expect(plain.loss.items.some((i) => i.what === 'terminology-text-only')).toBe(true);

    // a caller supplies a coding for the 'shame' node → it lands on that Observation's code
    const coded = toFhir(partsModel(), {
      coding: { shame: { system: 'http://snomed.info/sct', code: '00000', display: 'Shame' } },
    });
    const shame = coded.bundle.entry
      .map((e) => e.resource)
      .find(
        (r) =>
          r.resourceType === 'Observation' &&
          (r as { code: { text?: string } }).code.text === 'Shame',
      ) as { code: { coding?: { system?: string; code?: string }[] } } | undefined;
    expect(shame?.code.coding?.[0]?.system).toBe('http://snomed.info/sct');
    expect(shame?.code.coding?.[0]?.code).toBe('00000');
    expect(validateFhirBundle(coded.bundle).ok).toBe(true);
    expect(coded.loss.items.some((i) => i.what === 'terminology-partial')).toBe(true);
  });
});
