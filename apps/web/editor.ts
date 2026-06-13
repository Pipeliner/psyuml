/**
 * Pure editor-state helpers for the web app (kept out of React so they are
 * unit-testable in node). They never mutate the input model.
 *
 * Traceability: REQ-EDITOR-MVP, REQ-COLLAB (client can add/edit), REQ-CLIENT-SAFETY-UX,
 * REQ-VERSIONING-DIFF (in-session snapshots).
 */
import { parseModel, serializeModel, type PsyumlModel } from '@psyuml/model';

/** An immutable in-session snapshot of a formulation (M6 versioning). */
export interface Version {
  id: string;
  label: string;
  /** ISO timestamp the snapshot was taken. */
  at: string;
  /** The serialized model at snapshot time (immutable). */
  json: string;
}

/** Take an immutable snapshot of the current model. The model is serialized, not referenced. */
export function snapshotModel(model: PsyumlModel, label: string, at: string): Version {
  return { id: at, label, at, json: serializeModel(model) };
}

/** Rehydrate a snapshot back into a validated model. */
export function restoreVersion(version: Version): PsyumlModel {
  return parseModel(version.json);
}

/** First unused `${prefix}${n}` id in the model. */
export function nextId(prefix: string, model: PsyumlModel): string {
  const ids = new Set(model.nodes.map((n) => n.id));
  let i = 1;
  while (ids.has(`${prefix}${i}`)) i += 1;
  return `${prefix}${i}`;
}

/**
 * Add a node appropriate to the current diagram, returning a new validated model.
 * State maps get a state in the first band; parts maps get an agent (protector).
 * Nothing is auto-finalized; the label is editable by either layer (co-authorship).
 */
export function addNode(model: PsyumlModel, label: string): PsyumlModel {
  const isParts = model.diagram === 'parts-map';
  const node = isParts
    ? {
        id: nextId('part', model),
        kind: 'agent',
        stereotype: 'manager',
        tier: 3,
        label: { clinician: { en: label } },
        properties: { epistemicStatus: 'reported' },
      }
    : {
        id: nextId('state', model),
        kind: 'state',
        bandId: model.bands[0]?.id,
        tier: 1,
        label: { clinician: { en: label } },
        properties: { epistemicStatus: 'reported' },
      };
  return parseModel({ ...model, nodes: [...model.nodes, node] });
}

/** Set a node's label for the given layer (in 'en'); returns a new validated model. */
export function setNodeLabel(
  model: PsyumlModel,
  id: string,
  text: string,
  layer: 'clinician' | 'client',
): PsyumlModel {
  return parseModel({
    ...model,
    nodes: model.nodes.map((n) => {
      if (n.id !== id) return n;
      const label = { ...n.label };
      if (layer === 'client') label.client = { ...(label.client ?? {}), en: text };
      else label.clinician = { ...label.clinician, en: text };
      return { ...n, label };
    }),
  });
}

/** Show/hide a node (progressive reveal, UX-M7); returns a new validated model. */
export function setNodeHidden(model: PsyumlModel, id: string, hidden: boolean): PsyumlModel {
  return parseModel({
    ...model,
    nodes: model.nodes.map((n) => (n.id === id ? { ...n, hidden } : n)),
  });
}

/**
 * Set a clinician safety-triage flag (acute-risk / psychosis), returning a new
 * validated model. The validator turns these into escalation issues and the
 * `requiresHumanEscalation` gate (REQ-SAFETY-TRIAGE).
 */
export function setSafetyFlag(
  model: PsyumlModel,
  flag: 'acuteRiskFlag' | 'psychosisFlag',
  value: boolean,
): PsyumlModel {
  return parseModel({
    ...model,
    meta: { ...model.meta, safety: { ...model.meta.safety, [flag]: value } },
  });
}
