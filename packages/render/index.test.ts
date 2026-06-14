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
    expect(svg).toContain('IFS / schema / SD');
    expect(svg).not.toContain('Little one, age 6');
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
    expect(svg).toContain('988');
    expect(altText).toContain('Crisis navigation chart');
    expect(altText).toContain('always shown');
  });

  it('renders the client layer vocabulary', () => {
    const { svg } = renderDecisionChart(decisionModel, { layer: 'client' });
    expect(svg).toContain('Call for help now');
  });

  it('matches the committed golden SVG', () => {
    expectGolden('decision-nav.svg', renderDecisionChart(decisionModel).svg);
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
