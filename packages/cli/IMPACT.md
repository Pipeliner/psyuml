# Impact — `packages/cli/` (`@psyuml/cli`)

**Purpose:** the headless `psyuml lint | render | convert` CLI (M9). Pure `run(argv, io)`
logic (unit-tested) + a Node `bin.ts` that `scripts/build-cli.mjs` bundles to a runnable
script. Lets validation gate CI / pre-commit the same way the editor gates export.
**Status:** active (M9 — lint/render/convert; reuses the libraries)
**Spec anchor / REQ:** REQ-TEXT-DSL (CLI), REQ-WELLFORMEDNESS, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE, REQ-ACCESSIBILITY

## Upstream (this depends on)
- `@psyuml/model` (parse/serialize), `@psyuml/validate` (lint), `@psyuml/render` (render), `@psyuml/grammar` (DSL convert), `@psyuml/privacy` (redact).
- `../../scripts/build-cli.mjs` bundles `bin.ts` (esbuild, already in the toolchain) → `dist/cli/psyuml.mjs`.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A leaf tool; nothing imports it. The bundle is a dev/CI artifact
> (`dist/` is gitignored). `run` is filesystem-injected so it is testable without a build.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace manifest (`@psyuml/cli`) | — | workspace resolution | — | low |
| `index.ts` | `run(argv, io)` — `lint` (validate, exit≠0 on error), `render` (→SVG), `convert` (JSON⇄DSL), `redact` (de-identify), `template` (blank printable scaffold); auto-detects JSON vs DSL input | model, validate, render, grammar, privacy | bin.ts, tests | §J, §B/§C, §D / REQ-TEXT-DSL, REQ-PRIVACY, REQ-TEMPLATES | low |
| `bin.ts` | Node wiring (fs + process streams) → `run`; bundled to `dist/cli/psyuml.mjs` | `index.ts`, `node:fs` | the built binary | — | low |
| `index.test.ts` | Unit tests over `run` with a fake IO (clean/error lint, render, convert both ways, help/version) | `index.ts`, `examples/*.psyuml` | CI `test` | REQ-TEXT-DSL | low |

## Change checklist
- [ ] New diagram type ⇒ add it to the `RENDERERS` map here (mirrors `conformance/`).
- [ ] Keep `run` pure (all I/O via `CliIO`) so it stays testable without the bundle.
- [ ] `pnpm build:cli` then `node dist/cli/psyuml.mjs lint examples/*.psyuml` to smoke-test.
- [ ] Ran `node sdd/check.mjs` (green).
