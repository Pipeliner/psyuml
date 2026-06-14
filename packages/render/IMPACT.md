# Impact — `packages/render/` (`@psyuml/render`)

**Purpose:** turn a model (under a profile) into SVG, with layers, monochrome, legend, and
alt-text — plus a longitudinal diff "progress card".
**Status:** active (M1–M6 — 11 diagram renderers + the diff card)
**Spec anchor / REQ:** REQ-NOTATION, REQ-ACCESSIBILITY, REQ-EPISTEMIC-STATUS

## Upstream (this depends on)
- `@psyuml/model` (what to draw), `@psyuml/diff` (the changeset `renderDiff` visualizes).
- `../../assets/glyphs/` and `../../assets/tokens.json` (the 8 core glyphs + palette).
- `../../docs/specification/psyuml-v0.1.0.md` §B, §C, §D.

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `apps/web` renders via this; golden-SVG snapshot tests pin output.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/render`) | — | workspace resolution | — | low |
| `index.ts` | Render API — one `render*` per diagram type: State, Parts, ModeMap, RelationalField (+ drama triangle via `nestedWithin`), BodyMap, Loop, Timeline, InterventionSeq, Ritual, Decision, Resource, TwoTriangles (Malan, via `transference`) — plus `renderDiff(before,after)`. Shared `esc`/`r1`/**`fitText`** (single-line compress) + **`wrapLabel`** (true multi-line `tspan` wrapping, used by the box/shape renderers) + content-fit framing (ADR-0006: Loop fits its viewBox incl. negative coords + honors `pos`; State clamps node centers). **`blankTemplate(model)`** turns a model into a fill-in printable scaffold (REQ-TEMPLATES). Takes `roleLabels` (cross-school vocabulary). The Parts Map draws a node claimed by >1 school as a **contested-origin marker** (`⚖ A vs B`, via `schoolClaims`) + names the conflict in alt-text, surfacing §G.2 disagreement instead of merging it (ADR-0007). The Decision chart's crisis line is region-neutral (ADR-0008). | model, diff, assets | apps/web | §B–§F, §G, §K, §D / REQ-NOTATION, REQ-ACCESSIBILITY, REQ-GENOGRAM, REQ-PROCESS-LOOP, REQ-TIMELINE, REQ-INTERVENTION-SEQ, REQ-RITUAL, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR, REQ-RESEARCH-PROFILES, REQ-CROSS-SCHOOL, REQ-VERSIONING-DIFF | medium |
| `index.test.ts` | Unit tests (incl. the content-fit/no-clip frame assertion) | `index.ts` | CI `test` | REQ-ACCESSIBILITY | low |

## Change checklist
- [ ] Keep color redundant (§D) and emit alt-text/text-summary for every view.
- [ ] Update golden-SVG snapshots intentionally; never let color carry meaning alone.
- [ ] Ran `node sdd/check.mjs` (green).
