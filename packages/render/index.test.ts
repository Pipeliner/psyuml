import { describe, expect, it } from 'vitest';
import { renderPlaceholder } from './index';

describe('renderPlaceholder', () => {
  it('emits an accessible svg element with a label', () => {
    const svg = renderPlaceholder('State Map');
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="State Map placeholder"');
  });
});
