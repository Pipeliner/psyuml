# ADR-0033: the `tree-of-life` diagram type — narrative-therapy life portrait

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (in-progress) / spec §E; follows ADR-0029/0030/0031/0032

## Context
Fifth of the catalogue's ◇ new-type renderers, and the **one genuinely new layout shape** among the
remaining four. The **Tree of Life** (catalog #33, narrative therapy — Ncube; Dulwich Centre) was
chosen over the schema-domains sorter (#16) and decisional-balance 2×2 (#46) — both *tables* the
catalogue already flags as non-diagrams — and over Circle of Security (#56), which is trademarked,
attachment-specific, and carries the catalogue's own "graphic ≠ program" / mixed-evidence caveat. The
Tree of Life is, by contrast, a widely-used, culturally-adaptable, **client-led** strengths practice
whose meaning is a clear **botanical metaphor** — high-value, client-facing, and visually distinct
from everything shipped.

## Decision
Add a 17th `DiagramType`, **`tree-of-life`**, and `renderTreeOfLife`.

1. **Model (no new fields):** each node is an **item** placed in a zone by `stereotype` — `roots`
   (where I come from), `ground` (my present), `trunk` (my skills & values), `branches` (my hopes &
   dreams), `leaves` (the important people), `fruits` (gifts I've been given). The renderer buckets
   nodes by zone; zone headers are fixed renderer copy, not model nodes. **Edge-free** (like
   `bullseye`) — `context`-kind items with `edges: []` lint clean (only isolated `intervention` nodes
   are flagged by `validate`). Zero schema growth (reuses `stereotype`).
2. **Renderer:** each non-empty zone is a **labelled band**; its items are laid out in a row of
   haloed labels spread by `layout.separate1D` (so they never collide and the canvas need not grow). A
   tree **silhouette** is drawn behind as decoration (no `data-el`): a soft **canopy** ellipse behind
   the branches/leaves/fruits bands, a **trunk** rectangle down to the **soil** line, and a **root
   fan** into the roots band. The items are the `data-el="nodelabel:"` content (no owner `node:`
   box — like `venn`/`bullseye`), so the overlap/legibility invariants apply to the labels and the
   silhouette stays purely decorative. Monochrome-friendly (the only fills are faint canopy/trunk
   tints, not Okabe–Ito meaning-colours); alt-text reads each zone and its contents.
3. **Wiring (same surface as ADR-0029–0032):** `render()` dispatcher; the four test `RENDERERS` maps +
   `catalog.test` `KNOWN_TYPES` + `profiles.FAMILY_OF` (→ **journey**, matching the catalogue family) +
   the §K `compat` list. **Not** in `layout-quality` `LABEL_IN_BOX` (zone items are free labels, not
   box-contained); `index.test`'s showcase check already accepts `data-el="node(label)?:"`. Two
   examples (`tree-of-life` + golden `showcase-tree-of-life`); manifest moved "River / Tree of Life"
   `newTypes` → a verified `diagrams` row; generated catalog table + editor gallery auto-update
   (ADR-0028). Catalog #33 → ✅; showcase 17.

## Consequences
- **Positive:** a fifth canonical ◇ diagram ships, again zero schema growth; the most *layout-novel*
  renderer so far (a botanical silhouette with zone bands) and a strongly client-facing, culturally
  portable strengths tool — broadening the library beyond problem-focused maps. Reuses the same
  edge-free + labels-as-nodes pattern proven by `bullseye`, plus `separate1D` for row packing.
- **Cost / honest scope:** the silhouette is a **stylised** tree (zone bands + a canopy/trunk/root
  motif), not a botanically-accurate or free-form hand-drawn tree; items sit in horizontal rows per
  zone (best for a handful of items each), not scattered organically; the "river of life" variant in
  the same catalogue row is **not** rendered (the tree is the higher-value, more-defined form). The
  metaphor is presented as a **co-created reflection, not an assessment** (alt-text + footer say so).
  **3 ◇ shapes remain** (schema-domains sorter, decisional-balance 2×2, Circle of Security);
  REQ-NEW-DIAGRAM-TYPES stays in-progress.
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderTreeOfLife`,
  +dispatcher, +`TREE_W`), the test `RENDERERS`/`KNOWN_TYPES` sets, `index.test` (+import, +showcase,
  count 16→17), `profiles.FAMILY_OF`, §K compat, `examples/{tree-of-life,showcase-tree-of-life}.psyuml`
  (+golden), `examples/catalog.json`, `docs/research/diagram-catalog.md` (#33 ✅, showcase 17, ◇
  lists).

## Alternatives considered
- **Schema 18-EMS / 5-domains sorter (#16) and decisional-balance 2×2 (#46).** Deferred — both are
  grids/tables whose cells don't connect; the catalogue itself excludes them as non-diagrams, and
  ADR-0031/0032 already deferred them on that ground.
- **Circle of Security (#56).** Deferred deliberately — trademarked programme, attachment/parenting
  specific, mixed evidence (the catalogue note cites a 2025 NHS RCT finding no added benefit); shipping
  it needs an explicit "graphic ≠ program" treatment, not a quick renderer.
- **A general recursive `tree` renderer (arbitrary parent→child hierarchy).** Rejected for now —
  honest naming: the catalogued item is the *narrative Tree of Life* (named botanical zones), not an
  arbitrary data-tree; building zone-by-`stereotype` renders exactly what #33 is without over-claiming
  a general hierarchy layout. A general `tree` can come later if a catalogue row needs it.
- **Render the items as `data-el` node boxes (leaves/fruits as shapes).** Rejected — boxes in organic
  canopy positions would re-introduce node↔node packing pressure; free haloed labels spread by
  `separate1D` keep the overlap guarantee with a lighter, more tree-like look.
