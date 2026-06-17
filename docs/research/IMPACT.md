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
| `v0.2-research-synthesis.md` | Deep-research synthesis (5 angles, cited + adversarially verified) for the **v0.2** evolution: collaborative-formulation centre, CAT SDR, modality archetypes, notation science + ISO-9186 comprehension testing, ethics/FHIR, honest evidence base; incl. an evidence-and-notation matrix + verdicts on the prior synthesis | external syntheses, web sources | `specification/psyuml-v0.2.0.md`, ADR-0014 | §A/§E/§J/§L | low (archival) |
| `diagram-catalog.md` | **The 40+ formulation-diagram catalog** for the help-site example library — a second cited deep-research pass (~25 agents across CBT / CAT-psychodynamic-TA / third-wave-somatic / systemic-narrative / frameworks). 59 diagrams mapped to PsyUML families/renderers (✅ existing / ◐ approx / ◇ new-type) + per-item honest evidence notes, cross-cutting findings (therapy-evidence ≠ diagram-evidence; alliance dominates; sharing can harm; contested theories; attribution corrections), and an explicit "worksheets are NOT diagrams" exclusion list. Drives the help-site examples (apps/web) | external web sources, the v0.2 renderers/families | `apps/web` help site + example library, ROADMAP | §E (diagram types), §J/§L (evidence/ethics) | low (archival) |

## Change checklist
- [ ] Keep the adopt/reject decisions consistent with the spec's Ethical-Use Statement (§L.2).
- [ ] If an adopted idea changes status, update the citing `REQ-…` in `traceability.json`.
- [ ] When adding a saved source, add a Files row here (the checker fails otherwise) and an `idea-incorporation.md` section.
- [ ] Ran `node sdd/check.mjs` (green).
