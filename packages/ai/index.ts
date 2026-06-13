/**
 * @psyuml/ai — bounded narrative → *draft* model assist (M8).
 *
 * This package is the GUARDRAILS, not a model. The actual narrative→suggestions step is a
 * pluggable `Extractor` (default: a no-op) so an LLM-backed extractor can drop in later
 * without changing the safety envelope — and so removing/ignoring this package leaves the
 * editor fully functional. Everything the spec's M8 acceptance demands is enforced and
 * tested here, with no live model call:
 *
 *   1. CONSENT — without explicit `consented: true`, nothing is processed.
 *   2. PII MINIMIZATION — the narrative is de-identified (`@psyuml/privacy`) before the
 *      extractor ever sees it.
 *   3. SAFETY TRIAGE — if the model already requires human escalation, or the narrative trips
 *      a coarse acute-risk / psychosis marker, the pipeline HALTS and escalates *before* any
 *      extraction. (A safety net to route to a human, not a clinical risk assessment.)
 *   4. FORMULATION-ONLY, LOW-CONFIDENCE — every suggestion is wrapped at confidence "L" with
 *      epistemicStatus "inferred"; suggestions are *proposals* for human review.
 *   5. NEVER AUTO-APPLIED — `assist` only returns suggestions; `applySuggestions` is a
 *      separate, explicit step a human invokes after accepting them.
 *
 * Out of scope (by design, mirroring the spec): diagnosis / severity, safeguard-bypass
 * prompting, autonomous formulation, live-care recommendations.
 *
 * Traceability: REQ-AI-ASSIST (§A.3 formulation-not-nosology), REQ-SAFETY-TRIAGE, REQ-PRIVACY.
 */
import type { Edge, EdgeKind, Node, NodeKind, PsyumlModel } from '@psyuml/model';
import { parseModel } from '@psyuml/model';
import { requiresHumanEscalation } from '@psyuml/validate';
import { redactText, type TextRedaction } from '@psyuml/privacy';

export interface RawNodeSuggestion {
  kind: 'node';
  id?: string;
  nodeKind: NodeKind;
  label: string;
}
export interface RawEdgeSuggestion {
  kind: 'edge';
  id?: string;
  source: string;
  target: string;
  edgeKind: EdgeKind;
  label?: string;
}
export type RawSuggestion = RawNodeSuggestion | RawEdgeSuggestion;

/** narrative (ALREADY de-identified) + the current model → raw, unwrapped suggestions.
 *  Pure and synchronous here; an async LLM wrapper can adapt to it. */
export type Extractor = (deidentifiedNarrative: string, model: PsyumlModel) => RawSuggestion[];

/** The default extractor ships nothing — plug in an LLM-backed one (model-agnostic). */
export const noopExtractor: Extractor = () => [];

export interface NodeSuggestion {
  kind: 'node';
  node: Node;
}
export interface EdgeSuggestion {
  kind: 'edge';
  edge: Edge;
}
export type Suggestion = NodeSuggestion | EdgeSuggestion;

export interface AssistOptions {
  /** The diagram the suggestions target (used for escalation + id-collision avoidance). */
  model: PsyumlModel;
  /** Explicit informed consent to process the narrative. Required — no consent, no processing. */
  consented: boolean;
  /** Names/terms to strip before processing (PII minimization). */
  terms?: string[];
}

export type AssistStatus = 'ok' | 'no-consent' | 'escalated';

export interface AssistResult {
  status: AssistStatus;
  /** Proposed additions for HUMAN review — never applied. All low-confidence. */
  suggestions: Suggestion[];
  /** What PII was stripped before processing. */
  redactions: TextRedaction[];
  /** Why it halted, for 'no-consent' / 'escalated'. */
  message?: string;
}

// Coarse safety nets — route to a human, deliberately broad, NOT a risk assessment.
const ACUTE_RISK =
  /\b(suicid|kill (myself|him|her|them)|end (my|his|her) life|self[- ]harm|overdose|take my (own )?life)\b/i;
const PSYCHOSIS =
  /\b(hearing voices|voices (telling|told)|hallucinat|psychosis|psychotic|delusion)\b/i;

function freshId(prefix: string, used: Set<string>): string {
  let i = 1;
  while (used.has(`${prefix}${i}`)) i += 1;
  const id = `${prefix}${i}`;
  used.add(id);
  return id;
}

/** Wrap a raw node suggestion into a validated, low-confidence Node. */
function wrapNode(s: RawNodeSuggestion, id: string): Node {
  return parseModel({
    version: '0.1.0',
    diagram: 'state-map',
    nodes: [
      {
        id,
        kind: s.nodeKind,
        label: { clinician: { en: s.label } },
        properties: { confidence: 'L', epistemicStatus: 'inferred' },
      },
    ],
  }).nodes[0];
}

/** Wrap a raw edge suggestion into a low-confidence Edge. */
function wrapEdge(s: RawEdgeSuggestion, id: string): Edge {
  return {
    id,
    kind: s.edgeKind,
    source: s.source,
    target: s.target,
    ...(s.label ? { label: { clinician: { en: s.label } } } : {}),
    properties: { confidence: 'L', epistemicStatus: 'inferred' },
  };
}

/**
 * Run the bounded assist pipeline. Returns proposals for human review; never mutates the
 * model and never applies anything. `extractor` defaults to the no-op (ships no model call).
 */
export function assist(
  narrative: string,
  options: AssistOptions,
  extractor: Extractor = noopExtractor,
): AssistResult {
  if (!options.consented) {
    return {
      status: 'no-consent',
      suggestions: [],
      redactions: [],
      message: 'No consent recorded — nothing was processed.',
    };
  }

  // PII minimization happens before anything else looks at the text.
  const { text: clean, redactions } = redactText(narrative, { terms: options.terms });

  // Safety triage — halt and escalate before any extraction.
  if (requiresHumanEscalation(options.model) || ACUTE_RISK.test(clean) || PSYCHOSIS.test(clean)) {
    return {
      status: 'escalated',
      suggestions: [],
      redactions,
      message:
        'Halted: route to a human now. A risk flag is set or the narrative trips an acute-risk / psychosis marker. This tool does not assess risk or handle crises.',
    };
  }

  const used = new Set(options.model.nodes.map((n) => n.id));
  const suggestions: Suggestion[] = extractor(clean, options.model).map((s) =>
    s.kind === 'node'
      ? { kind: 'node', node: wrapNode(s, s.id ?? freshId('ai_n', used)) }
      : { kind: 'edge', edge: wrapEdge(s, s.id ?? freshId('ai_e', used)) },
  );

  return { status: 'ok', suggestions, redactions };
}

/**
 * Explicitly merge human-accepted suggestions into a model (the separate accept step).
 * Returns a new validated model; the input is untouched.
 */
export function applySuggestions(model: PsyumlModel, accepted: Suggestion[]): PsyumlModel {
  const nodes = accepted.filter((s): s is NodeSuggestion => s.kind === 'node').map((s) => s.node);
  const edges = accepted.filter((s): s is EdgeSuggestion => s.kind === 'edge').map((s) => s.edge);
  return parseModel({
    ...model,
    nodes: [...model.nodes, ...nodes],
    edges: [...model.edges, ...edges],
  });
}
