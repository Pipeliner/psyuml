# Impact — `examples/`

**Purpose:** the canonical example corpus — one `<type>.psyuml` model + its generated
`<type>.svg` golden per diagram type — used as regression fixtures, the CI corpus lint,
and the editor's built-in examples.
**Status:** active (all 9 diagram types)
**Spec anchor / REQ:** REQ-STATE-MAP, REQ-PARTS-MAP, REQ-GENOGRAM, REQ-PROCESS-LOOP, REQ-TIMELINE, REQ-INTERVENTION-SEQ, REQ-RITUAL, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR

<!-- sdd:cover: *.psyuml, *.svg -->

## Upstream (this depends on)
- `@psyuml/model` (the schema these files must satisfy) and `@psyuml/render` (produces the goldens).
- `../docs/specification/psyuml-v0.1.0.md` §E (diagram types), §H (the worked case).

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `packages/model`, `packages/render`, and `packages/validate` tests
> read these as fixtures; `apps/web` imports them as the editor's examples. A model-schema or
> renderer change can require regenerating the goldens here.

## Files
Files are **covered in bulk** by the `sdd:cover` directive above (they don't each need a row):
- `*.psyuml` — hand-authored canonical models, one per diagram type. Their validity is enforced
  by the **examples-corpus lint** in `packages/validate/index.test.ts` (must pass in both layers).
- `*.svg` — **generated** golden renders (produced by `packages/render/index.test.ts`; never
  hand-edited). Byte-compared in CI.

| Diagram types present | state-map · parts-map · mode-map · relational-field · process-loop · timeline · intervention-sequence · ritual · decision-nav · resource-anchor |
|---|---|

## Change checklist
- [ ] New diagram example = add `<type>.psyuml` + run the render test to generate `<type>.svg`. No IMPACT edit needed (glob-covered) — but add a render test + a `REQ-…` for the new type.
- [ ] Never hand-edit a golden `.svg`; regenerate it (delete + `pnpm test`).
- [ ] Ran `node sdd/check.mjs` (green).
