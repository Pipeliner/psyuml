/**
 * Mobile / touch-screen UX conformance (REQ-MOBILE-TOUCH-UX, ADR-0056).
 *
 * The real behaviour (no overflow, 44px targets, no iOS focus-zoom, touch drag) is measured in a
 * browser by `e2e/mobile.spec.ts` — but that runs via `pnpm run e2e`, NOT in CI (which stays
 * browser-free). This is the CI-enforced guard: it parses the editor's `index.html` / `styles.css` /
 * `App.tsx` and asserts the load-bearing mobile rules are present, so a future edit can't silently
 * delete the viewport meta, the 44px coarse targets, the ≥16px touch fonts, the wrapping control rows,
 * or the DSL field's responsive font without failing here. (Text-level guard, like docs-conformance;
 * the e2e is the behavioural proof.)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string): string => readFileSync(new URL(f, import.meta.url), 'utf8');
const html = read('./index.html');
const css = read('./styles.css');
const app = read('./App.tsx');

/** The body of the `@media (pointer: coarse) { … }` block (brace-matched). */
function coarseBlock(): string {
  const start = css.indexOf('@media (pointer: coarse)');
  expect(start, 'a @media (pointer: coarse) block exists').toBeGreaterThan(-1);
  let depth = 0;
  let i = css.indexOf('{', start);
  const from = i + 1;
  for (; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}' && --depth === 0) return css.slice(from, i);
  }
  throw new Error('unterminated coarse block');
}

describe('mobile / touch-screen UX conformance (REQ-MOBILE-TOUCH-UX, ADR-0056)', () => {
  it('the page declares a mobile-fit, zoomable viewport', () => {
    const m = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/i);
    expect(m, 'a viewport meta is present').toBeTruthy();
    expect(m![1], 'viewport scales to the device width').toContain('width=device-width');
    // never disable user zoom — pinch-zoom is an accessibility right (WCAG 1.4.4 / 1.4.10).
    expect(m![1]).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
  });

  it('the page can never scroll sideways (a wide diagram is clipped/scrolled, not the page)', () => {
    expect(css).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/s);
  });

  const coarse = coarseBlock();

  it('touch raises every control to the 44px WCAG 2.5.5 target size', () => {
    expect(coarse, '--control-h bumped to 44px on touch').toMatch(/--control-h:\s*2\.75rem/);
    expect(coarse, 'summaries get a 44px touch row').toMatch(
      /summary\s*\{[^}]*min-height:\s*2\.75rem/s,
    );
  });

  it('touch lifts every editable field to ≥16px so iOS will not zoom on focus', () => {
    expect(coarse, 'inputs/selects/textareas ≥16px on touch').toMatch(
      /input,\s*select,\s*textarea,[^{]*\{\s*font-size:\s*16px/s,
    );
    expect(coarse, '--fs-mono (the DSL field) lifts to 16px on touch').toMatch(/--fs-mono:\s*16px/);
    // and the DSL textarea must read that variable, not a hardcoded sub-16 size.
    expect(app, 'DSL textarea uses the responsive --fs-mono').toMatch(
      /fontSize:\s*['"]var\(--fs-mono\)['"]/,
    );
    expect(app, 'no hardcoded fontSize: <16 on the DSL textarea').not.toMatch(
      /fontSize:\s*1?[0-5]\b/,
    );
  });

  it('rows of controls wrap instead of overflowing a narrow screen', () => {
    for (const cls of ['.row', '.form-row', '.toolbar', '.toolbar__group']) {
      const rule = css.match(new RegExp(`\\${cls}\\s*\\{[^}]*\\}`, 's'));
      expect(rule, `${cls} exists`).toBeTruthy();
      expect(rule![0], `${cls} wraps`).toMatch(/flex-wrap:\s*wrap/);
    }
  });

  it('touch ergonomics: no grey tap-flash, contained scroll, fast taps', () => {
    expect(css, 'suppress the grey tap-highlight (we draw our own focus ring)').toMatch(
      /-webkit-tap-highlight-color:\s*transparent/,
    );
    expect(css, 'the scrollable diagram contains its overscroll').toMatch(
      /\.diagram\s*\{[^}]*overscroll-behavior:\s*contain/s,
    );
    expect(css, 'controls remove the legacy double-tap-zoom delay').toMatch(
      /touch-action:\s*manipulation/,
    );
  });

  it('the diagram opts out of native gestures only while it is touch-draggable', () => {
    // pointer events (not mouse-only) so a finger drag works; touch-action:none gates the canvas.
    expect(app).toMatch(/onPointerDown/);
    expect(app).toMatch(/touchAction:\s*draggable\s*\?\s*'none'/);
  });
});
