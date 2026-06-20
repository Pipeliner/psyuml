# Impact — `conformance/`

**Purpose:** the executable spec-conformance suite (§J) — round-trip, validation,
accessible-SVG, and monochrome invariants over the whole example corpus and every
diagram type. Runs under `pnpm test` / CI.
**Status:** active (M10 track)
**Spec anchor / REQ:** REQ-CONFORMANCE (§J), REQ-CROSS-SCHOOL (round-trip), REQ-ACCESSIBILITY

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
| `README.md` | What the suite checks and how it maps to §J; the v1.0 gate | spec §J | readers | §J | low |

## Change checklist
- [ ] New diagram type ⇒ add it to the `RENDERERS` map here and ship an example.
- [ ] Leaving v0.x stays gated on the spec's Stage-4 clinical evidence (not code alone).
- [ ] Ran `node sdd/check.mjs` (green).
