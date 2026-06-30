# ADR-0056: a mobile / touch-screen friendly editor — fit, don't-yank, tappable, touch-draggable

- **Status:** accepted
- **Date:** 2026-06-30
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-MOBILE-TOUCH-UX (new → implemented) · §D (accessibility) · builds on ADR-0013 (the responsive design system) and ADR-0026 (visual identity); WCAG 2.5.5 (target size), 1.4.4/1.4.10 (zoom/reflow)

## Context

ADR-0013 gave the editor a mobile-first foundation (a `width=device-width` viewport, a `pointer:
coarse` block bumping controls toward 44px, fluid widths). But a real phone audit (Chromium emulating
360×760, touch, `pointer: coarse`) found that foundation had holes:

- **It did not FIT.** 286px of horizontal overflow at 360px: the Composite-board button row (`.row`)
  had no `flex-wrap`, so "Add current view / Clear board" ran off-screen; and a native file input's
  stubborn intrinsic min-width (its button + filename) poked the file-action group ~25px past the
  edge even at `min-width: 0`.
- **It YANKED.** Every form control was 13–14px and the DSL textarea a hardcoded inline 12px — under
  iOS Safari's 16px threshold, so *focusing any field zoomed the whole page* (the classic jarring
  mobile bug).
- **A tap target missed.** A bare `details.panel > summary` was 43.4px — under the 44px WCAG 2.5.5
  minimum (the coarse bump only covered `.disclose-inline` summaries).
- **Touch ergonomics were unset** — no `-webkit-tap-highlight-color` (grey flash on every tap),
  `overscroll-behavior` (panning the diagram rubber-banded the page), or `touch-action: manipulation`
  (legacy double-tap-zoom delay on the controls).

(Drag-to-reposition was already sound — it uses pointer events + `setPointerCapture` with
`touch-action: none`, so one-finger drag works; and a `View − 100% + Reset` zoom control already lets
a dense diagram be enlarged + panned, which is the right mobile pattern since fit-to-width would
shrink text below the 8px legibility floor.)

## Decision

Close the gaps so the editor is **fit, never-yanks, tappable, touch-draggable**, and **enforce it two
ways**:

- **Fit:** `.row` now `flex-wrap: wrap` (every control row drops to the next line, not off-screen);
  on touch the file-action `.toolbar__group` takes a full-width row and a `:has(> input[type=file])`
  control fills its row, so the stubborn file input clips its filename instead of overflowing.
- **Never-yanks:** on `pointer: coarse`, `input/select/textarea/[type=file]` lift to 16px, and a new
  `--fs-mono` var (12px desktop → 16px touch) feeds the DSL textarea's inline style, so no focused
  field is under 16px.
- **Tappable:** all `summary`s get a 44px touch row; controls already meet 44px via `--control-h`.
- **Ergonomics:** `-webkit-tap-highlight-color: transparent` (we draw our own `:focus-visible` ring),
  `overscroll-behavior: contain` + `-webkit-overflow-scrolling: touch` on the diagram, and
  `touch-action: manipulation` on the controls.
- **Enforcement:** `e2e/mobile.spec.ts` (Chromium, touch) *measures* the four commitments — no overflow
  at 320/360px, every field ≥16px across diagram types, every control ≥44px, and the touch-drag
  affordance wired; and `apps/web/mobile-ux.test.ts` is the CI-enforced text guard (browser-free CI
  can't run the e2e) that the load-bearing rules can't be silently deleted.

## Consequences

- **Positive:** the editor is genuinely usable one-handed on a phone — it never scrolls sideways
  (320–414px), focusing a field never zooms the page, every control is a comfortable tap, the diagram
  pans without rubber-banding the page and zooms for reading, and a node still drags by touch. Proven
  by 5 e2e mobile tests; the 12 desktop onboarding e2e tests still pass (no regression); 7 CI
  conformance tests lock the rules in. No new dependency; all changes are CSS + one inline-style swap.
- **Negative / cost:** the e2e behavioural proof runs only under `pnpm run e2e` (CI stays
  browser-free), so the in-CI guarantee is the *rule-level* conformance test, not the measured layout
  — the same honest split the project already uses for e2e. A very long save-file name still clips in
  the file input (native control limit) rather than wrapping; acceptable (the button works, the name
  is decorative).
- **Impact:** `apps/web/styles.css` (wrap rows, touch fonts, 44px summaries, tap/overscroll/touch-
  action, `:has` file input), `apps/web/App.tsx` (DSL textarea → `var(--fs-mono)`),
  `e2e/mobile.spec.ts` (new), `apps/web/mobile-ux.test.ts` (new), `sdd/traceability.json`,
  `apps/web/IMPACT.md`, `e2e/IMPACT.md`.

## Alternatives considered

- **Replace the native file input with a styled button + hidden input.** Rejected for now — more code
  and an accessibility surface to re-implement; the full-width-row + clip approach removes the overflow
  with pure CSS. Noted as the upgrade if filename truncation ever bothers a user.
- **Fit the diagram to the phone width.** Rejected — scaling a native-width diagram to ~340px pushes
  its 8px-floor text below legibility; the native-size + pan + zoom control keeps it readable.
- **Disable user zoom for an "app-like" feel** (`maximum-scale=1`). Rejected — pinch-zoom is a WCAG
  1.4.4/1.4.10 right; the conformance test asserts it is *not* disabled.
- **Bump all desktop fonts to 16px too.** Rejected — keeps the desktop compact; the 16px lift is
  scoped to `pointer: coarse` where the iOS-zoom problem actually exists.
