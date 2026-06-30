# ADR-0053: shrink the font before squishing — no label crushed to a sliver

- **Status:** accepted
- **Date:** 2026-06-30
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-LEGIBLE-COMPRESSION (new → implemented) · §D (notation), §J (conformance); builds on ADR-0006 (`fitText` compression), ADR-0045 (8px legibility floor) and the body-map's shrink-to-fit

## Context

`fitText`/`wrapLabel` keep a long label inside its box by compressing it horizontally
(`textLength` + `lengthAdjust="spacingAndGlyphs"`). That is fine for a *mild* overflow, but the
compression had **no floor**: a label far too long for its box was squished to a sliver. A corpus
sweep of `textLength` segments found the worst crushed to **~40%** of natural width (e.g. the
safety-behaviour loop's "Disconfirmation / blocked — it only went OK because I checked" second line),
with ~12 segments below 70%. Horizontal squishing destroys glyph proportions — a half-width label is
far less legible than the **same text one or two points smaller** at natural proportions. Every such
label still passed every invariant (it fit its box, didn't overlap, stayed in frame), so the defect
was invisible to the machine checks — exactly the gap a legibility invariant should close. The
codebase already had the right idea elsewhere: the **body-map shrinks the font to fit** rather than
squishing.

## Decision

**Prefer a smaller, full-proportion font over horizontal squishing**, generalising the body-map's
approach into the shared text helpers:

- A new `legibleFitSize(s, size, maxWidth)` returns the size to render at: a label that fits is
  unchanged; one that only *mildly* overflows (compression ≥ `SQUISH_FLOOR = 0.8`) keeps its size and
  is left to `textLength` (so the common case stays **byte-identical**); one that would be *severely*
  squished is **shrunk toward the 8px floor** (`LEG_FLOOR`) so glyphs keep their proportions, and only
  compressed if it still overflows at the floor (the genuine last resort).
- `fitText` uses it directly; `wrapLabel` iterates — if wrapping to `maxLines` would severely squish
  the widest line, it shrinks the font and re-wraps. The three renderers that emitted `textLength`
  *directly* (venn region contents, resource-anchor headers, decisional-balance cells) call
  `legibleFitSize` inline so they get the same treatment.

**Guard:** a new `legibility.test.ts` invariant decodes every `textLength` segment (single `<text>` and
stacked `<tspan>`s, entity-decoded), computes its compression against the shared `textWidth` metric,
and asserts it is **either ≥ `SQUISH_FLOOR` OR already at the 8px floor** — so a label can only be
heavily compressed once the font has been shrunk as far as legibility allows. TDD: proven red (the
worst at 40-72%) when the shrink is disabled, green as shipped.

## Consequences

- **Positive:** the worst-case compression went from **~40% to effectively ≥80%** (mild) by the
  renderer's own metric; severely-squished labels now render a point or two smaller at natural
  proportions — visibly legible (the safety-behaviour node's crushed line is gone). The fix is
  invariant-safe: a smaller label fits *better*, so overlap / containment / in-frame all still hold,
  and the 8px floor is respected (`legibleFitSize` never goes below it). The change is surgical — only
  the ~6 goldens whose labels were severely compressed changed; every mild compression is
  byte-identical.
- **Negative / cost:** a severely-overlong label now renders smaller than its siblings (mixed font
  sizes within a diagram) — an accepted trade (the body-map already does this) that is far more
  legible than squishing. A label so long it overflows even at 8px is still compressed at 8px (the
  guard's `size ≤ floor` branch) — the irreducible last resort; the real remedy there is shorter text
  or a bigger box, which the author controls.
- **Impact:** `packages/render/index.ts` (`legibleFitSize` + `fitText`/`wrapLabel` + 3 inline
  `textLength` sites), `packages/render/legibility.test.ts` (new squish-floor invariant), 6
  regenerated goldens, `sdd/traceability.json` (REQ-LEGIBLE-COMPRESSION).

## Alternatives considered

- **Grow the box / node to fit the label.** Rejected as the default — for ring/grid nodes it breaks
  the layout spacing (the ADR-0050 diamond lesson); growth is right for titles/legends (ADR-0052) but
  not for every crowded node.
- **Wrap to more lines.** Used where there is vertical room (`wrapLabel` already does, and now
  re-wraps after shrinking), but a fixed-height node (loop-map 140×44) can't add lines — hence the
  font shrink.
- **A hard minimum compression, squish-only.** Rejected — capping the squish ratio without shrinking
  would clip or overflow the label; shrinking preserves the whole text legibly.
- **Leave it (labels rarely this long).** Rejected — the audit found real corpus labels crushed to
  40%, illegible on the published showcase; "fits the box" is not the same as "readable".
