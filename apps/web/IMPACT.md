# Impact — `apps/web/` (the GUI editor)

**Purpose:** the browser-based PsyUML editor. (M0: empty-canvas shell; M2: the drag-and-drop
editor over the 8-symbol Tier-1 core.)
**Status:** active (M0 shell)
**Spec anchor / REQ:** REQ-EDITOR-MVP, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR

## Upstream (this depends on)
- `react`, `react-dom`, `vite` (built from the repo root via `../../vite.config.ts`).
- Will consume `@psyuml/model`, `@psyuml/validate`, `@psyuml/render`, `@psyuml/profiles` from M1.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A leaf app; nothing imports it. Built to `dist/web` (gitignored).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace member manifest (`web`) | — | workspace resolution | — | low |
| `index.html` | Vite entry; mounts `#root`, loads `main.tsx` | `main.tsx` | build | — | low |
| `main.tsx` | React bootstrap (mounts `App`) | react-dom, `App.tsx` | build | — | low |
| `App.tsx` | M0 shell UI (empty canvas) | react | — | REQ-EDITOR-MVP | low |

## Change checklist
- [ ] Keep the client layer plain/non-pathologizing; gate client exports on disclaimer + crisis fields (§L.2).
- [ ] When wiring `@psyuml/*`, update Upstream above and the dependency DAG in `sdd/README.md`.
- [ ] Ran `node sdd/check.mjs` (green).
