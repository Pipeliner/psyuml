import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile / touch-screen friendly editor (REQ-MOBILE-TOUCH-UX, ADR-0056).
 *
 * Driven through Chromium emulating a phone (360×760, touch, `pointer: coarse`). Asserts the four
 * commitments that make the editor usable on a touch screen: it FITS (no horizontal overflow at the
 * smallest common widths), it never YANKS (every editable field ≥16px so iOS won't zoom on focus), it
 * is TAPPABLE (every interactive control meets the 44px touch-target minimum, WCAG 2.5.5), and it is
 * DRAGGABLE BY TOUCH (the reposition affordance is wired with pointer events + `touch-action: none`).
 *
 * Targets by role/accessible-name where it can (doubles as an a11y check). Browsers aren't installed
 * by `pnpm install` — run `npx playwright install chromium`, then `pnpm run e2e`. Kept out of
 * `pnpm run verify` (CI stays browser-free).
 */

test.use({
  viewport: { width: 360, height: 760 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});

const hOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('mobile / touch-screen friendly editor', () => {
  test('emulates a touch device with a mobile-fit viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'PsyUML editor' })).toBeVisible();
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const viewport = await page.evaluate(
      () => document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '',
    );
    expect(viewport).toContain('width=device-width');
  });

  test('FITS: no horizontal overflow at 360 and 320px', async ({ page }) => {
    await page.goto('/');
    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(150);
      expect(await hOverflow(page), `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('NEVER YANKS: every editable field is ≥16px so focusing it does not zoom iOS', async ({
    page,
  }) => {
    await page.goto('/');
    // toggle a few diagram types so the different panels (incl. the monospace DSL field) all render
    for (const diagram of ['process-loop', 'relational-field', 'decision-nav']) {
      await page.getByRole('combobox', { name: 'Diagram' }).selectOption(diagram);
      const small = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            'input:not([type=checkbox]):not([type=range]), select, textarea',
          ),
        ]
          .filter(
            (el) =>
              (el as HTMLElement).offsetParent !== null &&
              parseFloat(getComputedStyle(el).fontSize) < 16,
          )
          .map((el) => el.getAttribute('aria-label') ?? (el as HTMLInputElement).type),
      );
      expect(small, `fields under 16px while showing ${diagram}`).toEqual([]);
    }
  });

  test('TAPPABLE: interactive controls meet the 44px touch-target minimum', async ({ page }) => {
    await page.goto('/');
    // Buttons, selects, file/text inputs, disclosure summaries — the things you press. (Checkboxes are
    // wrapped in a label = the real target; inline links in prose get the WCAG inline exception.)
    const tooSmall = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            'button, select, input[type=file], input[type=text], summary, [role=button]',
          ),
        ]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0 && r.height < 44 - 0.5).length,
    );
    expect(tooSmall, 'controls under the 44px touch-target minimum').toBe(0);
  });

  test('DRAGGABLE BY TOUCH: the reposition affordance is wired for pointer/touch', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('relational-field');
    const canvas = page.locator('.diagram__canvas');
    await expect(canvas.locator('svg [data-node-id]').first()).toBeVisible();
    // touch-drag opts the canvas out of native scroll/zoom so a one-finger drag moves the node, not
    // the page (the handler uses pointer events + setPointerCapture, which unify mouse + touch).
    await expect(canvas).toHaveCSS('touch-action', 'none');
  });
});
