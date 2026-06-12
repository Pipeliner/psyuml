# Impact — `packages/profiles/` (`@psyuml/profiles`)

**Purpose:** school profiles (glyph/palette + layout + vocabulary + extra validators) and the
translation table — the "many views over one model" layer. (M0: seed list; M4–M5: definitions.)
**Status:** active (M0 skeleton)
**Spec anchor / REQ:** REQ-CROSS-SCHOOL, REQ-RESEARCH-PROFILES, REQ-BODY-MAP, REQ-EXTENSION-MECH

## Upstream (this depends on)
- `@psyuml/model`, `@psyuml/validate`.
- `../../docs/specification/psyuml-v0.1.0.md` §G (translation), §K (extension).

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `render` consumes profile glyph/layout choices; `apps/web` shows
> the profile switcher. Provenance tags here keep opposed origin-claims visible (§G.2).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/profiles`) | — | workspace resolution | — | low |
| `index.ts` | Profiles API (M0: `SEED_PROFILES`, `listProfiles`) | model, validate | render, apps/web | §G, §K / REQ-CROSS-SCHOOL | medium |
| `index.test.ts` | Unit tests | `index.ts` | CI `test` | — | low |

## Change checklist
- [ ] New profile ⇒ follow §K extension rules (map to a §A element; Tier-3; collision check).
- [ ] Never flatten opposed theoretical claims — tag provenance (§G.2 caveat).
- [ ] Ran `node sdd/check.mjs` (green).
