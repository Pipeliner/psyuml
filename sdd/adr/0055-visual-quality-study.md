# ADR-0055: a simulated visual-quality study — render adversarial complex diagrams, machine-check them

- **Status:** accepted
- **Date:** 2026-06-30
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-VISUAL-QUALITY-STUDY (new → implemented) · §D (notation), §J (conformance), v0.2 §5 (notation testing); complements REQ-EVAL-SUITE / REQ-STUDY-PREREG (the human studies that stay the v1.0 gate)

## Context

This session repeatedly found renderer/authoring defects that **every geometry invariant passed** and
only a human eye caught: a body-map's sensation markers sat off the body, loop-map rings were shoved
off-centre by a long title, and node/zone labels were squished to ~40%. The root cause is coverage:
the invariants run over `examples/`, a corpus hand-tuned to look good — so a defect that only appears
under **dense, custom-detailed** input (many nodes, long labels, every optional channel) has nowhere
to show up. A real comprehension/utility **study** (the v1.0 gate, REQ-STUDY-PREREG) would have
clinicians draw their own messy formulations; we can't run that yet, but we *can* simulate its
machine-checkable half.

## Decision

Add a **simulated visual-quality study**: a set of deliberately complex study-case models plus a
battery that renders them and checks visual quality.

- **`packages/render/study-cases.ts`** — `STUDY_CASES`, eight adversarial diagrams (process-loop /
  parts-map / body-map / state-map / decision-nav / relational-field / mode-map /
  intervention-sequence), each maxing out its type: 6–9 nodes, long labels, custom anatomical
  positions, epistemic status, loop topology, contested provenance + narrative, as-if, confidence,
  dominance/intensity ranges, exits, parallel/lane-crossing edges, and a long title. Authored as
  validated `parseModel` objects (a malformed case fails at import). Cases are **not golden-pinned**
  (they assert quality, not byte output), so they can grow freely.
- **`checkVisualQuality(svg, label, diagram)`** — one battery aggregating the corpus invariants:
  node↔node / label↔non-owner-node / text↔text non-overlap, in-frame, interior-label containment
  (scoped to `LABEL_IN_BOX` renderers), no-severe-squish (≥ 0.8 unless at the 8px floor), the 8px
  microtext floor, a **gross one-sided empty-margin** check, and **loop-map ring-centring** (the
  title-masked lopsidedness the empty-margin check can't see). Returns a list of violations.
- **`study-cases.test.ts`** renders every case in BOTH audience layers and asserts the battery is
  clean. TDD-proven to bite: planting the loop-map frame-growth fails it ("ring off-centre by −62px").

Authoring the cases also exercised the renderers as real input would — it surfaced (and the battery
flagged) that an over-long Self label overflowed the parts-map orbit, which was then shortened to the
design's envelope.

## Consequences

- **Positive:** the renderers are now held to their geometric contract under **adversarial** input,
  not just the curated corpus — so a regression that only shows under density (exactly this session's
  class) fails CI. The battery is a single reusable visual-quality gate; the case set is cheap to
  extend (no goldens). It also documents, in runnable form, "what a complex real formulation looks
  like" per type.
- **Negative / cost:** this simulates the **drawing + legibility** half only — it cannot test
  comprehension, utility, or clinical safety, which require the human studies (REQ-STUDY-PREREG);
  recorded so the simulated study is never mistaken for the validation gate. The ring-centring and
  empty-margin checks are deliberately conservative (loop-map-scoped / gross-only) because a *general*
  balance metric false-positives on intentionally-asymmetric structured layouts (ADR-0054) — so a
  subtle imbalance on a non-loop renderer could still pass; that residual is the visual-review surface.
- **Impact:** `packages/render/study-cases.ts` (new — models + battery), `packages/render/study-cases.test.ts`
  (new — the study), `sdd/traceability.json` (REQ-VISUAL-QUALITY-STUDY), `packages/render/IMPACT.md`.

## Alternatives considered

- **Add the complex cases to `examples/`.** Rejected — they'd be pulled into the golden tests,
  catalog/showcase conformance, and the editor gallery, coupling stress-tests to the curated corpus
  (and forcing goldens that churn on every legitimate render tweak). A separate, golden-free module
  keeps them as pure quality probes.
- **Only extend the existing per-invariant tests over more examples.** Rejected — each invariant test
  asserts one property; the study's value is one battery over *deliberately adversarial* input, which
  the curated corpus is specifically tuned not to be.
- **Fabricate a human-study result.** Never — results are never invented; the simulated study is
  explicitly the buildable half, with the human study held as the v1.0 gate.
