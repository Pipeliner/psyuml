# Impact — `docs/research/`

**Purpose:** saved source material and the record of how it was synthesized — the
companion UPML/Fable research paper, and the adopt/adapt/reject analysis that feeds the
plan.
**Status:** active (reference)
**Spec anchor / REQ:** REQ-PATH-OF-HOPE, REQ-RESEARCH-PROFILES, REQ-VERSIONING-DIFF, REQ-AI-ASSIST

## Upstream (this depends on)
- `../specification/psyuml-v0.1.0.md` — `idea-incorporation.md` maps ideas onto spec sections and defers to the spec's ethics where they conflict.

## Downstream (depends on this) — blast radius
> **Blast radius: medium.** `idea-incorporation.md` is cited as the `source` for several
> requirements; the rejected items (safeguard-bypass, autonomous diagnosis) are binding
> scope boundaries.
- `sdd/traceability.json` — REQ-PATH-OF-HOPE / REQ-RESEARCH-PROFILES / REQ-VERSIONING-DIFF / REQ-AI-ASSIST cite `idea-incorporation.md`.
- `docs/ROADMAP.md` (M5, M6, M8) and `docs/ARCHITECTURE.md` — incorporate its adopted ideas.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `upml-fable-agent-architecture.ru.md` | Companion research paper (RU), saved verbatim for reference | — | `idea-incorporation.md` | — | low (archival) |
| `idea-incorporation.md` | What ideas are adopted / adapted / **rejected** from the paper, and why | `upml-fable-agent-architecture.ru.md`, spec §L.2 | roadmap M5/M6/M8, several REQs | §G, §K, §L.2 | medium |

## Change checklist
- [ ] Keep the adopt/reject decisions consistent with the spec's Ethical-Use Statement (§L.2).
- [ ] If an adopted idea changes status, update the citing `REQ-…` in `traceability.json`.
- [ ] Ran `node sdd/check.mjs` (green).
