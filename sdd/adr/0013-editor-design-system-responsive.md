# ADR-0013: A hand-rolled, token-based editor design system — mobile-first + colour-by-default

- **Status:** accepted
- **Date:** 2026-06-15
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §D · REQ-UX-STORIES, REQ-ACCESSIBILITY, REQ-EDITOR-MVP

## Context

The `apps/web` editor was functionally complete but styled entirely with ad-hoc inline
`style={{}}` objects: bare `system-ui`, undifferentiated greys, a single flex toolbar, and a
fixed `maxWidth: 860` centred column. It carried no shared visual language, no spacing/type
scale, no responsive layout, and — on a narrow phone — controls overflowed the viewport. The UX
research (`docs/ux`, ADR-0003) makes accessibility (WCAG 2.2 AA), a calm/non-intimidating
surface, and colour-redundancy binding for the editor; §D requires that colour never be the only
signal and that the tool be monochrome-printable.

Separately, the editor opened with `monochrome` **on**, so first-run diagrams were greyscale even
though `@psyuml/render` ships an accessible, *redundant* Okabe–Ito palette (the same colourblind-
safe hues — primary blue `#0072B2`, success green `#009E73`, vermillion `#D55E00`, plus neutrals —
already used ad hoc in the chrome). The default hid the friendlier colour view.

The constraint set: no behaviour/semantics/model changes; preserve every aria-label, role, region
name, button accessible-name, and `<summary>` text the e2e suite + screen readers rely on
(byte-identical); do not touch `@psyuml/render` or any `packages/**`; and add no new dependencies.

## Decision

- **Adopt a hand-written, token-based design system** in a single new stylesheet
  `apps/web/styles.css`, imported once from `apps/web/main.tsx`. It defines CSS custom properties
  (design tokens): a cohesive palette, a 4px spacing scale, radii, layered shadows, a type scale,
  and a focus ring. The accent palette is **grounded in Okabe–Ito** (the renderer's hues) so the
  chrome and the diagrams share one visual language; semantic roles (`--c-accent`/`--c-success`/
  `--c-danger`) map onto those hues, with darker `-strong` variants reserved for text/borders on
  light backgrounds to hold **WCAG 2.2 AA** contrast (≥4.5:1 body text, ≥3:1 UI/large).
- **Mobile-first + responsive.** Base styles target a ~360–390px phone with no horizontal
  overflow and no clipped/overlapping controls; richer multi-column structure is layered in at
  `@media (min-width: 768px/1024px)`. The toolbar wraps gracefully; a `@media (pointer: coarse)`
  block raises tap targets to ≥44px on touch; the diagram preview keeps its existing
  zoom + `overflow:auto` scroll/pan. Native file inputs (which have a wide intrinsic min-width)
  are clamped so "Open…" / "Compare with…" can't force a phone to scroll sideways.
- **Show colour by default in the editor:** flip the editor's initial `monochrome` state to
  `false`. The Monochrome toggle stays as the print / extra-safe path. This is the editor's
  *initial toggle only* — `@psyuml/render` keeps its monochrome-by-default library default
  (conformance still asserts monochrome-by-default at the render layer), and colour stays
  redundant (state cues keep their ✖/⚠/text).
- **Replace inline styles with semantic `className`s.** `App.tsx` becomes class-based against
  the stylesheet; only a few genuinely-dynamic inline styles remain (the zoom-driven canvas
  width, small one-off margins). Every accessibility/semantic hook is preserved byte-identical.
- **No UI framework.** The surface is a handful of cards, a toolbar, panels, disclosures, and two
  list editors — well within hand-written CSS. A framework (Tailwind/MUI/etc.) would add a
  dependency + build surface, fight the strict semantic-hook preservation, and bloat a leaf app
  for no benefit.

`prefers-color-scheme: dark` is supported as a calm, AA-checked nice-to-have (the diagram surface
stays light so the SVG ink remains legible). `prefers-reduced-motion` disables transitions.

## Consequences

- **Positive:** a modern, calm, professional editor with clear hierarchy, comfortable spacing, and
  one cohesive Okabe–Ito-grounded palette shared with the diagrams; usable on a phone with no
  horizontal overflow and ≥44px touch targets (verified by Playwright screenshots at 390×844 and
  1280×800 + a programmatic overflow/target audit); colour shown by default while remaining
  redundant and monochrome-printable. No new dependencies; all 8 e2e tests stay green (semantics
  intact); `pnpm run verify` green.
- **Negative / cost:** tokens + responsive rules are now maintained by hand (no utility-class
  ergonomics); `.css` is outside the existing Prettier `format:check` scope (the lockfile/format
  config is unchanged per constraints) so the stylesheet is kept tidy by convention, not CI. A
  handful of dynamic inline styles remain in `App.tsx`. Dark mode is best-effort, not exhaustively
  audited across every state.
- **Impact:** `apps/web/styles.css` (new), `apps/web/main.tsx` (import), `apps/web/App.tsx`
  (class-based; `monochrome` initial → `false`), `apps/web/index.html` (trimmed inline baseline to
  a focus ring + background; the full system lives in `styles.css`). See `apps/web/IMPACT.md`.

## Alternatives considered

- **Adopt Tailwind (or a component library like MUI).** Rejected: adds a dependency + build/config
  surface this leaf app doesn't need, and utility classes / opinionated components would collide
  with the hard requirement to preserve exact aria-labels, roles, and `<summary>` text. The design
  is small enough that hand-written CSS is clearer and lighter.
- **CSS Modules / CSS-in-JS.** Rejected: no scoping problem here (one app, one stylesheet, semantic
  class names), and either would add tooling/runtime for no real isolation benefit.
- **Keep the inline-style approach, just polish it.** Rejected: inline styles can't express media
  queries, `:focus-visible`, `:hover`, `prefers-*`, or shared tokens — exactly what a responsive,
  accessible, cohesive design needs.
- **Leave `monochrome` defaulting on.** Rejected: it hid the accessible, redundant colour view on
  first run; flipping the editor default (while keeping the renderer's library default and the
  toggle) is the low-risk way to show colour by default.
