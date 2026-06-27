# ADR-0046: a containment invariant — a node's own label/caption is never clipped by its border

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-TEXT-CONTAINMENT (→ **implemented**) / §D (notation), §J (conformance); companion to ADR-0045 (text-legibility) and ADR-0021 (layout-quality A)

## Context

The showcase audit surfaced two collision *classes*. ADR-0045 closed the first (two words colliding).
This is the second: **text clipped by its OWN container shape** — a node border cutting through the
node's own label/caption. Concretely: a **mode-map** mode name overflowing its dominance-sized circle
(a low-dominance circle is tiny, the label is not), and a **decision-nav** crisis-resources caption
grazed by the thick crisis-node border.

The existing layout-quality check (ADR-0021 invariant A) already guards INTERIOR labels (centre inside
the node ⇒ must be `contains`-ed, with a 3px metric slop), but only for the box renderers in
`LABEL_IN_BOX`. It deliberately excludes the glyph renderers (parts-map, relational-field, mode-map),
whose labels ride small symbol nodes — a measured tight fit that is the intended notation, within the
3px slop. So neither A nor the ADR-0045 text↔text check caught the two real clipping defects.

## Decision

1. **Fix mode-map (the clear defect) at the renderer.** Move the mode NAME (and the `dom` numeral)
   from inside the circle to a caption BELOW it. The circle becomes a **pure dominance glyph** — its
   size carries dominance with nothing to clip — and the name, wrapped narrow, sits clear beneath it
   (and is now covered by the ADR-0045 text↔text invariant against its neighbours). This is also
   better notation: the dominance signal reads cleanly (0.85 biggest → 0.30 smallest) instead of
   competing with label text.

2. **Add the containment guard (invariant C).** In `layout-quality.test.ts`: for every node label
   whose centre is OUTSIDE its node (a caption), assert it is **DISJOINT** from the node (does not
   straddle the border), for every example × both layers. Combined with invariant A (centre-inside ⇒
   contained), this means **every owner label is cleanly inside OR cleanly outside its node, never
   bisected by the border.** The mode-map fix is now machine-guarded — a name that slid back onto its
   circle would fail C.

3. **One documented gap.** `CAPTION_BISECT_KNOWN_GAP = {decision-nav}`. Its crisis-resources caption
   sits tight under the thick-bordered crisis node in the deliberately compact crisis chart; pushing
   it fully clear collides with a sibling branch label — a worse defect in that tight layout. It is
   the node's OWN caption and stays fully legible. This is the established honest-scope pattern (cf.
   the now-empty `EDGE_NODE_KNOWN_GAP` / `LABEL_LABEL_KNOWN_GAP`): a reasoned, named exception, not a
   silent pass.

## Consequences

- **Positive:** the worst clipping defect (mode-map's tiny circles eating their labels) is gone, with
  a cleaner dominance glyph as a bonus, and the whole "a node border cuts its own caption" class is
  machine-checked corpus-wide (one documented exception). Composes with A (the two together = "owner
  label cleanly in-or-out").
- **Cost / honest scope (recorded in the test + REQ):**
  - **Interior glyph-label tightness is intended, not a defect.** parts-map / relational-field labels
    fill their symbol nodes by design and stay within invariant A's 3px slop; forcing strict margins
    there would flag the intended notation and risk node-overlap regressions from growing every glyph.
    Not in scope.
  - **decision-nav's crisis caption is the one accepted graze** (≈6px), documented with its reason.
  - **Text over DECORATION stays out of scope** (ADR-0045) — a banner on a circle, a label on a body
    outline are intentional labelling, not containment failures.
- **Impact:** `packages/render/index.ts` (mode-map name/`dom` moved below the circle + taller frame),
  `packages/render/layout-quality.test.ts` (invariant C + the documented gap), 2 regenerated mode-map
  goldens, `sdd/traceability.json` (REQ-TEXT-CONTAINMENT → implemented).

## Alternatives considered

- **Grow mode-map circles to fit interior labels.** Rejected — unbounded (dominance → 0 ⇒ tiny
  circle), and growing circles at the fixed 150px spacing risks node↔node overlap; it also muddies the
  dominance signal. Moving the label out is cleaner and preserves the glyph.
- **Enforce strict interior containment for ALL renderers (parts-map, relational-field, mode-map).**
  Rejected — their tight glyph-labels are the intended notation; this would flag dozens of intended
  cases and force invasive, regression-prone glyph growth.
- **Fix decision-nav's crisis caption too.** Rejected as disproportionate — the compact crisis chart
  makes a clean fix collide with branch labels; the graze is the node's own caption and stays legible.
  Documented as the one known gap instead.
- **A separate new test file.** Rejected — containment lives in `layout-quality.test.ts` next to
  invariant A (interior containment), which it complements; one home keeps the two halves together.
