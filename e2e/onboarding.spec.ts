import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Onboarding journey: a newcomer diagramming a situation they only *partially* understand.
 *
 * It exercises the UX commitments that make that safe and unintimidating — visible safety
 * posture, co-authorship (relabel in your own words), progressive reveal (hide what you're
 * not ready to look at, reversibly), nothing auto-finalized (snapshot in-progress), and
 * "see what changed" as understanding evolves — plus the live validation + escalation UX.
 *
 * Browsers aren't installed by `pnpm install`; run `npx playwright install chromium`, then
 * `pnpm run e2e`. (Kept out of `pnpm run verify` so CI stays browser-free.)
 */

const diagram = (page: Page): Locator => page.locator('section[aria-label$="diagram"]');
const nodes = (page: Page): Locator => page.getByRole('region', { name: 'Nodes' });

test.describe('new user: diagramming a partially understood situation', () => {
  test('build it, hide what you do not know yet, snapshot, and see what changed', async ({
    page,
  }) => {
    // 1) Arrive cold — the safety posture is the first thing you see.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'PsyUML editor' })).toBeVisible();
    const note = page.getByRole('note');
    await expect(note).toContainText('Unvalidated v0.x');
    await expect(note).toContainText(/does not replace, professional care/i);

    // 2) "Parts of me pull different ways, but I'm not sure how." -> Parts / Agents Map.
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('parts-map');
    await expect(diagram(page).locator('svg')).toBeVisible();

    // 3) Co-authorship: relabel a node into your own, tentative words.
    const lastRow = nodes(page).getByRole('listitem').last();
    const lastLabel = lastRow.getByRole('textbox');
    await lastLabel.fill('a part I am not ready to face');
    await expect(diagram(page)).toContainText('a part I am not ready to face');

    // 4) Partially understood -> hide what you are not ready to look at (progressive reveal),
    //    and confirm it is reversible: nothing is lost or finalized.
    const showToggle = lastRow.getByRole('checkbox');
    await showToggle.uncheck();
    await expect(diagram(page)).not.toContainText('a part I am not ready to face');
    await showToggle.check();
    await expect(diagram(page)).toContainText('a part I am not ready to face');

    // 5) A realization mid-session -> add a part.
    const before = await nodes(page).getByRole('listitem').count();
    await page.getByRole('button', { name: 'Add part' }).click();
    await expect(nodes(page).getByRole('listitem')).toHaveCount(before + 1);
    await expect(diagram(page)).toContainText('New part');

    // 6) Show it to the client in plain language — it still renders.
    await page.getByRole('combobox', { name: 'Layer' }).selectOption('client');
    await expect(diagram(page).locator('svg')).toBeVisible();
    await page.getByRole('combobox', { name: 'Layer' }).selectOption('clinician');

    // 7) Live validation feedback — no surprises at export time.
    await expect(page.getByRole('region', { name: 'Formulation health' })).toBeVisible();

    // 8) Save-incomplete: snapshot the in-progress understanding.
    await page.getByRole('button', { name: 'Snapshot' }).click();
    const versions = page.getByRole('region', { name: 'Saved versions' });
    await expect(versions).toBeVisible();
    await expect(versions.getByRole('listitem')).toHaveCount(1);

    // 9) Understanding evolves -> change one node, then see exactly what changed vs. the snapshot.
    await nodes(page)
      .getByRole('listitem')
      .first()
      .getByRole('textbox')
      .fill('clearer now: my steady center');
    await versions.getByRole('button', { name: 'Compare' }).click();
    const changes = page.getByRole('region', { name: 'Changes since the loaded version' });
    await expect(changes).toBeVisible();
    await expect(changes).toContainText('clearer now: my steady center');

    // 10) The same model as editable text (DSL), for a power user.
    await page.getByText('Text (DSL) — read, copy, or edit as text').click();
    await expect(page.getByLabel('PsyUML text DSL')).toHaveValue(/diagram parts-map/);
  });

  test('flagging acute risk raises a human-review banner (and clears when unflagged)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('parts-map');

    const banner = page.getByRole('alert', { name: 'Clinical escalation' });
    await expect(banner).toHaveCount(0);

    await page.getByRole('checkbox', { name: /Acute risk/i }).check();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Human clinical review required/i);

    await page.getByRole('checkbox', { name: /Acute risk/i }).uncheck();
    await expect(banner).toHaveCount(0);
  });
});
