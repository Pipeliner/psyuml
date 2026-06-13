/**
 * @psyuml/validate — well-formedness + clinical-safety lint (M3).
 *
 * Rule classes: well-formedness (§A.2), and the safety lints the UX research made
 * binding — path-of-hope (a map of only problems can harm), crisis no-dead-ends +
 * crisis-resources (UX-M4), and the client-facing disclaimer gate (§A.2-r7, §L.2).
 * `ok` is false when any error-severity issue is present (used to gate client export).
 *
 * Traceability: REQ-WELLFORMEDNESS, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE, REQ-ETHICS-GUARDRAILS.
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

const CLIENT_FACING = new Set([
  'state-map',
  'parts-map',
  'mode-map',
  'relational-field',
  'decision-nav',
  'resource-anchor',
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
