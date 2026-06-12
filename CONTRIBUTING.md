# Contributing to PsyUML

Thanks for helping build PsyUML. This repo is **spec-driven**: the specification
(`docs/specification/psyuml-v0.1.0.md`) is the source of truth, and an SDD harness
(`sdd/`) keeps code traceable to it and makes change-impact analysis cheap.

## Prerequisites
- Node ≥ 18 and **pnpm 10** (`corepack enable` will provide it).

## Setup & verify
```sh
pnpm install
pnpm run verify   # sdd:check + format:check + lint + typecheck + test + build
```
Individual steps: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`,
`pnpm run build`, `pnpm run format`, `pnpm run sdd:check`. Start the editor with
`pnpm run dev`.

## Repository layout
- `packages/*` — `@psyuml/*` libraries (`model` → `validate` → `profiles` → `render`).
- `apps/web` — the GUI editor.
- `assets/` — color tokens + the 8 core glyphs.
- `docs/` — spec, architecture, roadmap, research.
- `sdd/` — the Spec-Driven Development harness.

## The SDD discipline (enforced by CI)
1. **Trace it.** Behavior changes trace to a spec section and a `REQ-…` in
   `sdd/traceability.json`. Change the spec first (or in the same PR) per the §K
   semver rules; update the requirement's `status`/`impl`/`tests`.
2. **Document it.** Every directory has an `IMPACT.md` and every file is listed in
   its directory's `IMPACT.md`. New directory ⇒ copy `sdd/templates/impact.md`.
   New file ⇒ add a row. `node sdd/check.mjs` fails until you do.
3. **Check the blast radius.** Before changing a module, read its `IMPACT.md` and the
   reverse-dependency table in `sdd/README.md`; update downstream dependents.

## Design commitments (non-negotiable)
- Formulation-level, **not** diagnosis. No autonomous diagnosis; AI-assist is a bounded,
  human-in-the-loop draft tool.
- Accessibility: never encode meaning by color alone; keep glyphs hand-drawable;
  emit alt-text for every view.
- Ethics: client-facing diagrams carry a disclaimer + crisis resources; ritual ships a
  secular variant + honest framing. See the Ethical-Use Statement (spec §L.2).

## Commits & branches
- Work on the designated feature branch; keep commits focused with descriptive messages.
- Do not open a pull request unless explicitly asked.
