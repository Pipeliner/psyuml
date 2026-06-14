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
| `0002-incorporate-psyml-source3.md` | Records adopting Source-3 (PsyML) ideas; keeps PsyUML notation as source of truth | `../templates/adr.md`, `../../docs/research/psyml-fable-agent-spec.md` | REQ-EPISTEMIC-STATUS, REQ-SAFETY-TRIAGE, REQ-BODY-MAP, REQ-I18N, REQ-PRIVACY, REQ-INTEROP-FHIR, REQ-EVAL-SUITE | §B, §J, §K, §L.2 | low (append-only) |
| `0003-adopt-ux-research-as-binding.md` | Records treating the UX research findings as binding requirements for the editor | `../templates/adr.md`, `../../docs/ux/ux-research-and-requirements.md` | REQ-UX-STORIES, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-EDITOR-MVP, REQ-ACCESSIBILITY, REQ-DECISION-NAV | §D, §E.8, §L.2 | low (append-only) |
| `0004-bulk-coverage-for-generated-files.md` | Records the `sdd:cover` glob directive (generated/fixture files documented in bulk) | `../templates/adr.md`, `../check.mjs` | `sdd/check.mjs`, `examples/IMPACT.md` | cross-cutting | low (append-only) |
| `0005-client-facing-diagram-classification.md` | Records which diagram types are client-facing (disclaimer-gated) — adds `process-loop`, excludes `two-triangles`; + in-UI diagram-details editing | `../templates/adr.md`, `../../packages/validate/index.ts` | REQ-ETHICS-GUARDRAILS, REQ-PATH-OF-HOPE | §A.2-r7, §L.2 | low (append-only) |
| `0006-rendering-robustness-fit.md` | Records content-fit viewBoxes + `fitText` fit-to-box labels (no clipping / overflow on screen or export) found by the build-a-diagram agent test | `../templates/adr.md`, `../../packages/render/index.ts` | REQ-ACCESSIBILITY, REQ-NOTATION | §D | low (append-only) |
| `0007-cross-school-provenance-contested-origins.md` | Records the shared `schoolClaims` reader (bare + `school:` tags), validate firing on real data, and the Parts Map contested-origin marker (`⚖ A vs B`) + alt-text — making §G.2's "preserve disagreement" real | `../templates/adr.md`, `../../packages/model/index.ts` | REQ-CROSS-SCHOOL, REQ-ACCESSIBILITY | §G.2 | low (append-only) |
| `0008-region-neutral-crisis-resources.md` | Records keeping crisis defaults region-neutral (no baked-in per-country numbers) + the `safety.crisis-localize` nudge for a concrete local contact under acute risk | `../templates/adr.md`, `../../packages/validate/index.ts` | REQ-SAFETY-TRIAGE, REQ-DECISION-NAV | §A.2-r7, §L.2 | low (append-only) |

## Change checklist
- [ ] Don't rewrite history — supersede with a new ADR and mark the old one `superseded`.
- [ ] Number new ADRs sequentially (`NNNN-short-title.md`).
- [ ] Ran `node sdd/check.mjs` (green).
