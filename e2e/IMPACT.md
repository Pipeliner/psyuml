# Impact — `e2e/`

**Purpose:** Playwright end-to-end tests of the web editor as a *user* experiences it —
the onboarding journey for someone diagramming an only partially understood situation
(safety posture, co-authorship, progressive reveal, snapshot/diff, escalation UX).
**Status:** active (M2/M3 UX, exercised through the browser)
**Spec anchor / REQ:** REQ-UX-STORIES, REQ-EDITOR-MVP, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-VERSIONING-DIFF, REQ-MOBILE-TOUCH-UX

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
| `mobile.spec.ts` | **Mobile / touch-screen UX (ADR-0056, REQ-MOBILE-TOUCH-UX)** — Chromium emulating a phone (360×760, touch, `pointer: coarse`) MEASURES the four commitments: FITS (no horizontal overflow at 320/360px), NEVER YANKS (every editable field ≥16px across diagram types — no iOS focus-zoom), TAPPABLE (every control ≥44px, WCAG 2.5.5), and DRAGGABLE BY TOUCH (the reposition canvas is `touch-action: none` + pointer-event wired). The CI-enforced rule guard is `apps/web/mobile-ux.test.ts` | `apps/web`, `playwright.config.ts` | `pnpm run e2e` | REQ-MOBILE-TOUCH-UX, REQ-ACCESSIBILITY | low |

## Change checklist
- [ ] Target by role/label (accessible names), not brittle CSS — it doubles as an a11y check.
- [ ] Keep e2e out of `verify`; CI without browsers must stay green.
- [ ] Ran `node sdd/check.mjs` (green).
