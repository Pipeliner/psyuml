# ADR-0029: the `ladder` diagram type — exposure / fear hierarchies & ranked goal ladders

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (planned → in-progress) / spec §E

## Context
The diagram catalog lists eight **◇ new-type** shapes the system can't yet draw (the manifest's
`newTypes`). REQ-NEW-DIAGRAM-TYPES tracks adding their renderers. The **ranked ladder** (exposure /
fear hierarchy, catalog #39; and the ranked goal/scaling ladder, #47) is the cleanest, highest-value
first one: a strongly-evidenced, ubiquitous CBT tool whose meaning *is* a 1-D ranking, so it maps
onto the existing model with no schema additions beyond the type tag.

## Decision
Add a 13th `DiagramType`, **`ladder`**, and `renderLadder` (`@psyuml/render`).

1. **Model:** `ladder` joins the `DiagramType` enum — additive, backward-compatible (existing models
   stay valid). **No new node/edge fields:** a rung is an ordinary node; its rank is the existing
   `properties.intensity` (0–1, the SUDS / distress or value rating). Edges are unused (the ranking is
   the structure), so the example carries `edges: []`.
2. **Renderer:** a vertical stack of labelled step-boxes, **hardest-first** (sorted by `intensity`
   desc, stable on ties), each box a `data-el="node:"` rect with a single-line `fitText` label and a
   ringed **rating badge** (intensity×100). A left **intensity arrow** worded *harder ↑ / easier* keeps
   the gradient redundant with a word (spec §D); an interpretive rung is dashed (`epistemicStatus`).
   A pacing note ("master a rung before climbing; the bottom rung is where to start") encodes the
   path-of-hope. Monochrome; `role="img"` + alt-text lists the rungs hardest-first with ratings.
3. **Wiring:** the `render()` dispatcher case; the conformance / overlap / layout-quality / crossing
   `RENDERERS` maps + `catalog.test` `KNOWN_TYPES` + `layout-quality` `LABEL_IN_BOX` (rung labels are
   contained) all gain `ladder`. Two examples ship — `exposure-ladder.psyuml` (social-anxiety
   hierarchy) and a feature-dense `showcase-ladder.psyuml` (agoraphobia, 7 rungs, mixed epistemic
   statuses) — both invariant-clean; the showcase is golden-pinned (13th type). The catalog manifest
   moves "Exposure / fear ladder" from `newTypes` → a verified `diagrams` row (`type: ladder`), and the
   generated example-library table + the editor gallery pick it up automatically (ADR-0028).

## Consequences
- **Positive:** a canonical, evidenced diagram the system couldn't draw now ships, end-to-end and
  verified (validate, overlap, legibility, layout-quality, edge↔edge, conformance, golden) with zero
  model-schema risk (reused `intensity`). Proves the "add a ◇ renderer" path: dispatcher + maps +
  example + manifest row, and the catalog/gallery flow from the manifest.
- **Cost / honest scope:** `ladder` is one of eight ◇ shapes — REQ-NEW-DIAGRAM-TYPES stays
  **in-progress** (remaining: 2×2 sorter, Venn, three-circles, tree/branching, radial bullseye,
  hub/hexagon, circle-of-security). The renderer is intentionally simple (no rails/curves); the
  ranking is by `intensity` only (no per-rung free-text rating unit — "SUDS 0–100" is the convention).
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderLadder`,
  +dispatcher), the four test `RENDERERS` maps + `catalog.test`/`layout-quality` sets,
  `examples/{exposure-ladder,showcase-ladder}.psyuml` (+golden), `examples/catalog.json`,
  `docs/research/diagram-catalog.md` (#39 ✅, showcase 13, ◇ lists). REQ-NEW-DIAGRAM-TYPES → in-progress.

## Alternatives considered
- **Reuse `intervention-sequence` (a single ranked lane).** Rejected — the catalog already maps the
  ladder as ◐ on intervention-sequence, but a swimlane/phase renderer distorts a pure ranking; a
  dedicated `ladder` reads as the rungs it is, and the rating badge has no home in the lane renderer.
- **Add a new `rank`/`suds` node field.** Rejected — `properties.intensity` already models a 0–1
  magnitude (used by body-map/state-map), so the ladder needs no schema growth.
- **A literal rails-and-rungs ladder graphic.** Rejected — thin horizontal rungs can't hold the
  situation labels legibly; stacked step-boxes are the common, accessible "fear ladder" form.
