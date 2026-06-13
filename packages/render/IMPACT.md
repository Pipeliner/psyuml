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
| `index.ts` | Render API — one `render*` per diagram type: State, Parts, ModeMap, RelationalField (+ drama triangle via `nestedWithin`), BodyMap, Loop, Timeline, InterventionSeq, Ritual, Decision, Resource, TwoTriangles (Malan, via `transference`) — plus `renderDiff(before,after)` (the longitudinal progress card). Takes `roleLabels` (cross-school vocabulary). | model, diff, assets | apps/web | §B–§F, §G, §K / REQ-NOTATION, REQ-GENOGRAM, REQ-PROCESS-LOOP, REQ-TIMELINE, REQ-INTERVENTION-SEQ, REQ-RITUAL, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR, REQ-RESEARCH-PROFILES, REQ-CROSS-SCHOOL, REQ-VERSIONING-DIFF | medium |
| `index.test.ts` | Unit tests | `index.ts` | CI `test` | — | low |

## Change checklist
- [ ] Keep color redundant (§D) and emit alt-text/text-summary for every view.
- [ ] Update golden-SVG snapshots intentionally; never let color carry meaning alone.
- [ ] Ran `node sdd/check.mjs` (green).
