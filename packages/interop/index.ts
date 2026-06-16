/**
 * @psyuml/interop — a *lossy*, export-only bridge from the canonical model to FHIR R4 (v0.2 §7).
 *
 * FHIR has **no native formulation or genogram resource**, so this maps a PsyUML formulation onto
 * the closest standard resources (Composition / ClinicalImpression / Observation /
 * FamilyMemberHistory + List / CarePlan + Goal) and **documents what does not survive** (`loss`).
 * It is **not** a round-trip source of truth — there is no importer; the diagram stays canonical.
 * De-identified + audience-scoped by default (REQ-PRIVACY). An isolated leaf (ARCH/§8): nothing in
 * the workspace depends on it.
 *
 * Traceability: REQ-INTEROP-FHIR, REQ-PRIVACY.
 */
import { getText, type PsyumlModel } from '@psyuml/model';
import { deidentify, scopeToLayer } from '@psyuml/privacy';
import { z } from 'zod';

/** The audience scope an export is cut for (v0.2 §6). Drives the label layer + redaction posture. */
export type ExportScope = 'record' | 'client' | 'research' | 'teaching';

/** A FHIR terminology coding — supplied by the caller; PsyUML never invents clinical codes. */
export interface FhirCoding {
  /** e.g. "http://snomed.info/sct" or "http://loinc.org". */
  system: string;
  code: string;
  display?: string;
}

export interface FhirExportOptions {
  /** Audience scope (§6). `client` uses the plain client layer; default `record` (clinician). */
  scope?: ExportScope;
  /** De-identify free-text labels + use a pseudonymous subject. Default **true** (REQ-PRIVACY). */
  deidentify?: boolean;
  /** Extra exact name terms to redact (e.g. ['Rachel', 'R.']). */
  redactTerms?: string[];
  /**
   * Optional **terminology binding** keyed by node id: a SNOMED/LOINC `Coding` (or codings) to
   * attach to that node's `CodeableConcept`. PsyUML ships **no** code map — clinical codes are a
   * deployment's validated value sets, never fabricated here; nodes with no entry stay text-only.
   */
  coding?: Record<string, FhirCoding | FhirCoding[]>;
  lang?: string;
}

/** A single documented thing the FHIR mapping could not carry (§7 MUST: limits are documented). */
export interface LossItem {
  what: string;
  detail: string;
}
export interface LossReport {
  /** Round-trip is explicitly not offered; this is always present. */
  roundTrip: false;
  items: LossItem[];
}

export interface FhirExportResult {
  /** The emitted FHIR R4 document Bundle. */
  bundle: FhirBundle;
  /** What did not survive the mapping — the honest companion to the bundle (§7). */
  loss: LossReport;
  scope: ExportScope;
  deidentified: boolean;
  /** Recorded client-consent status carried from the model (privacy / §6). */
  consent: { obtained: boolean; scope?: string };
}

// --- the FHIR R4 subset we emit (a *subset* schema — not a full FHIR validator) ----------------

const Coding = z.object({
  system: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
});
const CodeableConcept = z.object({
  text: z.string().optional(),
  coding: z.array(Coding).optional(),
});
const Reference = z.object({ reference: z.string().optional(), display: z.string().optional() });
const Narrative = z.object({ status: z.string(), div: z.string() });

const Composition = z.object({
  resourceType: z.literal('Composition'),
  status: z.string(),
  type: CodeableConcept,
  date: z.string(),
  author: z.array(Reference).min(1),
  title: z.string(),
  subject: Reference.optional(),
  section: z
    .array(
      z.object({
        title: z.string().optional(),
        text: Narrative.optional(),
        entry: z.array(Reference).optional(),
      }),
    )
    .optional(),
});
const ClinicalImpression = z.object({
  resourceType: z.literal('ClinicalImpression'),
  status: z.string(),
  subject: Reference,
  description: z.string().optional(),
  summary: z.string().optional(),
  finding: z
    .array(z.object({ itemReference: Reference.optional(), basis: z.string().optional() }))
    .optional(),
});
const Observation = z.object({
  resourceType: z.literal('Observation'),
  status: z.string(),
  code: CodeableConcept,
  subject: Reference.optional(),
  category: z.array(CodeableConcept).optional(),
  valueString: z.string().optional(),
});
const CarePlan = z.object({
  resourceType: z.literal('CarePlan'),
  status: z.string(),
  intent: z.string(),
  subject: Reference,
  description: z.string().optional(),
  goal: z.array(Reference).optional(),
  activity: z
    .array(
      z.object({ detail: z.object({ status: z.string(), description: z.string().optional() }) }),
    )
    .optional(),
});
const Goal = z.object({
  resourceType: z.literal('Goal'),
  lifecycleStatus: z.string(),
  description: CodeableConcept,
  subject: Reference,
});
const FamilyMemberHistory = z.object({
  resourceType: z.literal('FamilyMemberHistory'),
  status: z.string(),
  patient: Reference,
  relationship: CodeableConcept,
  name: z.string().optional(),
});
const List = z.object({
  resourceType: z.literal('List'),
  status: z.string(),
  mode: z.string(),
  title: z.string().optional(),
  entry: z.array(z.object({ item: Reference })).optional(),
});

