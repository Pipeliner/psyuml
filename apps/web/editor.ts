/**
 * Pure editor-state helpers for the web app (kept out of React so they are
 * unit-testable in node). They never mutate the input model.
 *
 * Traceability: REQ-EDITOR-MVP, REQ-COLLAB (client can add/edit), REQ-CLIENT-SAFETY-UX.
 */
import { parseModel, type PsyumlModel } from '@psyuml/model';

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
