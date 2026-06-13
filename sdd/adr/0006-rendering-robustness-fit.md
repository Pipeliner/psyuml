# ADR-0006: Rendering robustness — content-fit frames and fit-to-box labels

- **Status:** accepted
- **Date:** 2026-06-13
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §D (accessibility/legibility) / REQ-ACCESSIBILITY, REQ-NOTATION

## Context
A build-a-diagram usability test (5 cold agents driving the live editor) found two
*information-losing* rendering bugs — confirmed on screen **and in exported SVG**:

1. **Content clipped by a fixed viewBox.** `renderLoopMap` used a fixed `0 0 560 H`
   canvas, but its ring layout (radius grows with node count) pushed nodes to negative or
   beyond-width coordinates — one agent measured content at `x:-73 … w:706` against a
   `560`-wide frame, so nodes were cut off. The State Map similarly let a crowded band place
   a node box past the frame edge (a label rendered as "…ment").
2. **Labels overflowing their box/diamond**, worst for the longer plain-language client-layer
   labels.

It also found `renderLoopMap` ignored manual `pos=` (honored by other positioned renderers)
and produced detached arrowheads on very short chords.

## Decision
- **Fit the frame to the content.** A renderer's viewBox is computed from the actual drawn
  bounds (including negative coordinates) plus a margin, rather than a fixed canvas.
  Implemented in `renderLoopMap` (which also now **honors `pos=`** and **clamps edge
  pull-back** so short chords don't overshoot into a floating arrowhead). The State Map
  **clamps node centers** so a box can't exit the frame.
- **Labels never overflow.** A shared `fitText()` emits `<text>` that *compresses* (never
  stretches) an over-long label into a given `maxWidth` via `textLength` +
  `lengthAdjust="spacingAndGlyphs"`. Short labels are emitted unchanged. Applied to the
  renderers the test flagged: State Map, Process/Loop (incl. its resource diamonds), and the
  Resource map; the helper is reusable by the rest.

## Consequences
- **Positive:** no information is lost to clipping on screen or in exports; labels stay
  legible inside the frame; large/force-laid-out diagrams and hand-placed loops render
  correctly. Short-labelled committed examples are byte-identical (no `textLength`), so only
  the loop goldens were regenerated.
- **Cost / limits:** compression *squishes* a very long label (acceptable vs. losing it;
  true multi-line wrapping is a future option). Other box renderers (mode-map, two-triangles,
  relational-field) can adopt `fitText` mechanically when needed — the helper exists.
- **Impact:** `packages/render/index.ts` (`fitText`, `renderLoopMap`, `renderStateMap`,
  `renderResourceMap`); regenerated `examples/process-loop.svg` + `cat-sdr.svg`.

## Alternatives considered
- **Multi-line text wrapping** (tspan/foreignObject). Better typography, but more code and
  heavy golden churn — deferred; `fitText` is the bounded first step.
- **Grow node boxes to the label.** Rejected for the fixed-layout renderers — it shifts
  positions and causes collisions.
- **Keep fixed canvases and just enlarge them.** Rejected — still clips for unbounded
  layouts and wastes space for small ones; content-fit is correct in both directions.
