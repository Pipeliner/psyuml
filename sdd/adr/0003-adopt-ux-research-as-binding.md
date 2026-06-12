# ADR-0003: Adopt the UX research findings as binding requirements for the editor

- **Status:** accepted
- **Date:** 2026-06-12
- **Deciders:** project owner
- **Spec / REQ touched:** REQ-UX-STORIES, REQ-EDITOR-MVP, REQ-ACCESSIBILITY, REQ-DECISION-NAV, REQ-PRIVACY, REQ-SAFETY-TRIAGE, REQ-AI-ASSIST; new REQ-COLLAB, REQ-CLIENT-SAFETY-UX

## Context
Before designing the M2 editor we ran a deep-research synthesis on UX user stories/requirements
across five personas (therapist, client, solo/self-help, researcher, ritual practitioner). The
findings (`docs/ux/ux-research-and-requirements.md`) are cited and the load-bearing numbers were
verified against primary sources. They converge strongly with PsyUML's existing commitments but
also surface hard, evidence-based guardrails — and one uncomfortable finding: formulation
improving *outcomes* is **not** established, while collaboration, plain-language comprehension,
safety-planning, and reflection **are** supported. Without binding these into the SDD harness, the
editor could drift toward unsafe or over-claiming UX.

## Decision
Treat the UX **MUST** requirements as **binding architectural constraints** (ARCHITECTURE §14),
specified into the milestones (ROADMAP M2/M3/M8/M10) and the traceability registry:

1. Accessibility = **WCAG 2.2 AA in the editor itself** (keyboard, contrast, 200% zoom, target
   size, colour-redundant, text/outline alternative) — REQ-ACCESSIBILITY.
2. Two real layers: ~5th–6th-grade plain-language client layer (≈6 symbols, dual-coded) + richer
   clinician layer — REQ-EDITOR-MVP / REQ-UX-STORIES.
3. **Co-authorship & client ownership** — new **REQ-COLLAB**.
4. **Emotional-safety UX** (progressive reveal, save-incomplete, non-pathologizing) — new
   **REQ-CLIENT-SAFETY-UX**.
5. Crisis chart designed for cognitive constriction (one step, localized resources everywhere, no
   dead-ends, human escalation, **no AI crisis handling**) — REQ-DECISION-NAV.
6. **Local-first privacy** (no third-party trackers, explicit consent) — REQ-PRIVACY.
7. **No outcome over-claiming** in UI copy or docs; v0.x stays "unvalidated"; the usability open
   questions are the Stage-4 gate — REQ-EVAL-SUITE.

## Consequences
- **Positive:** the editor is specified against cited evidence; safety/accessibility/privacy are
  enforced, not aspirational; the harm-avoidance findings (distress from poor formulation, crisis
  mishandling, data leakage, over-reliance) become explicit anti-requirements.
- **Negative / cost:** higher bar for M2 (accessibility + collaboration + safety UX up front);
  must resist outcome-claim marketing. Some requirements (real-time collaboration) are non-trivial
  and may span milestones.
- **Impact:** `apps/web` (editor), `packages/render`/`packages/model` (layer + safety affordances),
  the crisis chart, privacy/AI/ritual guardrails, and the eval suite. See `docs/ux/IMPACT.md`.

## Alternatives considered
- **Keep the UX doc as background reading only.** Rejected — it would not bind the build, risking
  drift toward inaccessible/over-claiming UX.
- **Implement everything in one M2.** Rejected — real-time collaboration and full usability
  validation are sequenced (M2 ships the MUST core; collaboration/validation iterate).
