# Diagram-catalog audit — where it loses marks, and the spec to fix it

> Audits `docs/research/diagram-catalog.md` (the 59-diagram catalog that drives the help-site example
> library) against a stated rubric, grades it honestly, and specs the improvements that would raise
> the marks. Inherits the catalog's own honesty clause (unvalidated v0.x; supports, never replaces,
> care). This doc is the `source` for REQ-CATALOG-CONFORMANCE / -COVERAGE / -METADATA (M22, planned).

## Progress (2026-06-20)

- **#4 auditability — addressed (ADR-0027).** A machine-readable manifest `examples/catalog.json` +
  `conformance/catalog.test.ts` now enforce catalog↔corpus fidelity in CI: the catalog can no longer
  claim an example that isn't shipped, nor leave a shipped example un-catalogued. REQ-CATALOG-CONFORMANCE
  → implemented.
- **#2 coverage — closed (as files).** All 18 named-but-absent / disorder-specific / narrative
  examples shipped across two batches (CAT pattern: safety-behaviour, reciprocal-roles, dilemma, snag;
  disorder-specific: health-anxiety, ptsd-cycle, metacognitive-cas, eating-disorder, psychosis-cycle;
  functional analysis: sorc, abc; journey: trauma-timeline; field: empowerment-triangle,
  structural-dissociation, ecomap, social-atom, cultural-genogram, narrative-externalising), each
  invariant-clean + manifest-registered (**45 non-showcase examples now**). REQ-CATALOG-COVERAGE →
  implemented. A standalone *composite* example is out of scope as a single file (renderComposite takes
  an array — demoed live in the editor); wiring the new examples into the editor gallery is optional
  (REQ-EXAMPLE-LIBRARY). The grades below are the *original* audit; #4 and #2 are now addressed.

## Rubric (what a reviewer marks, and what full marks means)

| # | Dimension | Full marks = | Weight |
|---|---|---|---|
| 1 | **Evidence honesty & sourcing** | every item flags worksheet-vs-instrument + therapy-vs-diagram evidence; contested theories named; claims cited | high |
| 2 | **Coverage of canonical must-haves** | the diagrams a field reviewer expects are all present, across schools | high |
| 3 | **Per-item metadata completeness & consistency** | every row carries the *same* fields, filled (school, what, evidence, mapping, audience, **safety/cultural caveat**, **citation**) | high |
| 4 | **Catalog ↔ product fidelity (auditability)** | every build claim is *true of the shipped product*, and a machine-check keeps it that way | high |
| 5 | **Structure / navigation** | TOC, anchors, cross-references; related items findable; one consistent ordering | med |
| 6 | **Notation / syntax documentation** | the symbols + DSL the mapping column uses are defined and cross-linked | med |

## Grades (honest)

| Dimension | Grade | Why |
|---|---|---|
| 1 Evidence honesty | **A** | The standout. Per-item evidence/limits, the two honest distinctions, contested-theory flags, cited cross-cutting findings, a real sources section. Little to improve. |
| 2 Coverage | **A−** | All the big ones present. Gap: **disorder-specific maintenance formulations** — the bread-and-butter of UK CBT — are missing (PTSD/Ehlers–Clark; eating-disorder transdiagnostic/Fairburn; psychosis/Morrison; **metacognitive CAS/Wells**; a standalone health-anxiety cycle), as is the **narrative externalising map** (White). |
| 3 Metadata consistency | **B−** | Fields present but uneven: **safety/cultural caveat is woven into "evidence/limits" for some rows and absent for others** (not a dedicated, always-filled field); **no per-item primary citation/anchor** (sourcing lives only at the bottom); the **audience key is C/L/B and omits the product's third profile, `picture`** (ADR-0016); "how widely taught/used" was asked for but is uneven. |
| 4 Catalog ↔ product fidelity | **C** | **The weak spot.** The Build plan promises "≈34 example models now" and names specific instances — **27 non-showcase examples actually ship**, and ~14 *named* ones are **absent** (below). Most are ✅/◐ — **realizable now on shipped renderers, just never built** — not blocked by a missing ◇ renderer. And **nothing machine-checks the catalog against the corpus**, so it can silently over-claim again. |
| 5 Structure | **B** | Family sections + tables are clear, but there is **no TOC/anchors**, related items aren't cross-linked (safety plans #41/#42/#53; drama/empowerment #18/#19; ABC/SORC/ARC #43/#44/#55; reciprocal-roles/CCRT #13/#58), and items **52–59 ("Additional") sit outside their families** instead of in them. |
| 6 Notation docs | **A−** | Added and complete; could cross-link each glyph to the M14 comprehension-test set. |

