# ADR-0061: Body Map coordinate frame, named regions and a whole-body marker

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §D redundancy · REQ-NOTATION, REQ-ACCESSIBILITY, REQ-LAYOUT-QUALITY
  (issue #9); builds on ADR-0006 (content fit), ADR-0012 (non-overlap), ADR-0047 (halo)

## Context
Issue #9 reported three Body Map problems:

1. A sensation with `pos` below the figure (`pos=230,470`, a feet sensation) was drawn over the
   caption and disclaimer. The figure's coordinate frame was undocumented, so placing feet or
   shoulders took trial and error.
2. Marker labels crossed the arm and leg strokes. A long torso label was cut by the arm line.
3. A non-localized sensation (fatigue, whole-body heaviness) had to be pinned to a point on the
   torso.

## Decision
1. **A documented, exported frame.** `BODY_FIGURE` (in `@psyuml/render`) is the contract a `pos` is
   read in: origin top-left, y down, `BODY_W` = 460 wide and at least 484 tall. It includes the
   head circle, the torso, the four limb strokes and the silhouette bounds (x 120–300,
   y 54–436). It is a front view, so the person's right is on the viewer's left. The bottom chrome
   (caption + disclaimer) now starts **below the lowest marker**, so a sensation below the figure
   grows the canvas. A marker past the frame's sides or above the title is clamped inside. The frame
   is documented in `docs/format-reference.md`.
2. **Named regions through `stereotype`.** The model exports `BODY_REGIONS` (head, throat, chest,
   abdomen, pelvis, and `shoulder-`/`arm-`/`hand-`/`leg-`/`foot-` × `left`/`right`). The render
   package exports `BODY_REGION_ANCHORS`, typed exhaustively over that list.
   `stereotype=<region>` places a sensation on its anchor when it has no explicit `pos`, and an
   explicit `pos` (for example from a GUI drag) wins. Several un-positioned sensations on one region
   fan out vertically so their markers never coincide. This reuses `stereotype`, like the other
   zone-placed diagrams, so the schema does not grow. The legacy `stereotype=sensation` still means
   "placed by pos". An unknown region gets the ADR-0060 lint warning with a hint (`feet` →
   `foot-left` / `foot-right`).
3. **Labels avoid limbs.** For each marker the renderer counts how many limb strokes the right-side
   and left-side label boxes would cross (`segIntersectsBox`). It picks the side that crosses fewer,
   as long as that side still has reasonable room; otherwise it falls back to the previous room rule.
   When a crossing cannot be avoided (a torso label has an arm on each side), the existing white
   halo keeps the glyphs legible.
4. **Whole-body marker.** `stereotype=whole-body` lists a sensation in a **"Whole body"** row under
   the figure: a dashed, intensity-sized marker with its label, ignoring any `pos`. It is named in
   the alt-text ("Fatigue (whole body, intensity 0.4)"), and the heading is localized
   (`body.wholeBody`, en + ru).

## Consequences
- **Positive:** authors can place sensations by name, out-of-figure markers no longer collide with
  the footer, and the frame is a tested contract instead of something to guess. The existing body-map
  goldens are byte-identical: none of them uses regions, and none of their labels changes side.
- **Negative / cost:** region anchors are single points. A plural ("feet", "hands") is not a
  region, and the hint suggests the two sided ones. The fan-out does not avoid *other* regions, so
  stacking several sensations on a small region next to other markers (for example 3 on `chest`
  plus both shoulders) can still crowd. The overlap invariant then fails loudly instead of hiding
  it; a stress model with every region used once (plus a stacked pair, an off-figure `pos`, an
  off-frame `pos` and two whole-body items) passes all four ADR-0012 assertions.
- **Impact:** `packages/model/index.ts`, `packages/render/index.ts` (`renderBodyMap`,
  `BODY_FIGURE`, `BODY_REGION_ANCHORS`), `packages/render/i18n.ts`,
  `packages/render/body-map.test.ts`, `packages/render/overlap.test.ts`, `packages/validate`
  (region lint via ADR-0060), `docs/format-reference.md`, `docs/handbook.md`.

## Alternatives considered
- **A new `region=` option / `properties.region` field.** Rejected: it would grow the canonical
  model, the highest-blast-radius package, for something `stereotype` already expresses in the other
  zone-placed diagrams.
- **Clamp an out-of-figure marker into the figure.** Rejected: a sensation the author put below the
  feet (for example "ground under me") is deliberate. The canvas grows instead.
- **Leader lines to a label gutter.** Rejected for now: heavier, and the halo plus side choice
  fixes the reported cases.
