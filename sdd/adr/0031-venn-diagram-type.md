# ADR-0031: the `venn` diagram type — overlapping circles (DBT states of mind)

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (in-progress) / spec §E; follows ADR-0029/0030

## Context
Third of the catalogue's ◇ new-type renderers. The **Venn / overlapping circles** (catalog #20, DBT
states of mind: Reasonable ∩ Emotion = Wise Mind) was chosen over the 2×2 sorter because the
catalogue's own "excluded by design" section flags a 2×2 decisional-balance as a *table* (its cells
don't connect — no load-bearing topology), whereas a Venn's **overlap genuinely carries the meaning**
(the lens *is* a region). So the Venn is the more defensible diagram.

## Decision
Add a 15th `DiagramType`, **`venn`**, and `renderVenn`.

1. **Model (no new fields):** three region nodes by `stereotype` (`left`/`reasonable`,
   `overlap`/`wise`/`both`, `right`/`emotion`); each region's contents are nodes via `containment`
   (the resource-anchor / three-circles pattern).
2. **Renderer:** two overlapping circles drawn as **decoration, NOT `data-el` nodes** — they must
   overlap, which the node↔node invariant forbids — and each region's label placed in its zone
   (left-only / the lens / right-only) with a haloed one-line contents summary. The region labels ARE
   the `data-el` content (`nodelabel:`, no owner `node:` box); the overlap/layout invariants already
   handle "labels without owner nodes". Monochrome; alt-text states the two circles, their overlap,
   and what each region holds.
3. **Wiring (same surface as ADR-0029/0030):** `render()` dispatcher; the four test `RENDERERS` maps +
   `catalog.test` `KNOWN_TYPES` + `profiles.FAMILY_OF` (→ **parts**, matching the catalogue) + the §K
   `compat` list. **Not** added to `layout-quality` `LABEL_IN_BOX` (there are no node boxes to contain
   a label in). The index.test showcase sanity-check was generalised from `data-el="node:"` to
   `data-el="node(label)?:"` — honest, since `venn` represents its nodes as labels. Two examples
   (`dbt-states-of-mind` + golden `showcase-venn`); manifest moved "DBT states of mind" from
   `newTypes` → a verified `diagrams` row; generated catalog table + editor gallery auto-update
   (ADR-0028). Catalog #20 → ✅; showcase 14 → 15.

## Consequences
- **Positive:** a third canonical ◇ diagram ships, again zero schema growth; the first renderer whose
  nodes are *labels in regions* rather than boxes — a clean pattern the invariants already support,
  and proof the overlap guarantee accommodates a legitimately-overlapping shape by keeping the circles
  decorative.
- **Cost / honest scope:** the two circles are fixed equal size (no per-circle weighting); region
  contents are a one-line summary below each label. **5 ◇ shapes remain** (2×2 sorter, tree/branching,
  radial bullseye, hub/hexagon, circle-of-security); REQ-NEW-DIAGRAM-TYPES stays in-progress.
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderVenn`,
  +dispatcher, +`VENN_W`), the test `RENDERERS`/`KNOWN_TYPES` sets, `index.test` assertion generalised,
  `profiles.FAMILY_OF`, §K compat, `examples/{dbt-states-of-mind,showcase-venn}.psyuml` (+golden),
  `examples/catalog.json`, `docs/research/diagram-catalog.md` (#20 ✅, showcase 15, ◇ lists).

## Alternatives considered
- **2×2 sorter (decisional balance / ACT matrix).** Deferred — the catalogue itself excludes the
  decisional-balance 2×2 as a *table* (cells don't connect); the ACT matrix's axes are more
  diagram-like, but the Venn is unambiguously topological and higher-value (DBT core psychoeducation).
- **Make the two circles `data-el` nodes + exempt `venn` from node↔node overlap.** Rejected — that
  would re-introduce an overlap known-gap (the project drove those to zero); keeping the circles
  decorative + regions-as-labels preserves the guarantee with no exemption.
- **Three-set Venn.** Rejected for now — DBT states of mind is two-set; a third set's seven regions
  are a harder label-placement problem, out of proportion to current need.
