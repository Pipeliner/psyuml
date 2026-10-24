# ADR-0063: parts-map labels — own barrier label, wrapped Self, names inside circles, labels on their edge

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-LAYOUT-QUALITY, REQ-TEXT-CONTAINMENT, REQ-EDGE-ROUTER (label placement)
  · §D; fixes issue #4. Builds on ADR-0012 (non-overlap), ADR-0024 (`deCollide`), ADR-0047 (halos).

## Context
Issue #4 reported four label-layout defects in `renderPartsMap`, all reproduced by a synthetic
model (now `packages/render/issue-repros.ts`):
1. a `barrier` edge's own label was dropped — the renderer always printed the fixed
   "dissociative barrier";
2. a long Self label was one unwrapped line, drawn through the neighbouring part circles;
3. part names were wrapped to 110px inside a 68px circle, so the text crossed the outline;
4. containment labels were placed at the bow's CONTROL point (off the curve) and then pushed by
   `deCollide` to wherever overlap was smallest, so a label could land next to a different
   protector's line.

The overlap invariant missed (2) because the corpus had no long Self label, and it has no notion
of "inside a circle" (3) or "on its own edge" (4).

## Decision
1. **Barrier label.** The barrier edge's own label replaces the default; with no label the localized
   default (`parts.barrier`) is kept. It is wrapped (≤2 lines) to the free column under the Self,
   haloed, tagged `edgelabel:<id>` (so every invariant covers it), and echoed in the alt text.
2. **Self label.** Wrapped (≤3 lines, 12px bold) to ≤150px and haloed. The orbit radius grows just
   enough that the two lowest protectors clear that width; the barrier and the exile orbit move down
   past the wrapped label instead of overlapping it.
3. **Names inside circles.** `circleWrap` wraps a name to the circle's CHORD at the text block's
   half-height (a w×h block fits a circle of radius r iff every line fits 2·√(r² − (h/2)²)). The part
   radius is the smallest (shared, so the parts stay one size) in 34–50px that holds every name at
   10px; a name that still doesn't fit steps down to 9 / 8px, and only then compresses to the chord.
   The containment orbit grows with the radius so the exile role tag clears its outline.
4. **Labels on their own edge.** New `layout.placeLabel` (small, additive): scan candidate centres
   in order and take the first that clears every obstacle box and crosses no other edge's line. A
   containment label's candidates are points ON its own bow, nearest the middle first, so it stays
   on its edge. Conflict-tie labels, and any containment label with no free spot, still go through
   `deCollide`.

## Verification
`packages/render/parts-loop-geometry.test.ts` (written first, red before the fix): for the repro and
every parts-map example in both layers, the barrier prints its own label (and the default without
one, localized in `ru`), every Self label line clears every part circle, every part-name line lies
inside its circle, and every containment label centre is within 10px of its own curve and nearer
to it than to any other edge. `overlap.test.ts` runs the repro through all four overlap assertions.

## Consequences
- Parts-map goldens changed (`parts-map`, `perfectionism-parts`, `showcase-parts-map`): larger
  circles where names are long, labels on their curves.
- A very long single word still compresses inside the circle at 8px rather than overflowing.
- The showcase POLARIZATION tie still crosses two containment lines (baseline 2, ADR-0025).
