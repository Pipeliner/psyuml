# ADR-0027: the diagram catalog is a verified artifact — a manifest + a catalog↔corpus conformance test

- **Status:** accepted
- **Date:** 2026-06-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-CATALOG-CONFORMANCE (planned → implemented), REQ-CATALOG-COVERAGE (planned → in-progress) / executes `docs/research/diagram-catalog-audit.md`

## Context
The catalog audit (`docs/research/diagram-catalog-audit.md`) graded the diagram catalog strong on
content (evidence-honesty A, coverage A−) but **C on catalog↔product fidelity**: the prose Build plan
promised "≈34 example models now" and named specific instances, yet only **27 non-showcase examples
shipped** and ~14 named ✅/◐ rows were **absent** — *and nothing machine-checked the catalog against
the corpus*, so it could silently over-claim. A prose catalog rots; the goldens do not. The fix is to
make the catalog a **verified artifact** and then close the drift.

## Decision
1. **A machine-readable manifest, `examples/catalog.json`** — the source of truth that keeps
   `diagram-catalog.md` honest. Each shipped diagram is a row `{ file, type, family, name, catalogId? }`;
   the catalogued **◇ new-types** (no renderer yet) are listed separately as `newTypes` (no example).
2. **A conformance test, `conformance/catalog.test.ts`**, asserting: (i) every `diagrams[].file`
   exists, parses, and `model.diagram === type` (a real renderer type); (ii) every **non-showcase**
   `examples/*.psyuml` is listed **exactly once** (no orphan, no duplicate); (iii) each
   `showcase-<type>.psyuml` is a real renderer type matching its model; (iv) the manifest count equals
   the shipped count; (v) `newTypes` are documented and never shipped. So a "ships now" claim can
   **never again be untrue of the corpus** — the catalog joins the goldens/invariants as checked.
3. **Close the drift (REQ-CATALOG-COVERAGE, first batch).** Ship the named-absent diagrams that are
   realizable now on shipped renderers, each authored to pass *every* existing invariant (validate
   both layers, overlap ADR-0012, legibility, layout-quality ADR-0021, **edge↔edge ADR-0025**) and
   registered in the manifest. **10 shipped this pass:** `safety-behaviour`, `reciprocal-roles`,
   `dilemma`, `snag` (CAT pattern), `health-anxiety`, `ptsd-cycle` (Ehlers–Clark), `metacognitive-cas`
   (Wells) [disorder-specific maintenance models the audit flagged], `sorc`, `abc` (functional
   analysis), `trauma-timeline`. Authoring rule learned: a maintaining loop's **exit must leave the
   same node the loop-closing edge does** (as `panic-cycle` does), else the exit chord crosses the
   closing chord — keeping the new loops crossing-free without growing the ADR-0025 baseline.

## Consequences
- **Positive:** the catalog is now self-auditing — its central weakness (over-claiming) is closed by
  CI, not vigilance; +10 real, rendered, invariant-clean examples (37 non-showcase total) directly
  raise coverage; the manifest is also a clean data source a future help-site/catalog generator can
  read (REQ-CATALOG-METADATA).
- **Cost / honest scope:** the manifest is a *second* surface beside the prose catalog, so the two can
  still disagree in their **prose** (the test checks manifest↔corpus, not prose↔manifest); unifying
  them — generating the prose tables from the manifest — is REQ-CATALOG-METADATA (P2). The new
  examples are shipped + catalogued but **not yet wired into the curated editor gallery** (a separate,
  optional follow-up). REQ-CATALOG-COVERAGE stays **in-progress**: still to ship are the
  relational-field instances (ecomap, social-atom, cultural-genogram, empowerment-triangle,
  structural-dissociation), ED/psychosis loops, narrative externalising, and a standalone composite —
  each will land as a verified manifest row.
- **Impact:** `examples/catalog.json` (new) + 10 `examples/*.psyuml` (new) + `conformance/catalog.test.ts`
  (new); `diagram-catalog.md` build-count corrected to point at the manifest; traceability +
  IMPACT + ROADMAP. No renderer/golden change (the new examples are invariant-covered, not
  golden-pinned — goldens remain reserved for the showcase set + specific regressions).

## Alternatives considered
- **Parse the markdown tables directly** (one source of truth). Rejected — brittle against prose
  edits; a structured manifest is robust and reusable, and prose↔manifest unification is a later step.
- **Accept the new cross-ring exits + bridge them** (grow the ADR-0025 `CROSSING_BASELINE`). Rejected
  for the authored corpus — re-sourcing each exit to the loop-closing node keeps them genuinely
  crossing-free, so the "accepted structural crossings" set stays minimal and honest.
- **Golden-pin every new example.** Deferred — the invariants (overlap/legibility/layout-quality/
  crossing) already guarantee quality corpus-wide; goldens stay for the feature-dense showcase set and
  named regressions, avoiding 10 large golden blobs that churn on any benign layout tweak.
