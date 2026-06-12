# Impact — `/` (repository root)

**Purpose:** project entry point and top-level configuration for the PsyUML
spec + tooling repo.
**Status:** active (docs/plan phase; no application code yet)
**Spec anchor / REQ:** project-wide

## Upstream (this depends on)
> Nothing in-repo. Root files are leaf configuration/landing docs.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** These are entry points; changing them affects readers and
> tooling setup, not runtime behavior.
- New contributors / readers — `README.md` is the front door.
- Git tooling — `.gitignore` governs what gets tracked across all future packages.

## Subdirectories
- `docs/` — specification, architecture, roadmap, research (see `docs/IMPACT.md`).
- `sdd/` — Spec-Driven Development harness (see `sdd/IMPACT.md`).
- `.github/` — CI workflows (untracked by the SDD checker, dot-directory).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `README.md` | Project intro, status, doc map, design commitments | — | readers | project-wide | low |
| `.gitignore` | Ignore build/vendor/secret artifacts | — | all future packages | — | low |

## Change checklist
- [ ] If adding a top-level dir, give it an `IMPACT.md` (copy `sdd/templates/impact.md`).
- [ ] Keep `README.md`'s doc map in sync with `docs/` and `sdd/`.
- [ ] Ran `node sdd/check.mjs` (green).
