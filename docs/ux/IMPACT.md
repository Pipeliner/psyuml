# Impact — `docs/ux/`

**Purpose:** the UX research synthesis and the per-persona user stories + cross-cutting
requirements that drive the editor (M2) and the product's UX, accessibility, crisis, privacy,
and AI guardrails.
**Status:** active (requirements authored; implementation lands in M2+)
**Spec anchor / REQ:** REQ-UX-STORIES, REQ-EDITOR-MVP, REQ-DECISION-NAV, REQ-ACCESSIBILITY, REQ-PRIVACY, REQ-SAFETY-TRIAGE, REQ-AI-ASSIST

## Upstream (this depends on)
- `../specification/psyuml-v0.1.0.md` (Audience guide, §D, §E.8, §L.2) — the UX requirements operationalize these.
- External research (cited inline) — verified against primary sources at synthesis time.

## Downstream (depends on this) — blast radius
> **Blast radius: high (for the editor).** The M2 editor, the crisis chart, the privacy/AI/ritual
> guardrails, and the eval suite are specified against these user stories + MoSCoW requirements.
- `apps/web` (the editor) — must satisfy the MUST/SHOULD requirements (UX-M1…M8, S1…S6).
- `sdd/traceability.json` — REQ-UX-STORIES cites this file; several REQs trace acceptance criteria here.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `ux-research-and-requirements.md` | Cited UX research → per-persona user stories + acceptance criteria + MoSCoW requirements + risks + open questions | spec, external research | `apps/web`, traceability | Audience guide, §D, §E.8, §L.2 / REQ-UX-STORIES | medium |

## Change checklist
- [ ] Keep user stories consistent with the spec's Ethical-Use Statement (§L.2) and accessibility (§D).
- [ ] When the editor implements a story, update its acceptance criteria status and the citing `REQ-…`.
- [ ] Preserve evidence tiers ([E]/[S]/[G]/[H]) — do not upgrade heuristics to empirical claims.
- [ ] Ran `node sdd/check.mjs` (green).
