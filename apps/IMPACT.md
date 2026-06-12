# Impact — `apps/`

**Purpose:** deployable applications built on the `@psyuml/*` packages.
**Status:** active (M0)
**Spec anchor / REQ:** REQ-EDITOR-MVP

## Upstream (this depends on)
- `../packages/*` — apps consume the core libraries.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** Apps are leaves of the dependency DAG; nothing depends on them.

## Subdirectories
- `web/` — the GUI editor (see `apps/web/IMPACT.md`).

## Files
_None at this level._

## Change checklist
- [ ] New app ⇒ add `<app>/IMPACT.md` and a `pnpm-workspace.yaml` entry.
- [ ] Ran `node sdd/check.mjs` (green).
