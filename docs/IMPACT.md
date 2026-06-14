# Impact — `docs/`

**Purpose:** the human-facing knowledge base — the language specification (source of
truth), the tooling architecture, the build roadmap, and saved research.
**Status:** active
**Spec anchor / REQ:** all (this directory *contains* the spec)

## Upstream (this depends on)
> Nothing in code. `ARCHITECTURE.md` and `ROADMAP.md` are derived from, and must stay
> consistent with, `specification/psyuml-v0.1.0.md`.

## Downstream (depends on this) — blast radius
> **Blast radius: high (conceptual).** The spec governs every `REQ-…` and therefore all
> code. A change to a spec section ripples to every requirement that cites it.
- `sdd/traceability.json` — requirements cite spec sections here.
- All `packages/*` and `apps/web` — implement what the spec defines.
- Per-directory `IMPACT.md` files — reference spec sections.

## Subdirectories
- `specification/` — the normative spec (see `docs/specification/IMPACT.md`).
- `research/` — companion source material + the idea-incorporation record.
- `ux/` — UX research synthesis + per-persona user stories & requirements (see `docs/ux/IMPACT.md`).

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `ARCHITECTURE.md` | Tooling design: one-model/many-views, metamodel, pipeline, stack, repo layout | `specification/psyuml-v0.1.0.md` | `ROADMAP.md`, all packages, `sdd/README.md` dependency map | all | medium |
| `ROADMAP.md` | Milestone plan M0–M10 (GUI-first), spec-traceable | `ARCHITECTURE.md`, spec | `sdd/traceability.json` milestones | all | medium |
| `format-reference.md` | Field-level `.psyuml` reference (mirrors the zod schema) + per-diagram authoring quick-guide + the validation rules an author must satisfy | `packages/model`, `packages/validate`, spec | authors, readers | REQ-CORE-ONTOLOGY, REQ-STYLE-GUIDE, REQ-TEXT-DSL | low |
| `cheatsheets.md` | One-page clinician + client quick references (the 8 glyphs, connectors, which diagram for which job, the safety gates; plain-language "reading the map") | spec §B/§E/§L.2, `packages/render`, `packages/validate` | clinicians, clients | REQ-STYLE-GUIDE | low |
| `style-guide.md` | Visual notation style guide — glyph forms, colour/line-weight semantics (colour redundant), epistemic/consolidation/valence encoding, layout, ritual cultural-sensitivity, cross-school | spec §B–§D/§F/§L.2, `packages/render` | clinicians, contributors | REQ-STYLE-GUIDE | low |
| `evaluation-suite.md` | The v0.x→v1.0 evidence plan — Tier A (automated, enforced now) vs. Tier B (human studies) per §J/Source-3 dimension + the Stage-4 go/no-go gate | spec §J, `conformance/`, `packages/validate`, `packages/privacy` | maintainers, reviewers | REQ-EVAL-SUITE | low |
| `evaluation-suite-pilot.md` | A **simulated** (LLM role-play) dry-run of the Tier-B instruments — comprehension/inter-rater/multi-school — explicitly **not evidence**; surfaced the cross-school overclaim + DSL learnability gap (both fixed) | `evaluation-suite.md`, `docs/cheatsheets.md`, `examples/*` | maintainers | REQ-EVAL-SUITE | low |

## Change checklist
- [ ] If you change behavior, update `specification/psyuml-v0.1.0.md` first (§K semver).
- [ ] Re-sync `ARCHITECTURE.md` ↔ `ROADMAP.md` ↔ `sdd/traceability.json`.
- [ ] Ran `node sdd/check.mjs` (green).
