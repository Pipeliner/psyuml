/**
 * @psyuml/diff — longitudinal model diff (M6).
 *
 * Compares two saved versions of the *same* formulation by stable id (§H.10) and
 * produces a structured changeset plus readable progress lines. The deltas the spec
 * calls out are first-class: dominance ↑/↓ and consolidation dashed→solid
 * (forming/liminal → consolidated) — so "an Exit consolidated" and "Punishing Parent
 * dominance ↓" read straight off a two-version comparison (M6 acceptance).
 *
 * Pure + view-agnostic: two immutable models in, one diff out (ARCH §2). Nothing here
 * mutates its inputs, and matching is purely by id so a renamed node reads as a label
 * change rather than an add+remove.
 *
 * Traceability: REQ-VERSIONING-DIFF (§E.5, §H.10).
 */
import { getText, type Edge, type Node, type PsyumlModel } from '@psyuml/model';

export type Layer = 'clinician' | 'client';

/** A single changed field on a node or edge, rendered for display. */
export interface FieldDelta {
  field: string;
  before: string;
  after: string;
  /** Set for numeric fields (dominance, valence) so a view can show ↑/↓. */
  direction?: 'up' | 'down';
}

export interface NodeChange {
  id: string;
  /** The after-version label in the requested layer. */
  label: string;
  deltas: FieldDelta[];
}

export interface EdgeChange {
  id: string;
  deltas: FieldDelta[];
}

export interface ModelDiff {
  nodes: { added: Node[]; removed: Node[]; changed: NodeChange[] };
  edges: { added: Edge[]; removed: Edge[]; changed: EdgeChange[] };
  /** Counts of entities present in both versions with no tracked change. */
  unchanged: { nodes: number; edges: number };
}

const show = (v: number | undefined): string => (v === undefined ? '—' : String(v));

function nodeDeltas(before: Node, after: Node, layer: Layer): FieldDelta[] {
  const d: FieldDelta[] = [];
  const pb = before.properties;
  const pa = after.properties;

  if (pb.dominance !== pa.dominance) {
    d.push({
      field: 'dominance',
      before: show(pb.dominance),
      after: show(pa.dominance),
      direction: (pa.dominance ?? 0) >= (pb.dominance ?? 0) ? 'up' : 'down',
    });
  }
  if (pb.valence !== pa.valence) {
    d.push({
      field: 'valence',
      before: show(pb.valence),
      after: show(pa.valence),
      direction: (pa.valence ?? 0) >= (pb.valence ?? 0) ? 'up' : 'down',
    });
  }
  if (pb.consolidation !== pa.consolidation) {
    d.push({
      field: 'consolidation',
      before: pb.consolidation ?? '—',
      after: pa.consolidation ?? '—',
    });
  }
  if (pb.epistemicStatus !== pa.epistemicStatus) {
    d.push({
      field: 'epistemicStatus',
      before: pb.epistemicStatus ?? '—',
      after: pa.epistemicStatus ?? '—',
    });
  }
  if ((before.stereotype ?? '') !== (after.stereotype ?? '')) {
    d.push({
      field: 'stereotype',
      before: before.stereotype ?? '—',
      after: after.stereotype ?? '—',
    });
  }
  if (Boolean(before.hidden) !== Boolean(after.hidden)) {
    d.push({
      field: 'hidden',
      before: String(Boolean(before.hidden)),
      after: String(Boolean(after.hidden)),
    });
  }
  const lb = getText(before.label, layer);
  const la = getText(after.label, layer);
  if (lb !== la) d.push({ field: 'label', before: lb, after: la });
  return d;
}

function edgeDeltas(before: Edge, after: Edge, layer: Layer): FieldDelta[] {
  const d: FieldDelta[] = [];
  if (before.kind !== after.kind) d.push({ field: 'kind', before: before.kind, after: after.kind });
  if ((before.loop ?? '—') !== (after.loop ?? '—')) {
    d.push({ field: 'loop', before: before.loop ?? '—', after: after.loop ?? '—' });
  }
  const lb = before.label ? getText(before.label, layer) : '—';
  const la = after.label ? getText(after.label, layer) : '—';
  if (lb !== la) d.push({ field: 'label', before: lb, after: la });
  return d;
}

