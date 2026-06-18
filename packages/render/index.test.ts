import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import {
  blankTemplate,
  render,
  renderComposite,
  sharedNodeIds,
  renderBodyMap,
  renderDecisionChart,
  renderDiff,
  renderInterventionSeq,
  renderLoopMap,
  renderModeMap,
  renderPartsMap,
  renderRelationalField,
  renderResourceMap,
  renderRitual,
  renderStateMap,
  renderTimeline,
  renderTwoTriangles,
} from './index';

const read = (name: string): string =>
  readFileSync(new URL(`../../examples/${name}`, import.meta.url), 'utf8');

const stateModel = parseModel(read('state-map.psyuml'));
const partsModel = parseModel(read('parts-map.psyuml'));
const decisionModel = parseModel(read('decision-nav.psyuml'));
const resourceModel = parseModel(read('resource-anchor.psyuml'));
const loopModel = parseModel(read('process-loop.psyuml'));
const timelineModel = parseModel(read('timeline.psyuml'));
const seqModel = parseModel(read('intervention-sequence.psyuml'));
const ritualModel = parseModel(read('ritual.psyuml'));
const relModel = parseModel(read('relational-field.psyuml'));
const modeModel = parseModel(read('mode-map.psyuml'));
const bodyModel = parseModel(read('body-map.psyuml'));
const dramaModel = parseModel(read('drama-triangle.psyuml'));
const twoTriModel = parseModel(read('two-triangles.psyuml'));
const catSdrModel = parseModel(read('cat-sdr.psyuml'));
// REQ-CASE-CORPUS: additional worked teaching cases (fictional composites, distinct from "R.").
const socialAnxietyModel = parseModel(read('social-anxiety-loop.psyuml'));
const perfectionismModel = parseModel(read('perfectionism-parts.psyuml'));
const familyGenogramModel = parseModel(read('family-genogram.psyuml'));
// REQ-EXAMPLE-LIBRARY: the help-site gallery examples (school-specific profiles of the base types).
const panicModel = parseModel(read('panic-cycle.psyuml'));
const ocdModel = parseModel(read('ocd-cycle.psyuml'));
const depressionFlowerModel = parseModel(read('depression-flower.psyuml'));
const stagesModel = parseModel(read('stages-of-change.psyuml'));
const longitudinalModel = parseModel(read('longitudinal-formulation.psyuml'));
const fivePsModel = parseModel(read('five-ps.psyuml'));
const dbtChainModel = parseModel(read('dbt-chain.psyuml'));
const goalLadderModel = parseModel(read('goal-ladder.psyuml'));
const choicePointModel = parseModel(read('act-choice-point.psyuml'));
const relapseModel = parseModel(read('relapse-prevention.psyuml'));

/** Compare against a committed golden; generate it locally on first run. */
function expectGolden(name: string, svg: string): void {
  const url = new URL(`../../examples/${name}`, import.meta.url);
  if (!existsSync(url)) {
    if (process.env.CI) throw new Error(`Golden examples/${name} is missing in CI`);
    writeFileSync(url, svg);
  }
  expect(svg).toBe(readFileSync(url, 'utf8'));
}

