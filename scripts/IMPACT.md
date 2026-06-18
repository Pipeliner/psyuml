# Impact — `scripts/`

**Purpose:** repo build/automation scripts that aren't part of the published packages.
**Status:** active
**Spec anchor / REQ:** project-wide (tooling)

## Upstream (this depends on)
- `esbuild` (present in the toolchain via Vite) and the `@psyuml/cli` source it bundles.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** Dev/CI tooling. `build-cli.mjs`/`gen-icons.mjs` are run on demand and
> produce gitignored/committed artifacts; **`build-docs.mjs` runs as the first step of `dev` and
> `build`** (so it is exercised by `pnpm run verify` via `build`, and by `apps/web/links.test.ts`).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `build-cli.mjs` | Bundle `packages/cli/bin.ts` → `dist/cli/psyuml.mjs` (a runnable Node script) via esbuild | `@psyuml/cli`, esbuild | `pnpm build:cli` | REQ-TEXT-DSL | low |
| `gen-icons.mjs` | Generate the editor's favicons + PWA icons + OG image from one on-brand SVG mark, rasterized via Playwright/chromium (no native image deps) → `apps/web/public/` | `@playwright/test` (chromium) | `apps/web/public/*` | REQ-UX-STORIES | low |
| `build-docs.mjs` | Render selected repo docs (`docs/handbook.md`, `docs/research/diagram-catalog.md`) → standalone **HTML** pages in `apps/web/public/` (so the static site serves them rendered, not raw markdown). Runs first in `dev`/`build`; exports `DOCS` + `renderDoc` for `apps/web/links.test.ts` | `marked`, `docs/*.md` | `apps/web/public/*.html`, `App.tsx` doc links | REQ-HANDBOOK, REQ-EXAMPLE-LIBRARY | low |

## Change checklist
- [ ] Keep CLI/icon scripts out of `verify` (CLI logic is covered by `packages/cli` unit tests); `build-docs.mjs` is intentionally wired into `build`.
- [ ] To publish another doc, add it to `DOCS` in `build-docs.mjs`, link it base-aware in the app, and ignore the output (`.gitignore`/`.prettierignore`, `apps/web/public/*.html`).
- [ ] Ran `node sdd/check.mjs` (green).
