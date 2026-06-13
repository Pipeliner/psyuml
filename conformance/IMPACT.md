# Impact — `conformance/`

**Purpose:** the executable spec-conformance suite (§J) — round-trip, validation,
accessible-SVG, and monochrome invariants over the whole example corpus and every
diagram type. Runs under `pnpm test` / CI.
**Status:** active (M10 track)
**Spec anchor / REQ:** REQ-CONFORMANCE (§J), REQ-CROSS-SCHOOL (round-trip), REQ-ACCESSIBILITY

## Upstream (this depends on)
- `@psyuml/model`, `@psyuml/render`, `@psyuml/validate` (the things it conforms-checks).
- `../examples/*.psyuml` (the corpus under test).
- `../docs/specification/psyuml-v0.1.0.md` §J (the rubric it operationalizes).

## Downstream (depends on this) — blast radius
> **Blast radius: low (it's a gate).** Nothing imports it; it fails CI when a spec invariant
> breaks. A new diagram type should be added to its `RENDERERS` map + get an example.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace member manifest (`@psyuml/conformance`) declaring the packages it checks | — | pnpm resolution | — | low |
| `conformance.test.ts` | Per-example: round-trip, validation (both layers), accessible-SVG, monochrome; + type coverage | model, render, validate, `examples/*.psyuml` | CI `test` | §J / REQ-CONFORMANCE | low |
| `README.md` | What the suite checks and how it maps to §J; the v1.0 gate | spec §J | readers | §J | low |

## Change checklist
- [ ] New diagram type ⇒ add it to the `RENDERERS` map here and ship an example.
- [ ] Leaving v0.x stays gated on the spec's Stage-4 clinical evidence (not code alone).
- [ ] Ran `node sdd/check.mjs` (green).