**Overall: a strong catalog (≈B+) held back by two fixable things — auditability (#4) and metadata consistency (#3).** Those are where the marks are.

## Finding 4a — the named-but-absent examples (the drift)

Build plan names these "new instances"; **absent** from `examples/` today (status = realizable):

| Named in build plan | Catalog # | Build status | Shipped? |
|---|---|---|---|
| safety-behaviour cycle | 5 | ✅ process-loop | **no** |
| vicious flower (generic) | 2 | ✅ process-loop (hub) | partial (only `depression-flower`) |
| reciprocal-roles (standalone) | 13 | ✅ process-loop | **no** (only inside `cat-sdr`) |
| trap / dilemma / snag exemplars | 10/11/12 | ✅/◐ process-loop | **no** (only `trap` inside `cat-sdr`) |
| structural dissociation | 17 | ◐ parts-map (barrier) | **no** |
| empowerment triangle | 19 | ◐ relational-field | **no** |
| ecomap | 22 | ◐ relational-field | **no** |
| social atom | 23 | ◐ relational-field | **no** |
| cultural genogram | 24 | ◐ relational-field | **no** |
| trauma timeline (titrated) | 34 | ◐ timeline | **no** |
| SORC functional analysis | 43 | ◐ intervention-sequence | **no** |
| ABC functional analysis | 44 | ◐ intervention-sequence | **no** |
| grief ritual | 49 | ✅ ritual | **no** (only generic `ritual`) |
| composite case board | 50 | ✅ composite | **no** standalone example |

(IFS #14 ships as `parts-map`; panic/social/OCD, longitudinal, 5 Ps, DBT chain, ACT choice-point, relapse-prevention, goal-ladder, stages-of-change all ship. The ◇ new-type rows are correctly not shipped.)

## The spec (prioritised)

**REQ-CATALOG-CONFORMANCE (P1 — the audit-proofing).** Make the catalog machine-checkable so it
cannot drift from the product. A small structured **manifest** (a `catalog.json`, or parseable
front-matter rows) carries each row's `id`, `name`, `family`, `status` (✅/◐/◇), `mappedType`, and
(for ✅/◐) `example` filename(s). A conformance test (in `conformance/` or `apps/web`) then asserts:
(i) every ✅/◐ row's `example` exists in `examples/` and is of `mappedType`; (ii) every shipped
`examples/*.psyuml` is catalogued; (iii) ◇ rows have no example; (iv) the prose build-count matches
the manifest. So a build claim can never again be untrue of the shipped corpus — the catalog becomes
a *verified* artifact, like the goldens. (Highest-value single change for the audit mark.)

**REQ-CATALOG-COVERAGE (P1 — close the drift + the canonical gaps).** Ship the ~14 named-but-absent
✅/◐ examples in Finding 4a (most are quick instances on shipped renderers), plus a standalone
composite example; and add the missing **disorder-specific maintenance formulations** — PTSD
(Ehlers–Clark), eating-disorder transdiagnostic (Fairburn), psychosis (Morrison), **metacognitive
CAS** (Wells), a standalone health-anxiety cycle — and the **narrative externalising** map (White),
each with its honest evidence note. Bound by REQ-CATALOG-CONFORMANCE (each becomes a verified row).

**REQ-CATALOG-METADATA (P2 — consistency + structure).** One consistent per-row schema, every field
filled: a dedicated **safety / cultural caveat** column (`—` when none), a **primary citation**
(author + year) per row anchored to a consolidated **References** section, and the audience taxonomy
aligned to the product's **three** profiles (clinician / client / **picture**) with per-row
picture-suitability. Structure: a **table of contents + per-item anchors + "see also" cross-refs**,
and **integrate items 52–59 into their families** (or state why they're held separate). Cross-link
each notation glyph to the M14 comprehension-test set.

## Acceptance (how we'll know the marks went up)

- **#4 → A:** the conformance test is green in CI; the catalog's build-count equals the shipped count;
  zero named-but-absent ✅/◐ rows.
- **#2 → A:** the five disorder-specific maintenance models + narrative externalising are catalogued
  (and the realizable ones shipped).
- **#3 → A−:** every row has a filled safety/cultural-caveat field + a primary citation; audience
  covers picture.
- **#5 → A−:** TOC + anchors + cross-refs present; 52–59 folded into families.

No change to the honesty posture: more coverage means more honest evidence notes, not fewer caveats;
the conformance check enforces "every shipped example is a real, rendered, catalogued diagram."
