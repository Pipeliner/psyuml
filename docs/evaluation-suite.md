# PsyUML evaluation suite

The evidence PsyUML must accumulate before it can leave **v0.x** for a clinical **v1.0**
(spec §J self-eval rubric; Recommendations Stage 4; Source 3 C11). It has **two tiers**:

- **Tier A — automated, enforced now.** Machine-checkable invariants that run in CI on every
  change (`conformance/`, `@psyuml/validate`, `@psyuml/privacy`, `@psyuml/grammar`, the
  Playwright `e2e/` journey). These are *green today* and gate merges.
- **Tier B — human studies, outstanding.** Comprehension, collaborative validity, inter-rater
  reliability, and multi-school endorsement need real people; no amount of passing code
  substitutes. **These are the v1.0 gate and are not yet done.**

> **Software-ready ≠ clinically-validated.** Tier A being green means the *tool* behaves as
> designed. Leaving v0.x stays blocked on Tier B. Until then PsyUML is formulation-support
> infrastructure, not a validated instrument, and must be presented that way.

## Dimensions

Each maps to an evaluation **question**, a **method/instrument**, a **success criterion**, and
its **current coverage**.

### 1. Comprehension (layperson) — Tier B
- **Q:** Can a non-clinician read a client-layer diagram and state what it says about the person?
- **Method:** comprehension test — show the §H crisis chart + a State Map to N≥20 laypeople;
  free-recall + targeted questions; compare to a text-only formulation.
- **Success:** ≥80% correctly identify states, at least one "way out", and the crisis action;
  non-inferior to (ideally better than) prose.
- **Now:** *pending* (Tier B). Tier A guarantees the *artifact* exists: every view renders with a
  plain-language client layer + a narrated alt-text (`conformance` asserts role/aria/alt both layers).

### 2. Collaborative validity — Tier B
- **Q:** Does co-drawing improve the client's sense of the formulation being *theirs* and accurate?
- **Method:** therapist–client dyads build a map together; client-rated accuracy + ownership
  (Likert) vs. clinician-only formulation; qualitative debrief.
- **Success:** clients rate co-drawn maps higher on ownership/accuracy; no increase in distress
  (watch the emotional-safety items).
- **Now:** *pending*. Tier A supports it: per-layer relabelling, hide/reveal, remove, and version
  snapshots are e2e-covered (co-authorship is editable + reversible).

### 3. Editability — Tier A (mostly) + B
- **Q:** Can a clinician build/modify a Tier-1 diagram quickly and without dead-ends?
- **Method:** task test — reproduce the §H State Map + crisis chart from scratch in < 5 min.
- **Success:** task completion < 5 min; no unrecoverable states; export reachable.
- **Now:** **Tier A green** — the Playwright onboarding journey builds nodes (any kind), **links**,
  edits diagram details to clear the export gate, snapshots, and diffs, all through the GUI; the
  CLI lints/round-trips. Timed human task-test is the remaining Tier-B slice.

### 4. Cross-school fidelity — Tier A
- **Q:** Does re-rendering in another school preserve structure without flattening differences?
- **Method:** round-trip + provenance checks; expert review that opposed origin-claims survive.
- **Success:** structure invariant under school switch; provenance tags retained; experts agree no
  claim is silently merged.
- **Now:** **Tier A green** — `@psyuml/grammar` round-trips every example losslessly; `validate`
  surfaces mixed-school provenance; the School switch re-labels without mutating the model. Expert
  endorsement is Tier B.

### 5. Safety — Tier A (enforced) + B (review)
- **Q:** Does the tool make unsafe artifacts hard to produce by accident, and escalate risk?
- **Method:** the safety lints + an expert red-team of edge cases.
- **Success:** no hopeless-only client diagram, no disclaimer-less client export, no crisis chart
  without resources or with a dead-end; risk flags escalate; ritual gated.
- **Now:** **Tier A green** — `validate` enforces path-of-hope, the disclaimer/crisis gates,
  safety-triage (acute-risk/psychosis → human-review banner; ritual-under-psychosis block), and
  the corpus is lint-gated. Clinical red-team is Tier B.

### 6. Privacy — Tier A (enforced) + B (policy)
- **Q:** Does PHI stay on-device, and are exports de-identified by default?
- **Method:** de-identification tests + a data-flow audit.
- **Success:** local-first (no network egress of model data); `redact` removes emails/phones/links
  + named terms; the disclaimer/crisis line survive; nothing leaks via a misspelled term silently.
- **Now:** **Tier A green** — `@psyuml/privacy` tests cover redaction + the "term matched nothing"
  warning; the editor is local-first. A formal HIPAA/GDPR data-flow audit is Tier B.

### 7. Interoperability — partial / shelved
- **Q:** Can a formulation round-trip to a standard health record format without meaning loss?
- **Method:** export → external validator → re-import diff.
- **Success:** validates against the target schema; re-imports without meaning loss.
- **Now:** the **text DSL** round-trips losslessly (Tier A). **FHIR/SNOMED export is shelved** — an
  honest mapping is lossy and needs a real validator + consumer (see ROADMAP M9); not attempted
  rather than overclaimed.

### 8. Accessibility — Tier A (enforced) + B (audit)
- **Q:** Is every view usable without colour and with a screen reader; does the editor meet WCAG 2.2 AA?
- **Method:** automated checks + a formal a11y audit (keyboard, contrast, 200% zoom, target size).
- **Success:** no meaning by colour alone; alt-text per view; AA on the editor.
- **Now:** **Tier A green** — `conformance` asserts role=img + aria-label + non-empty alt text per
  view + monochrome-no-hue; renderers fit/wrap labels (no clip); the e2e drives by accessible
  roles/names. A formal third-party audit is Tier B.

## The v1.0 go / no-go gate

Leave v0.x **only** when all hold (Stage 4):
1. **Layperson comprehension** non-inferior to prose (dimension 1).
2. **Inter-rater reliability** — independent clinicians produce concordant formulations of the
   same case (a reliability study, not yet designed here).
3. **Multi-school endorsement** — practitioners across ≥3 traditions agree the cross-school
   renderings are faithful (dimension 4, Tier B).
4. Tiers A remain green; the safety, privacy, and accessibility audits (5/6/8 Tier B) pass.

Until then the version stays `0.x` and every surface keeps the "unvalidated — not a clinical
instrument" framing.

## Status snapshot

| Dimension | Tier A (automated, now) | Tier B (human, outstanding) |
|---|---|---|
| Comprehension | artifact + alt-text exist | comprehension study |
| Collaborative validity | co-authorship e2e | dyad study |
| Editability | build-a-diagram e2e + CLI | timed task-test |
| Cross-school fidelity | lossless round-trip + provenance | expert review |
| Safety | lints + triage enforced | clinical red-team |
| Privacy | redaction tests + local-first | data-flow audit |
| Interoperability | DSL round-trip | FHIR (shelved) |
| Accessibility | conformance role/alt/mono + fit | formal WCAG audit |
