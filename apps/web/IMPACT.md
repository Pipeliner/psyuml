# Impact — `apps/web/` (the GUI editor)

**Purpose:** the browser-based PsyUML editor. (M0: empty-canvas shell; M2: the drag-and-drop
editor over the 8-symbol Tier-1 core.)
**Status:** active (M0 shell)
**Spec anchor / REQ:** REQ-EDITOR-MVP, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR

## Upstream (this depends on)
- `react`, `react-dom`, `vite` (built from the repo root via `../../vite.config.ts`).
- `@psyuml/model`, `@psyuml/render`, `@psyuml/validate`, `@psyuml/profiles` (live render + lint + cross-school vocabulary; M2/M3/M4). Editor state logic is in `editor.ts`.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A leaf app; nothing imports it. Built to `dist/web` (gitignored).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace member manifest (`web`) | — | workspace resolution | — | low |
| `index.html` | Vite entry; mounts `#root`, loads `main.tsx`; WCAG focus + target-size styles | `main.tsx` | build | WCAG 2.4.7/2.5.8 | low |
| `main.tsx` | React bootstrap (mounts `App`) | react-dom, `App.tsx` | build | — | low |
| `App.tsx` | Editor: live render (all 9 diagrams), layer/monochrome/**school** toggles, palette, node panel (rename/hide), text alt, formulation-health panel + export gating, save/export | `@psyuml/model`, `@psyuml/render`, `@psyuml/validate`, `@psyuml/profiles`, `editor.ts`, `examples/*.psyuml` | — | REQ-EDITOR-MVP, REQ-UX-STORIES, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-PATH-OF-HOPE, REQ-CROSS-SCHOOL | medium |
| `editor.ts` | Pure editor-state helpers (`addNode`, `nextId`, `setNodeLabel`, `setNodeHidden`) — testable in node | `@psyuml/model` | `App.tsx`, `editor.test.ts` | REQ-EDITOR-MVP, REQ-COLLAB, REQ-CLIENT-SAFETY-UX | low |
| `editor.test.ts` | Unit tests for editor helpers | `editor.ts` | CI `test` | — | low |
| `vite-env.d.ts` | Vite client ambient types (enables `?raw` imports) | `vite/client` | typecheck | — | low |

## Change checklist
- [ ] Keep the client layer plain/non-pathologizing; gate client exports on disclaimer + crisis fields (§L.2).
- [ ] When wiring `@psyuml/*`, update Upstream above and the dependency DAG in `sdd/README.md`.
- [ ] Ran `node sdd/check.mjs` (green).
