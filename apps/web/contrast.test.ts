/**
 * Theme-token contrast conformance (REQ-THEME-CONTRAST, ADR-0057).
 *
 * The editor's light/dark theme documents specific WCAG 2.2 AA contrast ratios in `styles.css`
 * comments. This guard RE-DERIVES those ratios from the committed CSS custom properties — it does
 * not trust the comments — and fails if any text-on-field role, including the placeholder colour,
 * drops below AA in *either* theme. It exists because a live browser audit caught the browser's
 * default `::placeholder` grey (Chromium's #757575) at only ~3.7:1 on the dark field (--c-surface
 * #211b13), below the 4.5:1 that the information a placeholder carries requires. The fix pins
 * placeholders to `--c-text-subtle`; this test keeps that — and the other text roles — honest as
 * the palette evolves. Parsing guard (like `mobile-ux.test.ts`); the rendering is spot-checked in
 * a real browser.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

// --- WCAG 2.x relative luminance + contrast ratio (sRGB) ---
const lin = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: number[]): number =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number[], b: number[]): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hexToRgb = (hex: string): number[] => {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

// --- brace-matched CSS block extraction (no CSS parser dependency) ---
const block = (needle: string, from = 0): string => {
  const start = css.indexOf(needle, from);
  expect(start, `"${needle}" is present in styles.css`).toBeGreaterThan(-1);
  let depth = 0;
  let i = css.indexOf('{', start);
  const bodyFrom = i + 1;
  for (; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}' && (depth -= 1) === 0) return css.slice(bodyFrom, i);
  }
  throw new Error(`unterminated block for ${needle}`);
};
const tokenIn = (body: string, name: string): string | null => {
  // `--name: value;` — the trailing `:` in the pattern stops `--c-text` matching `--c-text-muted`.
  const m = body.match(new RegExp(`\\${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
};

// Light defaults live in the first `:root {}`; dark overrides in the `:root {}` inside the
// `@media (prefers-color-scheme: dark)` block. A dark theme inherits any token it does not override.
const lightRoot = block(':root');
const darkMediaAt = css.indexOf('@media (prefers-color-scheme: dark)');
const darkRoot = block(':root', darkMediaAt);
const resolve = (root: string, name: string): number[] => {
  const v = tokenIn(root, name) ?? tokenIn(lightRoot, name);
  expect(v, `${name} resolves to a hex literal`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
  return hexToRgb(v!);
};

// The text field's background token (inputs set `background: var(--…)`) — the surface a
// placeholder and typed text sit on. Read it from the CSS so the test tracks the real field.
const fieldRule = block("input[type='text'],");
const bgMatch = fieldRule.match(/background:\s*var\((--[\w-]+)\)/);
const FIELD_BG = bgMatch ? bgMatch[1] : '--c-surface';

// The `::placeholder` rule — the colour token it pins, and its opacity guard.
const placeholderRule = block('::placeholder');
const phMatch = placeholderRule.match(/color:\s*var\((--[\w-]+)\)/);

const THEMES = [
  { name: 'light', root: lightRoot },
  { name: 'dark', root: darkRoot },
];

describe('theme-token contrast conformance (REQ-THEME-CONTRAST, ADR-0057)', () => {
  it('placeholders are pinned to a token (not the browser default) and opacity:1', () => {
    expect(bgMatch, 'the text field background is a token').toBeTruthy();
    expect(phMatch, '::placeholder colour is a design token, not a browser default').toBeTruthy();
    // Firefox dims placeholders with a default opacity; pin it so the AA colour is not clawed back.
    expect(placeholderRule, '::placeholder pins opacity:1').toMatch(/opacity:\s*1\b/);
  });

  for (const t of THEMES) {
    it(`${t.name}: placeholder text meets WCAG AA (4.5:1) on the field`, () => {
      const ph = phMatch![1];
      const c = contrast(resolve(t.root, ph), resolve(t.root, FIELD_BG));
      expect(c, `${ph} on ${FIELD_BG} = ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${t.name}: body / muted / subtle text meet AA on the surface`, () => {
      const surface = resolve(t.root, '--c-surface');
      const ratios = {
        '--c-text': contrast(resolve(t.root, '--c-text'), surface),
        '--c-text-muted': contrast(resolve(t.root, '--c-text-muted'), surface),
        '--c-text-subtle': contrast(resolve(t.root, '--c-text-subtle'), surface),
      };
      // body ink is strong (comments claim ~13–15:1); secondary/tertiary must still clear AA text.
      expect(
        ratios['--c-text'],
        `--c-text ${ratios['--c-text'].toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(7);
      expect(
        ratios['--c-text-muted'],
        `--c-text-muted ${ratios['--c-text-muted'].toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        ratios['--c-text-subtle'],
        `--c-text-subtle ${ratios['--c-text-subtle'].toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
