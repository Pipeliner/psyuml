<!-- TEMPLATE: copy to a working location when specifying a feature before building it. -->
# Feature spec: <name>

- **REQ:** REQ-… (add/keep in `sdd/traceability.json`)
- **Spec sections:** §…
- **Milestone:** M…
- **Status:** draft | ready | building | done

## Problem / intent
What user-facing capability this delivers, and for whom (clinician layer / client layer).

## In scope / out of scope
- In: …
- Out: … (especially anything that would cross into diagnosis, or weaken ethics/accessibility)

## Behavior (spec-traceable)
Restate the relevant spec rules this must satisfy, with section refs. List the
well-formedness / accessibility / safety lints that apply (`packages/validate`).

## Model / notation impact
New stereotypes, glyphs, connectors, or properties? Each must specialize a §A core
element and pass the §K collision check. Note Tier (new = Tier 3 by default).

## Acceptance criteria
- [ ] Reproduces the relevant spec example(s).
- [ ] Passes accessibility (monochrome) and path-of-hope lints where applicable.
- [ ] Round-trips through save/load (and DSL, if applicable).

## Impact analysis
Which directories/modules change; update their `IMPACT.md` and the reverse-dependency
table in `sdd/README.md` if the dependency graph changes.
