/**
 * @psyuml/model — the school-agnostic canonical model.
 *
 * One immutable graph (nodes + edges + bands) that every view projects from
 * (ARCH §2). zod is the single source of truth: it gives both the runtime schema
 * (parse/validate) and the TypeScript types (via z.infer).
 *
 * Traceability: REQ-CORE-ONTOLOGY (§A), REQ-EPISTEMIC-STATUS, REQ-I18N, REQ-NOTATION.
 */
import { z } from 'zod';

export const PSYUML_MODEL_VERSION = '0.1.0';

/** i18n: localized text is a map of BCP-47 language tag → string (Source 3 C7). */
export const LocalizedText = z.record(z.string());
export type LocalizedText = z.infer<typeof LocalizedText>;

/** Dual-audience label: a clinician layer and an optional plain client layer. */
export const Label = z.object({
  clinician: LocalizedText,
  client: LocalizedText.optional(),
});
export type Label = z.infer<typeof Label>;

/**
 * Epistemic standing of an element — formulation is a working hypothesis (Source 3 C2).
 *
 * v0.2 §3 makes this the explicit **provenance axis** ("where the content came from"),
 * orthogonal to `confidence` ("how strongly it is held"). It adds three values that the
 * lived-experience critique surfaced: `jointly-agreed` (co-authored), `clinician-inferred`
 * (the clinician's interpretation, distinct from the client's report), and `contested`
 * (disputed standing — "jointly-agreed" can mask clinician dominance). The v0.1 values
 * are retained unchanged, so this is additive/backward-compatible.
 */
