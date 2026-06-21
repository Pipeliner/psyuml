import { test, expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

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

    // 4b) Mark the uncertain bit as a guess, not a fact (epistemic honesty).
    const lastCertainty = lastRow.getByRole('combobox');
    await lastCertainty.selectOption('inferred');
    await expect(lastCertainty).toHaveValue('inferred');

    // 5) A realization mid-session -> add a part of the right kind via the add-node form.
    const before = await nodes(page).getByRole('listitem').count();
    await page.getByLabel('New node label').fill('A newly-noticed part');
    await page.getByLabel('New node kind').selectOption('agent');
    await page.getByRole('button', { name: 'Add node' }).click();
    await expect(nodes(page).getByRole('listitem')).toHaveCount(before + 1);
    await expect(diagram(page)).toContainText('A newly-noticed part');

    // 6) Show it to the client in plain language — it still renders.
    await page.getByRole('combobox', { name: 'Audience' }).selectOption('client');
    await expect(diagram(page).locator('svg')).toBeVisible();
    await page.getByRole('combobox', { name: 'Audience' }).selectOption('clinician');

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
    await page.getByText(/Edit as text \(DSL\)/).click();
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

  test('remove a node drops it from the list and the diagram', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('parts-map');
    const list = nodes(page).getByRole('listitem');
    const count = await list.count();
    const lastRow = list.last();
    const label = await lastRow.getByRole('textbox').inputValue();
    await lastRow.getByRole('button', { name: /Remove node/i }).click();
    await expect(list).toHaveCount(count - 1);
    await expect(diagram(page)).not.toContainText(label);
  });

  test('diagram details: editing title + disclaimer flows into the model', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('parts-map');
    // Title is surfaced at the top now (no longer hidden in a collapsed panel).
    await page.getByLabel('Diagram title', { exact: true }).fill('JOURNEY-TITLE-XYZ');
    // Disclaimer + crisis line live under "Diagram details".
    await page.getByText('Diagram details — disclaimer, crisis line').click();
    await page.getByLabel('Diagram disclaimer', { exact: true }).fill('MY-OWN-DISCLAIMER-XYZ');
    // It flows into the model — visible in the text (DSL) view.
    await page.getByText(/Edit as text \(DSL\)/).click();
    const dsl = page.getByLabel('PsyUML text DSL');
    await expect(dsl).toHaveValue(/JOURNEY-TITLE-XYZ/);
    await expect(dsl).toHaveValue(/MY-OWN-DISCLAIMER-XYZ/);
  });

  test('a GUI-added node can carry its own plain-language label (not blank in Client view)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('parts-map');
    // Add a part with BOTH a clinician and a client label, entirely via the GUI form.
    await page.getByLabel('New node label').fill('Caretaker');
    await page
      .getByLabel('New node client-language label (optional)')
      .fill('the one who looks after everyone');
    await page.getByRole('button', { name: 'Add node' }).click();
    // In the client layer the GUI-made node shows the plain words, not a blank.
    await page.getByRole('combobox', { name: 'Audience' }).selectOption('client');
    await expect(diagram(page)).toContainText('the one who looks after everyone');
  });

  test('build a link between two nodes in the GUI — no DSL needed', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('parts-map');
    const links = page.getByRole('region', { name: 'Links' });
    const before = await links.getByRole('listitem').count();

    // Connect the first two nodes with a typed, labelled link — entirely via the GUI.
    await page.getByLabel('Link from').selectOption({ index: 1 }); // index 0 is the "from…" placeholder
    await page.getByLabel('Link to').selectOption({ index: 2 });
    await page.getByLabel('Link type').selectOption('containment');
    await page.getByLabel('Link label (optional)').fill('protects');
    await page.getByRole('button', { name: 'Add link' }).click();

    await expect(links.getByRole('listitem')).toHaveCount(before + 1);
    await expect(links).toContainText('containment');
    await expect(links).toContainText('protects');

    // And it is removable from the GUI too (reversible).
    await links
      .getByRole('button', { name: /Remove link/i })
      .last()
      .click();
    await expect(links.getByRole('listitem')).toHaveCount(before);
  });

  test('view controls zoom and fit a dense diagram', async ({ page }) => {
    await page.goto('/');
    const controls = page.getByRole('group', { name: 'View controls' });
    await expect(controls).toContainText('100%');
    await controls.getByRole('button', { name: 'Zoom in' }).click();
    await expect(controls).toContainText('125%');
    // the diagram still renders while zoomed
    await expect(diagram(page).locator('svg')).toBeVisible();
    // Reset returns to 100%
    await controls.getByRole('button', { name: 'Reset' }).click();
    await expect(controls).toContainText('100%');
  });

  test('drag repositions a node on a hand-laid-out (genogram) diagram', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Diagram' }).selectOption('relational-field');
    const node = diagram(page).locator('[data-node-id]').first();
    const before = await node.boundingBox();
    if (!before) throw new Error('no node bounding box');
    const cx = before.x + before.width / 2;
    const cy = before.y + before.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 90, cy + 60, { steps: 6 });
    await page.mouse.up();
    const after = await node.boundingBox();
    if (!after) throw new Error('node vanished after drag');
    // it actually moved on screen (drag-to-reposition wired through to the model + re-render)
    expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(15);
  });

  test('exports the diagram as a real PNG (REQ-EXPORT-RASTER)', async ({ page }) => {
    await page.goto('/');
    await expect(diagram(page).locator('svg')).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    const path = await download.path();
    const buf = readFileSync(path);
    // a real, non-trivial PNG (the 8-byte signature, then more than a stub of pixels)
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buf.length).toBeGreaterThan(1000);
  });
});
