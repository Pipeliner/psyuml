import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';
import {
  blankTemplate,
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
      const m = svg.match(new RegExp(`<text x="[-\\d.]+" y="([-\\d.]+)"[^>]*>${txt}<`));
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

  it('matches the committed golden SVG', () => {
    expectGolden('cat-sdr.svg', renderLoopMap(catSdrModel).svg);
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
