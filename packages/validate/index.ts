/**
 * @psyuml/validate — well-formedness + clinical-safety lint (M3).
 *
 * Rule classes: well-formedness (§A.2), and the safety lints the UX research made
 * binding — path-of-hope (a map of only problems can harm), crisis no-dead-ends +
 * crisis-resources (UX-M4), the client-facing disclaimer gate (§A.2-r7, §L.2), the
 * clinical-hazard safety triage that acts on a clinician's risk flags (§L.2, M3), and
 * cross-school provenance awareness so opposed origin-claims stay visible (§G.2).
 * `ok` is false when any error-severity issue is present (used to gate client export).
 * `requiresHumanEscalation` is the gate AI-assist (M8) and the UI banner read to halt
 * autonomous formulation when an acute-risk / psychosis flag is set.
 *
 * Traceability: REQ-WELLFORMEDNESS, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE,
 * REQ-ETHICS-GUARDRAILS, REQ-CROSS-SCHOOL.
 */
import { getText, type PsyumlModel } from '@psyuml/model';

export type Severity = 'error' | 'warn' | 'info';

export interface ValidationIssue {
  rule: string;
  severity: Severity;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface ValidateOptions {
  layer?: 'clinician' | 'client';
}

// Diagram types that can be shown to a client and so must carry a standing disclaimer
// (§A.2-r7, §L.2). `process-loop` is included: a maintaining-cycle map is routinely shared
// with clients (CBT/CAT), and it renders in the client layer, so it is gated like the rest.
// `two-triangles` is intentionally NOT here — Malan's triangles are a clinician/supervision
// formulation aid, not a client handout.
const CLIENT_FACING = new Set([
  'state-map',
  'parts-map',
  'mode-map',
  'relational-field',
  'body-map',
  'decision-nav',
  'resource-anchor',
  'process-loop',
  'timeline',
  'intervention-sequence',
  'ritual',
]);
// Path-of-hope applies to maintaining-cycle diagrams (spec §A.2-r5). Timelines are
// trajectories whose preferred-future column is the structural hope, so they are excluded.
const CYCLE_DIAGRAMS = new Set(['state-map', 'parts-map', 'process-loop', 'mode-map']);

export function validate(model: PsyumlModel, options: ValidateOptions = {}): ValidationResult {
  const layer = options.layer ?? 'clinician';
  const issues: ValidationIssue[] = [];
  const add = (rule: string, severity: Severity, message: string, nodeId?: string): void => {
    issues.push({ rule, severity, message, nodeId });
  };

  const nodeIds = new Set(model.nodes.map((n) => n.id));
  const bandIds = new Set(model.bands.map((b) => b.id));

  // --- Well-formedness (§A.2) ---
  for (const e of model.edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      add('wf.edge-endpoints', 'error', `Edge "${e.id}" points to a missing node.`);
    }
  }
  for (const n of model.nodes) {
    if (n.bandId && !bandIds.has(n.bandId)) {
      add(
        'wf.band-exists',
        'error',
        `Node "${n.id}" references a missing band "${n.bandId}".`,
        n.id,
      );
    }
    const clinLabel = getText(n.label, 'clinician');
    if (!clinLabel.trim()) {
      add('wf.label', 'warn', `Node "${n.id}" has no label.`, n.id);
    } else if (clinLabel.length > 40) {
      add(
        'a11y.label-length',
        'info',
        `Node "${n.id}" label is long (${clinLabel.length} chars) — may overflow or be hard to read.`,
        n.id,
      );
    }
  }

  // --- More §A.2 well-formedness: relation/barrier endpoint kinds + no floating intervention ---
  // Relations (§A.2-r3) join social entities — people, parts, or contexts — not states/resources.
  // `reciprocal` is intentionally excluded: it also marks mutual state↔state reinforcement in loops.
  const kindById = new Map(model.nodes.map((n) => [n.id, n.kind]));
  const RELATION_KINDS = new Set(['close', 'conflict', 'fused', 'distant', 'cutoff']);
  const RELATION_ENDPOINT_KINDS = new Set(['agent', 'self', 'context']);
  const BARRIER_ENDPOINT_KINDS = new Set(['agent', 'self', 'state']); // §A.2-r6
  const incident = new Set<string>();
  for (const e of model.edges) {
    incident.add(e.source);
    incident.add(e.target);
    for (const ep of [e.source, e.target]) {
      const k = kindById.get(ep);
      if (!k) continue; // a missing endpoint is already an error above
      if (RELATION_KINDS.has(e.kind) && !RELATION_ENDPOINT_KINDS.has(k)) {
        add(
          'wf.relation-endpoints',
          'warn',
          `A ${e.kind} relation ("${e.id}") touches a ${k} node — relations connect people, parts, or contexts (§A.2-r3).`,
        );
      }
      if (e.kind === 'barrier' && !BARRIER_ENDPOINT_KINDS.has(k)) {
        add(
          'wf.barrier-endpoints',
          'warn',
          `A dissociative barrier ("${e.id}") touches a ${k} node — it may only separate parts or states (§A.2-r6).`,
        );
      }
    }
  }
  for (const n of model.nodes) {
    if (n.kind === 'intervention' && !incident.has(n.id)) {
      add(
        'wf.intervention-attached',
        'warn',
        `Intervention "${getText(n.label, layer)}" floats unattached — attach it to what it acts on (§A.2-r4).`,
        n.id,
      );
    }
  }

