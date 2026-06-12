# ADR-0002: Incorporate Source 3 (PsyML) — epistemic status, round-trip views, conservative interop/safety

- **Status:** accepted
- **Date:** 2026-06-12
- **Deciders:** project owner
- **Spec / REQ touched:** REQ-EPISTEMIC-STATUS, REQ-SAFETY-TRIAGE, REQ-BODY-MAP, REQ-I18N, REQ-PRIVACY, REQ-INTEROP-FHIR, REQ-EVAL-SUITE; extends REQ-ACCESSIBILITY, REQ-AI-ASSIST, REQ-CROSS-SCHOOL, REQ-CONFORMANCE

## Context
A second companion paper — `docs/research/psyml-fable-agent-spec.md` ("PsyML") — is
well-grounded and ethically careful, and **converges** with PsyUML's architecture
(one canonical graph + multiple reversible views). It supplies several capabilities the
plan lacked, but it also uses a different visual-primitive set that **conflicts** with the
normative PsyUML notation (§B), and it pulls toward standards/regulatory scope (FHIR, clinical
safety case) that could expand the project past "formulation infrastructure."

## Decision
Adopt the PsyML ideas that strengthen PsyUML, keep PsyUML's spec as the source of truth, and
sequence the heavyweight/regulation-sensitive items conservatively:

1. **Epistemic status** (`reported|observed|inferred|planned|symbolic`; ritual = `client-believed|tradition-claimed`, never `system-confirmed`) becomes a first-class node/edge property (REQ-EPISTEMIC-STATUS, M1).
2. **Clinical-hazard / safety-triage** rules become a fourth validation class and gate the AI-assist pipeline (REQ-SAFETY-TRIAGE, M3).
3. **Body Map** is added as a new view (REQ-BODY-MAP, M5).
4. **i18n** (stable IDs vs localized labels) and **alt-text/text-summary per view** are baked in from M1/M3 (REQ-I18N; extends REQ-ACCESSIBILITY).
5. **`@psyuml/interop`** (FHIR/SNOMED + de-identified research export) is added, **late and optional** (REQ-INTEROP-FHIR, M9), with **privacy-by-default** (REQ-PRIVACY, M8).
6. The **round-trip invariant** (JSON ⇄ any view ⇄ JSON, lossless) is elevated to a conformance test; the **evaluation suite** becomes the Stage-4 metric set (REQ-EVAL-SUITE, M10).
7. **Notation conflicts are resolved in PsyUML's favor.** PsyML's glyph assignments (hexagon=self-state, circle=emotion, octagon=risk) are **not** adopted; we keep PsyUML §B glyphs and express PsyML's concepts (epistemic line-styles, risk-as-entity) via stereotypes on a redundant, collision-checked channel (spec §J.4).

## Consequences
- **Positive:** richer epistemic honesty, stronger safety/privacy posture, a real interop story, and a testable round-trip guarantee — all without changing PsyUML's ethical core.
- **Negative / cost:** more surface area (a new package, a new view, a new property dimension, more lint rules). Interop + clinical-safety-case work is regulation-sensitive and deliberately deferred.
- **Impact:** `packages/model` (epistemicStatus, i18n), `packages/validate` (hazard class), `packages/render` (line-styles, alt-text, Body Map), new `packages/interop`, `packages/ai` (pipeline). See `docs/ARCHITECTURE.md` §13 and the updated `sdd/README.md` dependency map.

## Alternatives considered
- **Adopt PsyML wholesale (incl. its glyph set).** Rejected — it would fork the notation and break spec §B/§J semiotic clarity.
- **Defer all of it.** Rejected — epistemic status and the safety-triage rules are cheap, high-value, and belong in the foundations (M1/M3); only interop/governance genuinely needs deferring.
- **Build FHIR interop now.** Rejected — premature and regulation-sensitive before there is a stable core and any real data.
