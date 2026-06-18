# ADR-0022: spec the road to v1.0 — gap analysis (validation is the gate, not features)

- **Status:** accepted
- **Date:** 2026-06-18
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** new forward spec `docs/specification/roadmap-to-v1.md` / REQ-STUDY-PREREG, REQ-NEW-DIAGRAM-TYPES, REQ-EDGE-ROUTER, REQ-PICTURE-PICTOGRAPHS, REQ-CASE-FILE, REQ-LIVE-PROFILES, REQ-I18N-LOCALIZATION, REQ-PROVENANCE-NARRATIVE, REQ-EXPORT-RASTER (all **planned**)

## Context
Asked "what's missing — spec these," we inventoried the actual build (45 implemented REQs; only the
two human-study gates in-progress; 0 planned) and the deferral markers already written across the
spec/ADRs/ROADMAP/catalogue (the honest "future / known-gap / not-yet" notes). The gaps are real and
already flagged in-tree; what was missing was a *consolidated forward spec* and `planned` REQs to
track them.

The decision that shapes everything: **the dominant gap is validation, not features.** Every glyph,
profile, and topology mark is distinguishable + word-redundant but **never comprehension-tested with
real participants** (ADR-0015/0017; the only "studies" are blind LLM dry-runs, explicitly not
evidence). So a feature backlog that buried "run the studies" among "build more renderers" would
misrepresent the project. v1.0 must be **defined by the validation gate**, with expressiveness and
product-depth gaps ordered *behind* it.

## Decision
1. **A forward spec, `docs/specification/roadmap-to-v1.md`** — non-normative; enumerates each gap with
   acceptance criteria, grouped: §0 validation (the gate), §1 notation completeness, §2 renderers +
   edge routing, §3 product depth, §4 deliberately-out-of-scope (boundaries, not gaps).
2. **Nine `planned` REQs** citing that doc, across three new phases/milestones:
   - **Phase 8 / M19 — the gate:** `REQ-STUDY-PREREG` (pre-register + run the comprehension /
     collaborative-validity / utility studies; subsumes the human a11y audit). This operationalizes
     the in-progress `REQ-EVAL-SUITE` + `REQ-NOTATION-TESTING` rather than duplicating them.
   - **Phase 9 / M20 — expressiveness:** `REQ-NEW-DIAGRAM-TYPES` (the 7 `◇` renderers + missing live
     examples), `REQ-EDGE-ROUTER` (close `EDGE_NODE_KNOWN_GAP` + label↔label), `REQ-PICTURE-PICTOGRAPHS`
     (gated on M19).
   - **Phase 10 / M21 — product depth:** `REQ-CASE-FILE`, `REQ-LIVE-PROFILES`, `REQ-I18N-LOCALIZATION`,
     `REQ-PROVENANCE-NARRATIVE`, `REQ-EXPORT-RASTER`.
3. **v1.0 is defined by §0.** PsyUML may ship every renderer in §2 and still be v0.x *unvalidated*;
   it earns v1.0 only when the pre-registered studies have run and driven revisions.
4. **FHIR/interop import is explicitly NOT specced** (no `REQ-…IMPORT`) — recorded in §4 as a held
   scope line (export-only, not live-care CDS), revisited only behind a governance review.

## Consequences
- **Positive:** the backlog is now explicit, grounded in the repo's own deferral notes, and *honestly
  ordered* — validation first. `planned` REQs make each gap auditable by `sdd/check.mjs` without
  pretending anything is built (planned REQs carry a real `source` + milestone, no impl/tests). The
  out-of-scope lines are restated so "missing" is not confused with "deliberately excluded".
- **Negative / cost:** this is spec + roadmap only — no code. The estimates/sequencing are
  provisional; the studies (M19) need real participants, ethics approval, and funding that a code
  change cannot supply. The `planned` REQs will sit unimplemented until those phases are resourced.
- **Impact:** `docs/specification/roadmap-to-v1.md` (new), `sdd/traceability.json` (+3 milestones,
  +9 planned REQs), `docs/ROADMAP.md` (forward section), `docs/specification/IMPACT.md` +
  `sdd/adr/IMPACT.md` rows. Nothing in `packages/*`/`apps/*` changes.

## Alternatives considered
- **Just start building the `◇` renderers / the editor depth.** Rejected as the *headline* — it would
  imply feature-completeness is the path to v1.0, when validation is. The renderers are specced
  (Phase 9) but explicitly behind the gate.
- **Fold everything into one mega-REQ "v1.0".** Rejected — too coarse to track or schedule; distinct
  REQs per gap keep `traceability.json` auditable and let phases be resourced independently.
- **Spec a FHIR importer / round-trip for "completeness".** Rejected — it would erode the export-only,
  not-live-care posture (Source 3); recorded as a held boundary, not a gap.
- **Leave the gaps as prose in ADRs/ROADMAP (status quo).** Rejected — they were scattered and
  untracked; consolidating them as `planned` REQs is what "spec these" asks for.
