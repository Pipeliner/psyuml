# Impact — `conformance/`

**Purpose:** the executable spec-conformance suite (§J) — round-trip, validation,
accessible-SVG, and monochrome invariants over the whole example corpus and every
diagram type; **+ catalog↔corpus and docs↔system drift guards** (the catalogue and the
prose docs can't fall behind the language). Runs under `pnpm test` / CI.
**Status:** active (M10 track)
**Spec anchor / REQ:** REQ-CONFORMANCE (§J), REQ-CROSS-SCHOOL (round-trip), REQ-ACCESSIBILITY,
REQ-CATALOG-CONFORMANCE, REQ-DOC-CONFORMANCE, REQ-SHOWCASE-PAGE

## Upstream (this depends on)
- `@psyuml/model`, `@psyuml/render`, `@psyuml/validate`, `@psyuml/profiles` (the things it conforms-checks).
- `../examples/*.psyuml` (the corpus under test).
- `../docs/specification/psyuml-v0.1.0.md` §J (the rubric it operationalizes), §K (extension invariants).

## Downstream (depends on this) — blast radius
> **Blast radius: low (it's a gate).** Nothing imports it; it fails CI when a spec invariant
> breaks. A new diagram type should be added to its `RENDERERS` map + get an example.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace member manifest (`@psyuml/conformance`) declaring the packages it checks | — | pnpm resolution | — | low |
| `conformance.test.ts` | Per-example: round-trip, validation (both layers), accessible-SVG, monochrome; + type coverage; + §K extension invariants (CFT profile clean; `CORE_BASES` == model elements; the four rules fire) | model, render, validate, profiles, `examples/*.psyuml` | CI `test` | §J, §K / REQ-CONFORMANCE, REQ-EXTENSION-MECH | low |
| `catalog.test.ts` | **Catalog ↔ corpus conformance (ADR-0027/0028)** — validates the `../examples/catalog.json` manifest against the shipped corpus: every `diagrams[].file` exists, parses, `model.diagram === type`; every non-showcase example listed exactly once; each `showcase-<type>` matches its model; count matches; ◇ `newTypes` never shipped. **+ schema** (every row has non-empty `school`/`note` + a valid `audience` C\|L\|B) **+ drift check** (the generated "Shipped example library" table in `diagram-catalog.md` is parsed back and asserted equal to the manifest, content-compared — so prose can't drift, ADR-0028). Makes the catalog + the editor gallery VERIFIED, single-source artifacts | model, `../examples/catalog.json`, `../examples/*.psyuml`, `../docs/research/diagram-catalog.md` | CI `test` | §E, §J / REQ-CATALOG-CONFORMANCE, REQ-CATALOG-METADATA, REQ-EXAMPLE-LIBRARY | low |
| `showcase.test.ts` | **Showcase ↔ system conformance (ADR-0044)** — drift-locks the standalone HTML showcase the same way `catalog.test.ts` locks the catalogue: the `../examples/showcase.json` manifest is checked against the SYSTEM (its `diagrams` cover EXACTLY `DiagramType.options`, one per type; each `family` == `FAMILY_OF`; the `families` chooser block == the `FAMILIES` registry; each entry's prose is substantive + has a committed `showcase-<type>.svg`/`.psyuml`), and the generated page (via the imported `renderShowcase`) is checked against the manifest — self-contained (no external script/stylesheet/`<img>`), inlines every golden render + each model's REAL title, and carries every explanation, on-paper guide, JTBD job, chooser question and honesty note. So adding a 21st type fails CI until it has a showcase entry, and the page can't silently drop content | model, profiles, `scripts/build-showcase.mjs`, `../examples/showcase.json`, `../examples/showcase-*` | CI `test` | §E, §J / REQ-SHOWCASE-PAGE | low |
| `docs-conformance.test.ts` | **Docs ↔ system conformance (ADR-0043)** — the prose analogue of `catalog.test.ts`: derives the load-bearing facts from the SYSTEM (`DiagramType.options` count + exact type list, `FAMILIES.length`, the `examples/` corpus) and asserts the live docs match — the format-reference quick-guide table lists EXACTLY `DiagramType.options`; every digit-form "N diagram types/renderers" equals the renderer count; every "N families" equals the family count; one `showcase-<type>` per type. So a doc saying "12 diagram types" or a quick-guide missing a renderer fails CI — the hand-fixed drift can't return. Digit-form counts only; a `(?<![.\w])` lookbehind skips version/identifier digits ("v0.1 diagram types", "M15"); `docs/research/**` + `sdd/adr/**` out of scope | model, profiles, `../docs/**/*.md`, `../examples/*.psyuml` | CI `test` | §J, §E / REQ-DOC-CONFORMANCE | low |
| `README.md` | What the suite checks and how it maps to §J; the v1.0 gate | spec §J | readers | §J | low |

## Change checklist
- [ ] New diagram type ⇒ add it to the `RENDERERS` map here and ship an example.
- [ ] Leaving v0.x stays gated on the spec's Stage-4 clinical evidence (not code alone).
- [ ] Ran `node sdd/check.mjs` (green).
