# ADR-0052: no text spills past the viewBox — the text-in-frame invariant + chrome-fit

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-TEXT-IN-FRAME (new → implemented) · §D (notation), §J (conformance); the in-frame analogue of ADR-0045 (text↔text) and ADR-0012's box in-frame check; found in the same dense-diagram audit as ADR-0050/0051

## Context

`overlap.test.ts` (ADR-0012) asserts every `data-el` NODE/LABEL box is inside the viewBox — but, like
the text↔text gap ADR-0045 closed, that check is **blind to UNTAGGED chrome text**: the diagram
title, a guidance caption, the disclaimer, the genogram legend carry no `data-el`, so a line wider
than the frame spilled past the viewBox and was **clipped on export / in an embed** with nothing to
catch it. The audit found it first on the **body-map** (its fixed 460px frame clipped the title *and*
both bottom chrome lines, the caption by ~220px), then a corpus sweep showed it was **pervasive** —
**38 layer-cases across ~10 renderers**: every process-loop title (the ring content-fit ignores the
title row), the genogram legend (a fixed reference strip wider than the node spread), and many
captions / disclaimers emitted as raw `<text>` at full width.

## Decision

**Add the invariant, then fix the corpus to satisfy it.**

- **Invariant (`text-overlap.test.ts`, ADR-0052):** reconstruct the AABB of **every** `<text>`
  (`introspect.textBoxesFromSvg`, honouring `textLength`) and assert it sits inside the SVG's own
  viewBox, for every example × both layers. A few-px tolerance absorbs the shared metric's estimate;
  real overflow is tens of px.
- **Chrome-fit fixes.** A shared `chromeLine(s, x, y, frameW, opts)` helper compresses a bottom chrome
  line to `frameW − x − pad` via `fitText` (short lines render byte-identically, so non-overflowing
  goldens don't churn). Applied to the overflowing captions / disclaimers (mode-map, ladder,
  three-circles, venn, resource-anchor, schema-grid, decisional-balance, secure-base). Two cases get
  **room instead of compression**, because squeezing them would hurt:
  - **process-loop titles** — the ring frame now grows its width to contain the title (a heading
    shouldn't squish);
  - **genogram legend + title** (relational-field) — the frame grows to fit the glyph legend at full
    size (a compressed symbol legend reads poorly).
  - **body-map** — the long guidance caption + disclaimer now **wrap** to the frame width and the frame
    **height grows** to fit (ADR-0050's outside-the-glyph pattern, applied to chrome); the title
    compresses.

## Consequences

- **Positive:** no text clips on export or embed anywhere in the corpus, and a future overflow (a long
  title, a localized disclaimer, a new caption) **fails CI** instead of shipping clipped — the defect
  class is closed, not just swept. The fixes prefer *room* for headings/legends and gentle
  *compression* only for secondary guidance lines, so legibility is preserved. 16 goldens regenerated.
- **Negative / cost:** a few long captions/disclaimers are now mildly compressed (≥~94% on the widest,
  e.g. the MI decisional-balance caption) — legible, and the alternative (clipping) is worse. The
  helper is applied where overflow exists today; other renderers' chrome is guarded by the invariant
  and converted if/when it ever overflows (so the codebase mixes raw and `chromeLine` chrome until
  then — an accepted, invariant-backed inconsistency).
- **Impact:** `packages/render/index.ts` (`chromeLine` helper + renderLoopMap / renderRelationalField
  / renderBodyMap / renderModeMap / renderLadder / renderThreeCircles / renderVenn / renderResourceMap
  / renderSchemaGrid / renderDecisionalBalance / renderSecureBase chrome), `packages/render/text-overlap.test.ts`
  (new invariant), 16 regenerated goldens, `sdd/traceability.json` (REQ-TEXT-IN-FRAME).

## Alternatives considered

- **Compress everything to the frame (titles included).** Rejected — squishing a 16px heading or a
  glyph legend reads badly; headings/legends get *room* (frame grows), only secondary guidance lines
  compress.
- **Grow every frame to fit its widest chrome line.** Rejected as the default — a long disclaimer
  would balloon a compact diagram's width with whitespace; growth is reserved for the title/legend
  where squishing is the worse trade.
- **Convert all chrome to `chromeLine` now (every renderer).** Deferred — byte-identical for
  non-overflowing lines, so it would be churn-free but touches every renderer; the invariant already
  guarantees correctness, so conversion can happen lazily as overflow appears. Recorded as the honest
  inconsistency above.
- **Leave it (chrome rarely overflows).** Rejected — it already overflowed on 10 renderers including
  the published showcase pages; clipped text on export is a clear UX defect.
