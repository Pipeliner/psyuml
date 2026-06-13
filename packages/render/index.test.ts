import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';
import { renderDecisionChart, renderPartsMap, renderStateMap } from './index';

const read = (name: string): string =>
  readFileSync(new URL(`../../examples/${name}`, import.meta.url), 'utf8');

const stateModel = parseModel(read('state-map.psyuml'));
const partsModel = parseModel(read('parts-map.psyuml'));
const decisionModel = parseModel(read('decision-nav.psyuml'));

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
