# Impact — `packages/profiles/` (`@psyuml/profiles`)

**Purpose:** school profiles (glyph/palette + layout + vocabulary + extra validators) and the
translation table — the "many views over one model" layer. (M0: seed list; M4–M5: definitions.)
**Status:** implemented (M4–M5 — translation table + the §K extension mechanism)
**Spec anchor / REQ:** REQ-CROSS-SCHOOL, REQ-RESEARCH-PROFILES, REQ-BODY-MAP, REQ-EXTENSION-MECH

## Upstream (this depends on)
- `@psyuml/model` (NodeKind/EdgeKind/DiagramType/Tier — the core element set the §K base/compat
  checks are derived from), `zod` (the profile schema).
- `../../docs/specification/psyuml-v0.1.0.md` §G (translation), §K (extension), §B/§C (glyphs).
- `../../docs/extension-guide.md` — the practical §K companion.

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `render` consumes profile glyph/layout choices; `apps/web` shows
> the profile switcher. Provenance tags here keep opposed origin-claims visible (§G.2).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/profiles`) | — | workspace resolution | — | low |
| `index.ts` | Profiles API: `SEED_PROFILES`, `listProfiles`, the §G.2 `TRANSLATIONS` table, `translate(concept,school)`, `roleLabelsFor(school)`; **§K extension mechanism** — `ExtensionProfile`/`StereotypeDef` schemas, `validateProfile` (4 rules + Tier-1 freeze + glyph collision + semver/deprecation, ADR-0009), `roleLabelsFromProfile`, `CORE_BASES`/`CORE_TIER1_GLYPHS`, the worked `CFT_PROFILE`; **v0.2 families + audience profiles** (ADR-0014) — `FAMILIES`/`FAMILY_OF`/`familyOf`/`diagramsInFamily` (8 families over the 12 diagram types) + `AUDIENCE_PROFILES`/`audienceProfile` (clinician/client/picture) + `withinSymbolBudget(kinds, audience)` (ADR-0016 — the §2 graphic-economy cap: clinician none, client 6, picture 5; the editor surfaces it as a gentle nudge) | `@psyuml/model`, zod | render (via `roleLabels`), cli (`lint-profile`), conformance, apps/web | §G, §K, v0.2 §2 / REQ-CROSS-SCHOOL, REQ-EXTENSION-MECH, REQ-DIAGRAM-FAMILIES, REQ-AUDIENCE-PROFILES | medium |
| `index.test.ts` | Unit tests (seed list + translation table + the §K rule checks) | `index.ts` | CI `test` | — | low |

## Change checklist
- [ ] New profile ⇒ follow §K extension rules (map to a §A element; Tier-3; collision check).
- [ ] Never flatten opposed theoretical claims — tag provenance (§G.2 caveat).
- [ ] Ran `node sdd/check.mjs` (green).
