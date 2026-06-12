# Impact — `assets/glyphs/`

**Purpose:** the 8 Tier-1 core glyphs (spec §B "graphic economy") as monochrome,
shape-based, hand-drawable SVGs. Distinguishable by shape alone (no color dependence).
**Status:** active (M0)
**Spec anchor / REQ:** REQ-NOTATION, REQ-ACCESSIBILITY

## Upstream (this depends on)
- `../../docs/specification/psyuml-v0.1.0.md` §B (the core symbol table).

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `packages/render` and the editor palette load these by filename;
> renaming or restyling a glyph changes every diagram that uses it.

## Files
| File | Glyph (spec §B) | Shape | Spec / REQ | Change risk |
|---|---|---|---|---|
| `state.svg` | State node | rounded rectangle | §B | low |
| `agent.svg` | Agent / Part | circle | §B | low |
| `self.svg` | Self / core | double ring + centre dot | §B | low |
| `resource.svg` | Resource / anchor | diamond, thick border | §B | low |
| `intervention.svg` | Intervention | hexagon, hatched fill | §B | low |
| `observing-eye.svg` | Observing eye / I | eye outline | §B | low |
| `context-lane.svg` | Context / role lane | dashed swimlane | §B | low |
| `phase-band.svg` | Phase / arousal band | banded zone, pattern not hue | §B | low |

## Change checklist
- [ ] Keep each glyph distinguishable by **shape** when monochrome (§D).
- [ ] If you add a Tier-1 glyph, run the §K collision check and update `assets/tokens.json`.
- [ ] Ran `node sdd/check.mjs` (green).
