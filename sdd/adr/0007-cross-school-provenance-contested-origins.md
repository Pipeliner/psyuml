# ADR-0007: Cross-school provenance — canonical claim form + contested-origin surfacing

- **Status:** accepted
- **Date:** 2026-06-14
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §G.2 (cross-school) / REQ-CROSS-SCHOOL, REQ-ACCESSIBILITY

## Context
The simulated Tier-B pilot's multi-school reviewer found the "preserves disagreement"
promise (§G.2) was aspirational, not demonstrated. Two concrete problems behind it:

1. **The detector missed real data.** `validate`'s `provenance.node-mixed-school` /
   `provenance.mixed-school` rules only matched an explicit `school:` prefix, but every
   shipped example records provenance as **bare** tags (`IFS`, `schema`, `SD`). So the rule
   fired only on prefixed test fixtures and never on the corpus — the disagreement was real
   in the data but invisible to the tool.
2. **No renderer surfaced the conflict.** A node claimed by >1 school was either undrawn
   (most renderers) or shown as a bland slash-list (`IFS / schema / SD`) on the Parts Map —
   which reads as one merged origin, the opposite of "keep both claims visible."

## Decision
- **One shared, school-agnostic reader.** `@psyuml/model` exports `schoolClaims(provenance)`:
  it understands the provenance *format* — accepting both explicit `school:<id>` tags and the
  bare-token form the examples use, skipping other namespaces (`source:`, `ref:`),
  de-duplicating case-insensitively while keeping first-seen casing and order. It hard-codes
  **no** school list, so `model` stays school-agnostic; `validate` and `render` both consume it
  so detection and display can never drift apart.
- **Validate fires on real data.** Both provenance rules now use `schoolClaims`, so the
  corpus's genuinely multi-school nodes (e.g. the Parts Map exile claimed by IFS + schema +
  structural-dissociation) raise the existing **info** signals. Severity is unchanged — these
  never block export.
- **Render shows the disagreement.** On the Parts Map a node with ≥2 distinct claims is drawn
  as a **contested-origin marker** (`⚖ A vs B`) in a distinct weight, not a slash-list; a
  single-claim node keeps its plain tag. The conflict is also written into the alt-text/`<desc>`
  ("Origins disagree on: … — both claims are shown, not merged"), so it survives in the text
  channel too (§D).

## Consequences
- **Positive:** the §G.2 promise is now true on the shipped corpus and in both the visual and
  text channels; a single element carrying opposed origin theories is shown as a disagreement,
  not silently reconciled. Detection and rendering share one definition.
- **Cost / limits:** contested-origin **rendering** currently lives only on the Parts Map (the
  canonical cross-school surface). Other diagram types can adopt the same `schoolClaims` helper
  + marker later; until then they detect (validate) but don't draw the conflict. The marker
  names the schools but does not yet explain *how* they disagree — that narrative stays in the
  clinician's notes / style guide.
- **Impact:** `packages/model/index.ts` (`schoolClaims` + test); `packages/validate/index.ts`
  (both provenance rules use it; + bare-tag and corpus tests); `packages/render/index.ts`
  (Parts Map contested marker + alt-text; regenerated `parts-map.svg`).

## Alternatives considered
- **Standardize on the `school:` prefix and migrate the examples.** Rejected — more churn,
  and bare tags are friendlier for authors; a tolerant reader is strictly more robust.
- **Put a school registry (ids, display names, aliases) in `model`.** Rejected — it would
  break `model`'s school-agnostic charter. The registry stays in `@psyuml/profiles`; the
  format reader needs no registry.
- **Render the conflict on every diagram type now.** Deferred — high golden churn for low
  marginal value; the Parts Map is where cross-school work actually happens.
