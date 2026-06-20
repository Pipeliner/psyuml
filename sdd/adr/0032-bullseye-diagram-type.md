# ADR-0032: the `bullseye` diagram type — concentric values target (ACT values bull's-eye)

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (in-progress) / spec §E; follows ADR-0029/0030/0031

## Context
Fourth of the catalogue's ◇ new-type renderers. The **values bull's-eye** (catalog #45, ACT /
Lundgren) was chosen over the remaining four (schema-domains sorter #16, Tree of Life #33, decisional
balance #46, Circle of Security #56) because it is the most defensible *now*:

- It is a **real instrument** (Lundgren et al.'s Bull's-Eye Values Survey), not only a worksheet.
- Its **geometry is load-bearing** — radial distance encodes how on-/off-target a life area is being
  lived; the *spread of darts* is the clinical picture. The two **sorters/grids** (#16, #46) the
  catalogue itself flags as table-like (cells don't connect — ADR-0031 already deferred the 2×2 on
  exactly this ground).
- It carries **no IP/cultural risk**, unlike **Circle of Security** (#56), which is a trademarked
  programme whose own catalogue note warns "graphic ≠ program" and cites a 2025 NHS RCT finding no
  added benefit — better deferred with care than rushed.
- It **generalises** to the very common "circles of control / influence / concern" (same concentric
  form), so one renderer serves several catalogue needs.

## Decision
Add a 16th `DiagramType`, **`bullseye`**, and `renderBullseye`.

1. **Model (no new fields):** each node is a life **domain**; `properties.intensity` (0–1) =
   how closely the person is currently living by that value (1 = dead-centre / on target, 0 = the rim
   / off target) — the same field the `ladder` reuses for SUDS, so **zero schema growth**. Domains
   carry no edges (a bull's-eye plots points, it doesn't connect them); only isolated `intervention`
   nodes are flagged by `validate`, so `context`-kind domains lint clean with an empty `edges` array.
2. **Renderer:** concentric rings + centre drawn as **decoration (not `data-el`)**; each domain is a
   **dot** (`data-el="node:"`) plotted at `radius = innerPad + (R − innerPad)·(1 − intensity)` on an
   **evenly-spaced angle**, with the **label on the perimeter** (`data-el="nodelabel:"`, anchored by
   hemisphere) and a thin **leader** from dot to ring edge. Decoupling label placement (always at the
   perimeter, evenly spread) from dot radius (the data channel) keeps labels separated **by
   construction** — so overlap/legibility/layout-quality pass without a de-collision pass. Monochrome;
   alt-text reads each domain's on-/off-target standing and rating.
3. **Wiring (same surface as ADR-0029/0030/0031):** `render()` dispatcher; the four test `RENDERERS`
   maps + `catalog.test` `KNOWN_TYPES` + `profiles.FAMILY_OF` (→ **change**, matching the catalogue
   family) + the §K `compat` list. **Not** added to `layout-quality` `LABEL_IN_BOX` (the labels ride
   the perimeter, they are not inside the dot boxes — like `venn`); the index.test showcase check
   already accepts `data-el="node(label)?:"`. Two examples (`values-bullseye` + golden
   `showcase-bullseye`); manifest moved "Values bullseye" `newTypes` → a verified `diagrams` row;
   generated catalog table + editor gallery auto-update (ADR-0028). Catalog #45 → ✅; showcase 16.

## Consequences
- **Positive:** a fourth canonical ◇ diagram ships, again zero schema growth; the first renderer whose
  meaning lives in **radial distance**, and the first that ships a legitimate **edge-free** model
  (plotted points) — proof the corpus invariants accept a diagram with no relations. The
  perimeter-label / radial-dot split is a clean, reusable layout idiom.
- **Cost / honest scope:** rings are fixed (four bands, decorative — they don't quantise the rating);
  the bull's-eye is a single target, not the four-quadrant Bull's-Eye worksheet (work / leisure /
  relationships / personal-growth quadrants); intensity is a 0–1 self-report, not a validated score.
  **4 ◇ shapes remain** (schema-domains sorter, Tree of Life, decisional-balance 2×2, Circle of
  Security); REQ-NEW-DIAGRAM-TYPES stays in-progress.
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderBullseye`,
  +dispatcher, +`BULLSEYE_W`), the test `RENDERERS`/`KNOWN_TYPES` sets, `index.test` (+import,
  +showcase, count 15→16), `profiles.FAMILY_OF`, `profiles/index.test` (change family unchanged in
  the exhaustive `parts` check), §K compat, `examples/{values-bullseye,showcase-bullseye}.psyuml`
  (+golden), `examples/catalog.json`, `docs/research/diagram-catalog.md` (#45 ✅, showcase 16, ◇
  lists).

## Alternatives considered
- **Schema 18-EMS / 5-domains sorter (#16) and Decisional balance 2×2 (#46).** Deferred — both are
  *grids/tables* whose cells don't connect; the catalogue flags them as table-like and ADR-0031
  already deferred the 2×2 on that ground. A sorter adds little the existing list/`mode-map` views
  don't, and its topology isn't load-bearing.
- **Tree of Life (#33).** Strong candidate (narrative therapy, culturally rich, client-led) but the
  branching/hierarchical layout is a larger build and the metaphor is heavier; better given its own
  ADR rather than rushed in fourth.
- **Circle of Security (#56).** Deferred deliberately — trademarked programme, attachment/parenting
  specific, and the catalogue's own note warns the graphic must not be sold as the (mixed-evidence)
  programme. Shipping it needs an explicit "graphic ≠ program" treatment, not a quick renderer.
- **Make the rings `data-el` and quantise dots to a band.** Rejected — bands would discretise a
  continuous self-report and re-introduce a node↔node concern (concentric rings overlap by design);
  decorative rings + a continuously-placed dot keep the guarantee and the meaning.
