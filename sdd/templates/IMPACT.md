# Impact — `sdd/templates/`

**Purpose:** reusable templates that keep impact docs, ADRs, and feature specs
consistent across the repo.
**Status:** active
**Spec anchor / REQ:** cross-cutting

## Upstream (this depends on)
> None. Templates are leaf scaffolding.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** Templates seed new documents; changing one affects the shape of
> *future* docs (and, for `impact.md`, what `check.mjs` expects authors to fill in).
- New `IMPACT.md` files (from `impact.md`).
- New ADRs in `../adr/` (from `adr.md`).
- Feature specs (from `feature-spec.md`).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `impact.md` | Template for per-directory `IMPACT.md` impact docs | — | every directory's `IMPACT.md` | cross-cutting | low |
| `adr.md` | Template for Architecture Decision Records | — | `../adr/*.md` | cross-cutting | low |
| `feature-spec.md` | Template for spec-traceable feature specs | — | feature specs | cross-cutting | low |

## Change checklist
- [ ] If `impact.md` changes, ensure it still satisfies `check.mjs` (file-mention coverage).
- [ ] Ran `node sdd/check.mjs` (green).
