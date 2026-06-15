/**
 * Pure editor-state helpers for the web app (kept out of React so they are
 * unit-testable in node). They never mutate the input model.
 *
 * Traceability: REQ-EDITOR-MVP, REQ-COLLAB (client can add/edit/remove), REQ-CLIENT-SAFETY-UX,
 * REQ-EPISTEMIC-STATUS (mark a node as a guess), REQ-ETHICS-GUARDRAILS (edit disclaimer/crisis),
 * REQ-NOTATION (author typed connectors / edges, §C), REQ-VERSIONING-DIFF (in-session snapshots).
 */
import {
  parseModel,
  serializeModel,
  type EdgeKind,
  type EpistemicStatus,
  type NodeKind,
  type PsyumlModel,
} from '@psyuml/model';

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
export function addNode(
  model: PsyumlModel,
  label: string,
  opts: {
    kind?: NodeKind;
    stereotype?: string;
    /** Optional plain-language (client-layer) label, so a GUI-made node isn't blank in Client view. */
    client?: string;
    /** Origin/school provenance tags (§G.2). */
    provenance?: string[];
    tier?: 1 | 2 | 3;
  } = {},
): PsyumlModel {
  const isParts = model.diagram === 'parts-map';
  const kind: NodeKind = opts.kind ?? (isParts ? 'agent' : 'state');
  const stereotype = opts.stereotype ?? (isParts && kind === 'agent' ? 'manager' : undefined);
  const clinicianLabel = { en: label };
  const node: Record<string, unknown> = {
    id: nextId(opts.kind ?? (isParts ? 'part' : 'state'), model),
    kind,
    tier: opts.tier ?? (isParts ? 3 : 1),
    label: opts.client?.trim()
      ? { clinician: clinicianLabel, client: { en: opts.client.trim() } }
      : { clinician: clinicianLabel },
    properties: {
      epistemicStatus: 'reported',
      ...(opts.provenance && opts.provenance.length ? { provenance: opts.provenance } : {}),
    },
  };
  if (stereotype) node.stereotype = stereotype;
  // States default into the first band so they render in a zone; other kinds float.
  if (kind === 'state' && model.bands[0]) node.bandId = model.bands[0].id;
  return parseModel({ ...model, nodes: [...model.nodes, node] });
}

/** First unused `e${n}` edge id in the model. */
export function nextEdgeId(model: PsyumlModel): string {
  const ids = new Set(model.edges.map((e) => e.id));
  let i = 1;
  while (ids.has(`e${i}`)) i += 1;
  return `e${i}`;
}

/**
 * Connect two nodes with a typed edge, returning a new validated model. This is the GUI's
 * way to author the *relationships* — transitions, protective containment, exits, branches —
 * that a diagram is mostly about. parseModel enforces well-formedness (endpoints exist);
 * any softer concern (e.g. a relation touching a state) surfaces in the health panel, not here.
 */
export function addEdge(
  model: PsyumlModel,
  opts: { source: string; target: string; kind: EdgeKind; label?: string; trigger?: string },
): PsyumlModel {
  const edge: Record<string, unknown> = {
    id: nextEdgeId(model),
    kind: opts.kind,
    source: opts.source,
    target: opts.target,
  };
  if (opts.label && opts.label.trim()) edge.label = { clinician: { en: opts.label } };
  // A ⚑ precipitant on a transition (spec §B) — distinct from a free label, and what the State
  // Map / Decision chart draw as the trigger word on the arrow.
  if (opts.trigger && opts.trigger.trim()) edge.trigger = { clinician: { en: opts.trigger } };
  return parseModel({ ...model, edges: [...model.edges, edge] });
}

/** Remove an edge by id, returning a new validated model. */
export function removeEdge(model: PsyumlModel, id: string): PsyumlModel {
  return parseModel({ ...model, edges: model.edges.filter((e) => e.id !== id) });
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

/**
 * Set (or clear, with `''`) a node's stereotype — the Tier-3 tag that drives shape/role, e.g.
 * `question` for a decision diamond on a crisis chart, or `manager`/`exile` on a parts map (§K).
 * Exposed in the GUI so these aren't DSL-only. Returns a new validated model.
 */
export function setNodeStereotype(model: PsyumlModel, id: string, stereotype: string): PsyumlModel {
  return parseModel({
    ...model,
    nodes: model.nodes.map((n) => {
      if (n.id !== id) return n;
      const next: Record<string, unknown> = { ...n };
      if (stereotype.trim()) next.stereotype = stereotype.trim();
      else delete next.stereotype;
      return next;
    }),
  });
}

/**
 * Set (or clear) a node's origin/school provenance tags (§G.2) from a comma-separated string,
 * so co-present opposed claims can be authored in the GUI, not only the DSL. New validated model.
 */
export function setNodeProvenance(model: PsyumlModel, id: string, tags: string): PsyumlModel {
  const list = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return parseModel({
    ...model,
    nodes: model.nodes.map((n) => {
      if (n.id !== id) return n;
      const properties = { ...n.properties };
      if (list.length) properties.provenance = list;
      else delete properties.provenance;
      return { ...n, properties };
    }),
  });
}

/**
 * Set a node's manual position (drag-to-reposition for hand-laid-out diagrams — genogram /
 * relational field). Persisted on the node (round-trips as `pos=x,y`); renderers that honor
 * `position` place the node there instead of auto-layout. Coordinates are rounded. New model.
 */
export function setNodePosition(model: PsyumlModel, id: string, x: number, y: number): PsyumlModel {
  return parseModel({
    ...model,
    nodes: model.nodes.map((n) =>
      n.id === id ? { ...n, position: { x: Math.round(x), y: Math.round(y) } } : n,
    ),
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
 * Set (or clear, with `''`) a node's epistemic status — "is this observed, reported, or
 * just a guess?". Central to diagramming an only-partially-understood situation: mark the
 * uncertain bits as `inferred` rather than overclaiming (REQ-EPISTEMIC-STATUS, UX honesty).
 */
export function setNodeEpistemic(
  model: PsyumlModel,
  id: string,
  status: EpistemicStatus | '',
): PsyumlModel {
  return parseModel({
    ...model,
    nodes: model.nodes.map((n) => {
      if (n.id !== id) return n;
      const properties = { ...n.properties };
      if (status) properties.epistemicStatus = status;
      else delete properties.epistemicStatus;
      return { ...n, properties };
    }),
  });
}

/**
 * Remove a node and every edge touching it, returning a new validated model. Lets a user
 * drop something they added by mistake or don't relate to (co-authorship; reversible via
 * an earlier snapshot). Never mutates the input.
 */
export function removeNode(model: PsyumlModel, id: string): PsyumlModel {
  return parseModel({
    ...model,
    nodes: model.nodes.filter((n) => n.id !== id),
    edges: model.edges.filter((e) => e.source !== id && e.target !== id),
  });
}

/**
 * Patch diagram-level metadata (title / disclaimer / crisis resources), returning a new
 * validated model. This is how a user satisfies the client-facing disclaimer + crisis gates
 * from inside the editor (REQ-ETHICS-GUARDRAILS) rather than hitting an unfixable export block.
 */
export function setMeta(
  model: PsyumlModel,
  patch: { title?: string; disclaimer?: string; crisisResources?: string },
): PsyumlModel {
  return parseModel({ ...model, meta: { ...model.meta, ...patch } });
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