const FhirResource = z.discriminatedUnion('resourceType', [
  Composition,
  ClinicalImpression,
  Observation,
  CarePlan,
  Goal,
  FamilyMemberHistory,
  List,
]);
export type FhirResource = z.infer<typeof FhirResource>;

export const FhirBundle = z.object({
  resourceType: z.literal('Bundle'),
  type: z.literal('document'),
  timestamp: z.string().optional(),
  entry: z.array(z.object({ fullUrl: z.string(), resource: FhirResource })).default([]),
});
export type FhirBundle = z.infer<typeof FhirBundle>;

export interface FhirValidationIssue {
  rule: string;
  message: string;
}
export interface FhirValidation {
  ok: boolean;
  issues: FhirValidationIssue[];
}

const BASE = 'https://psyuml.example/fhir';
const SUBJECT_DEID: Reference = {
  reference: 'Patient/anonymous',
  display: 'de-identified subject',
};
type Reference = z.infer<typeof Reference>;

const cc = (text: string): z.infer<typeof CodeableConcept> => ({ text });
const escXml = (s: string): string =>
  s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
const narrative = (s: string): z.infer<typeof Narrative> => ({
  status: 'generated',
  div: `<div xmlns="http://www.w3.org/1999/xhtml">${escXml(s)}</div>`,
});

/** A plain-text formulation summary (no renderer dependency) — kept honestly non-diagnostic. */
function summarize(model: PsyumlModel, layer: 'clinician' | 'client', lang: string): string {
  const title = model.meta.title ? `${getModelTitle(model)}. ` : '';
  const lead = model.nodes
    .slice(0, 4)
    .map((n) => getText(n.label, layer, lang))
    .filter(Boolean)
    .join('; ');
  return (
    `${title}A ${model.diagram} formulation: ${model.nodes.length} elements, ${model.edges.length} links` +
    `${lead ? ` (e.g. ${lead})` : ''}. A collaborative working hypothesis — not a diagnosis.`
  );
}
const getModelTitle = (model: PsyumlModel): string => model.meta.title ?? 'Case formulation';

/**
 * Export a model to a **lossy** FHIR R4 document Bundle (§7). De-identified + audience-scoped by
 * default; returns the bundle, a documented `loss` report, and the carried consent status. There is
 * deliberately **no** inverse (`fromFhir`): the mapping drops structure (see `loss`) and the diagram
 * remains the source of truth.
 */
