# Impact — `e2e/`

**Purpose:** Playwright end-to-end tests of the web editor as a *user* experiences it —
the onboarding journey for someone diagramming an only partially understood situation
(safety posture, co-authorship, progressive reveal, snapshot/diff, escalation UX).
**Status:** active (M2/M3 UX, exercised through the browser)
**Spec anchor / REQ:** REQ-UX-STORIES, REQ-EDITOR-MVP, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-VERSIONING-DIFF

## Upstream (this depends on)
- `apps/web` (the running editor) via the Vite dev server; `../playwright.config.ts` (runner + webServer).
- Browsers are NOT installed by `pnpm install` — run `npx playwright install chromium`, then `pnpm run e2e`.

## Downstream (depends on this) — blast radius
> **Blast radius: none at runtime.** A leaf test suite; nothing imports it. It is **not** part
> of `pnpm run verify` (which stays browser-free for CI) — run it explicitly with `pnpm run e2e`.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `onboarding.spec.ts` | New-user onboarding journey + the acute-risk escalation banner, driven through Chromium | `apps/web`, `playwright.config.ts` | `pnpm run e2e` | REQ-UX-STORIES, REQ-CLIENT-SAFETY-UX | low |

## Change checklist
- [ ] Target by role/label (accessible names), not brittle CSS — it doubles as an a11y check.
- [ ] Keep e2e out of `verify`; CI without browsers must stay green.
- [ ] Ran `node sdd/check.mjs` (green).
