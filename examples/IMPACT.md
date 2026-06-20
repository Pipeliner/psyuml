# Impact — `examples/`

**Purpose:** the canonical example corpus — a `<name>.psyuml` model + its generated
`<name>.svg` golden for each diagram type (plus school-specific profiles of a type, e.g.
the Karpman drama triangle under Relational Field) — used as regression fixtures, the CI
corpus lint, and the editor's built-in examples. This corpus is also the **interactive
help-site example library** (ADR-0020): the editor's family-grouped gallery showcases these
models with honest per-item evidence notes, so a gallery item is always a real, validated model.
**Status:** active (12 diagram types + school-specific profile instances)
**Spec anchor / REQ:** REQ-STATE-MAP, REQ-PARTS-MAP, REQ-GENOGRAM, REQ-PROCESS-LOOP, REQ-TIMELINE, REQ-INTERVENTION-SEQ, REQ-RITUAL, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR, REQ-EXAMPLE-LIBRARY

<!-- sdd:cover: *.psyuml, *.svg, catalog.json -->

**`catalog.json`** — the machine-readable **catalog manifest** (REQ-CATALOG-CONFORMANCE, ADR-0027):
each shipped diagram is a row `{ file, type, family, name, catalogId? }`, and the catalogued ◇
new-types are listed as `newTypes`. `conformance/catalog.test.ts` enforces catalog↔corpus fidelity
against it, so `docs/research/diagram-catalog.md` can never over-claim. Add a row whenever a new
example ships (REQ-CATALOG-COVERAGE).

## Upstream (this depends on)
- `@psyuml/model` (the schema these files must satisfy) and `@psyuml/render` (produces the goldens).
- `../docs/specification/psyuml-v0.1.0.md` §E (diagram types), §H (the worked case).

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `packages/model`, `packages/render`, and `packages/validate` tests
> read these as fixtures; `apps/web` imports them as the editor's examples. A model-schema or
> renderer change can require regenerating the goldens here.

## Files
Files are **covered in bulk** by the `sdd:cover` directive above (they don't each need a row):
- `*.psyuml` — hand-authored canonical models, one per diagram type (plus **school-specific
  profile instances** — `drama-triangle`, `cat-sdr`, and the help-site library: `panic-cycle`,
  `ocd-cycle`, `depression-flower`, `stages-of-change` (process-loop); `longitudinal-formulation`,
  `five-ps` (timeline); `dbt-chain`, `goal-ladder` (intervention-sequence); `act-choice-point`,
  `relapse-prevention` (decision-nav); etc.), **and a `showcase-<type>.psyuml` set — one
  feature-dense model per diagram type** (the catalogue's "what can it do", exercising the full
  notation). Their validity is enforced by the **examples-corpus lint** in
  `packages/validate/index.test.ts` (must pass in both layers), plus the overlap (ADR-0012) and
  legibility/dual-coding (ADR-0011) invariants over the whole corpus; each `showcase-*` is also
  pinned by a golden in `packages/render/index.test.ts`.
- `*.svg` — **generated** golden renders (produced by `packages/render/index.test.ts`; never
  hand-edited). Byte-compared in CI.

| Diagram types present | state-map · parts-map · mode-map · relational-field (+ drama-triangle) · body-map · process-loop (+ cat-sdr) · timeline · intervention-sequence · ritual · decision-nav · resource-anchor · two-triangles |
|---|---|

## Change checklist
- [ ] New diagram example = add `<type>.psyuml` + run the render test to generate `<type>.svg`. No IMPACT edit needed (glob-covered) — but add a render test + a `REQ-…` for the new type.
- [ ] If the example is shown in the help-site gallery, add a `GalleryItem` (family + school + an **honest** evidence/limit `note`) to `apps/web/App.tsx`'s `EXAMPLE_CATALOG`, and keep the note in step with `docs/research/diagram-catalog.md`.
- [ ] Never hand-edit a golden `.svg`; regenerate it (delete + `pnpm test`).
- [ ] Ran `node sdd/check.mjs` (green).
