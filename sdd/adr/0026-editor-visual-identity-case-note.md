# ADR-0026: editor visual identity — "case-note / ink-on-paper", and the formulation as the hero

- **Status:** accepted
- **Date:** 2026-06-19
- **Deciders:** project owner + maintainer (design pass via the `frontend-design` skill)
- **Spec / REQ touched:** REQ-UX-STORIES, REQ-EDITOR-MVP, REQ-ACCESSIBILITY (§D) — evolves ADR-0013

## Context
ADR-0013 established a hand-rolled, token-based design system (no UI framework, Okabe–Ito palette,
WCAG-AA, mobile-first). That **architecture** is right and stays. But the *aesthetic* had drifted to
the generic "calm blue SaaS" default — system-ui everywhere, a placeholder gradient-square logo, no
typographic personality, and (the real UX flaw) the **diagram — the whole point of the product —
buried below a full screen of admin chrome.** A `frontend-design` pass asked for an identity grounded
in the subject (psychotherapy case formulation) rather than a templated one.

## Decision
A **"clinician's case-note, in ink"** identity — the editor speaks the diagrams' own quiet,
monochrome, ink-on-paper language instead of looking like a dashboard. Implemented in `styles.css`
tokens + a small `App.tsx` header/layout change; **every accessible name, role, and the `role=note`
copy the e2e + a11y rely on are preserved** (a visual pass, not a DOM-semantics change).

1. **Signature = the notation as the brand.** The wordmark mark is the **◎ "Self" glyph** (the
   notation's own centre-held-in-a-field), not a generic logo. The honesty/safety `note` wears the
   diagrams' **dashed "held-lightly" stroke** — the chrome's humility spoken in the notation's
   language. The canvas is treated as a **formulation sheet** (a faint dot grid, framed) so the ink
   is the hero. One bold place (the masthead); everything else stays quiet.
2. **The formulation is promoted to the hero.** The live diagram + its view controls + the example
   caption move directly under the controls, so the map is the first thing you see and work with —
   not the last. The sections are landmark-labelled and located by role/`aria-label`, so reading and
   focus order stay coherent and the journeys are unchanged (verified by the e2e).
3. **Type gets three intentional roles** — a restrained old-style **serif** (`--font-display`) for the
   wordmark / eyebrow / section headings (the "written case-note" voice, used sparingly), the humane
   **sans** for body/UI, **mono** for ids/DSL/data. All **system stacks — zero web-font dependency**,
   honouring the local-first / offline posture (and the golden SVG renderer's `sans-serif` is
   untouched, so no goldens move).
4. **Palette: warm "paper & ink".** Warm-paper neutrals + true ink text replace cool SaaS grey; the
   **Okabe–Ito accents are kept** (the diagrams' own colourblind-safe hues — coherence + the brief's
   pinned a11y direction). Warmth is restrained (a soft sheet, never saturated cream — and the accent
   stays clinical blue, not the cream+terracotta cliché). Dark mode is re-grounded as a *lamp-lit
   notebook* (warm dark browns), with the diagram kept on a light sheet so the ink stays legible.

## Consequences
- **Positive:** a distinctive, subject-grounded identity that could not be mistaken for a generic
  tool; the product (the formulation) leads; the chrome reinforces the project's deepest idea
  (epistemic humility) through the dashed motif. Quality floor held: AA contrast, visible focus,
  reduced-motion, ≥44px touch targets, responsive to ~360px, dark mode — all preserved.
- **Cost / honest scope:** the display serif is a *system* stack, so the exact face varies by OS
  (Iowan/Palatino on Apple, Book Antiqua/Georgia on Windows, Georgia/Times fallback elsewhere) — an
  accepted trade for zero dependency; self-hosting one face is a future option if the identity needs
  to be pixel-identical cross-platform. No new runtime deps; no renderer/golden change.
- **Surfaced bug (fixed):** running the e2e against the reorder revealed two **stale** assertions —
  `getByRole('combobox', { name: 'Layer' })` — left over from the v0.2 audience-profile rename
  (ADR-0016 renamed the control "Audience"); the e2e is not in `verify`/CI, so it had gone unnoticed.
  Updated to `'Audience'`; all 8 journeys green.
- **Impact:** `apps/web/styles.css` (tokens + components), `apps/web/App.tsx` (wordmark lockup +
  diagram promotion), `e2e/onboarding.spec.ts` (stale-name fix). REQ-UX-STORIES / REQ-EDITOR-MVP.

## Alternatives considered
- **Warm cream + high-contrast serif + terracotta** (a known AI-design default). Rejected — templated,
  and reads fashion-editorial, not clinical; the blue accent + notation signature keep us clear of it.
- **A canvas-forward two-pane app shell** (diagram left, tools right, Figma-style). Rejected for now —
  a bigger DOM/focus-order change with real a11y risk; the single-column promotion gets most of the
  win at a fraction of the risk. Revisit if the editor grows.
- **Self-host a display web font** for a pixel-identical wordmark. Deferred — adds a binary asset +
  licence + build wiring against the local-first posture, for a chrome-only (non-golden) gain.
- **Leave ADR-0013's look as-is and only reorder.** Rejected — the brief was an identity pass; the
  generic look was the bigger miss.
