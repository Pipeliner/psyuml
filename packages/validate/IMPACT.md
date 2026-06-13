# Impact — `packages/validate/` (`@psyuml/validate`)

**Purpose:** well-formedness, accessibility, path-of-hope, and clinical-hazard lint over
a model (M3 rule classes). Acts on the clinician's risk flags + cross-school provenance.
**Status:** active (M3 — rule classes landed; safety triage acts on `meta.safety`)
**Spec anchor / REQ:** REQ-WELLFORMEDNESS, REQ-ACCESSIBILITY, REQ-PATH-OF-HOPE,
REQ-SAFETY-TRIAGE, REQ-ETHICS-GUARDRAILS, REQ-CROSS-SCHOOL

## Upstream (this depends on)
- `@psyuml/model` (the graph it checks).
- `../../docs/specification/psyuml-v0.1.0.md` §A.2, §D, §L.2.

## Downstream (depends on this) — blast radius
> **Blast radius: medium-high.** `profiles` add view-specific validators on top; `apps/web`
> surfaces lint live; CI lints the `examples/` corpus.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/validate`) | — | workspace resolution | — | low |
| `index.ts` | `validate(model,{layer})` — well-formedness + path-of-hope + crisis no-dead-ends/resources + client disclaimer gate + a11y label-length + **safety triage** (acute-risk/psychosis escalation, ritual-under-psychosis contraindication) + **mixed-school provenance** awareness; exports `requiresHumanEscalation` (the AI/UI halt gate) | `@psyuml/model` | apps/web, ai (M8) | §A.2, §D, §G.2, §L.2 / REQ-WELLFORMEDNESS, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE, REQ-ETHICS-GUARDRAILS, REQ-CROSS-SCHOOL, REQ-ACCESSIBILITY | medium |
| `index.test.ts` | Unit tests + **examples-corpus lint** (every `examples/*.psyuml` must validate clean in both layers — a bad example fails CI) | `index.ts`, `examples/*.psyuml` | CI `test` | REQ-CONFORMANCE | low |

## Change checklist
- [ ] New rule ⇒ trace it to a spec section + `REQ-…`; set severity + layer scope.
- [ ] Keep the "path of hope" + hazard rules consistent with the Ethical-Use Statement (§L.2).
- [ ] Ran `node sdd/check.mjs` (green).
