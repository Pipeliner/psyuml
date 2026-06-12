# Impact — `sdd/adr/`

**Purpose:** Architecture Decision Records — the durable log of *why* significant
choices were made.
**Status:** active
**Spec anchor / REQ:** cross-cutting

## Upstream (this depends on)
- `../templates/adr.md` — the format ADRs follow.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** ADRs are a historical record; superseding one is additive (write
> a new ADR that supersedes it). They inform, but do not execute.
- Contributors and future ADRs (which may supersede earlier ones).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `0001-adopt-spec-driven-development.md` | Records adopting the SDD harness + enforced impact docs | `../templates/adr.md` | the whole `sdd/` harness rationale | cross-cutting | low (append-only) |

## Change checklist
- [ ] Don't rewrite history — supersede with a new ADR and mark the old one `superseded`.
- [ ] Number new ADRs sequentially (`NNNN-short-title.md`).
- [ ] Ran `node sdd/check.mjs` (green).
