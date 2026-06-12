/**
 * @psyuml/model — the school-agnostic canonical model (M0 skeleton).
 *
 * The real metamodel (8 element categories, typed connectors, the PT property
 * bag incl. epistemicStatus + i18n labels) lands in M1.
 * Traceability: REQ-CORE-ONTOLOGY, REQ-EPISTEMIC-STATUS, REQ-I18N.
 */

export const PSYUML_MODEL_VERSION = '0.0.0';

/** Minimal placeholder graph shape; replaced by the full metamodel in M1. */
export interface PsyumlModel {
  version: string;
  nodes: unknown[];
  edges: unknown[];
}

/** Create an empty, well-versioned model — the starting point for any formulation. */
export function createEmptyModel(): PsyumlModel {
  return { version: PSYUML_MODEL_VERSION, nodes: [], edges: [] };
}
