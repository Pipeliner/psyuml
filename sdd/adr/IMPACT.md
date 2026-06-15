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
| `0009-extension-mechanism-validated-profiles.md` | Records implementing §K as a typed, validated profile registry in `@psyuml/profiles` (`ExtensionProfile`/`validateProfile`, the four rules + Tier-1 freeze + glyph-collision), the `lint-profile` CLI, and conformance invariants | `../templates/adr.md`, `../../packages/profiles/index.ts` | REQ-EXTENSION-MECH | §K, §B, §C | low (append-only) |
| `0010-scalable-cycle-aware-layout.md` | Records the cycle-aware longest-path layering for the Decision/Navigation chart (DFS back-edge break so a looping crisis plan doesn't collapse onto one row) + content-fit viewBox that grows to the widest layer + parallel-edge fan-out in the State Map + rendering the disclaimer into the decision-chart SVG | `../templates/adr.md`, `../../packages/render/index.ts` | REQ-DECISION-NAV, REQ-NOTATION, REQ-ACCESSIBILITY | §E.1, §E.8, §D | low (append-only) |
| `0011-eval-round-2-label-legibility-and-guards.md` | Records the second eval round's fixes — wrapping decision-chart node labels, haloing state-map parallel-edge labels, rendering the Parts Map containment label, generalizing "never silently drop" to edges (`render.edge-not-shown`), and the editor unsaved-changes confirm + Open selector sync | `../templates/adr.md`, `../../packages/render/index.ts`, `../../apps/web/App.tsx` | REQ-ACCESSIBILITY, REQ-NOTATION, REQ-DECISION-NAV, REQ-EDITOR-MVP | §D, §E | low (append-only) |
| `0012-guaranteed-non-overlap-layout.md` | Records the systematic non-overlap layout: a shared geometry layer (`layout.ts` — one `textWidth`, AABB `overlaps`/`union`, and the `separate1D` VPSC / Fast-Node-Overlap-Removal core), structure-aware placement + the scaling guarantee (grow canvas / content-fit so `separate1D` spreading never clips), `data-el` element tagging, and the machine-checked `overlap.test.ts` invariant over the corpus + 3 stress models. Scopes the guarantee under the shared text-metric (node↔node / label↔non-owner-node / in-frame universal; label↔label enforced for ten of twelve renderers, a documented known-gap for parts-map + process-loop whose free curve/chord labels collide; edge line/path crossings out of scope) | `../templates/adr.md`, `../../packages/render/index.ts`, `../../packages/render/layout.ts` | REQ-ACCESSIBILITY, REQ-NOTATION, REQ-CONFORMANCE | §D, §J | low (append-only) |
| `0013-editor-design-system-responsive.md` | Records the editor's hand-rolled, token-based design system (new `../../apps/web/styles.css` — CSS custom properties for an Okabe–Ito-grounded palette, spacing/type scales, radii, shadows, focus ring), the mobile-first + responsive layout (no horizontal overflow at ~360px; richer multi-column at `min-width` breakpoints; ≥44px touch targets via `pointer: coarse`), colour-by-default in the editor (initial `monochrome` → `false`, toggle kept, renderer's monochrome-by-default library default untouched), the no-UI-framework / no-new-dependency stance, and the WCAG 2.2 AA + colour-redundant posture; `App.tsx` moved from inline styles to semantic `className`s with all a11y/semantic hooks preserved byte-identical | `../templates/adr.md`, `../../apps/web/styles.css`, `../../apps/web/App.tsx` | REQ-UX-STORIES, REQ-ACCESSIBILITY, REQ-EDITOR-MVP | §D | low (append-only) |

| `0014-v0.2-collaborative-formulation-evolution.md` | Records the **v0.2** evolution (backward-compatible): collaborative-formulation centre + honesty clause, 8 diagram families × 3 audience profiles, CAT Pattern semantics (ontology-neutral), comprehension-testing gate (ISO 9186), lossy FHIR export, sharpened ethics; M11 ships the families/profiles registry | `../templates/adr.md`, `../../docs/specification/psyuml-v0.2.0.md`, `../../docs/research/v0.2-research-synthesis.md`, `../../packages/profiles/index.ts` | REQ-DIAGRAM-FAMILIES, REQ-AUDIENCE-PROFILES, REQ-NOTATION-TESTING, REQ-INTEROP-FHIR | v0.2 §0–§10 | low (append-only) |

## Change checklist
- [ ] Don't rewrite history — supersede with a new ADR and mark the old one `superseded`.
- [ ] Number new ADRs sequentially (`NNNN-short-title.md`).
- [ ] Ran `node sdd/check.mjs` (green).
