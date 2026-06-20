# ADR-0028: the catalog manifest is the single source — generate the prose table + the gallery from it

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-CATALOG-METADATA (in-progress → implemented), REQ-CATALOG-CONFORMANCE / extends ADR-0027

## Context
The catalog audit's metadata dimension (#3) wanted a *consistent per-row schema* and the structure
dimension (#5) wanted the prose to stop drifting. ADR-0027 made `examples/catalog.json` a verified
index (every shipped example is real + catalogued). But three surfaces still each held the per-example
display data **by hand** and could disagree: the prose tables in `diagram-catalog.md`, the editor
gallery's `EXAMPLE_CATALOG` in `App.tsx`, and the manifest. Hand-maintaining all three is exactly the
drift the audit flagged.

## Decision
**`examples/catalog.json` is the single source of truth for the shipped example library.** Each
`diagrams` row carries the full per-row schema — `{ file, type, family, name, catalogId?, school,
note, audience }`, `audience ∈ C|L|B` — and the two prose/UI surfaces are **derived**, not duplicated:

1. **Prose table — generated.** `scripts/build-catalog.mjs` (`pnpm run catalog`) renders a per-family
   "Shipped example library" table from the manifest into `diagram-catalog.md` between
   `<!-- BEGIN/END catalog:generated -->` markers. `conformance/catalog.test.ts` parses the committed
   table back and asserts it equals the manifest row-for-row (a **drift check**, content-compared so
   Prettier's table re-alignment is irrelevant) — so the prose can never go stale.
2. **Editor gallery — derived.** `App.tsx` imports `catalog.json` and builds the non-showcase
   `EXAMPLE_CATALOG` items from it (`label`=name, `family`=family, `school`, `note`); the ★ showcase
   set stays a small hand-authored list (it has no manifest row — it's a per-type capability demo).
   The ~250 hand-written gallery entries are gone; adding an example is one manifest row.
3. **Schema enforced.** `catalog.test.ts` also asserts every row has a non-empty `school`/`note` and a
   valid `audience` — so the generated table + gallery are always complete.

## Consequences
- **Positive:** the prose catalog, the gallery, and the corpus cannot drift — all flow from one
  manifest, checked in CI. The audit's #3 (consistent, complete per-row schema) and #5 (the example
  table is generated + navigable) are closed for the shipped set. Adding a diagram is now: ship the
  `.psyuml`, add one manifest row, run `pnpm run catalog` — the prose, the gallery, and conformance all
  update/verify together.
- **Cost / honest scope:** the manifest covers the **shipped** examples (45). The catalog also keeps
  its hand-authored, richer **family tables** (the full 59 conceptual diagrams incl. the ◇ new-types
  and non-shipped rows) — those stay prose, because they describe diagrams that don't ship as a single
  model; the generated table is the *verified shipped subset*, not a replacement for the survey. The
  generator writes raw markdown (Prettier re-aligns on `format`); it is intentionally **not** wired
  into `build`/`dev` (which would leave the tree un-prettied) — it is a manual `pnpm run catalog`, with
  the drift check as the backstop.
- **Impact:** `examples/catalog.json` (+schema fields), `scripts/build-catalog.mjs` (new),
  `conformance/catalog.test.ts` (+schema +drift), `apps/web/App.tsx` (gallery derived; manifest
  import), `docs/research/diagram-catalog.md` (generated section), `package.json` (`catalog` script).
  REQ-CATALOG-METADATA → implemented.

## Alternatives considered
- **Hand-maintain a caveat/citation column on all 59 prose rows.** Rejected — fragile and the exact
  drift the audit named; generation from a checked manifest is robust and the per-row "note" already
  carries the honest evidence/caveat, with the consolidated Safety & cultural caveats + References
  sections (REQ-CATALOG-METADATA, prior pass) covering the rest.
- **Generate the rich 59-row family tables too.** Deferred — those include non-shipped ◇ rows and
  survey prose; porting all of it into the manifest is a larger model change for little added safety
  (the shipped subset is what users load + what can rot silently).
- **Keep the gallery hand-authored + add a gallery↔manifest equality test.** Rejected — deriving the
  gallery removes the duplication outright (no second source to keep equal) and deletes ~250 lines.
