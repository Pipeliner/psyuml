# ADR-0050: a loop-map resource label is contained — short inside the diamond, long lifted outside

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-TEXT-CONTAINMENT (extends it to the non-rectangular diamond shape) · §D (notation), §J (conformance); follow-up to ADR-0049 (the layered-layout work, during whose dense-diagram audit this was found), built on ADR-0046 (containment invariant) and ADR-0047 (legibility halos)

## Context

A dense-diagram layout audit (prompted by the ADR-0049 layout/routing work) found a real legibility
defect in the process-loop (maintaining-cycle) renderer: a **resource node** is a flat `140×44`
**diamond** (the "way out" / exit target), and its label was drawn **inside** the rhombus at the rect
width. A rhombus only has its full width on its centre line — at any vertical offset the usable width
shrinks linearly to zero at the tips — so a label that needs **more than one line**, or a single line
wider than the narrow inscribed band, **pokes through the slanted edges**. Concretely the panic-cycle
clinician exit label ("Check facts; it's anxiety, not danger; ride the wave") had its lower line cut
by the lower-left/right edges.

Two constraints made the obvious fixes wrong:

- **The diamond can't grow.** The ring layout positions every node assuming the shared `LNODE`
  (`140×44`) footprint; growing the diamond to contain the label broke the node↔node overlap
  invariant (a first attempt produced 19 `overlap.test` failures — `trigger overlaps out`).
- **Inscribing 2 lines is geometrically impossible.** A `140×44` rhombus is too flat to stack two
  text lines away from its wide centre — the inscribed width for two lines collapses to ~44px, far
  too narrow for the clinician labels. A first "wrap to the centre-line width" attempt still poked,
  because the lines sit *off* the centre line where the rhombus is much narrower.

## Decision

Place the resource label by **length**, so it is always *contained* and never cuts the diamond:

1. **Short label → inside.** If the label fits on **one line** within the rhombus' widest band
   (`textWidth ≤ 100px`, ≈ the inscribed width at the cap-height offset from centre), it is drawn
   **inside**, centred — the diamond reads as a normal filled node (e.g. the client layer's
   "Ride it out").
2. **Long label → outside.** Otherwise it is lifted **outside** the glyph, on the **outward**
   vertical side (above the diamond when it sits in the upper half of the ring, below otherwise —
   computed from the ring centroid). A resource diamond sits on the ring hull, so the outward side is
   open exterior **and** is the side *away* from the incoming exit chord (whose own midpoint label
   lives on the inward side) — so the node label never lands on the edge label. It wraps to up to 3
   lines at full node width, carries a white **halo** (ADR-0047) so it stays legible over any chord
   it crosses, and the content-fit **frame is grown** past it so it never clips.

**Guard (so it can't silently regress):** a new invariant in `packages/render/legibility.test.ts`
asserts that for every loop-map resource node, in both audience layers, **every** label line is
either **wholly inside the rhombus** (all four corners satisfy `|x−cx|/HW + |y−cy|/HH ≤ 1`) or
**wholly clear of the diamond's box** — never half-in, cutting an edge. Written TDD-style and proven
to bite: forcing the old inside-the-diamond placement turns it **red on 18 layer-cases** with precise
"label line … cuts across node:… diamond" messages; the shipped placement is green.

## Consequences

- **Positive:** the original defect is fixed (no label cuts a diamond edge in either layer) and made
  **machine-impossible to reintroduce**. The two layers each read well — short client labels fill the
  diamond as ordinary nodes; long clinician labels sit cleanly above it, fully legible and haloed. No
  diamond grows, so every node↔node / label / crossing / routing invariant still holds. No new
  dependency; reuses the existing `wrapLabel`/`wrapLines`/halo machinery.
- **Negative / cost:** the placement rule is a length threshold (a short label inside vs a long label
  outside), so the *same* node can be inside in one audience layer and outside in the other — correct
  (the label content differs per layer) but worth knowing when reading a diff. 8 process-loop goldens
  regenerated (cat-sdr, depression-flower, ocd-cycle, panic-cycle, process-loop, showcase-process-loop,
  social-anxiety-loop, stages-of-change). HONEST SCOPE: the outward side is chosen by the ring
  centroid (above/below), which is open for every corpus ring; a future ring whose resource diamond is
  hemmed on its outward side would be caught by the overlap / text-overlap invariants, not silently
  shipped.
- **Impact:** `packages/render/index.ts` (`renderLoopMap` resource-label placement + frame growth),
  `packages/render/legibility.test.ts` (new containment invariant), 8 regenerated goldens,
  `sdd/traceability.json` (REQ-TEXT-CONTAINMENT notes + tests extended).

## Alternatives considered

- **Grow the diamond to contain the label.** Rejected — breaks the ring spacing (the layout assumes
  the shared `LNODE` footprint), producing real node↔node overlaps. Measured: 19 `overlap.test`
  failures.
- **Wrap the label to the rhombus' centre-line inscribed width and keep it inside.** Rejected — the
  lines sit *off* the centre line, where the rhombus is much narrower, so they still poke; and two
  lines simply don't fit a `140×44` rhombus (inscribed width ~44px).
- **Always place the label outside (uniform, like mode-map names).** Rejected — a short label
  ("Ride it out") floating above a large empty diamond reads as unfinished; keeping short labels
  inside fills the glyph naturally. The hybrid is the small extra rule that buys the better look.
- **Shrink the resource font until it fits inside.** Rejected — a `44px`-tall rhombus can't hold a
  long clinical label at any legible size (it would fall under the 8px microtext floor, ADR-0045),
  and shrinking only the resource label breaks the uniform node type size.
