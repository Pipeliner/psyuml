# Impact — `/` (repository root)

**Purpose:** project entry point, monorepo configuration, and top-level docs for the
PsyUML spec + tooling repo.
**Status:** active (M0 scaffold landed)
**Spec anchor / REQ:** project-wide

## Upstream (this depends on)
> Nothing in-repo. Root files are leaf configuration/landing docs and toolchain config.

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** The toolchain config (tsconfig, eslint, vite, vitest, pnpm
> workspace) governs how every package builds, lints, types, and tests. The landing docs
> affect readers, not runtime.

## Subdirectories
- `packages/` — `@psyuml/*` libraries (see `packages/IMPACT.md`).
- `apps/` — deployable apps; `apps/web` is the editor (see `apps/IMPACT.md`).
- `assets/` — color tokens + the 8 core glyphs (see `assets/IMPACT.md`).
- `examples/` — canonical `.psyuml` models + golden renders (see `examples/IMPACT.md`).
- `docs/` — spec, architecture, roadmap, research (see `docs/IMPACT.md`).
- `conformance/` — executable spec-conformance suite (§J; see `conformance/IMPACT.md`).
- `scripts/` — build/automation scripts (CLI bundler; see `scripts/IMPACT.md`).
- `sdd/` — Spec-Driven Development harness (see `sdd/IMPACT.md`).
- `.github/` — CI workflow `ci.yml` (untracked by the SDD checker, dot-directory).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `README.md` | Project intro, status, doc map, design commitments | — | readers | project-wide | low |
| `CONTRIBUTING.md` | Dev setup + the SDD discipline | `sdd/README.md` | contributors | — | low |
| `LICENSE` | Placeholder — license pending owner selection | — | readers | — | low |
| `package.json` | Root manifest: scripts (`verify`, etc.) + shared devDeps | — | all packages/app | — | medium |
| `pnpm-workspace.yaml` | Workspace membership (`packages/*`, `apps/*`) | — | pnpm resolution | — | low |
| `pnpm-lock.yaml` | Locked dependency graph (generated; CI uses `--frozen-lockfile`) | `package.json` | CI install | — | low |
| `.npmrc` | `node-linker=hoisted` (flat node_modules) | — | pnpm install | — | low |
| `tsconfig.json` | Single typecheck config across packages + app | — | `typecheck` | — | medium |
| `vite.config.ts` | Builds `apps/web` from the repo root | — | `build`, `dev` | — | low |
| `vitest.config.ts` | Test discovery (`packages/**`, `apps/**`) | — | `test` | — | low |
| `eslint.config.js` | Flat ESLint config (typescript-eslint) | — | `lint` | — | low |
| `.prettierrc.json` | Prettier style (single quotes, width 100) | — | `format` | — | low |
| `.prettierignore` | Excludes docs/sdd/assets/md from formatting | — | `format` | — | low |
| `.gitignore` | Ignore build/vendor/secret artifacts | — | all packages | — | low |

## Change checklist
- [ ] New top-level dir ⇒ give it an `IMPACT.md` (copy `sdd/templates/impact.md`).
- [ ] Keep `README.md`'s doc map and `pnpm-workspace.yaml` in sync with the tree.
- [ ] Toolchain change ⇒ run `pnpm run verify` and confirm CI (`.github/workflows/ci.yml`).
- [ ] Ran `node sdd/check.mjs` (green).