describe('renderStateMap', () => {
  it('emits an accessible svg with bands, states, and exits', () => {
    const { svg, altText } = renderStateMap(stateModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('Sympathetic / mobilized');
    expect(svg).toContain('Numb / shutdown');
    expect(svg).toContain('(EXIT)');
    expect(altText).toContain('Bands top to bottom');
    expect(altText).toContain('Ways out');
  });

  it('renders the client layer with the client vocabulary', () => {
    const { svg } = renderStateMap(stateModel, { layer: 'client' });
    expect(svg).toContain('Foggy');
    expect(svg).toContain('Green — safe &amp; social');
    expect(svg).not.toContain('Numb / shutdown');
  });

  it('is monochrome by default; hue is redundant and opt-in', () => {
    expect(renderStateMap(stateModel).svg).not.toContain('#009E73');
    expect(renderStateMap(stateModel, { monochrome: false }).svg).toContain('#009E73');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('state-map.svg', renderStateMap(stateModel).svg);
  });
});

describe('renderStateMap — parallel-edge fan-out (ADR-0010)', () => {
  // Two edges between the SAME pair used to share one lane and stack both labels at the same
  // point — an unreadable smear. They must fan out into distinct lanes + staggered labels.
  const twoEdgeModel = parseModel({
    version: '0.1.0',
    diagram: 'state-map',
    meta: { disclaimer: 'x' },
    bands: [
      { id: 'top', label: { clinician: { en: 'Top' } }, order: 0 },
      { id: 'bot', label: { clinician: { en: 'Bot' } }, order: 1 },
    ],
    nodes: [
      { id: 'p', kind: 'state', bandId: 'top', label: { clinician: { en: 'P' } } },
      { id: 'q', kind: 'state', bandId: 'bot', label: { clinician: { en: 'Q' } } },
    ],
    edges: [
      {
        id: 'e1',
        kind: 'sequential',
        source: 'p',
        target: 'q',
        trigger: { clinician: { en: 'harsh criticism' } },
      },
      {
        id: 'e2',
        kind: 'sequential',
        source: 'p',
        target: 'q',
        trigger: { clinician: { en: 'fight with partner' } },
      },
    ],
  });

  it('keeps BOTH labels verbatim (not merged into one smear)', () => {
    const { svg } = renderStateMap(twoEdgeModel);
    expect(svg).toContain('harsh criticism');
    expect(svg).toContain('fight with partner');
  });

  it('routes the two edges on different paths (distinct lanes)', () => {
    const { svg } = renderStateMap(twoEdgeModel);
    const paths = [...svg.matchAll(/<path d="(M [^"]+H [^"]+V [^"]+H [^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThanOrEqual(2);
    // the two transition edges between p,q must differ (different vertical lane x)
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('staggers the two labels on different baselines', () => {
    const { svg } = renderStateMap(twoEdgeModel);
    const labelY = (txt: string): number => {
      // the edge-label <text> may carry a leading data-el attr (ADR-0012); match y wherever it is
      const m = svg.match(new RegExp(`<text [^>]*\\by="([-\\d.]+)"[^>]*>${txt}<`));
      if (!m) throw new Error(`label not found: ${txt}`);
      return Number(m[1]);
    };
    expect(labelY('harsh criticism')).not.toBe(labelY('fight with partner'));
  });
});

describe('label wrapping (fit-to-box)', () => {
  const make = (label: string) =>
    parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { disclaimer: 'x' },
      bands: [{ id: 'b', label: { clinician: { en: 'B' } }, order: 0 }],
      nodes: [{ id: 'n', kind: 'state', bandId: 'b', label: { clinician: { en: label } } }],
    });

  it('keeps a short label on one line (no tspan, byte-identical path)', () => {
    expect(renderStateMap(make('Calm')).svg).not.toContain('<tspan');
  });

  it('wraps a long label into multiple lines', () => {
    const svg = renderStateMap(make('A very long worried-about-everything anxious state')).svg;
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('blankTemplate', () => {
  it('replaces node labels with fill-in prompts, keeps the structure, renders blank', () => {
    const t = blankTemplate(stateModel);
    expect(t.nodes).toHaveLength(stateModel.nodes.length);
    expect(t.edges).toHaveLength(stateModel.edges.length);
    expect(t.nodes.find((n) => n.kind === 'state')?.label.clinician.en).toBe('(state…)');
    expect(t.edges.every((e) => !e.label && !e.trigger)).toBe(true);
    const { svg } = renderStateMap(t);
    expect(svg).toContain('(state…)');
    expect(svg).not.toContain('Calm / connected'); // original label gone
    expect(stateModel.nodes[0]?.label.clinician.en).toBe('Calm / connected'); // input untouched
  });
});

describe('renderPartsMap', () => {
  it('emits self, protectors, an exile, and a dissociative barrier', () => {
    const { svg, altText } = renderPartsMap(partsModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Controller');
    expect(svg).toContain('Little one, age 6');
    expect(svg).toContain('dissociative barrier');
    expect(svg).toContain('manager');
    expect(altText).toContain('Self at the centre');
    expect(altText).toContain('behind a dissociative barrier');
  });

  it('renders the client layer vocabulary and preserves provenance tags', () => {
    const { svg } = renderPartsMap(partsModel, { layer: 'client' });
    expect(svg).toContain('the young hurt part');
    expect(svg).not.toContain('Little one, age 6');
  });

  it('draws a conflict tie (zigzag) between two parts instead of dropping it', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'parts-map',
      meta: { disclaimer: 'x' },
      nodes: [
        { id: 'self', kind: 'self', stereotype: 'Self', label: { clinician: { en: 'Self' } } },
        { id: 'a', kind: 'agent', stereotype: 'manager', label: { clinician: { en: 'Driver' } } },
        {
          id: 'b',
          kind: 'agent',
          stereotype: 'firefighter',
          label: { clinician: { en: 'Staller' } },
        },
      ],
      edges: [
        {
          id: 'cf',
          kind: 'conflict',
          source: 'a',
          target: 'b',
          label: { clinician: { en: 'push vs stall' } },
        },
      ],
    });
    const { svg } = renderPartsMap(m);
    expect(svg).toContain('stroke-width="1.5"'); // the conflict zigzag (unique weight on this map)
    expect(svg).toContain('push vs stall');
  });

  it('renders the containment relationship label on the dotted line', () => {
    // the "protects" word on each containment curve — so "soothes" vs "numbs" vs "protects"
    // aren't all indistinguishable dotted lines (eval finding).
    const { svg } = renderPartsMap(partsModel);
    expect(svg).toContain('>protects<');
  });

  it('marks a node claimed by >1 school as a contested origin, not a merged list (§G.2)', () => {
    const { svg, altText } = renderPartsMap(partsModel);
    // the exile carries IFS + schema + SD → shown as a disagreement, not "IFS / schema / SD"
    expect(svg).toContain('⚖');
    expect(svg).toContain('IFS vs schema vs SD');
    expect(svg).not.toContain('IFS / schema / SD');
    // a single-school node keeps the plain tag
    expect(svg).toContain('>IFS<');
    // and the disagreement is legible in the text channel too (§D)
    expect(altText).toContain('Origins disagree on');
    expect(altText).toContain('claimed by IFS and schema and SD');
  });

  it('re-labels role tags under a school vocabulary (roleLabels, §G)', () => {
    expect(renderPartsMap(partsModel).svg).toContain('manager');
    const schema = renderPartsMap(partsModel, {
      roleLabels: { manager: 'overcontroller', exile: 'vulnerable child mode' },
    }).svg;
    expect(schema).toContain('overcontroller');
    expect(schema).toContain('vulnerable child mode');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('parts-map.svg', renderPartsMap(partsModel).svg);
  });
});

describe('renderDecisionChart', () => {
  it('lays out a top-down crisis chart with an always-visible crisis banner', () => {
    const { svg, altText } = renderDecisionChart(decisionModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Am I safe right now?');
    expect(svg).toContain('Crisis resources (always available):');
    expect(svg).toContain('use your local number');
    expect(altText).toContain('Crisis navigation chart');
    expect(altText).toContain('always shown');
  });

  it('repeats the crisis contact on the crisis node, not only in the bottom banner', () => {
    // the crisis line appears both on the crisis node (wrapped) and in the banner. The node
    // copy is split into tspans, so count a single un-splittable word rather than a phrase.
    const occurrences = (renderDecisionChart(decisionModel).svg.match(/danger/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('renders the client layer vocabulary', () => {
    const { svg } = renderDecisionChart(decisionModel, { layer: 'client' });
    expect(svg).toContain('Call for help now');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('decision-nav.svg', renderDecisionChart(decisionModel).svg);
  });
});

/** Parse a `viewBox="x y w h"` into numbers. */
function viewBox(svg: string): { x: number; y: number; w: number; h: number } {
  const m = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/);
  if (!m) throw new Error('no viewBox');
  return { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) };
}

describe('renderDecisionChart — scalable, cycle-aware layout (ADR-0010)', () => {
  // A realistic crisis plan that BRANCHES wide and LOOPS BACK (≥12 nodes). The back-edge
  // k -> root is the bug case: a plain Kahn pass leaves the cycle (and everything below it)
  // at in-degree>0 forever, collapsing them onto one overlapping top row.
  const decNode = (id: string) => ({
    id,
    kind: 'state' as const,
    label: { clinician: { en: `Step ${id}` } },
  });
  const decEdge = (id: string, source: string, target: string, label?: string) => ({
    id,
    kind: 'sequential' as const,
    source,
    target,
    ...(label ? { label: { clinician: { en: label } } } : {}),
  });
  const loopingModel = parseModel({
    version: '0.1.0',
    diagram: 'decision-nav',
    meta: {
      title: 'Branching plan with a loop',
      disclaimer: 'This plan supports, and does not replace, professional care.',
      crisisResources: 'If you are in danger now, call your local emergency number.',
    },
    nodes: ['root', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'].map(
      decNode,
    ),
    edges: [
      decEdge('r-a', 'root', 'a', 'option A'),
      decEdge('r-b', 'root', 'b', 'option B'),
      decEdge('r-c', 'root', 'c', 'option C'),
      decEdge('r-d', 'root', 'd', 'option D'),
      decEdge('a-e', 'a', 'e'),
      decEdge('b-f', 'b', 'f'),
      decEdge('c-g', 'c', 'g'),
      decEdge('d-h', 'd', 'h'),
      decEdge('e-i', 'e', 'i'),
      decEdge('f-j', 'f', 'j'),
      decEdge('i-k', 'i', 'k'),
      decEdge('k-m', 'k', 'm'),
      decEdge('m-n', 'm', 'n'),
      decEdge('j-l', 'j', 'l'),
      // The cycle: "still not safe → go back to the start".
      decEdge('n-root', 'n', 'root', 'still not safe — start over'),
    ],
  });

  it('grows the viewBox HEIGHT with depth and WIDTH to fit the widest layer', () => {
    const small = viewBox(renderDecisionChart(decisionModel).svg);
    const big = viewBox(renderDecisionChart(loopingModel).svg);
    // Deeper chain → taller; wider (4-node) layer → wider than the small 2-wide example.
    expect(big.h).toBeGreaterThan(small.h);
    expect(big.w).toBeGreaterThan(small.w);
  });

  it('breaks the cycle and lays out ≥3 distinct rows (no collapse onto depth 0)', () => {
    const { svg } = renderDecisionChart(loopingModel);
    // Every node draws a centered <text> at its row y; collect the distinct y-rows. A naive
    // Kahn pass would pile the cycle + downstream nodes onto a single y (one row).
    const ys = new Set(
      [
        ...svg.matchAll(
          /<text x="[-\d.]+" y="([-\d.]+)" font-family="sans-serif" font-size="11" text-anchor="middle"/g,
        ),
      ].map((m) => Number(m[1])),
    );
    expect(ys.size).toBeGreaterThanOrEqual(3);
    // No node sits outside the (content-fit) frame horizontally.
    const vb = viewBox(svg);
    for (const m of svg.matchAll(/<rect x="([-\d.]+)" y="[-\d.]+" width="([\d.]+)"/g)) {
      const x = Number(m[1]);
      const w = Number(m[2]);
      expect(x).toBeGreaterThanOrEqual(vb.x);
      expect(x + w).toBeLessThanOrEqual(vb.x + vb.w + 0.5);
    }
  });

  it('renders the disclaimer in the exported SVG (was omitted before)', () => {
    const { svg } = renderDecisionChart(loopingModel);
    expect(svg).toContain('This plan supports, and does not replace, professional care.');
  });

  it('tolerates an all-in-cycle model (no in-degree-0 root) without piling up', () => {
    const ring = parseModel({
      version: '0.1.0',
      diagram: 'decision-nav',
      meta: {},
      nodes: ['x', 'y', 'z'].map(decNode),
      edges: [decEdge('xy', 'x', 'y'), decEdge('yz', 'y', 'z'), decEdge('zx', 'z', 'x')],
    });
    const { svg } = renderDecisionChart(ring);
    const ys = new Set(
      [
        ...svg.matchAll(
          /<text x="[-\d.]+" y="([-\d.]+)" font-family="sans-serif" font-size="11" text-anchor="middle"/g,
        ),
      ].map((m) => Number(m[1])),
    );
    // The cycle is broken at one back-edge, so the three steps still spread across rows.
    expect(ys.size).toBeGreaterThanOrEqual(2);
  });

  it('wraps a long node label inside its box instead of overflowing into siblings', () => {
    const longModel = parseModel({
      version: '0.1.0',
      diagram: 'decision-nav',
      meta: { disclaimer: 'Supports, not replaces, care.' },
      nodes: [
        decNode('root'),
        {
          id: 'act',
          kind: 'resource',
          stereotype: 'action',
          label: {
            clinician: { en: 'TIPP: cold water on the face, paced breathing, intense exercise' },
          },
        },
      ],
      edges: [decEdge('r-act', 'root', 'act', 'do this')],
    });
    const { svg } = renderDecisionChart(longModel);
    // the long label is wrapped into multiple <tspan> rows (not a single overflowing <text>)
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('renderResourceMap', () => {
  it('groups anchors under categories with a CFT footer', () => {
    const { svg, altText } = renderResourceMap(resourceModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('People who help me');
    expect(svg).toContain('Partner');
    expect(svg).toContain('CFT systems');
    expect(altText).toContain('Resource and anchor map');
    expect(altText).toContain('soothing system');
  });

  it('renders the client layer vocabulary', () => {
    const { svg } = renderResourceMap(resourceModel, { layer: 'client' });
    expect(svg).toContain('What matters to me');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('resource-anchor.svg', renderResourceMap(resourceModel).svg);
  });
});

describe('renderLoopMap', () => {
  it('draws a maintaining cycle with a reinforcing badge and an exit', () => {
    const { svg, altText } = renderLoopMap(loopModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Panic / shame');
    expect(svg).toContain('(EXIT)');
    expect(altText).toContain('Maintaining loop');
    expect(altText).toContain('reinforcing');
    expect(altText).toContain('Ways out');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('process-loop.svg', renderLoopMap(loopModel).svg);
  });

  it('fits the viewBox to content (honors positions; nothing clips)', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'process-loop',
      meta: { disclaimer: 'x', title: 'Big loop' },
      nodes: [
        { id: 'a', kind: 'state', position: { x: -50, y: -30 }, label: { clinician: { en: 'A' } } },
        { id: 'b', kind: 'state', position: { x: 700, y: 400 }, label: { clinician: { en: 'B' } } },
      ],
      edges: [{ id: 'e', kind: 'sequential', source: 'a', target: 'b', loop: 'R' }],
    });
    const vb = renderLoopMap(m).svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/);
    expect(vb).not.toBeNull();
    const x = Number(vb![1]);
    const y = Number(vb![2]);
    const w = Number(vb![3]);
    const h = Number(vb![4]);
    // both far-apart, partly-negative nodes (± their box half-size) sit inside the frame
    expect(x).toBeLessThanOrEqual(-50 - 70);
    expect(y).toBeLessThanOrEqual(-30 - 22);
    expect(x + w).toBeGreaterThanOrEqual(700 + 70);
    expect(y + h).toBeGreaterThanOrEqual(400 + 22);
  });
});

describe('renderTimeline', () => {
  it('lays out the action/identity grid across time bands', () => {
    const { svg, altText } = renderTimeline(timelineModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('ACTION');
    expect(svg).toContain('IDENTITY');
    expect(svg).toContain('Started therapy');
    expect(svg).toContain('preferred future');
    expect(altText).toContain('Timeline');
    expect(altText).toContain('Action:');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('timeline.svg', renderTimeline(timelineModel).svg);
  });
});

describe('renderInterventionSeq', () => {
  it('places interventions in actor lanes by phase order', () => {
    const { svg, altText } = renderInterventionSeq(seqModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Therapist');
    expect(svg).toContain('Phase 1: Stabilize');
    expect(svg).toContain('[stable &amp; resourced]');
    expect(altText).toContain('Intervention sequence');
    expect(altText).toContain('Steps in order');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('intervention-sequence.svg', renderInterventionSeq(seqModel).svg);
  });
});

describe('renderRitual', () => {
  it('draws van Gennep phases with a mandatory framing + secular footer', () => {
    const { svg, altText } = renderRitual(ritualModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Liminal (threshold)');
    expect(svg).toContain('Honest framing:');
    expect(svg).toContain('Secular variant:');
    expect(altText).toContain('Ritual structure');
    expect(altText).toContain('Secular variant:');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('ritual.svg', renderRitual(ritualModel).svg);
  });
});

describe('renderRelationalField', () => {
  it('draws genogram glyphs + relation line styles from positions', () => {
    const { svg, altText } = renderRelationalField(relModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('R. (34)');
    expect(svg).toContain('Father');
    expect(altText).toContain('Relational field');
    expect(altText).toContain('(cutoff)');
  });

  it('tags each node with a data-node-id hook for drag-to-reposition', () => {
    const { svg } = renderRelationalField(relModel);
    // every node id appears as a data-node-id group so the editor can hit-test + drag it
    for (const n of relModel.nodes) {
      expect(svg).toContain(`data-node-id="${n.id}"`);
    }
  });

  it('matches the committed golden SVG', () => {
    expectGolden('relational-field.svg', renderRelationalField(relModel).svg);
  });
});

describe('renderModeMap', () => {
  it('sizes modes by dominance (redundant numeral) and marks the Healthy Adult', () => {
    const { svg, altText } = renderModeMap(modeModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Vulnerable Child');
    expect(svg).toContain('↑ grow');
    expect(svg).toContain('dom 0.80');
    expect(altText).toContain('Schema mode map');
    expect(altText).toContain('grow the Healthy Adult');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('mode-map.svg', renderModeMap(modeModel).svg);
  });
});

describe('renderBodyMap', () => {
  it('places sensations on a body outline, sized by intensity', () => {
    const { svg, altText } = renderBodyMap(bodyModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Chest tightness (0.8)');
    expect(svg).toContain('pace and titrate');
    expect(altText).toContain('Body map');
    expect(altText).toContain('Pace and titrate');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('body-map.svg', renderBodyMap(bodyModel).svg);
  });
});

describe('renderRelationalField — Karpman drama triangle', () => {
  it('renders the present roles and the nested historical triangle', () => {
    const { svg, altText } = renderRelationalField(dramaModel);
    expect(svg).toContain('Persecutor');
    expect(svg).toContain('Rescuer');
    expect(svg).toContain('Critical parent (then)');
    expect(svg).toContain('stroke-dasharray="1 4"'); // the nestedWithin origin thread
    expect(altText).toContain('nestedWithin');
  });

  it('uses the client vocabulary in the client layer', () => {
    const { svg } = renderRelationalField(dramaModel, { layer: 'client' });
    expect(svg).toContain('The blaming role');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('drama-triangle.svg', renderRelationalField(dramaModel).svg);
  });
});

describe('renderLoopMap — CAT SDR', () => {
  it('draws the observing-eye, the reciprocal role, the trap and a named exit', () => {
    const { svg, altText } = renderLoopMap(catSdrModel);
    expect(svg).toContain('rx="26" ry="15"'); // observing-eye glyph
    expect(svg).toContain('Observing-I'); // label (may wrap across tspans)
    expect(svg).toContain('marker-start='); // reciprocal (double-headed) role link
    expect(svg).toContain('(EXIT)');
    expect(altText).toContain('Ways out');
  });

  it('surfaces v0.2 Pattern semantics: trap topology, contested + as-if role, confidence (§3/§4)', () => {
    const { svg, altText } = renderLoopMap(catSdrModel);
    // §4: the trap topology renders a redundant uppercase word (never glyph/colour alone)
    expect(svg).toContain('TRAP');
    // §3: the contested, low-confidence reciprocal role is dashed and carries ⚖ + (as-if)
    expect(svg).toContain('stroke-dasharray="5 4"');
    expect(svg).toContain('⚖');
    expect(svg).toContain('(as-if)');
    // …and every channel is echoed in the text channel (alt-text)
    expect(altText).toContain('is a trap');
    expect(altText).toContain('Contested standing');
    expect(altText).toContain('Named as-if');
    expect(altText).toContain('Confidence — high:');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('cat-sdr.svg', renderLoopMap(catSdrModel).svg);
  });
});

describe('renderLoopMap — v0.2 Pattern semantics (§3/§4)', () => {
  const loopWith = (topology?: 'trap' | 'dilemma' | 'snag') =>
    parseModel({
      version: '0.1.0',
      diagram: 'process-loop',
      meta: { disclaimer: 'x', title: 'T' },
      nodes: [
        { id: 'a', kind: 'state', label: { clinician: { en: 'A' } } },
        { id: 'b', kind: 'state', label: { clinician: { en: 'B' } } },
        { id: 'out', kind: 'resource', label: { clinician: { en: 'Way out' } } },
      ],
      edges: [
        { id: 'e', kind: 'sequential', source: 'a', target: 'b' },
        {
          id: 'l',
          kind: 'sequential',
          source: 'b',
          target: 'a',
          loop: 'R',
          ...(topology ? { loopTopology: topology } : {}),
        },
        { id: 'x', kind: 'exit', source: 'b', target: 'out' },
      ],
    });

  it('renders each topology as a distinct, redundant word + names its meaning in alt-text', () => {
    expect(renderLoopMap(loopWith('trap')).svg).toContain('TRAP');
    expect(renderLoopMap(loopWith('dilemma')).svg).toContain('DILEMMA');
    expect(renderLoopMap(loopWith('snag')).svg).toContain('SNAG');
    expect(renderLoopMap(loopWith('dilemma')).altText).toContain('false-binary');
    expect(renderLoopMap(loopWith('snag')).altText).toContain('self-truncating');
  });

  it('is backward-compatible: a plain loop shows the R badge but no topology word', () => {
    const svg = renderLoopMap(loopWith()).svg;
    expect(svg).not.toContain('TRAP');
    expect(svg).not.toContain('DILEMMA');
    expect(svg).not.toContain('SNAG');
    expect(svg).toContain('>R<'); // reinforcing badge still renders unchanged
  });

  it('surfaces contested standing and confidence in alt-text (not colour/glyph alone)', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'process-loop',
      meta: { disclaimer: 'x' },
      nodes: [
        {
          id: 'd',
          kind: 'state',
          label: { clinician: { en: 'Disputed bit' } },
          properties: { epistemicStatus: 'contested', confidence: 'L' },
        },
        {
          id: 'k',
          kind: 'state',
          label: { clinician: { en: 'Known bit' } },
          properties: { epistemicStatus: 'observed', confidence: 'H' },
        },
        { id: 'out', kind: 'resource', label: { clinician: { en: 'Way out' } } },
      ],
      edges: [
        { id: 'e', kind: 'sequential', source: 'k', target: 'd' },
        { id: 'x', kind: 'exit', source: 'd', target: 'out' },
      ],
    });
    const { svg, altText } = renderLoopMap(m);
    expect(svg).toContain('stroke-dasharray="5 4"'); // contested → interpretive → dashed
    expect(altText).toContain('Contested standing (held as disputed, not settled): Disputed bit');
    expect(altText).toContain('Confidence — high: Known bit; low: Disputed bit');
  });
});

describe('renderTwoTriangles — Malan', () => {
  it('renders both triangle group headers, concepts, and a dotted transference link', () => {
    const { svg, altText } = renderTwoTriangles(twoTriModel);
    expect(svg).toContain('Triangle of Conflict');
    expect(svg).toContain('Triangle of Person');
    expect(svg).toContain('Hidden feeling: anger &amp; grief');
    expect(svg).toContain('stroke-dasharray="2 4"'); // transference link
    expect(altText).toContain('Transference links the same conflict');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('two-triangles.svg', renderTwoTriangles(twoTriModel).svg);
  });
});

describe('REQ-CASE-CORPUS worked cases', () => {
  it('social-anxiety post-event rumination loop — reinforcing loop + early exit, pinned golden', () => {
    const { svg, altText } = renderLoopMap(socialAnxietyModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Post-event');
    expect(svg).toContain('(EXIT)');
    expect(altText).toContain('reinforcing');
    expect(altText).toContain('Ways out');
    expectGolden('social-anxiety-loop.svg', svg);
  });

  it('perfectionism parts map — contested-origin part (IFS vs schema), pinned golden', () => {
    const { svg, altText } = renderPartsMap(perfectionismModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Inner critic');
    // the critic carries IFS + schema → shown as a disagreement, not a merged slash-list (§G.2)
    expect(svg).toContain('⚖');
    expect(svg).toContain('IFS vs schema');
    expect(altText).toContain('Origins disagree on');
    expectGolden('perfectionism-parts.svg', svg);
  });

  it('three-generation family genogram — glyph set + relation ties, pinned golden', () => {
    const { svg, altText } = renderRelationalField(familyGenogramModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('K. (38)');
    expect(svg).toContain('Faith community');
    expect(altText).toContain('Relational field');
    expect(altText).toContain('(cutoff)');
    expectGolden('family-genogram.svg', svg);
  });
});

describe('REQ-EXAMPLE-LIBRARY help-site gallery examples (pinned goldens)', () => {
  // Each gallery item is a real, validated model; pinning its golden guarantees the showcased
  // render can't silently drift. Titles render as a single (unwrapped) <text>, so a title
  // substring is a stable content assertion. Rendered through the matching base-type renderer.
  it('panic cycle (CBT/Clark) — maintaining loop + exit', () => {
    const { svg } = renderLoopMap(panicModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('fear-of-fear');
    expect(svg).toContain('EXIT');
    expectGolden('panic-cycle.svg', svg);
  });

  it('OCD maintenance cycle (CBT/ERP) — response prevention is the way out', () => {
    const { svg } = renderLoopMap(ocdModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('OCD maintenance cycle');
    expect(svg).toContain('EXIT');
    expectGolden('ocd-cycle.svg', svg);
  });

  it('low-mood vicious flower (CBT/Moorey) — behavioural-activation exit', () => {
    const { svg } = renderLoopMap(depressionFlowerModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('vicious flower');
    expectGolden('depression-flower.svg', svg);
  });

  it('stages of change (TTM) — labelled contested as a stage model', () => {
    const { svg } = renderLoopMap(stagesModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('contested as a stage model');
    expectGolden('stages-of-change.svg', svg);
  });

  it('longitudinal formulation (CBT/Beck) — past shapes present', () => {
    const { svg } = renderTimeline(longitudinalModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('how the past shapes the present');
    expectGolden('longitudinal-formulation.svg', svg);
  });

  it('the 5 Ps — honestly labelled as a grid shown on a timeline', () => {
    const { svg } = renderTimeline(fivePsModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('by nature a grid');
    expectGolden('five-ps.svg', svg);
  });

  it('DBT chain analysis (Linehan) — vulnerability → behaviour, with a skill', () => {
    const { svg } = renderInterventionSeq(dbtChainModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('DBT chain analysis');
    expectGolden('dbt-chain.svg', svg);
  });

  it('goal ladder (solution-focused) — small steps toward a preferred future', () => {
    const { svg } = renderInterventionSeq(goalLadderModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('solution-focused steps');
    expectGolden('goal-ladder.svg', svg);
  });

  it('ACT choice point (Harris) — toward vs away moves', () => {
    const { svg } = renderDecisionChart(choicePointModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('ACT choice point');
    expectGolden('act-choice-point.svg', svg);
  });

  it('staying-well plan (relapse prevention) — a wellness plan, not a crisis plan', () => {
    const { svg } = renderDecisionChart(relapseModel);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Staying-well plan');
    expectGolden('relapse-prevention.svg', svg);
  });
});

describe('REQ-EXAMPLE-LIBRARY showcase — one feature-dense model per diagram type (pinned goldens)', () => {
  // One complex, capability-exercising example per diagram TYPE (epistemic variety, provenance /
  // contested origins, loop topology, as-if, triggers, bands, exits / path-of-hope, crisis
  // resources, client labels). Each is rendered through its base-type renderer and pinned.
  const showcases: [string, (m: PsyumlModel) => { svg: string }][] = [
    ['showcase-state-map.psyuml', renderStateMap],
    ['showcase-process-loop.psyuml', renderLoopMap],
    ['showcase-parts-map.psyuml', renderPartsMap],
    ['showcase-mode-map.psyuml', renderModeMap],
    ['showcase-relational-field.psyuml', renderRelationalField],
    ['showcase-body-map.psyuml', renderBodyMap],
    ['showcase-timeline.psyuml', renderTimeline],
    ['showcase-intervention-sequence.psyuml', renderInterventionSeq],
    ['showcase-ritual.psyuml', renderRitual],
    ['showcase-decision-nav.psyuml', renderDecisionChart],
    ['showcase-resource-anchor.psyuml', renderResourceMap],
    ['showcase-two-triangles.psyuml', renderTwoTriangles],
  ];

  it('covers all 12 diagram types', () => {
    expect(showcases.length).toBe(12);
  });

  it.each(showcases)('%s renders and matches its committed golden', (file, renderFn) => {
    const { svg } = renderFn(parseModel(read(file)));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('data-el="node:');
    expectGolden(file.replace(/\.psyuml$/, '.svg'), svg);
  });
});

describe('renderDiff', () => {
  // Okabe–Ito hues must not appear in the (monochrome) progress card (§D).
  const HUES = /#(009e73|e69f00|d55e00|56b4e9|cc79a7|f0e442|0072b2)/;
  const v1 = parseModel({
    version: '0.1.0',
    diagram: 'parts-map',
    meta: { title: 'R.', disclaimer: 'Supports, not replaces, care.' },
    nodes: [
      { id: 'self', kind: 'self', label: { clinician: { en: 'Self' } } },
      {
        id: 'punisher',
        kind: 'agent',
        label: { clinician: { en: 'Punishing Parent' } },
        properties: { dominance: 0.9, consolidation: 'forming' },
      },
      { id: 'gone', kind: 'state', label: { clinician: { en: 'Old state' } } },
    ],
  });
  const v2 = parseModel({
    ...JSON.parse(JSON.stringify(v1)),
    nodes: [
      v1.nodes[0],
      { ...v1.nodes[1], properties: { dominance: 0.4, consolidation: 'consolidated' } },
      { id: 'res', kind: 'resource', label: { clinician: { en: 'Walking' } } },
    ],
  });

  it('renders an accessible, monochrome progress card', () => {
    const { svg, altText } = renderDiff(v1, v2);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="');
    expect(svg.toLowerCase()).not.toMatch(HUES);
    expect(altText).toContain('Progress');
  });

  it('shows dominance direction, the dashed→solid swatch, an add and a remove', () => {
    const { svg } = renderDiff(v1, v2);
    expect(svg).toContain('↓'); // dominance fell
    expect(svg).toContain('stroke-dasharray'); // forming → consolidated swatch
    expect(svg).toContain('consolidated');
    expect(svg).toContain('Walking'); // added resource
    expect(svg).toContain('text-decoration="line-through"'); // removed node
  });

  it('says so when nothing changed', () => {
    const { svg, altText } = renderDiff(v1, v1);
    expect(svg).toContain('No tracked changes.');
    expect(altText).toContain('No tracked changes.');
  });
});

describe('render() dispatcher + audience profiles (v0.2 §2/§3)', () => {
  it('routes every diagram type to its renderer, identical to a direct call (back-compatible)', () => {
    expect(render(stateModel).svg).toBe(renderStateMap(stateModel).svg);
    expect(render(partsModel).svg).toBe(renderPartsMap(partsModel).svg);
    expect(render(modeModel).svg).toBe(renderModeMap(modeModel).svg);
    expect(render(relModel).svg).toBe(renderRelationalField(relModel).svg);
    expect(render(loopModel).svg).toBe(renderLoopMap(loopModel).svg);
    expect(render(catSdrModel).svg).toBe(renderLoopMap(catSdrModel).svg);
    expect(render(timelineModel).svg).toBe(renderTimeline(timelineModel).svg);
    expect(render(seqModel).svg).toBe(renderInterventionSeq(seqModel).svg);
    expect(render(ritualModel).svg).toBe(renderRitual(ritualModel).svg);
    expect(render(decisionModel).svg).toBe(renderDecisionChart(decisionModel).svg);
    expect(render(resourceModel).svg).toBe(renderResourceMap(resourceModel).svg);
    expect(render(bodyModel).svg).toBe(renderBodyMap(bodyModel).svg);
    expect(render(twoTriModel).svg).toBe(renderTwoTriangles(twoTriModel).svg);
  });

  it('clinician shows the interpretive surface; client/picture hide it (Pattern family)', () => {
    const clin = render(catSdrModel, { audience: 'clinician' });
    expect(clin.svg).toContain('⚖');
    expect(clin.svg).toContain('(as-if)');
    expect(clin.altText).toContain('Contested standing');
    expect(clin.altText).toContain('Confidence —');
    expect(clin.svg).toContain('Placate'); // clinician label ("Placate & comply")

    const client = render(catSdrModel, { audience: 'client' });
    // the clinician-analytic surface is gone …
    expect(client.svg).not.toContain('⚖');
    expect(client.svg).not.toContain('(as-if)');
    expect(client.altText).not.toContain('Contested standing');
    expect(client.altText).not.toContain('Confidence —');
    // … but the structural loop + topology stay, in the client's own words
    expect(client.svg).toContain('TRAP');
    expect(client.altText).toContain('is a trap');
    expect(client.svg).toContain('People-please'); // placate's client label
    expect(client.svg).not.toContain('Placate');
    // picture profile suppresses the analytic surface too
    expect(render(catSdrModel, { audience: 'picture' }).svg).not.toContain('⚖');
  });

  it('hides cross-school provenance for the client (Parts family, ADR-0007)', () => {
    const clin = render(perfectionismModel, { audience: 'clinician' });
    expect(clin.svg).toContain('⚖');
    expect(clin.altText).toContain('Origins disagree on');
    const client = render(perfectionismModel, { audience: 'client' });
    expect(client.svg).not.toContain('⚖');
    expect(client.altText).not.toContain('Origins disagree on');
  });

  it('never mutates the model (profiles change rendering only, §2)', () => {
    const before = JSON.stringify(catSdrModel);
    render(catSdrModel, { audience: 'client' });
    render(catSdrModel, { audience: 'picture' });
    render(perfectionismModel, { audience: 'client' });
    expect(JSON.stringify(catSdrModel)).toBe(before);
  });
});

describe('renderComposite — the Composite board (v0.2 §2)', () => {
  const partsView = parseModel({
    version: '0.1.0',
    diagram: 'parts-map',
    meta: { title: 'Parts view', disclaimer: 'x' },
    nodes: [
      { id: 'self', kind: 'self', label: { clinician: { en: 'Self' } } },
      { id: 'critic', kind: 'agent', label: { clinician: { en: 'Inner critic' } } },
      {
        id: 'anchor',
        kind: 'resource',
        label: { clinician: { en: 'Walking outdoors' }, client: { en: 'A walk' } },
      },
    ],
    edges: [{ id: 'e', kind: 'containment', source: 'self', target: 'critic' }],
  });
  const loopView = parseModel({
    version: '0.1.0',
    diagram: 'process-loop',
    meta: { title: 'Loop view', disclaimer: 'x' },
    nodes: [
      { id: 'worry', kind: 'state', label: { clinician: { en: 'Worry spikes' } } },
      {
        id: 'anchor',
        kind: 'resource',
        label: { clinician: { en: 'Walking outdoors' }, client: { en: 'A walk' } },
      },
    ],
    edges: [
      { id: 'l', kind: 'sequential', source: 'worry', target: 'worry', loop: 'R' },
      { id: 'x', kind: 'exit', source: 'worry', target: 'anchor' },
    ],
  });

  it('finds node ids shared across views (the cross-navigation threads)', () => {
    const threads = sharedNodeIds([partsView, loopView]);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.id).toBe('anchor');
    expect(threads[0]?.label).toBe('Walking outdoors');
    expect(threads[0]?.views.sort()).toEqual(['Loop view', 'Parts view']);
  });

  it('arranges the views as titled panels over a shared-threads index', () => {
    const { svg, altText } = renderComposite([partsView, loopView]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Shared threads (cross-navigation)');
    expect(svg).toContain('1. Parts view');
    expect(svg).toContain('2. Loop view');
    // each member is nested as a panel, and the shared id is tagged for cross-nav
    expect(svg).toContain('data-composite-panel="0"');
    expect(svg).toContain('data-composite-panel="1"');
    expect(svg).toContain('data-shared-id="anchor"');
    // the member content is embedded (a label from each view)
    expect(svg).toContain('Inner critic');
    expect(svg).toContain('Worry spikes');
    expect(altText).toContain('Composite board of 2 views');
    expect(altText).toContain('Walking outdoors in');
  });

  it('passes the audience profile through to each member view', () => {
    const svg = renderComposite([partsView, loopView], { audience: 'client' }).svg;
    expect(svg).toContain('A walk'); // client label for the shared resource
  });

  it('namespaces nested-panel def ids so shared markers do not collide (ADR-0019 fix)', () => {
    // the State Map and the Loop both define an `arrow` marker — nested in one document they
    // would otherwise share the id; each panel's defs + refs must be namespaced.
    const svg = renderComposite([stateModel, loopView]).svg;
    expect(svg).not.toContain('id="arrow"'); // no un-namespaced (colliding) id remains
    expect(svg).toContain('id="arrow__p0"'); // state-map panel
    expect(svg).toContain('id="arrow__p1"'); // loop panel
    // references are rewritten to match (no dangling url(#arrow))
    expect(svg).toContain('url(#arrow__p1)');
    expect(svg).not.toContain('url(#arrow)');
    // every emitted id is unique across the whole board
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never mutates the member models', () => {
    const before = JSON.stringify([partsView, loopView]);
    renderComposite([partsView, loopView], { audience: 'client' });
    expect(JSON.stringify([partsView, loopView])).toBe(before);
  });

  it('handles a board with no shared threads', () => {
    const a = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { title: 'A', disclaimer: 'x' },
      nodes: [{ id: 'p', kind: 'state', label: { clinician: { en: 'P' } } }],
    });
    const b = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { title: 'B', disclaimer: 'x' },
      nodes: [{ id: 'q', kind: 'state', label: { clinician: { en: 'Q' } } }],
    });
    expect(sharedNodeIds([a, b])).toEqual([]);
    expect(renderComposite([a, b]).altText).toContain('No shared threads');
  });
});
