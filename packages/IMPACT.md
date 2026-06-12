# Impact — `packages/`

**Purpose:** the reusable, UI-agnostic libraries that make up PsyUML's core
(`@psyuml/*`). Each subdirectory is its own package and impact unit.
**Status:** active (M0 skeletons)
**Spec anchor / REQ:** REQ-CORE-ONTOLOGY, REQ-NOTATION, REQ-WELLFORMEDNESS, REQ-CROSS-SCHOOL

## Upstream (this depends on)
- `../docs/specification/psyuml-v0.1.0.md` — the packages implement the spec.

## Downstream (depends on this) — blast radius
> **Blast radius: high.** These packages are consumed by `apps/web` and each other per
> the dependency DAG in `sdd/README.md`. `model` is the highest-fan-in module.

## Subdirectories
- `model/` · `validate/` · `render/` · `profiles/` — each has its own `IMPACT.md`.
  (`grammar/`, `interop/`, `ai/` are planned for later milestones — see `docs/ROADMAP.md`.)

## Files
_None at this level; all content lives in the package subdirectories._

## Change checklist
- [ ] New package ⇒ add `<pkg>/IMPACT.md` and a workspace entry (`pnpm-workspace.yaml`).
- [ ] Update the dependency DAG + blast-radius table in `sdd/README.md` if deps change.
- [ ] Ran `node sdd/check.mjs` (green).
