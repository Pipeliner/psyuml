# Impact — `sdd/`

**Purpose:** the Spec-Driven Development harness — traceability registry, impact-doc
convention, templates, ADRs, and the checker that enforces them.
**Status:** active
**Spec anchor / REQ:** cross-cutting (governs how all REQs trace to the spec)

## Upstream (this depends on)
- `../docs/specification/psyuml-v0.1.0.md` — `traceability.json` requirements cite it as `source`.
- `../docs/ARCHITECTURE.md`, `../docs/ROADMAP.md` — the module DAG and milestones mirrored here.

## Downstream (depends on this) — blast radius
> **Blast radius: medium (process-wide).** Changing the checker's rules or the impact-doc
> convention affects every directory and the CI gate, but not product runtime behavior.
- `.github/workflows/ci.yml` (the `sdd` job) — runs `check.mjs` in CI.
- Every `IMPACT.md` in the repo — conforms to `templates/impact.md` and is validated by `check.mjs`.
- Contributors — follow the workflows in `README.md`.

## Subdirectories
- `templates/` — reusable doc templates (see `sdd/templates/IMPACT.md`).
- `adr/` — Architecture Decision Records (see `sdd/adr/IMPACT.md`).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `README.md` | Harness overview, SDD loop, dependency map, workflows | spec, ARCHITECTURE | contributors | cross-cutting | low |
| `traceability.json` | Spec ↔ REQ ↔ milestone ↔ impl/test registry | spec sections | `check.mjs`, future code/tests | all REQs | medium |
| `check.mjs` | Zero-dep checker: impact-doc coverage + traceability validation | `traceability.json`, all `IMPACT.md` | CI workflow | cross-cutting | medium |

## Change checklist
- [ ] If you change `check.mjs` rules, re-run it and fix any newly-failing `IMPACT.md`.
- [ ] If you change the impact-doc shape, update `templates/impact.md` and existing docs.
- [ ] Keep `traceability.json` milestones aligned with `docs/ROADMAP.md`.
- [ ] Ran `node sdd/check.mjs` (green).