export function toFhir(model: PsyumlModel, options: FhirExportOptions = {}): FhirExportResult {
  const scope: ExportScope = options.scope ?? 'record';
  const deid = options.deidentify ?? true;
  const lang = options.lang ?? model.language ?? 'en';
  const layer: 'clinician' | 'client' = scope === 'client' ? 'client' : 'clinician';

  // Audience scope first (client → plain layer), then de-identify free text.
  let scoped = scope === 'client' ? scopeToLayer(model, 'client') : model;
  if (deid) scoped = deidentify(scoped, { terms: options.redactTerms }).model;
  const subject: Reference = deid ? SUBJECT_DEID : { display: getModelTitle(model) };

  const entries: { fullUrl: string; resource: FhirResource }[] = [];
  const add = (resource: FhirResource, id: string): string => {
    const fullUrl = `${BASE}/${resource.resourceType}/${id}`;
    entries.push({ fullUrl, resource });
    return fullUrl;
  };

  // Terminology binding (caller-supplied; never fabricated): a node's CodeableConcept gets the
  // SNOMED/LOINC coding(s) mapped to its id, alongside the text. Unmapped nodes stay text-only.
  const codingMap = options.coding ?? {};
  let codedCount = 0;
  const codeFor = (id: string, text: string): z.infer<typeof CodeableConcept> => {
    const entry = codingMap[id];
    if (!entry) return { text };
    const coding = Array.isArray(entry) ? entry : [entry];
    if (coding.length) codedCount += 1;
    return { text, coding };
  };

  const isRelational = scoped.diagram === 'relational-field';
  const interventions: typeof scoped.nodes = [];
  const resources: typeof scoped.nodes = [];
  const findingRefs: Reference[] = [];
  const fmhRefs: Reference[] = [];
  const droppedKinds = new Set<string>();

  for (const node of scoped.nodes) {
    const name = getText(node.label, layer, lang) || node.id;
    if (isRelational) {
      // The index person is the Patient (subject), not a separate resource.
      if (node.kind === 'self' || node.properties.index === true) continue;
      if (node.kind === 'agent') {
        // Relational people → FamilyMemberHistory. EDGE SEMANTICS (cutoff/fusion/conflict/closeness)
        // are NOT represented here — that is the documented genogram loss below.
        const rel = relationshipOf(scoped, node.id);
        const url = add(
          {
            resourceType: 'FamilyMemberHistory',
            status: 'completed',
            patient: subject,
            relationship: cc(rel),
            name,
          },
          `fmh-${node.id}`,
        );
        fmhRefs.push({ reference: url, display: name });
        droppedKinds.add('relational-edges');
        continue;
      }
    }
    if (node.kind === 'intervention') {
      interventions.push(node);
      continue;
    }
    if (node.kind === 'resource') {
      resources.push(node);
      continue;
    }
    // States, parts, contexts, temporal structures, the Self → Observations (NOT Conditions:
    // PsyUML asserts nothing nosological, §A.3 — only use Condition where a node *is* a diagnosis).
    const url = add(
      {
        resourceType: 'Observation',
        status: 'preliminary',
        code: codeFor(node.id, name),
        subject,
        category: [cc(`psyuml:${node.kind}`)],
      },
      `obs-${node.id}`,
    );
    findingRefs.push({ reference: url, display: name });
  }

  // CarePlan + Goals from the treatment direction (interventions = activities; resources = goals).
  const goalRefs: Reference[] = [];
  for (const r of resources) {
    const name = getText(r.label, layer, lang) || r.id;
    const url = add(
      {
        resourceType: 'Goal',
        lifecycleStatus: 'proposed',
        description: codeFor(r.id, name),
        subject,
      },
      `goal-${r.id}`,
    );
    goalRefs.push({ reference: url, display: name });
  }
  let carePlanRef: Reference | undefined;
  if (interventions.length || goalRefs.length) {
    const url = add(
      {
        resourceType: 'CarePlan',
        status: 'draft',
        intent: 'plan',
        subject,
        description: 'Treatment direction (export of the formulation; not prescriptive).',
        goal: goalRefs.length ? goalRefs : undefined,
        activity: interventions.length
          ? interventions.map((i) => ({
              detail: { status: 'not-started', description: getText(i.label, layer, lang) || i.id },
            }))
          : undefined,
      },
      'careplan',
    );
    carePlanRef = { reference: url, display: 'Care plan' };
  }

  // A List grouping the family members (relational diagrams only).
  let listRef: Reference | undefined;
  if (fmhRefs.length) {
    const url = add(
      {
        resourceType: 'List',
        status: 'current',
        mode: 'snapshot',
        title: 'Relational field',
        entry: fmhRefs.map((item) => ({ item })),
      },
      'list-family',
    );
    listRef = { reference: url, display: 'Relational field' };
  }

  const summary = summarize(scoped, layer, lang);

  // ClinicalImpression — the closest native match for a formulation; deliberately fixes NO diagnosis.
  const ciUrl = add(
    {
      resourceType: 'ClinicalImpression',
      status: 'completed',
      subject,
      description: 'PsyUML case formulation (non-diagnostic; a working hypothesis).',
      summary,
      finding: findingRefs.length
        ? findingRefs.map((itemReference) => ({ itemReference }))
        : undefined,
    },
    'impression',
  );

  // Composition — the attestable document root; sections reference the resources above.
  const sectionEntries = [{ reference: ciUrl, display: 'Formulation' }, ...findingRefs];
  if (carePlanRef) sectionEntries.push(carePlanRef);
  if (listRef) sectionEntries.push(listRef);
  add(
    {
      resourceType: 'Composition',
      status: 'preliminary',
      type: cc('Psychotherapy case formulation'),
      date: new Date(0).toISOString(),
      author: [{ display: 'PsyUML (export tool)' }],
      title: getModelTitle(scoped),
      subject,
      section: [{ title: 'Formulation', text: narrative(summary), entry: sectionEntries }],
    },
    'composition',
  );

  // Composition is the document root → it MUST be the first entry of a document Bundle.
  entries.unshift(entries.pop()!);

  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date(0).toISOString(),
    entry: entries,
  };

  return {
    bundle,
    loss: buildLoss(model, scoped, droppedKinds, codedCount),
    scope,
    deidentified: deid,
    consent: { obtained: model.meta.consent?.obtained ?? false, scope: model.meta.consent?.scope },
  };
}

/** Summarize a relational node's relationship from its incident edges (a lossy, text-only proxy). */
function relationshipOf(model: PsyumlModel, id: string): string {
  const kinds = model.edges.filter((e) => e.source === id || e.target === id).map((e) => e.kind);
  if (kinds.length === 0) return 'family member';
  return `family member (ties: ${[...new Set(kinds)].join(', ')})`;
}

