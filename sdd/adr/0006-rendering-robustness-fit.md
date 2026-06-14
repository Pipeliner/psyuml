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
- **Labels never overflow.** Two shared helpers: `fitText()` emits a single-line `<text>` that
  *compresses* (never stretches) into `maxWidth` via `textLength` + `spacingAndGlyphs` (for
  tight single-line spots like edge labels and the Resource list); `wrapLabel()` does **true
  multi-line wrapping** — it greedily packs words into ≤ `maxLines` `<tspan>` rows centered on
  the node, falling back to `fitText` compression on the last line if it still overflows. A
  one-line label is byte-identical to `fitText`, so short committed labels don't churn.
  `wrapLabel` is the node-label renderer across the box/shape renderers (State, Process/Loop,
  Parts, Mode, Relational/genogram, Intervention-sequence, Two-Triangles); the Resource list
  uses `fitText`.

## Consequences
- **Positive:** no information is lost to clipping on screen or in exports; labels stay
  legible inside the frame; large/force-laid-out diagrams and hand-placed loops render
  correctly. Short-labelled committed examples are byte-identical (no `textLength`), so only
  the loop goldens were regenerated.
- **Cost / limits:** a label longer than `maxLines` rows still compresses its last line
  (squished but legible and in-frame). `renderBodyMap`'s side-list labels keep `fitText`
  (not centered-in-box); they can move to `wrapLabel` later if needed.
- **Impact:** `packages/render/index.ts` (`fitText`, `wrapLabel`/`wrapLines`, content-fit
  `renderLoopMap`, `renderStateMap` clamp, and `wrapLabel` adopted by the box renderers);
  regenerated the goldens whose label attribute-order changed (process-loop, cat-sdr,
  intervention-sequence, relational-field, mode-map, drama-triangle, two-triangles).

## Alternatives considered
- **`foreignObject` + CSS for wrapping.** Rejected — heavier, worse for static SVG export and
  screen-reader text; hand-rolled `tspan` wrapping (`wrapLabel`) is portable and deterministic.
- **Grow node boxes to the label.** Rejected for the fixed-layout renderers — it shifts
  positions and causes collisions.
- **Keep fixed canvases and just enlarge them.** Rejected — still clips for unbounded
  layouts and wastes space for small ones; content-fit is correct in both directions.
