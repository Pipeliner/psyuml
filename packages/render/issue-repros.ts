/**
 * Synthetic issue repros shared by the render tests (test fixtures, not part of the public API).
 *
 * The models from issues #4 (parts-map label layout) and #5 (process-loop geometry), built with
 * `parseModel` so the tests need no grammar dependency. Generic, made-up content only.
 */
import { parseModel, type PsyumlModel } from '@psyuml/model';

/** A clinician-layer English label. */
const en = (s: string) => ({ clinician: { en: s } });
const node = (id: string, kind: string, label: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind,
  label: en(label),
  ...extra,
});
const edge = (
  id: string,
  source: string,
  kind: string,
  target: string,
  label?: string,
  extra: Record<string, unknown> = {},
) => ({ id, kind, source, target, ...(label ? { label: en(label) } : {}), ...extra });

/** Issue #4: four protectors with long names, a long Self label, and a labelled barrier. Pass
 * `null` to drop the barrier's own label (the renderer then prints its default). */
export function partsRepro(barrierLabel: string | null = 'walls the young part off'): PsyumlModel {
  return parseModel({
    version: '0.1.0',
    diagram: 'parts-map',
    meta: { title: 'Parts layout repro', disclaimer: 'Supports, does not replace, care.' },
    nodes: [
      node('self', 'self', 'Self: calm, curious, connected core', { stereotype: 'Self' }),
      node('a', 'agent', 'Controller / Planner / Critic', { stereotype: 'manager' }),
      node('b', 'agent', 'Analyst: lists, plans, models', { stereotype: 'manager' }),
      node('c', 'agent', 'Pleaser / peacemaker / mask', { stereotype: 'manager' }),
      node('d', 'agent', 'Numb-out / distractor', { stereotype: 'firefighter' }),
      node('e', 'agent', 'Young hurt part, age 6', { stereotype: 'exile' }),
    ],
    edges: [
      edge('c1', 'a', 'containment', 'e', 'criticises first'),
      edge('c2', 'b', 'containment', 'e', 'explains it away'),
      edge('c3', 'c', 'containment', 'e', 'keeps everyone happy'),
      edge('c4', 'd', 'containment', 'e', 'switches off'),
      edge('b1', 'e', 'barrier', 'self', barrierLabel ?? undefined),
    ],
  });
}

/** Issue #5: a 4-state loop + a reciprocal-role node + an observing eye + one exit. */
export function loopRepro(): PsyumlModel {
  return parseModel({
    version: '0.1.0',
    diagram: 'process-loop',
    meta: { title: 'Loop repro', disclaimer: 'Supports, does not replace, care.' },
    nodes: [
      node('s1', 'state', 'Trigger'),
      node('s2', 'state', 'Hot thought'),
      node('s3', 'state', 'Avoid'),
      node('s4', 'state', 'Low mood'),
      node('rr', 'agent', 'Criticising', {
        stereotype: 'reciprocal-role',
        properties: { asIf: true },
      }),
      node('eye', 'self', 'Observer: notice the pattern', { stereotype: 'observing-eye' }),
      node('out', 'resource', 'Alternative response'),
    ],
    edges: [
      edge('r', 'rr', 'reciprocal', 's1', 'criticising ⇄ criticised'),
      edge('e1', 's1', 'sequential', 's2'),
      edge('e2', 's2', 'sequential', 's3'),
      edge('e3', 's3', 'sequential', 's4'),
      edge('e4', 's4', 'sequential', 's1', 'pattern repeats', {
        loop: 'R',
        loopTopology: 'dilemma',
      }),
      edge('x1', 's1', 'exit', 'out', 'try the alternative'),
    ],
  });
}
