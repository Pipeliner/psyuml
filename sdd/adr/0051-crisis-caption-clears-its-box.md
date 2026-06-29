# ADR-0051: the decision-nav crisis caption clears its box — closing the last caption-bisection gap

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-TEXT-CONTAINMENT (invariant C now universal) · §D (notation), §J (conformance); closes the `CAPTION_BISECT_KNOWN_GAP = {decision-nav}` documented in ADR-0046; found in the same dense-diagram audit as ADR-0050

## Context

ADR-0046 added the caption-not-bisected invariant (layout-quality **C**): a node's *outside* caption
(its centre beyond the node box) must be **disjoint** from the box — a border cutting through a node's
own caption is a clipping defect. One renderer was left as a **documented exception**:
`CAPTION_BISECT_KNOWN_GAP = {decision-nav}`. Its **crisis** node (the thick-bordered "! Call a crisis
line now" box) carries the crisis-resources contact line as a caption beneath it, and that caption's
**top line rode up under the thick bottom border** — recorded as an acceptable ~6px graze because
"pushing it fully clear collides with a sibling branch label."

The dense-diagram audit (the one that produced ADR-0050) re-examined it on the **safety-critical**
node — the crisis instruction is the most important element on the chart, so its caption *must* be
fully legible. Two things had changed since ADR-0046:

- **The real cause was a centring bug, not a lack of room.** `wrapLabel` *centres* its block on the
  given `cy`. The caption was placed at a fixed `+13` offset below the box, so when it wrapped to
  **3 lines** the block centred such that the **top** line sat ~1px below the box bottom (ascenders
  *inside* the border). It wasn't tight-by-necessity — it was the top line riding up.
- **There is ample room below.** Under the ADR-0049 layered layout the depth-2 boxes sit in the
  centre/right lanes, **not** below the left-aligned crisis node; measurement showed ~20px of unused
  vertical budget directly beneath the caption.

## Decision

Shift the crisis caption block **down by half its height** — compute its line count (`wrapLines`) and
set `cy = boxBottom + 13 + (lines−1)·lh/2` — so the **first** line always clears the border by the
same fixed gap, **whatever the line count**. The caption is now wholly below the box (measured: box
bottom y=185, caption top y≈191). This fits entirely within the crisis node's existing vertical
budget, so the layout, banner and frame are otherwise unchanged.

With the graze gone, **`decision-nav` is removed from `CAPTION_BISECT_KNOWN_GAP` (now empty)** —
invariant C is **universal**: every renderer keeps its captions fully clear, machine-checked over the
whole corpus × both layers.

## Consequences

- **Positive:** the crisis caption — the single most safety-critical piece of text in the corpus — is
  now fully legible, no border through it. The last caption-bisection exception is closed, turning a
  *documented graze* into a *machine-enforced clearance* (invariant C gains 8 enforced cases). The
  fix is line-count-robust (a longer localized crisis line still clears). No layout/spacing change;
  2 goldens regenerated (decision-nav, showcase-decision-nav).
- **Negative / cost:** none of note — the caption moves down ~12px into space that was already empty.
  The machine proof that no sibling collision results is the overlap + text-overlap + layout-quality C
  invariants staying green (the very collision ADR-0046 worried about is now actively checked, not
  merely asserted away).
- **Impact:** `packages/render/index.ts` (`renderDecisionChart` crisis-caption placement),
  `packages/render/layout-quality.test.ts` (`CAPTION_BISECT_KNOWN_GAP` emptied), 2 regenerated
  goldens, `sdd/traceability.json` (REQ-TEXT-CONTAINMENT note).

## Alternatives considered

- **Leave the documented gap (do nothing).** Rejected — it was a real legibility graze on the
  *crisis* node, and the audit showed it was a fixable centring bug, not a space constraint.
- **Make the crisis box taller to contain the caption inside.** Rejected — the caption is
  deliberately a *caption* (lighter, smaller, beneath the bold instruction), and growing only the
  crisis box would desync it from the uniform `DNODE_H` node height the layered layout assumes.
- **Push the caption far down / into the next layer's gap.** Rejected — unnecessary; a half-block
  shift is the minimal change that clears the border, and a larger move would waste the compactness
  the crisis chart is designed for.
