# Impact — `apps/web/` (the GUI editor)

**Purpose:** the browser-based PsyUML editor. (M0: empty-canvas shell; M2: the drag-and-drop
editor over the 8-symbol Tier-1 core.)
**Status:** active (M2 — the editor is implemented: structured authoring, layers, links, snapshots/diff)
**Spec anchor / REQ:** REQ-EDITOR-MVP, REQ-DECISION-NAV, REQ-RESOURCE-ANCHOR

## Upstream (this depends on)
- `react`, `react-dom`, `vite` (built from the repo root via `../../vite.config.ts`).
- `@psyuml/model`, `@psyuml/render`, `@psyuml/validate`, `@psyuml/profiles`, `@psyuml/diff`, `@psyuml/grammar` (live render + lint + cross-school vocabulary + longitudinal compare + text-DSL view/edit; M2/M3/M4/M6/M9). Editor state logic is in `editor.ts`.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A leaf app; nothing imports it. Built to `dist/web` (gitignored).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace member manifest (`web`) | — | workspace resolution | — | low |
| `index.html` | Vite entry; mounts `#root`, loads `main.tsx`; a minimal pre-bundle baseline (WCAG 2.4.7 visible focus + page background); the full design system lives in `styles.css` (ADR-0013) | `main.tsx` | build | WCAG 2.4.7/2.5.8 | low |
| `main.tsx` | React bootstrap (mounts `App`; imports `styles.css`) | react-dom, `App.tsx`, `styles.css` | build | — | low |
| `styles.css` | **Hand-rolled, token-based design system (no UI framework; ADR-0013).** CSS custom properties — Okabe–Ito-grounded palette (shared with `@psyuml/render`), spacing/type scales, radii, shadows, focus ring — plus a **mobile-first + responsive** layout (no horizontal overflow at ~360px; richer multi-column at `min-width: 768/1024px`; ≥44px touch targets via `@media (pointer: coarse)`), `prefers-color-scheme: dark` (calm, AA), and `prefers-reduced-motion`. WCAG 2.2 AA contrast; colour stays redundant | `main.tsx` (import) | build | REQ-ACCESSIBILITY, REQ-UX-STORIES | low |
| `App.tsx` | Editor: live render (all 12 diagram types, **monochrome now passed to every renderer**, + **zoom/fit/pan view controls** + **drag-to-reposition** on hand-laid-out diagrams (genogram/relational field, via the renderer's `data-node-id` hook → `setNodePosition`)), surfaced **Title** field + intro/handbook link, layer/monochrome/**school** toggles, **acute-risk/psychosis flags**, **New (blank)** + **Open .psyuml** + Save/Export (filenames from the title) with **the block reason shown on disabled buttons**, **add-node form (kind + plain-language client label + stereotype datalist + provenance)**, node panel (rename / certainty / hide / remove + a **"more" disclosure: client label, stereotype, provenance**), **Links panel** (friendly connector names + a **⚑ trigger** option), **Diagram-details editor** (disclaimer/crisis), text alt, formulation-health panel + export gating, **clinical-escalation banner**, **Compare-with (diff)** + **version snapshots**, **Text (DSL) view/edit**. **Presentation now via semantic `className`s against `styles.css` (ADR-0013) — inline styles removed bar a few dynamic ones (zoom-driven canvas width); all aria-labels / roles / region + button names / `<summary>` texts preserved byte-identical. Editor opens in colour by default (`monochrome` initial `false`); Monochrome toggle kept as the print path.** | `@psyuml/model`, `@psyuml/render`, `@psyuml/validate`, `@psyuml/profiles`, `@psyuml/diff`, `@psyuml/grammar`, `editor.ts`, `styles.css`, `examples/*.psyuml` | — | REQ-EDITOR-MVP, REQ-UX-STORIES, REQ-ACCESSIBILITY, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-EPISTEMIC-STATUS, REQ-ETHICS-GUARDRAILS, REQ-NOTATION, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE, REQ-CROSS-SCHOOL, REQ-VERSIONING-DIFF, REQ-TEXT-DSL | medium |
| `editor.ts` | Pure editor-state helpers (`addNode` (kind/stereotype/**client label**/**provenance**/tier), `nextId`/`nextEdgeId`, `addEdge`/`removeEdge` (+**trigger**), `setNodeLabel`, `setNodeEpistemic`, `setNodeHidden`, **`setNodeStereotype`**, **`setNodeProvenance`**, **`setNodePosition`** (drag), `removeNode`, `setMeta`, `setSafetyFlag`, `snapshotModel`/`restoreVersion`) — testable in node | `@psyuml/model` | `App.tsx`, `editor.test.ts` | REQ-EDITOR-MVP, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-EPISTEMIC-STATUS, REQ-ETHICS-GUARDRAILS, REQ-NOTATION, REQ-CROSS-SCHOOL, REQ-SAFETY-TRIAGE, REQ-VERSIONING-DIFF | low |
| `editor.test.ts` | Unit tests for editor helpers | `editor.ts` | CI `test` | — | low |
| `vite-env.d.ts` | Vite client ambient types (enables `?raw` imports) | `vite/client` | typecheck | — | low |

## Change checklist
- [ ] Keep the client layer plain/non-pathologizing; gate client exports on disclaimer + crisis fields (§L.2).
- [ ] When wiring `@psyuml/*`, update Upstream above and the dependency DAG in `sdd/README.md`.
- [ ] Ran `node sdd/check.mjs` (green).
