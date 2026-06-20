# ADR-0030: the `three-circles` diagram type — the CFT threat/drive/soothing model

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (in-progress) / spec §E; follows ADR-0029

## Context
Second of the catalogue's ◇ new-type renderers (REQ-NEW-DIAGRAM-TYPES). The **CFT three circles**
(Gilbert; catalog #27) is high-value — CFT has systematic-review support for self-criticism/shame —
and maps cleanly onto the existing "category + items via `containment`" pattern already used by
`resource-anchor`, so it needs no schema growth.

## Decision
Add a 14th `DiagramType`, **`three-circles`**, and `renderThreeCircles`.

1. **Model (no new fields):** the three systems are nodes identified by `stereotype`
   (`threat` | `drive` | `soothing`); each carries `properties.weight` (0–1) for its size; a system's
   contents are ordinary nodes linked by `containment` edges (the `resource-anchor` pattern).
2. **Renderer:** the canonical triangle — Threat top-left, Drive top-right, **Soothing bottom-centre**
   (the one to grow). Each circle's radius scales with `weight` (min radius keeps the name legible), so
   an **over-developed threat** and a **depleted soothing** system are visible at a glance — the
   clinical point. The system name is the interior node label (`fitText`, containment-checked); its
   function (`protect`/`pursue`/`rest & connect`) and a one-line summary of its contents sit below.
   Monochrome; `role="img"` + alt-text reads the three systems, their relative balance, and contents.
3. **Wiring (same surface as ADR-0029):** `render()` dispatcher; the four test `RENDERERS` maps +
   `catalog.test` `KNOWN_TYPES` + `layout-quality` `LABEL_IN_BOX` + `profiles.FAMILY_OF` (→ **field**,
   matching the catalogue grouping) + the §K `compat` list. Two examples — `three-circles.psyuml` +
   golden-pinned `showcase-three-circles.psyuml` — both invariant-clean. The catalog manifest moves
   "CFT three circles" from `newTypes` → a verified `diagrams` row, and the generated example-library
   table + editor gallery pick it up automatically (ADR-0028).

## Consequences
- **Positive:** a second canonical ◇ diagram ships end-to-end and verified, again with zero
  model-schema risk (reused `stereotype`/`weight`/`containment`). The size-by-weight encoding makes
  the system *balance* — the whole point of the CFT model — legible without colour.
- **Cost / honest scope:** circle sizing is by `weight` only; system contents are summarised as a
  one-line list below each circle (not laid out inside the circle) to keep the containment/overlap
  invariants simple and truthful. **6 ◇ shapes remain** (2×2 sorter, Venn, tree/branching, radial
  bullseye, hub/hexagon, circle-of-security); REQ-NEW-DIAGRAM-TYPES stays in-progress.
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderThreeCircles`,
  +dispatcher, +`TC_W`), the test `RENDERERS`/`KNOWN_TYPES`/`LABEL_IN_BOX` sets, `profiles.FAMILY_OF`,
  the §K compat list, `examples/{three-circles,showcase-three-circles}.psyuml` (+golden),
  `examples/catalog.json`, `docs/research/diagram-catalog.md` (#27 ✅, showcase 14, ◇ lists).

## Alternatives considered
- **Overlapping circles (a Venn).** Rejected — that's a *different* catalogued shape (DBT states of
  mind, #20). The CFT three systems are separate circles whose *sizes* carry the meaning, not their
  intersections.
- **Lay system contents inside each circle.** Rejected for now — fitting N wrapped items inside a
  weight-sized circle is layout-heavy and risks the containment invariant; a one-line summary below is
  legible and safe. Revisit if a richer in-circle layout is wanted.
- **Family = parts** (internal systems). Rejected — the catalogue groups CFT three circles under
  **Field** (the person's internal landscape, with body-map); kept consistent so the prose, manifest,
  and gallery agree.