/** Compare two versions of a formulation, matching nodes/edges by stable id. */
export function diffModels(
  before: PsyumlModel,
  after: PsyumlModel,
  options: { layer?: Layer } = {},
): ModelDiff {
  const layer = options.layer ?? 'clinician';

  const beforeNodes = new Map(before.nodes.map((n) => [n.id, n]));
  const afterNodes = new Map(after.nodes.map((n) => [n.id, n]));
  const added: Node[] = [];
  const removed: Node[] = [];
  const changed: NodeChange[] = [];
  let unchangedNodes = 0;
  for (const after_ of after.nodes) {
    const before_ = beforeNodes.get(after_.id);
    if (!before_) {
      added.push(after_);
      continue;
    }
    const deltas = nodeDeltas(before_, after_, layer);
    if (deltas.length > 0)
      changed.push({ id: after_.id, label: getText(after_.label, layer), deltas });
    else unchangedNodes += 1;
  }
  for (const before_ of before.nodes) if (!afterNodes.has(before_.id)) removed.push(before_);

  const afterEdges = new Map(after.edges.map((e) => [e.id, e]));
  const beforeEdges = new Map(before.edges.map((e) => [e.id, e]));
  const addedE: Edge[] = [];
  const removedE: Edge[] = [];
  const changedE: EdgeChange[] = [];
  let unchangedEdges = 0;
  for (const after_ of after.edges) {
    const before_ = beforeEdges.get(after_.id);
    if (!before_) {
      addedE.push(after_);
      continue;
    }
    const deltas = edgeDeltas(before_, after_, layer);
    if (deltas.length > 0) changedE.push({ id: after_.id, deltas });
    else unchangedEdges += 1;
  }
  for (const before_ of before.edges) if (!afterEdges.has(before_.id)) removedE.push(before_);

  return {
    nodes: { added, removed, changed },
    edges: { added: addedE, removed: removedE, changed: changedE },
    unchanged: { nodes: unchangedNodes, edges: unchangedEdges },
  };
}

/** True when the two versions are identical on every tracked field. */
export function isEmptyDiff(diff: ModelDiff): boolean {
  return (
    diff.nodes.added.length === 0 &&
    diff.nodes.removed.length === 0 &&
    diff.nodes.changed.length === 0 &&
    diff.edges.added.length === 0 &&
    diff.edges.removed.length === 0 &&
    diff.edges.changed.length === 0
  );
}

const arrow = (d: FieldDelta): string => (d.direction === 'down' ? '↓' : '↑');

/** Render a diff as readable progress lines (the M6 "readable progress diff"). */
export function summarizeDiff(diff: ModelDiff, layer: Layer = 'clinician'): string[] {
  const lines: string[] = [];

  for (const n of diff.nodes.added) lines.push(`Added ${n.kind} “${getText(n.label, layer)}”`);
  for (const n of diff.nodes.removed) lines.push(`Removed ${n.kind} “${getText(n.label, layer)}”`);

  for (const c of diff.nodes.changed) {
    for (const d of c.deltas) {
      if (d.field === 'dominance') {
        lines.push(`${c.label}: dominance ${arrow(d)} (${d.before} → ${d.after})`);
      } else if (d.field === 'valence') {
        lines.push(`${c.label}: valence ${arrow(d)} (${d.before} → ${d.after})`);
      } else if (d.field === 'consolidation') {
        const solid = d.after === 'consolidated' ? ' — now solid' : '';
        lines.push(`${c.label}: ${d.before} → ${d.after}${solid}`);
      } else if (d.field === 'label') {
        lines.push(`Renamed “${d.before}” → “${d.after}”`);
      } else {
        lines.push(`${c.label}: ${d.field} ${d.before} → ${d.after}`);
      }
    }
  }

  for (const e of diff.edges.added) lines.push(`Added a ${e.kind} link`);
  for (const e of diff.edges.removed) lines.push(`Removed a ${e.kind} link`);
  for (const c of diff.edges.changed) {
    for (const d of c.deltas) lines.push(`Link ${c.id}: ${d.field} ${d.before} → ${d.after}`);
  }

  return lines;
}
