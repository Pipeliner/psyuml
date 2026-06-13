# Impact — `packages/diff/` (`@psyuml/diff`)

**Purpose:** longitudinal diff between two versions of the same formulation (M6) —
the structured changeset + readable progress lines (dominance ↑/↓, dashed→solid
consolidation, add/remove/rename) used to show change over time.
**Status:** active (M6 — diff engine; the renderDiff overlay + version store follow)
**Spec anchor / REQ:** REQ-VERSIONING-DIFF (§E.5, §H.10)

## Upstream (this depends on)
- `@psyuml/model` (the two graphs it compares; `getText` for layer-aware labels).
- `../../docs/specification/psyuml-v0.1.0.md` §E.5 (Timeline/Trajectory), §H.10 (shared ids).

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A pure leaf library. `apps/web` reads it for the Compare panel;
> a future Timeline/diff renderer and the version store (M6) build on it.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace manifest (`@psyuml/diff`) | — | workspace resolution | — | low |
| `index.ts` | `diffModels(before,after,{layer})` → structured changeset (added/removed/changed nodes+edges, field deltas); `summarizeDiff` → progress lines; `isEmptyDiff` | `@psyuml/model` | apps/web | §E.5, §H.10 / REQ-VERSIONING-DIFF | low |
| `index.test.ts` | Unit tests over a worked "R." case (dominance ↓, exit consolidates, add/remove/rename, no-mutation) | `index.ts` | CI `test` | REQ-VERSIONING-DIFF | low |

## Change checklist
- [ ] Match by stable `id` (§H.10) so a rename is a label change, never add+remove.
- [ ] Keep deltas redundant with text (no meaning by colour alone, §D) when a view renders them.
- [ ] Ran `node sdd/check.mjs` (green).
