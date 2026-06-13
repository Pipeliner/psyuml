# Impact — `packages/ai/` (`@psyuml/ai`)

**Purpose:** the bounded narrative → *draft* model assist (M8) — the **guardrails**, not a
model. `assist(narrative, options, extractor?)` enforces consent → PII minimization →
safety-triage halt → low-confidence, human-review-only suggestions; the LLM step is a
pluggable `Extractor` (default no-op). Removing/ignoring this package leaves the editor
fully functional.
**Status:** active (M8 — guardrail pipeline; LLM extractor is a pluggable seam)
**Spec anchor / REQ:** REQ-AI-ASSIST (§A.3), REQ-SAFETY-TRIAGE, REQ-PRIVACY

## Upstream (this depends on)
- `@psyuml/model` (`parseModel`; node/edge wrapping), `@psyuml/validate` (`requiresHumanEscalation`), `@psyuml/privacy` (`redactText` PII minimization).
- `../../docs/ROADMAP.md` M8 (acceptance) and `../../docs/research/idea-incorporation.md` §3–5 (rejected: autonomous diagnosis, safeguard-bypass).

## Downstream (depends on this) — blast radius
> **Blast radius: low and isolated by design.** Nothing in the core editor imports it; it's
> an optional panel. The default extractor ships no model call.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace manifest (`@psyuml/ai`) | — | workspace resolution | — | low |
| `index.ts` | `assist` (consent/PII/triage/low-confidence pipeline) + `applySuggestions` (explicit accept) + `Extractor` seam + `noopExtractor` | model, validate, privacy | editor AI panel (future) | REQ-AI-ASSIST, REQ-SAFETY-TRIAGE, REQ-PRIVACY | low |
| `index.test.ts` | Guardrail tests: no-consent, PII-minimized-before-extract, triage halt (flag + narrative markers), low-confidence wrapping, never-auto-applied | `index.ts` | CI `test` | REQ-AI-ASSIST | low |

## Change checklist
- [ ] Out of scope stays out: no diagnosis/severity, no safeguard-bypass, no autonomous formulation, no live-care advice.
- [ ] Every suggestion stays low-confidence (`confidence:'L'`, `epistemicStatus:'inferred'`) and is never auto-applied.
- [ ] Safety triage must halt BEFORE the extractor runs; keep the markers coarse (route to a human, don't assess risk).
- [ ] Ran `node sdd/check.mjs` (green).
