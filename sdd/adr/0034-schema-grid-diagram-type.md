# ADR-0034: the `schema-grid` diagram type — Young's 18 schemas in 5 domains (sorter/grid)

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-NEW-DIAGRAM-TYPES (in-progress) / spec §E; follows ADR-0029–0033

## Context
Sixth of the catalogue's ◇ new-type renderers. The **schema-domains sorter** (catalog #16, schema
therapy — Young) was chosen next (over the decisional-balance 2×2 and Circle of Security) because it
is the most diagram-like of the three remaining: although a *grid* rather than a topological shape,
the **grouping is load-bearing** — *which of the 5 domains a schema belongs to* is the schema model's
own structure, and a person's **active** schemas across those domains is a real clinical signal. The
2×2 decisional balance the catalogue explicitly excludes as a table; Circle of Security is trademarked
with a "graphic ≠ program" caveat — both better deferred. (Honest: this is the weakest topology of the
◇ set, recorded as such.)

## Decision
Add an 18th `DiagramType`, **`schema-grid`**, and `renderSchemaGrid`.

1. **Model (no new fields):** each node is a **schema**, placed in a domain by `stereotype` — one of
   the 5 canonical keys `disconnection` / `autonomy` / `limits` / `other-directed` / `overvigilance`
   (the domain *names* are fixed renderer copy, like the Tree-of-Life zones). A schema the person
   endorses is marked with `properties.intensity` ≥ 0.5 → drawn **active**. Edge-free; zero schema
   growth.
2. **Renderer:** a five-**column sorter** — a fixed domain header per column, with each schema a
   rounded **cell** (`data-el="node:"`) stacked beneath its domain, its label wrapped/contained
   (`wrapLabel`). An **active** schema gets a **bold outline + a filled corner wedge + a bold label +
   an alt-text "(active)"** — redundant coding, never colour alone (§D). Unlike the other recent ◇
   types, the cells ARE node boxes with contained labels, so `schema-grid` joins `layout-quality`
   `LABEL_IN_BOX` (the containment-A check), and clean columns + per-column stacking keep node↔node
   clear. Monochrome; alt-text reads each domain and its schemas, flagging the active ones.
3. **Wiring (same surface as ADR-0029–0033):** `render()` dispatcher; the four test `RENDERERS` maps +
   `catalog.test` `KNOWN_TYPES` + `profiles.FAMILY_OF` (→ **parts**, matching the catalogue — and the
   `profiles` exhaustive parts-family test updated) + the §K `compat` list + `layout-quality`
   `LABEL_IN_BOX`. Two examples (`schema-grid` — a person's identified schemas — + golden
   `showcase-schema-grid` — the full 18-EMS framework); manifest moved "Schema 18-EMS / 5-domains
   sorter" `newTypes` → a verified `diagrams` row; generated catalog table + editor gallery auto-update
   (ADR-0028). Catalog #16 → ✅; showcase 18.

## Consequences
- **Positive:** a sixth canonical ◇ diagram ships, zero schema growth; the first ◇ type since the
  `ladder` to use real **node boxes** (so it exercises the containment-A invariant), and the first to
  encode a per-item **active/endorsed** highlight with redundant coding. The fixed-domain-by-
  `stereotype` pattern (shared with Tree-of-Life) proves reusable for any canonical category set.
- **Cost / honest scope:** a grid's grouping is **weaker topology** than the Venn/bull's-eye/three-
  circles (no continuous geometric channel) — recorded plainly; it is justified by the schema model's
  own 5-domain structure + the active-schema signal, not by spatial meaning. Domain headers are fixed
  to Young's English domain names (i18n of the headers is future work); the grid shows schemas, not
  the schema *modes* (the `mode-map` already covers modes).
- **Impact:** `packages/model/index.ts` (+enum), `packages/render/index.ts` (+`renderSchemaGrid`,
  +dispatcher, +`SCHEMA_W`), the test `RENDERERS`/`KNOWN_TYPES`/`LABEL_IN_BOX` sets, `index.test`
  (+import, +showcase, count 17→18), `profiles.FAMILY_OF` + `profiles/index.test` (parts family),
  §K compat, `examples/{schema-grid,showcase-schema-grid}.psyuml` (+golden), `examples/catalog.json`,
  `docs/research/diagram-catalog.md` (#16 ✅, showcase 18, ◇ lists).

## Alternatives considered
- **Decisional-balance 2×2 (#46).** Deferred — the catalogue itself excludes the decisional-balance
  2×2 as a *table* (cells don't connect); ADR-0031/0032 already deferred it on that ground.
- **Circle of Security (#56).** Deferred deliberately — trademarked programme, attachment-specific,
  mixed evidence (a 2025 NHS RCT found no added benefit); needs an explicit "graphic ≠ program"
  treatment, not a quick renderer.
- **Render schemas as free labels (no boxes), like `venn`/`bullseye`/`tree-of-life`.** Rejected — a
  *sorter* reads best as discrete cells in columns; boxes also let the active highlight (outline +
  wedge) land cleanly, and clean columns make node↔node trivial, so the box form costs nothing.
- **Draw the schema *modes* model instead (Healthy Adult / Child / Parent / Coping modes).** Rejected
  — the catalogue's #16 is specifically the 18-EMS-in-5-domains sorter; modes are a different figure
  already served by `mode-map`. Building #16 as catalogued keeps the renderer honest to its row.
