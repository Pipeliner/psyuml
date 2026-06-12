# Impact — `docs/research/`

**Purpose:** saved source material and the record of how it was synthesized — two
companion research papers (UPML/Fable, RU; and the PsyML Fable-agent spec) plus the
adopt/adapt/reject analysis that feeds the plan.
**Status:** active (reference)
**Spec anchor / REQ:** REQ-PATH-OF-HOPE, REQ-RESEARCH-PROFILES, REQ-VERSIONING-DIFF, REQ-AI-ASSIST, REQ-EPISTEMIC-STATUS, REQ-SAFETY-TRIAGE, REQ-BODY-MAP, REQ-I18N, REQ-PRIVACY, REQ-INTEROP-FHIR, REQ-EVAL-SUITE, REQ-STYLE-GUIDE, REQ-TEMPLATES, REQ-CASE-CORPUS, REQ-HANDBOOK, REQ-ADOPTION

## Upstream (this depends on)
- `../specification/psyuml-v0.1.0.md` — `idea-incorporation.md` maps ideas onto spec sections and defers to the spec's ethics where they conflict.

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `idea-incorporation.md` and `psyml-fable-agent-spec.md` are cited
> as the `source` for many requirements; the rejected items (safeguard-bypass, autonomous
> diagnosis) are binding scope boundaries.
- `sdd/traceability.json` — REQ-PATH-OF-HOPE / REQ-RESEARCH-PROFILES / REQ-VERSIONING-DIFF / REQ-AI-ASSIST cite `idea-incorporation.md`; REQ-EPISTEMIC-STATUS / REQ-SAFETY-TRIAGE / REQ-BODY-MAP / REQ-I18N / REQ-PRIVACY / REQ-INTEROP-FHIR / REQ-EVAL-SUITE cite `psyml-fable-agent-spec.md`.
- `docs/ROADMAP.md` (M1, M3, M5, M6, M8, M9, M10) and `docs/ARCHITECTURE.md` (esp. §13) — incorporate the adopted ideas.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `upml-fable-agent-architecture.ru.md` | Companion research paper 1 (RU), saved verbatim | — | `idea-incorporation.md` | — | low (archival) |
| `psyml-fable-agent-spec.md` | Companion research paper 2 (PsyML), saved verbatim | — | `idea-incorporation.md` | — | low (archival) |
| `idea-incorporation.md` | What ideas are adopted / adapted / **rejected** from both papers, and why | both papers, spec §L.2 | roadmap M1/M3/M5/M6/M8/M9/M10, many REQs | §G, §K, §L.2 | medium |

## Change checklist
- [ ] Keep the adopt/reject decisions consistent with the spec's Ethical-Use Statement (§L.2).
- [ ] If an adopted idea changes status, update the citing `REQ-…` in `traceability.json`.
- [ ] When adding a saved source, add a Files row here (the checker fails otherwise) and an `idea-incorporation.md` section.
- [ ] Ran `node sdd/check.mjs` (green).
