# ADR-0020: M17 — the interactive help site = an honest, live-editable example library

- **Status:** accepted
- **Date:** 2026-06-17
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** v0.1 §E, v0.2 §2 / REQ-EXAMPLE-LIBRARY (new), REQ-EDITOR-MVP, REQ-DIAGRAM-FAMILIES, REQ-AUDIENCE-PROFILES

## Context
PsyUML had the language (12 types, 8 families, 3 audience profiles), the editor, and a
freshly-compiled, cited catalogue of **59** real formulation diagrams across the major schools
(`docs/research/diagram-catalog.md`, the deep-research pass). What it lacked was a way for a
newcomer to *see what the language can say* and *try it* — an interactive help site with many worked
examples and live editing.

Two things were true and shaped the decision:
1. The editor (`apps/web`) is **already** a live-editing surface that renders every type through the
   `render()` dispatcher, switches audience, and exports. A second "help site" would duplicate that
   machinery and immediately drift from it.
2. The catalogue is brutally honest — therapy-evidence ≠ diagram-evidence, the alliance (not the
   picture) carries most change, formulations are shared hypotheses, sharing one can distress a
   minority, and several popular "tools" are contested theories or worksheets, not diagrams. A
   gallery that showed the pictures *without* that humility would actively mislead.

Constraints: additive (no schema/Tier-1 change, no new app or build target); every showcased example
must be a **real, validated model**, not a hardcoded picture that can rot.

## Decision
**The editor *is* the help site.** No separate site/app/build — the example library and gallery live
in `apps/web/App.tsx` over real `examples/*.psyuml` files.

1. **The library is real models.** 10 new `examples/*.psyuml` were authored (panic-cycle, ocd-cycle,
   depression-flower, stages-of-change, longitudinal-formulation, five-ps, dbt-chain, goal-ladder,
   act-choice-point, relapse-prevention) on top of the existing 14, spanning Cycle / Pattern / Parts /
   Field / Journey / Change / Ritual. Each is parsed, validated by the **examples-corpus lint** (both
   layers), overlap-clean (ADR-0012) and legibility/dual-coding-clean (ADR-0011) — so a gallery item
   **cannot** diverge from the language; if an example breaks an invariant, CI fails.
2. **An honest, family-grouped gallery.** `EXAMPLE_CATALOG: GalleryItem[]` groups the 27 examples by
   their v0.2 **family** (the existing `listFamilies()` registry drives the picker `<optgroup>`s) and
   carries, per item, the originating **school** and a one-line **`note`** — a blurb *plus* its
   evidence/limit, lifted from the catalogue. A per-example **"About this example"** card shows
   label · school · family · note beside the live render, and an **"About these diagrams — please
   read"** disclosure carries the unvalidated-v0.x / honesty clause and points at the full catalogue.
3. **Live editing for free.** Picking a gallery item loads the model into the existing editor —
   structured editing, audience switch, text-DSL, diff, export — all already there. Nothing new to
   build; the gallery is the *entrance*, the editor is the *workshop*.

## Consequences
- **Positive:** one surface, one pipeline — every showcased diagram is a live, editable, validated
  model, so the help site can never show something the language can't produce or that fails an
  invariant. The honest notes make the library teach humility (the catalogue's central finding), not
  just pictures. Purely additive: no schema, no Tier-1, no new build target, no golden churn for the
  existing corpus (only the 10 new `.psyuml` + their generated goldens are added).
- **Negative / cost:** `App.tsx` grows (13 new `?raw` imports + a 27-entry annotated catalogue);
  the notes are hand-maintained prose that must stay in step with `diagram-catalog.md` (a checklist
  item, below). The 10 new examples are CBT/CAT/IFS/DBT/ACT/SFBT/systemic-weighted — the Field and
  ◇ new-type entries from the catalogue (ecomap, social atom, structural dissociation, etc.) are
  catalogued but **not yet** live examples (future).
- **Impact:** `apps/web/App.tsx` (gallery + About panel + imports), `examples/*.psyuml` (10 new);
  traceability REQ-EXAMPLE-LIBRARY (new, implemented) + milestone M17; ROADMAP Phase 7. See
  `apps/web/IMPACT.md`, `examples/IMPACT.md`, `docs/research/IMPACT.md`.

## Alternatives considered
- **A separate static help/docs site (Docusaurus / Storybook / MDX gallery).** Rejected — it would
  duplicate the renderer + editor, need its own build/deploy, and drift from the live language; the
  editor already offers live editing, so making *it* the help site is less code and structurally
  honest (you edit the real thing).
- **A hardcoded gallery of pre-rendered SVG/PNG thumbnails with captions.** Rejected — pictures
  divorced from models rot the moment a renderer changes, can't be edited, and dodge the corpus lint.
  Real `.psyuml` files in the lint are the single source of truth.
- **Show the pictures without the evidence notes (a "clean" gallery).** Rejected as actively
  misleading given the catalogue's findings — the humility *is* the feature; the per-item `note` and
  the "please read" panel are non-negotiable, not decoration.
- **Add a `note`/`school` field to the model schema so examples carry their own gallery copy.**
  Rejected — that is editorial metadata about an example's *place in the library*, not part of the
  formulation; it belongs in the app's catalogue, leaving the model schema unchanged.
