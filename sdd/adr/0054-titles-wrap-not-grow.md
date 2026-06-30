# ADR-0054: a content-fit diagram's title WRAPS — it never grows the frame off-centre

- **Status:** accepted
- **Date:** 2026-06-30
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-CONTENT-BALANCE (new → implemented) · §D (notation), §J (conformance); corrects ADR-0052's title-fit follow-up; same family as the body-map fix

## Context

ADR-0052's title-robustness follow-up made the content-fit renderers **grow their frame width** to
fit a long title at full size (`fw = max(contentWidth, titleWidth + pad)`). That fixed clipping, but
it introduced a worse defect, flagged in a visual audit: the diagram **body stayed where it was while
the frame grew on the right**, so a long title left the body **off-centre with a big empty right
margin**. It was most visible on the **loop-maps** — a maintaining-cycle ring is narrow (~390px) and
its titles are long (the disorder name + a clause), so the frame grew well past the ring, parking the
ring in the left ~60% with empty space on the right (eating-disorder: ring centred at x=280, frame
centre at 341 — 61px off). The body-map had the same bug (fixed in the prior change). No invariant
caught it: every geometry guard (overlap, containment, in-frame) was satisfied — "fits the box" is
not "looks centred".

## Decision

**A content-fit diagram's title WRAPS to ≤2 lines within the content width; it never grows the frame.**
For `renderLoopMap`, the frame is content-fit to the ring (`fw = ringWidth + 2·pad`), the title wraps
(`wrapLines`) to that width and each line is emitted via `fitText` (so a pathologically long line
still compresses as a last resort, never clipping), and the title's line count drives the top
headroom. The ring therefore stays centred whatever the title length — a wide title simply takes a
second line over the centred ring. (The body-map was already converted to this wrap-don't-grow
approach.)

**Guard:** a new `layout-quality.test.ts` invariant (D) asserts the loop-map's **ring node bbox is
horizontally centred** in its frame (|offset| ≤ 24px — a tolerance that passes the small *structural*
asymmetry a few CAT-SDR rings carry, ~18px from the observing-eye/assert sitting on one side, but
catches a re-grown frame, which shifted rings 32–61px). TDD: planting a frame-widen turns it red;
the wrap-based fix is green.

## Consequences

- **Positive:** loop-maps (the most common diagram type) are centred and balanced again; a long title
  takes a tidy second line over a centred ring instead of shoving it aside. The defect class
  ("frame grew for chrome, body left off-centre") is now machine-guarded for the loop-map, where it
  was worst and most likely to recur (narrow ring + long titles). 8 process-loop goldens regenerated.
- **Negative / cost:** a *general* content-balance invariant proved too noisy to ship — structured
  layouts legitimately place content asymmetrically (decisional-balance's left row-headers,
  resource-anchor's column-left diamonds, the genogram's index-person star), so a naive centre check
  false-positives. The guard is therefore scoped to the loop-map ring (unambiguously centred by
  construction); the other content-fit renderers' titles still *grow* (ADR-0052), which is only a
  latent risk while their current titles fit their wider frames — a future regression there is caught
  by the in-frame guard (clipping) but not by a balance guard. Recorded as honest scope.
- **Impact:** `packages/render/index.ts` (`renderLoopMap` title wrap; growth removed),
  `packages/render/layout-quality.test.ts` (invariant D), `packages/render/text-overlap.test.ts`
  (long-title guard comment updated — loop-map now fits by wrapping, not growing), 8 regenerated
  goldens, `sdd/traceability.json` (REQ-CONTENT-BALANCE).

## Alternatives considered

- **Grow the frame AND re-centre the body in it.** Rejected — needs a transform wrapper around the
  body while the left-aligned title/chrome stay put; wrapping is simpler and keeps the frame tight to
  the content.
- **Compress the title to the content width (ADR-0052 original).** Rejected — a condensed heading
  reads wrong (the user flagged it on the body-map); wrapping keeps full glyph proportions.
- **A general "content is centred" invariant over all renderers.** Rejected as the default — too many
  false positives on intentionally-asymmetric structured layouts; would need a large exemption list.
  Scoped to the loop-map instead, where centring is the unambiguous contract.
