# ADR-0036: the `secure-base` diagram type — a generic attachment graphic (Circle of Security, trademark-safe)

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (→ **implemented**) / spec §E; follows ADR-0029–0035

## Context
Eighth and **last** of the catalogue's ◇ build-list shapes (catalog #56). #56 is "Circle of Security"
— but **"Circle of Security" / "COS" is a registered trademark** of Circle of Security International,
and the specific hands-and-needs graphic + curriculum is their copyrighted material. The catalogue's
own note warns *"graphic ≠ program"* and cites a **2025 NHS COSI RCT that found no added benefit**. So
this row cannot be shipped as a faithful reproduction without (a) an IP problem and (b) implying an
evidence claim the catalogue itself disowns.

The underlying *concept*, however, is mainstream, unencumbered attachment theory: **Bowlby's secure
base** (a caregiver one can explore out from) and **Ainsworth's safe haven** (a caregiver one returns
to for comfort). Those are the academic terms, not the trademark.

## Decision
Ship a **generic, trademark-safe** renderer — a 20th `DiagramType` **`secure-base`** + `renderSecureBase`
— that teaches the secure-base / safe-haven concept WITHOUT reproducing the Circle of Security®
materials.

1. **Model (no new fields):** each node is placed by `stereotype` — `explore` (what a secure base
   provides, top), `comfort` (what a safe haven provides, bottom), `base` (the caregiver, at the
   foot). Edge-free; generic attachment-care wording in the examples (no CoS-copyrighted phrases).
2. **Renderer:** a ring (the "circle"); a child dot at the top; two **cycle arrows** (out up the
   right, back down the left); a **SECURE BASE** banner over the top half and a **SAFE HAVEN** banner
   over the bottom; the `explore`/`comfort` needs as free haloed label rows (`separate1D`); and the
   caregiver at the foot over an **abstract cradle arc** (deliberately NOT the CoS hands graphic). The
   alt-text and a hard-coded disclaimer state it is a **generic graphic, not the trademarked
   programme**. Edge-free; not `LABEL_IN_BOX` (free labels).
3. **IP / honesty choices:** the type is named `secure-base` (the generic concept), **not**
   `circle-of-security`; the catalogue #56 row maps to it with the name "Circle of Security →
   secure-base graphic", school credited to **Bowlby/Ainsworth** (not the CoS authors), and a note
   that names the trademark, the "graphic ≠ programme" caveat, and the 2025 RCT. The example
   disclaimers repeat "NOT the trademarked Circle of Security® programme".
4. **Wiring (same surface as ADR-0029–0035):** dispatcher; the four test `RENDERERS` maps +
   `KNOWN_TYPES` + `FAMILY_OF` (→ **field**, matching the catalogue) + §K compat. Two examples
   (`secure-base` + golden `showcase-secure-base`); manifest moved #56 `newTypes` → a verified
   `diagrams` row, **emptying `newTypes`**; catalog #56 → ✅; showcase 20.

## Consequences
- **REQ-NEW-DIAGRAM-TYPES → implemented.** With `secure-base`, **all eight** committed ◇ build-list
  shapes ship (ADR-0029–0036); `examples/catalog.json` `newTypes` is now empty. The only ◇-marked row
  left anywhere is the BA activity **week-grid** (#40), a worksheet kept out of scope on the
  tables-aren't-diagrams ground — so the build-list is genuinely complete, not merely abandoned.
- **Positive:** delivers the catalogued concept while respecting a live trademark + an honest evidence
  caveat — a template for handling IP-encumbered clinical material (build the generic concept, name it
  generically, disclaim the brand).
- **Cost / honest scope:** it is *not* the Circle of Security® program and intentionally lacks its
  specific quadrant phrases / hands iconography; it is a teaching picture of two attachment functions,
  no more. The evidence for attachment *interventions* is mixed (the cited RCT); the graphic is a
  concept aid, not a claim.
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderSecureBase`,
  +dispatcher, +`SECURE_W`), the test `RENDERERS`/`KNOWN_TYPES` sets, `index.test` (+import, +showcase,
  count 19→20), `profiles.FAMILY_OF`, §K compat, `examples/{secure-base,showcase-secure-base}.psyuml`
  (+golden), `examples/catalog.json` (newTypes emptied), `docs/research/diagram-catalog.md` (#56 ✅,
  showcase 20, build-list complete), `sdd/traceability.json` (REQ → implemented).

## Alternatives considered
- **Reproduce the Circle of Security® graphic faithfully (hands + the canonical quadrant phrases).**
  Rejected — trademark + copyright on the materials, and it would imply the program's (mixed) evidence.
- **Defer #56 and close REQ-NEW-DIAGRAM-TYPES at 7/8.** Rejected on the owner's instruction to build
  it; the generic-concept route lets it ship honestly, so the build-list completes cleanly.
- **Name the type `circle-of-security`.** Rejected — using the trademark as an API identifier + example
  title would tie the project to the brand; `secure-base` is the honest, generic name.
