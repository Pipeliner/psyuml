# ADR-0035: the `decisional-balance` diagram type — the MI 2×2 (promoted from "excluded")

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (in-progress) / spec §E; follows ADR-0029–0034

## Context
Seventh of the catalogue's ◇ new-type renderers (catalog #46, MI — Miller–Rollnick). This one is a
deliberate **reversal of a prior position**: ADR-0031/0032 deferred the 2×2 as table-like, and the
catalogue's *"Excluded by design — worksheets/tables/scales"* section listed the decisional balance as
a "2×2 pros/cons table". On the owner's instruction to build the remaining two ◇ shapes, the 2×2 was
re-examined and **promoted out of the excluded set**: unlike a flat pros/cons *table*, the decisional
balance's **crossed axes are a real 2-D structure** — *making the change ↔ staying the same* × *benefits
↔ costs* — and the four quadrants are *defined by* those two dimensions. That is load-bearing enough to
render as a diagram, provided the axes are drawn as the structure (not just a list in boxes).

The honesty cost is recorded plainly: this is the **most table-like** member of the ◇ set, and the MI
evidence caveat is non-trivial — MI-3 cautions that a **neutral** decisional balance can *deepen*
ambivalence when the goal is change. The renderer and examples carry that caveat.

## Decision
Add a 19th `DiagramType`, **`decisional-balance`**, and `renderDecisionalBalance`.

1. **Model (no new fields):** each item is placed in a quadrant by `stereotype` — `change-benefit` |
   `stay-benefit` | `change-cost` | `stay-cost`. Edge-free; zero schema growth.
2. **Renderer:** a **labelled-axis 2×2** — column headers (*making the change* | *staying the same*),
   row headers (*benefits/hopes* | *costs/worries*), a dividing cross + outer border, and faint
   per-row tints (redundant with the headers, not meaning-by-colour). Items are free haloed labels
   stacked per quadrant (no node boxes → **not** `LABEL_IN_BOX`). A standing footer states the **MI
   caveat** ("use when genuinely weighing… not a persuasion tool"); alt-text reads all four quadrants.
3. **Wiring (same surface as ADR-0029–0034):** `render()` dispatcher; the four test `RENDERERS` maps +
   `catalog.test` `KNOWN_TYPES` + `profiles.FAMILY_OF` (→ **change**, matching the catalogue) + the §K
   `compat` list. Two examples (`decisional-balance` + golden `showcase-decisional-balance`); manifest
   moved "Decisional balance" `newTypes` → a verified `diagrams` row; the catalogue's **excluded-by-
   design** list drops the decisional-balance entry and gains a note recording the promotion + the MI
   caveat. Catalog #46 → ✅; showcase 19.

## Consequences
- **Positive:** a seventh ◇ diagram ships; the catalogue's build status is now internally consistent
  (a row can't be both "excluded as a table" and "◇ to build"). Demonstrates the project *can* revisit
  a documented exclusion when given a reason, and do so transparently (the excluded list explains the
  move rather than silently dropping it).
- **Cost / honest scope:** the weakest topology of the ◇ set — the quadrant cells don't link; only the
  axes carry structure. Recorded as such. The MI ambivalence caveat means this tool is easy to misuse;
  the renderer hard-codes the caveat into every output so it travels with the picture.
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderDecisionalBalance`,
  +dispatcher, +`MATRIX_W`), the test `RENDERERS`/`KNOWN_TYPES` sets, `index.test` (+import, +showcase,
  count 18→19), `profiles.FAMILY_OF`, §K compat, `examples/{decisional-balance,
  showcase-decisional-balance}.psyuml` (+golden), `examples/catalog.json`,
  `docs/research/diagram-catalog.md` (#46 ✅, excluded-list reconciled, showcase 19).

## Alternatives considered
- **Keep it excluded (the ADR-0031/0032 position).** Rejected on the owner's instruction to build the
  remaining shapes, and on re-examination: the crossed axes are genuinely more than a table. The
  reversal is recorded here rather than hidden.
- **Render quadrant items as `data-el` node boxes (join `LABEL_IN_BOX`).** Rejected — boxes-in-cells
  add packing pressure for no gain; free haloed labels in clearly-bordered quadrants read fine and the
  2×2 border/cross already supplies the structure. (Contrast `schema-grid`, where discrete cells *are*
  the point.)
- **Drop the MI caveat to keep the picture clean.** Rejected — the caveat is the most important thing
  about this tool; it is hard-coded into the footer + alt-text so it cannot be separated from the
  diagram.
