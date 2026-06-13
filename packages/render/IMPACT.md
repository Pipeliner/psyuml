# Impact — `packages/render/` (`@psyuml/render`)

**Purpose:** turn a model (under a profile) into SVG, with layers, monochrome, legend, and
alt-text. (M0: placeholder; M1: the real pipeline.)
**Status:** active (M0 skeleton)
**Spec anchor / REQ:** REQ-NOTATION, REQ-ACCESSIBILITY, REQ-EPISTEMIC-STATUS

## Upstream (this depends on)
- `@psyuml/model`, `@psyuml/profiles` (what + how to draw).
- `../../assets/glyphs/` and `../../assets/tokens.json` (the 8 core glyphs + palette).
- `../../docs/specification/psyuml-v0.1.0.md` §B, §C, §D.

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `apps/web` renders via this; golden-SVG snapshot tests pin output.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/render`) | — | workspace resolution | — | low |
| `index.ts` | Render API (`renderStateMap`, `renderPartsMap`, `renderDecisionChart`, `renderResourceMap`) | model, profiles, assets | apps/web | §B–§D, §E.8, §E.9 / REQ-NOTATION, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR | medium |
| `index.test.ts` | Unit tests | `index.ts` | CI `test` | — | low |

## Change checklist
- [ ] Keep color redundant (§D) and emit alt-text/text-summary for every view.
- [ ] Update golden-SVG snapshots intentionally; never let color carry meaning alone.
- [ ] Ran `node sdd/check.mjs` (green).