/** Build the documented loss report (§7 MUST). Lists both the structural limits and what was present-and-dropped. */
function buildLoss(
  original: PsyumlModel,
  scoped: PsyumlModel,
  droppedKinds: Set<string>,
  codedCount: number,
): LossReport {
  const items: LossItem[] = [
    {
      what: 'no-native-formulation-resource',
      detail:
        'FHIR has no formulation resource; Composition + ClinicalImpression only approximate it.',
    },
    {
      what: 'node-typing-in-extension',
      detail:
        'PsyUML node kinds are carried as an Observation.category text (psyuml:<kind>), not a native FHIR type.',
    },
    {
      what: 'non-diagnostic',
      detail:
        'Internal nodes map to Observation, never Condition — PsyUML asserts nothing nosological (§A.3).',
    },
    codedCount === 0
      ? {
          what: 'terminology-text-only',
          detail:
            'Concepts are CodeableConcept text only — no SNOMED/LOINC codes bound. Supply `coding` (per node id) to bind to your validated value sets; PsyUML never fabricates clinical codes.',
        }
      : {
          what: 'terminology-partial',
          detail: `${codedCount} concept(s) carry a caller-supplied SNOMED/LOINC code; the rest are text-only.`,
        },
  ];
  if (
    scoped.diagram === 'relational-field' ||
    original.diagram === 'relational-field' ||
    droppedKinds.has('relational-edges')
  ) {
    items.push({
      what: 'relational-edge-semantics',
      detail:
        'Genogram/relational edge semantics (cutoff, fusion, conflict, closeness, attachment quality) are NOT represented — FamilyMemberHistory carries only a relationship label. The diagram stays source-of-truth.',
    });
  }
  if (original.edges.some((e) => e.loopTopology))
    items.push({
      what: 'loop-topology',
      detail: 'CAT loop topologies (trap/dilemma/snag) are not represented in FHIR.',
    });
  if (original.bands.length)
    items.push({
      what: 'bands-phases',
      detail: 'Ordered zones / arousal bands / ritual phases are not represented.',
    });
  if (original.meta.ritual)
    items.push({
      what: 'ritual-framing',
      detail: 'Ritual framing + secular-variant fields are not represented.',
    });
  if (
    original.nodes.some(
      (n) =>
        n.properties.provenance?.length || n.properties.confidence || n.properties.epistemicStatus,
    )
  )
    items.push({
      what: 'provenance-confidence-standing',
      detail:
        'Provenance/school tags, confidence (L/M/H), epistemic standing, and the as-if qualifier are not represented.',
    });
  if (original.edges.some((e) => e.trigger))
    items.push({
      what: 'edge-triggers',
      detail: 'Edge triggers/precipitants are not represented.',
    });
  return { roundTrip: false, items };
}

/**
 * Validate an emitted bundle against the FHIR R4 **subset** this module produces (required fields +
 * resourceTypes) and check **reference integrity** — every intra-bundle reference resolves to an
 * entry. This is a structural conformance check for the resources we emit, *not* a full FHIR
 * validator (external refs like `Patient/anonymous` / `Device/...` are allowed without resolution).
 */
export function validateFhirBundle(bundle: unknown): FhirValidation {
  const parsed = FhirBundle.safeParse(bundle);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((e) => ({
        rule: 'fhir.shape',
        message: `${e.path.join('.') || '(root)'}: ${e.message}`,
      })),
    };
  }
  const b = parsed.data;
  const issues: FhirValidationIssue[] = [];
  const urls = new Set(b.entry.map((e) => e.fullUrl));
  if (!b.entry.length || b.entry[0]?.resource.resourceType !== 'Composition')
    issues.push({
      rule: 'fhir.document-root',
      message: 'A document Bundle must start with a Composition.',
    });
  // Every intra-bundle reference (one of our own fullUrls' base) must resolve.
  const refs: (Reference | undefined)[] = [];
  for (const { resource } of b.entry) {
    if (resource.resourceType === 'Composition')
      for (const s of resource.section ?? []) refs.push(...(s.entry ?? []));
    if (resource.resourceType === 'ClinicalImpression')
      for (const f of resource.finding ?? []) refs.push(f.itemReference);
    if (resource.resourceType === 'CarePlan') refs.push(...(resource.goal ?? []));
    if (resource.resourceType === 'List') for (const e of resource.entry ?? []) refs.push(e.item);
  }
  for (const r of refs) {
    const ref = r?.reference;
    if (ref && ref.startsWith(BASE) && !urls.has(ref))
      issues.push({
        rule: 'fhir.dangling-reference',
        message: `Reference does not resolve in the bundle: ${ref}`,
      });
  }
  return { ok: issues.length === 0, issues };
}
