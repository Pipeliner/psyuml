# ADR-0057: placeholder text meets WCAG AA — pin it to a token, don't inherit the browser default

- **Status:** accepted
- **Date:** 2026-07-02
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-THEME-CONTRAST (new → implemented) · REQ-ACCESSIBILITY · §D (accessibility) · builds on ADR-0013 (the token design system) and ADR-0026 (visual identity); WCAG 2.2 §1.4.3 (contrast minimum)

## Context

A live WCAG contrast audit of the editor's **dark mode** (Chromium, `prefers-color-scheme: dark`,
walking every visible text node and computing each foreground against its composited background)
came back almost entirely clean — the dark theme's tokens (ADR-0026) hit their documented ratios,
and the only "failures" were the diagram's own dark ink on its deliberately-kept light sheet (SVG
`fill`, not chrome). **Except one real, systematic defect: form placeholders.**

`styles.css` had **no `::placeholder` rule at all**, so every placeholder inherited the browser
default. Chromium ships `#757575`, and even though `<meta name="color-scheme" content="light dark">`
is declared, that fixed grey on the dark field (`--c-surface` = `#211b13`) measures only **3.70:1**
— below the 4.5:1 WCAG 1.4.3 AA requires for the information a placeholder carries (light mode was a
borderline ~4.5 on the near-white field). This hit every empty field: the Title box, the node/link
editors' `label (clinician)…` / `plain words (client, optional)` / `origin/school` / `stereotype`
hints, the case-title box — exactly the "start here" affordances a first-time user reads.

Placeholder text is not exempt from 1.4.3 (only genuinely disabled controls and pure decoration are);
a hint telling you what to type is information.

## Decision

Add one rule pinning placeholders to the design system's **tertiary-hint** token — the role built
for exactly this "present but de-emphasised" text, and authored to clear AA on the field in *both*
themes:

```css
::placeholder {
  color: var(--c-text-subtle); /* light #736a58 ~5.3:1 · dark #a3977e ~5.9:1 on the field */
  opacity: 1;                  /* Firefox otherwise dims placeholders below AA */
}
```

`opacity: 1` matters: Firefox applies a default placeholder opacity that would claw an AA colour back
under the line. Measured after the fix, live in the browser: **5.92:1 dark / 5.30:1 light** — up from
3.70, comfortably AA, while still reading as a softer hint than typed input (`--c-text`, ~13–15:1).

**Enforce it as a machine invariant, not a comment.** `apps/web/contrast.test.ts` parses the theme
tokens straight out of `styles.css` (the first `:root {}` for light, the `:root {}` inside
`@media (prefers-color-scheme: dark)` for dark), reads which token the `::placeholder` rule pins and
which token the text field uses as its background, and **re-derives the WCAG ratio** — failing if the
placeholder, or any of the body/muted/subtle text roles, drops below AA on the surface in either
theme. It does not trust the ratios written in the comments; it computes them. This is the same
"guard the load-bearing rule in browser-free CI" split as `mobile-ux.test.ts` — the lived rendering is
spot-checked in a real browser, the token math is locked in CI.

## Consequences

- **Positive:** every field's placeholder is legible in both themes (dark went from a failing 3.70:1
  to 5.92:1); the fix is three lines of CSS reusing an existing token, so it stays on-brand and moves
  with the palette. The new test also *verifies the design system's own contrast claims* — the
  `~7:1` / `~5:1` annotations on `--c-text-muted` / `--c-text-subtle` are now checked, not asserted in
  prose, in both light and dark.
- **Negative / cost:** the guard is token-parsing, not a full-page render audit, so it protects the
  text-on-field roles it names, not every conceivable colour pairing (the accent-on-soft-panel
  combinations, say, are still only comment-documented). Accepted: the placeholder was the concrete
  bug; a whole-DOM contrast test belongs in the e2e/browser tier if it's ever wanted.
- **Impact:** `apps/web/styles.css` (the `::placeholder` rule), `apps/web/contrast.test.ts` (new),
  `sdd/traceability.json` (REQ-THEME-CONTRAST), `apps/web/IMPACT.md`, `sdd/adr/IMPACT.md`.

## Alternatives considered

- **Leave it to the browser default.** Rejected — that *is* the bug; the default fails AA on the dark
  field and can't be relied on across engines.
- **Set placeholders to `--c-text-muted`** (the stronger ~7:1 secondary token). Rejected — a
  placeholder should read as *lighter* than typed text; `--c-text-subtle` is the intended
  de-emphasised role and still clears AA. Using muted would blur the hint/value distinction.
- **A `rgba(…, 0.5)` translucent placeholder** (the common web pattern). Rejected — translucency makes
  the effective contrast depend on the field fill and is what produced the sub-AA default in the first
  place; an opaque token is predictable and testable.
- **Only fix dark mode.** Rejected — light was borderline (~4.5) and the single token fixes both;
  scoping to one theme would leave a latent light-mode risk and duplicate the rule.
