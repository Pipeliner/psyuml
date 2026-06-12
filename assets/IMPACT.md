# Impact — `assets/`

**Purpose:** shared design assets — the colorblind-safe token palette and the 8 core glyphs —
consumed by the renderer and the editor.
**Status:** active (M0)
**Spec anchor / REQ:** REQ-NOTATION, REQ-ACCESSIBILITY

## Upstream (this depends on)
- `../docs/specification/psyuml-v0.1.0.md` §B (glyphs), §D (palette + non-color encodings).

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `packages/render` (and the editor palette) draw from these; a glyph
> or token change is visible in every rendered diagram. Every concept's color stays redundant
> with a non-color encoding (§D) — see `tokens.json`.

## Subdirectories
- `glyphs/` — the 8 Tier-1 core glyphs as monochrome SVG (see `assets/glyphs/IMPACT.md`).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `tokens.json` | Okabe–Ito palette + concept→color+non-color map (§D) | spec §D | render, apps/web | §D / REQ-ACCESSIBILITY | medium |

## Change checklist
- [ ] Never add a concept whose meaning is carried by color alone (§D).
- [ ] Keep glyphs monochrome and hand-drawable; update `packages/render` if names change.
- [ ] Ran `node sdd/check.mjs` (green).