export const EpistemicStatus = z.enum([
  'reported',
  'observed',
  'inferred',
  'planned',
  'symbolic',
  'client-believed',
  'tradition-claimed',
  'jointly-agreed',
  'clinician-inferred',
  'contested',
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatus>;

/**
 * Interpretive standings (v0.2 §3): content arrived at by inference, clinician judgment,
 * disputed standing, or non-literal/symbolic framing — as opposed to *descriptive* content
 * that was directly reported, observed, jointly agreed, or planned. Rendering MUST
 * distinguish the two (v0.1 convention: solid vs dashed border). This is the single shared
 * predicate so renderers and lints agree on what counts as "interpretive".
 */
export const INTERPRETIVE_STATUSES: ReadonlySet<EpistemicStatus> = new Set([
  'inferred',
  'clinician-inferred',
  'contested',
  'symbolic',
]);
export function isInterpretive(status?: EpistemicStatus): boolean {
  return status !== undefined && INTERPRETIVE_STATUSES.has(status);
}

export const Tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Tier = z.infer<typeof Tier>;

/**
 * The node-like element kinds. Of the 8 core ontology categories (spec §A.1: State,
 * Agent/Part, Relation, Process/Transition, Intervention, Resource/Anchor, Context,
 * Temporal Structure), two — Relation and Process/Transition — are connectors and live in
 * `EdgeKind`; the rest are node-like here (with `self` as the distinguished Agent core),
 * so this enum has 7 members, not 8.
 */
export const NodeKind = z.enum([
  'state',
  'agent',
  'self',
  'resource',
  'intervention',
  'context',
  'temporal',
]);
export type NodeKind = z.infer<typeof NodeKind>;

/** Typed connector vocabulary (spec §C + Source 3 semantic labels). */
export const EdgeKind = z.enum([
  'sequential',
  'excitatory',
  'inhibitory',
  'reciprocal',
  'exit',
  'barrier',
  'containment',
  'invocation',
  'transference',
  'nestedWithin',
  'close',
  'conflict',
  'fused',
  'distant',
  'cutoff',
]);
export type EdgeKind = z.infer<typeof EdgeKind>;

/** Property bag (PT). Every visual channel stays redundant with text (spec §D). */
export const Properties = z.object({
  dominance: z.number().min(0).max(1).optional(),
  intensity: z.number().min(0).max(1).optional(),
  valence: z.number().min(-1).max(1).optional(),
  consolidation: z.enum(['consolidated', 'forming', 'liminal']).optional(),
  rigidity: z.number().min(0).max(1).optional(),
  weight: z.number().min(0).max(1).optional(),
  confidence: z.enum(['L', 'M', 'H']).optional(),
  epistemicStatus: EpistemicStatus.optional(),
  /**
   * Ontology-neutral "as-if" qualifier (v0.2 §4/§6): this internal node is named *as if*
   * it were an agent / part / voice / role, without asserting that metaphysics literally.
   * Keeps the Parts/Pattern families school-neutral — the model MUST NOT bake in one
   * metaphysics of mind, so the metaphor is flagged rather than reified.
   */
  asIf: z.boolean().optional(),
  /** Provenance tags, e.g. "school:CAT" — preserve opposed origin-claims (spec §G.2). */
  provenance: z.array(z.string()).optional(),
  /** Genogram index person (double border, spec §C). */
  index: z.boolean().optional(),
});
export type Properties = z.infer<typeof Properties>;

/** An ordered zone (polyvagal/WoT band, van Gennep phase). Pattern, not hue (spec §D). */
export const Band = z.object({
  id: z.string(),
  label: Label,
  order: z.number().int(),
  pattern: z.enum(['none', 'dots', 'diagonal', 'cross-hatch']).default('none'),
});
export type Band = z.infer<typeof Band>;

export const Node = z.object({
  id: z.string(),
  kind: NodeKind,
  label: Label,
  /** Optional Tier-3 stereotype tag, e.g. manager / firefighter / exile / Self (spec §K). */
  stereotype: z.string().optional(),
  tier: Tier.default(1),
  bandId: z.string().optional(),
  /** Manual placement for hand-laid-out diagrams (genogram/relational field; set by GUI drag). */
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  /** View flag for progressive reveal (UX-M7): hidden nodes + their edges are not rendered. */
  hidden: z.boolean().optional(),
  properties: Properties.default({}),
});
export type Node = z.infer<typeof Node>;

export const Edge = z.object({
  id: z.string(),
  kind: EdgeKind,
  source: z.string(),
  target: z.string(),
  label: Label.optional(),
  /** ⚑ precipitant on a transition (spec §B). */
  trigger: Label.optional(),
  /** Reinforcing / Balancing loop marker (spec §C). */
  loop: z.enum(['R', 'B']).optional(),
  /**
   * CAT-derived loop topology (v0.2 §4): the named *shape* of a maintaining loop —
   * `trap` (a self-confirming loop: actions meant to escape confirm the belief),
   * `dilemma` (a false-binary fork: polarized either/or), `snag` (a self-truncating loop:
   * sabotaging legitimate success). Tag the edge that closes/defines the loop. These are
   * three school-agnostic shapes of maladaptive loop — ontology-neutral, not a CAT-only tag.
   */
  loopTopology: z.enum(['trap', 'dilemma', 'snag']).optional(),
  properties: Properties.default({}),
});
export type Edge = z.infer<typeof Edge>;

export const DiagramType = z.enum([
  'state-map',
  'parts-map',
  'relational-field',
  'process-loop',
  'timeline',
  'intervention-sequence',
  'ritual',
  'decision-nav',
  'resource-anchor',
  'body-map',
  'mode-map',
  'two-triangles',
  'ladder',
  'three-circles',
  'venn',
  'bullseye',
  'tree-of-life',
  'schema-grid',
  'decisional-balance',
  'secure-base',
]);
export type DiagramType = z.infer<typeof DiagramType>;

/** Diagram-level metadata, incl. the client-facing disclaimer/crisis + safety flags. */
export const Meta = z
  .object({
    title: z.string().optional(),
    disclaimer: z.string().optional(),
    crisisResources: z.string().optional(),
    /** Recorded client consent to share/use this formulation (privacy + §L.2-r5 consent ethos). */
    consent: z
      .object({
        obtained: z.boolean().default(false),
        scope: z.string().optional(),
        date: z.string().optional(),
      })
      .optional(),
    /** Ritual diagrams must carry honest non-medical framing + a secular variant (spec §F, §L.2-r3). */
    ritual: z
      .object({
        framing: z.string().optional(),
        secularVariant: z.string().optional(),
      })
      .optional(),
    safety: z
      .object({
        psychosisFlag: z.boolean().default(false),
        acuteRiskFlag: z.boolean().default(false),
      })
      .default({}),
  })
  .default({});
export type Meta = z.infer<typeof Meta>;

export const PsyumlModel = z.object({
  version: z.string(),
  language: z.string().default('en'),
  diagram: DiagramType,
  meta: Meta,
  bands: z.array(Band).default([]),
  nodes: z.array(Node).default([]),
  edges: z.array(Edge).default([]),
});
export type PsyumlModel = z.infer<typeof PsyumlModel>;

/** Create an empty, well-versioned model for a diagram type. */
export function createEmptyModel(diagram: DiagramType = 'state-map'): PsyumlModel {
  return PsyumlModel.parse({ version: PSYUML_MODEL_VERSION, diagram });
}

/** Parse + validate a model from JSON text or a plain object. Throws on invalid input. */
export function parseModel(input: string | unknown): PsyumlModel {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  return PsyumlModel.parse(data);
}

/** Serialize a model to canonical, stable JSON (round-trips with `parseModel`). */
export function serializeModel(model: PsyumlModel): string {
  return JSON.stringify(PsyumlModel.parse(model), null, 2);
}

/** Resolve the best label string for a layer + language, with graceful fallback. */
export function getText(
  label: Label,
  layer: 'clinician' | 'client' = 'clinician',
  lang = 'en',
): string {
  const dict = layer === 'client' && label.client ? label.client : label.clinician;
  return dict[lang] ?? Object.values(dict)[0] ?? '';
}

/**
 * The distinct school-origin claims carried by a provenance list (spec §G.2).
 *
 * A claim is recorded either as an explicit `school:<id>` tag or as a bare token
 * (the form the examples use, e.g. `IFS`, `schema`, `SD`); a tag that carries some
 * *other* namespace (`source:`, `ref:`, …) is provenance but not a school claim and
 * is skipped. De-duplication is case-insensitive but the first-seen display casing is
 * kept, and order is preserved. This stays school-agnostic: it understands the
 * provenance *format*, not any particular school — so two claims on one element
 * (e.g. IFS's innate part vs. structural dissociation's trauma-made part) surface as
 * a genuine disagreement instead of being silently merged.
 */
export function schoolClaims(provenance?: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of provenance ?? []) {
    const t = raw.trim();
    if (!t) continue;
    let id: string;
    if (/^school:/i.test(t)) id = t.slice(t.indexOf(':') + 1).trim();
    else if (t.includes(':'))
      continue; // a different provenance namespace, not a school
    else id = t;
    const key = id.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}
