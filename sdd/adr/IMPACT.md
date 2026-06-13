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

## Change checklist
- [ ] Don't rewrite history — supersede with a new ADR and mark the old one `superseded`.
- [ ] Number new ADRs sequentially (`NNNN-short-title.md`).
- [ ] Ran `node sdd/check.mjs` (green).
