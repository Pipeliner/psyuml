# ADR-0005: Which diagram types are "client-facing" (disclaimer-gated)

- **Status:** accepted
- **Date:** 2026-06-13
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §A.2-r7, §L.2 / REQ-ETHICS-GUARDRAILS, REQ-PATH-OF-HOPE

## Context
`@psyuml/validate` keeps a `CLIENT_FACING` set: diagram types that, because they may be shown
to a client, must carry a standing disclaimer (error if missing) and trip the stricter
client-layer safety severities (e.g. path-of-hope escalates to an error). A cold-eyes usability
test flagged an inconsistency: `process-loop` rendered in the client layer and is routinely shown
to clients (CBT maintenance cycles, CAT reformulations), yet it was **absent** from the set — so a
client-facing loop with no disclaimer linted clean. Meanwhile `two-triangles` (Malan) is in the
catalog but is a clinician/supervision aid, not a client handout. The classification was implicit
and partly wrong; it deserves an explicit, recorded rule.

## Decision
Treat a diagram type as **client-facing** when it is plausibly shown to (or co-drawn with) a
client. Concretely, `CLIENT_FACING` = state-map, parts-map, mode-map, relational-field, body-map,
process-loop, timeline, intervention-sequence, decision-nav, resource-anchor, ritual. **Add
`process-loop`** (it was missing). **Exclude `two-triangles`** deliberately — Malan's triangles
are an intrapsychic clinician formulation, and gating it would push disclaimer boilerplate onto a
supervision artifact. The rule and the `two-triangles` exception are documented inline at the
`CLIENT_FACING` definition so the choice isn't re-litigated as an oversight.

To make the gate *satisfiable in-product*, the editor also gained a "Diagram details" panel
(title / disclaimer / crisis line) — previously a new client diagram could be export-blocked on a
missing disclaimer with no in-UI way to add one.

## Consequences
- **Positive:** the disclaimer + path-of-hope guarantees now actually cover the loop maps clients
  see; the classification is explicit and tested (`process-loop` without a disclaimer errors).
- **Cost / risk:** every client-facing example must carry a disclaimer (both process-loop examples
  already do, so the corpus stayed green). A future maintainer adding a client-facing type must add
  it to the set — the inline comment + this ADR are the reminder.
- **Impact:** `packages/validate/index.ts` (+ test), `apps/web` (Diagram-details editor), docs.

## Alternatives considered
- **Gate *every* diagram type.** Rejected — `two-triangles` is a clinician aid; forcing a client
  disclaimer there is noise and miscommunicates the artifact's audience.
- **Gate nothing; rely on the author.** Rejected — the whole point of the safety lint is to make
  the unsafe state hard to reach by accident; an ungated client loop is exactly that.
- **Infer "client-facing" from whether a `client` label layer is present.** Rejected — too
  implicit and easy to trip accidentally; an explicit per-type list is auditable.