  // --- Path of hope (a map of only problems can be harmful; Redhead 2015, UX-M7) ---
  if (CYCLE_DIAGRAMS.has(model.diagram) && model.nodes.length > 0) {
    const hopeful =
      model.edges.some((e) => e.kind === 'exit') ||
      model.nodes.some(
        (n) => n.kind === 'resource' || n.kind === 'self' || n.kind === 'intervention',
      );
    if (!hopeful) {
      add(
        'safety.path-of-hope',
        layer === 'client' ? 'error' : 'warn',
        'No way out shown — add an exit, a resource, or the Self. A map of only problems can be harmful.',
      );
    }
  }

  // --- Crisis chart safety (UX-M4) ---
  if (model.diagram === 'decision-nav') {
    if (!model.meta.crisisResources?.trim()) {
      add(
        'safety.crisis-resources',
        'error',
        'The crisis chart must carry crisis resources (a localized line/number).',
      );
    }
    const hasOutgoing = new Set(model.edges.map((e) => e.source));
    const terminalOk = new Set(['crisis', 'action', 'safe']);
    for (const n of model.nodes) {
      if (hasOutgoing.has(n.id)) continue;
      const ok =
        terminalOk.has(n.stereotype ?? '') || n.kind === 'resource' || n.kind === 'intervention';
      if (!ok) {
        add(
          'safety.no-dead-ends',
          'error',
          `"${getText(n.label, layer)}" is a dead-end — every path must end in an action or a person.`,
          n.id,
        );
      }
    }
  }

  // --- Safety triage: a clinician's risk flags must escalate, not sit silent (§L.2, M3) ---
  const safety = model.meta.safety;
  if (safety.acuteRiskFlag) {
    add(
      'safety.acute-risk-escalation',
      'warn',
      'Acute-risk flag is set — route to human clinical review now. This tool documents a formulation; it does not provide crisis care.',
    );
    if (!model.meta.crisisResources?.trim()) {
      add(
        'safety.acute-risk-resources',
        'error',
        'Acute risk is flagged but no crisis resources are recorded — add a localized crisis line/number before export.',
      );
    }
  }
  if (safety.psychosisFlag) {
    add(
      'safety.psychosis-escalation',
      'warn',
      'Psychosis indicators flagged — symbolic / reframing work needs specialist review; do not challenge reality-testing unsupervised.',
    );
    if (model.diagram === 'ritual') {
      add(
        'safety.psychosis-ritual',
        'error',
        'Ritual / symbolic modality is contraindicated with active psychosis indicators — requires specialist review before use.',
      );
    }
  }

  // --- Cross-school provenance awareness (§G.2): keep opposed origin-claims visible ---
  const schools = new Set<string>();
  for (const n of model.nodes)
    for (const p of n.properties.provenance ?? [])
      if (p.startsWith('school:')) schools.add(p.slice('school:'.length));
  if (schools.size > 1) {
    add(
      'provenance.mixed-school',
      'info',
      `This diagram draws on ${schools.size} schools (${[...schools].sort().join(', ')}) — keep provenance tags visible; do not merge opposed claims.`,
    );
  }

  // --- Ritual: honest non-medical framing + a secular variant (spec §F, §L.2-r3) ---
  if (model.diagram === 'ritual') {
    if (!model.meta.ritual?.framing?.trim()) {
      add(
        'ethics.ritual-framing',
        'error',
        'A ritual diagram must carry honest non-medical framing (it does not cure disease).',
      );
    }
    if (!model.meta.ritual?.secularVariant?.trim()) {
      add(
        'ethics.ritual-secular',
        'error',
        'A ritual diagram must offer a secular variant (no belief required).',
      );
    }
  }

  // --- Client-facing disclaimer gate (§A.2-r7, §L.2) ---
  if (CLIENT_FACING.has(model.diagram) && !model.meta.disclaimer?.trim()) {
    add(
      'ethics.disclaimer',
      'error',
      'A client-facing diagram needs a standing disclaimer (supports, not replaces, care).',
    );
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues };
}

/**
 * Safety-triage gate (REQ-SAFETY-TRIAGE): true when a risk flag requires human
 * escalation and any autonomous / AI-assisted formulation must halt (spec §L.2; the
 * M3/M8 acceptance that an acute-risk marker "disables autonomous formulation").
 * The editor reads this to raise its escalation banner; the AI panel (M8) reads it to
 * stop before any extraction.
 */
export function requiresHumanEscalation(model: PsyumlModel): boolean {
  return model.meta.safety.acuteRiskFlag || model.meta.safety.psychosisFlag;
}
