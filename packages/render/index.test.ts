import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';
import { renderStateMap } from './index';

const example = readFileSync(new URL('../../examples/state-map.psyuml', import.meta.url), 'utf8');
const model = parseModel(example);
const goldenUrl = new URL('../../examples/state-map.svg', import.meta.url);

describe('renderStateMap', () => {
  it('emits an accessible svg with bands, states, and exits', () => {
    const { svg, altText } = renderStateMap(model);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('Sympathetic / mobilized');
    expect(svg).toContain('Numb / shutdown');
    expect(svg).toContain('(EXIT)');
    expect(altText).toContain('Bands top to bottom');
    expect(altText).toContain('Ways out');
  });

  it('renders the client layer with the client vocabulary', () => {
    const { svg } = renderStateMap(model, { layer: 'client' });
    expect(svg).toContain('Foggy');
    expect(svg).toContain('Green — safe &amp; social');
    expect(svg).not.toContain('Numb / shutdown');
  });

  it('is monochrome by default; hue is redundant and opt-in', () => {
    expect(renderStateMap(model).svg).not.toContain('#009E73');
    expect(renderStateMap(model, { monochrome: false }).svg).toContain('#009E73');
  });

  it('matches the committed golden SVG', () => {
    const { svg } = renderStateMap(model);
    if (!existsSync(goldenUrl)) {
      if (process.env.CI) throw new Error('Golden examples/state-map.svg is missing in CI');
      writeFileSync(goldenUrl, svg);
    }
    expect(svg).toBe(readFileSync(goldenUrl, 'utf8'));
  });
});
