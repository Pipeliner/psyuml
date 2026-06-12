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

/** Epistemic standing of an element — formulation is a working hypothesis (Source 3 C2). */
export const EpistemicStatus = z.enum([
  'reported',
  'observed',
  'inferred',
  'planned',
  'symbolic',
  'client-believed',
  'tradition-claimed',
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatus>;

export const Tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Tier = z.infer<typeof Tier>;

/** The 8 core element categories that are node-like (spec §A.1). */
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
  /** Provenance tags, e.g. "school:CAT" — preserve opposed origin-claims (spec §G.2). */
  provenance: z.array(z.string()).optional(),
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
  tier: Tier.default(1),
  bandId: z.string().optional(),
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
]);
export type DiagramType = z.infer<typeof DiagramType>;

/** Diagram-level metadata, incl. the client-facing disclaimer/crisis + safety flags. */
export const Meta = z
  .object({
    title: z.string().optional(),
    disclaimer: z.string().optional(),
    crisisResources: z.string().optional(),
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
