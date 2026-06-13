# Impact — `packages/validate/` (`@psyuml/validate`)

**Purpose:** well-formedness, accessibility, path-of-hope, and clinical-hazard lint over
a model. (M0: skeleton; M3: the four rule classes.)
**Status:** active (M0 skeleton)
**Spec anchor / REQ:** REQ-WELLFORMEDNESS, REQ-ACCESSIBILITY, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE

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
| `index.ts` | `validate(model,{layer})` — well-formedness + path-of-hope + crisis no-dead-ends/resources + client disclaimer gate | `@psyuml/model` | apps/web | §A.2, §L.2 / REQ-WELLFORMEDNESS, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE | medium |
| `index.test.ts` | Unit tests | `index.ts` | CI `test` | — | low |

## Change checklist
- [ ] New rule ⇒ trace it to a spec section + `REQ-…`; set severity + layer scope.
- [ ] Keep the "path of hope" + hazard rules consistent with the Ethical-Use Statement (§L.2).
- [ ] Ran `node sdd/check.mjs` (green).
