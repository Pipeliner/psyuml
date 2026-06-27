# ADR-0045: a text-legibility invariant — no two rendered words may collide

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-TEXT-LEGIBILITY (→ **implemented**) / §D (notation), §J (conformance); extends ADR-0012 (overlap) and ADR-0024 (`deCollide`)

## Context

A visual audit of all 20 showcase diagrams (the user's "check every render for any two elements
overlapping") found a class of collision the machine invariants were blind to. `overlap.test.ts`
(ADR-0012) guarantees the `data-el`-tagged NODE and LABEL boxes never overlap — but it is, by design,
blind to **untagged chrome text**: the diagram title, band/lane headers, per-region contents
descriptors, captions, provenance footnotes and legends carry no `data-el`, so they never enter the
check. A scan of every corpus example (both audience layers) found **14 colliding text pairs across
12 files**, in five systematic classes:

1. **title ↔ lane header** — every `intervention-sequence` with a title overlapped its swimlane
   headers (the title sat at the same y as the header row, and bled across the columns);
2. **loop badge ↔ edge label** — `process-loop`'s centre R/B + "TRAP"/"DILEMMA" badge collided with a
   chord-midpoint edge label that happened to land on it;
3. **contents ↔ contents** — `venn`'s three region descriptors ran into each other;
4. **footnote ↔ legend** — `parts-map`'s provenance footnote touched the legend line below it;
5. **header ↔ header** — `resource-anchor`'s adjacent column headers overlapped when wide.

These are legibility defects (words on top of words), not node/label-box overlaps, so they passed CI.

## Decision

1. **Bring ALL rendered text into a machine-checked invariant.** `introspect.textBoxesFromSvg`
   reconstructs the AABB of EVERY `<text>` element — tagged or not — using the same `textWidth` metric
   the renderers size with, unioning multi-line `<tspan>` stacks (halos are a white *stroke* on the
   same element, so each word is counted once). `packages/render/text-overlap.test.ts` asserts no two
   text boxes overlap for every `examples/*.psyuml` in **both** audience layers. Adding the 21st
   diagram type, or any future chrome text, that collides now fails CI.

2. **Fix the five renderer classes** so the corpus is clean:
   - `renderInterventionSeq` reserves a **title band** (the headers, dividers and node stack shift
     down only when there is a title) so the title can't overlap the lane headers;
   - `renderLoopMap` reserves the centre **badge as a `deCollide` obstacle** up front, so the
     chord-midpoint edge labels are nudged off the R/B / loop-topology marker (reusing the existing
     ADR-0024 de-collision machinery), then draws the badge at that same centre;
   - `renderVenn` **caps each region's contents** to its zone's share of the centre-spacing (via
     `textLength` compression, only when it would otherwise overflow);
   - `renderPartsMap` **widens the gap** between the provenance footnote and the legend (the term
     cancels in the footnote's own y, so the change only widens that one gap);
   - `renderResourceMap` **caps each column header** to its column (the item labels already fit).

3. **TDD.** The invariant was written first and went red on all 24 layer-cases; each renderer fix
   drove the count down to zero. 11 goldens regenerated; the full render + conformance suite stays
   green (overlap, legibility, layout-quality, crossing, goldens all unaffected).

## Consequences

- **Positive:** the most common, easy-to-miss visual defect — two words on top of each other — is now
  impossible across the corpus and both audiences. The check needs no new tagging (it reads every
  `<text>`), so it also catches collisions in elements no one thought to tag. It composes with the
  existing `deCollide` (one renderer fix *reused* it rather than inventing a new mechanism).
- **Cost / honest scope (recorded in the test + REQ):**
  - **Text↔text only.** Text drawn OVER decoration is intentional labelling and is NOT a collision —
    a region banner on a circle (`secure-base`), a sensation label on a body outline (`body-map`), an
    edge label on its own connector (`process-loop`'s "trigger"). Decoration is not a `<text>`, so it
    never enters the check; this boundary is deliberate, not an oversight.
  - **Containment is separate.** Text overflowing / clipped by its OWN container shape (the decision-
    nav crisis caption, a mode-map circle label) is a different failure mode, guarded by the
    containment invariant (REQ-TEXT-CONTAINMENT, ADR-0046), not this one.
  - **Two `textLength` compressions.** The venn contents and resource-anchor headers are compressed
    to fit (only when they would overflow); they stay above the legibility floor (`legibility.test.ts`
    still passes) but a heavily-compressed descriptor is slightly condensed — judged better than a
    collision.
- **Impact:** `packages/render/introspect.ts` (`textBoxesFromSvg`), `packages/render/index.ts` (the
  five renderer fixes), `packages/render/text-overlap.test.ts` (new), 11 regenerated goldens,
  `sdd/traceability.json` (REQ-TEXT-LEGIBILITY → implemented; M24).

## Alternatives considered

- **Tag every chrome element with `data-el` and extend `overlap.test.ts`.** Rejected — tagging the
  title/headers/contents/footnotes/legends across 20 renderers is more invasive and still misses
  anything left untagged; reading every `<text>` is simpler and total.
- **Fix the 14 pairs and move on.** Rejected — it does not satisfy "make these failure modes
  impossible"; the next title or descriptor that grows would collide again. A derived invariant is the
  durable answer (the same reasoning as ADR-0043 for docs).
- **A strict zero-px overlap.** Rejected in favour of the existing 1px slop (the shared text metric is
  an estimate); the calibration showed every real collision is ≥2.8px deep with no grazes between, so
  1px is both safe and strict.
- **Forbid text over decoration too.** Rejected — labelling a decorative region/anatomy/connector is
  the intended design; forbidding it would break legitimate diagrams for no legibility gain.
