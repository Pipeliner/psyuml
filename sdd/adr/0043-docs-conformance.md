# ADR-0043: documentation ↔ system conformance — make the docs un-driftable

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-DOC-CONFORMANCE (→ **implemented**) / §J (conformance), §E (families/catalog); companion to ADR-0027/0028 (catalog↔corpus)

## Context

The codebase is sound, but an audit found the recurring failure was **documentation drift**:
prose that fell out of step with the system as the language grew. Concretely, after the eight ◇
renderers landed (ADR-0029–0036), several docs still said the language had **12 diagram types**, the
format-reference **authoring quick-guide listed only the original 12** (missing `ladder`,
`three-circles`, `venn`, `bullseye`, `tree-of-life`, `schema-grid`, `decisional-balance`,
`secure-base`), and the roadmap status banners pre-dated the M20/M21 work. A human had to find and fix
each by hand — exactly the kind of bug that silently returns the next time a type is added.

The catalog already solved its half of this (ADR-0027/0028): `examples/catalog.json` is the single
source, and `conformance/catalog.test.ts` fails CI if the generated catalog table drifts from the
corpus. But the **hand-written prose docs** (specs, format-reference, ROADMAP, ARCHITECTURE, the
package IMPACTs) had no such guard — their factual claims about *how many* types/families exist and
*which* types the quick-guide documents were trust-based.

The active goal: "bring all documentation to consistency with the system and with itself; make them
**impossible to drift again** in the future." A one-time hand reconciliation does not satisfy
"impossible to drift" — that needs a machine check, written TDD-first.

## Decision

1. **Reconcile the drift by hand, once.** Bring the live docs current: complete the format-reference
   quick-guide to all 20 renderer rows; correct every stale "12 diagram types" / "nine" /
   "twelve renderers" to the live count; replace the roadmap's pre-M20 status banners with the landed
   state (M20+M21 shipped, ADR-0023–0042). Reword *historical* counts so they read as history, not a
   current claim (e.g. v0.2 §2 "v0.1 shipped 12 *types* (the language now has 20)", not "12 diagram
   types").

2. **Lock it with a derived conformance test** — `conformance/docs-conformance.test.ts`, the prose
   analogue of `catalog.test.ts`. It derives the load-bearing facts **from the system**, never from a
   hand-kept copy:
   - `TYPE_COUNT = DiagramType.options.length` and the exact type list (the single source of truth);
   - `FAMILY_COUNT = FAMILIES.length`;
   - the `examples/` corpus (one `showcase-<type>.psyuml` per type).

   And asserts the docs match:
   - the format-reference **quick-guide table lists EXACTLY `DiagramType.options`** (a missing or
     extra renderer row fails CI — the bug that shipped a 12-row table can't recur);
   - **every digit-form "N diagram types/renderers"** claim across the live docs + package IMPACTs
     equals `TYPE_COUNT`;
   - **every digit-form "N families"** claim equals `FAMILY_COUNT`;
   - there is **exactly one `showcase-<type>`** per renderer type (structural coverage).

3. **TDD.** The test was written first; on first run it went red on the *real* residual drift, which
   was then fixed until green, and the guard was proven by planting a `20`→`19` regression (red) and
   reverting (green).

## Consequences

- **Positive:** the diagram-type count, the type *list* in the authoring guide, the family count, and
  per-type showcase coverage are now **single-sourced from the system**. Adding the 21st diagram type
  forces the quick-guide row and every count to be updated — CI fails otherwise — so the docs cannot
  silently fall behind the language again. The mechanism matches the one the catalog already uses, so
  there is one consistent "facts are derived, prose is checked" pattern across the repo.
- **Cost / honest scope (recorded):**
  - **Digit-form counts only.** The guard checks `12`/`20`-style numerals, not spelled-out words —
    "eight families" is unchecked prose. Catching spelled-out numbers risks false positives ("one of
    the families", "a few families"), so it is deliberately out of scope; the canonical claims are
    written as digits and are checked.
  - **Version/identifier digits are excluded.** A `(?<![.\w])` lookbehind means a digit glued to a
    version or identifier ("v0.1 diagram types", "v0.2 families", "M15") is not read as a count —
    those are legitimate prose, not drift. A genuine count always has a separator before the numeral.
  - **Scope boundary.** The dated cited-research archive (`docs/research/**`) has its own drift check
    and is a snapshot, so it is excluded; append-only ADR history (`sdd/adr/**`) is not a live doc.
  - **Not every fact is mechanizable.** The guard locks the counts/lists that *actually* drifted; it
    is not a claim that all prose is machine-verified. Reviewer care still matters for narrative
    claims — but the high-frequency, easy-to-miss numeric drift is now impossible.
- **Impact:** `conformance/docs-conformance.test.ts` (new), the reconciled docs
  (`docs/format-reference.md`, `docs/specification/psyuml-v0.2.0.md`, `roadmap-to-v1.md`,
  `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, the render/profiles IMPACTs),
  `conformance/IMPACT.md` (+ the new test row), `sdd/traceability.json` (REQ-DOC-CONFORMANCE → implemented; M23).

## Alternatives considered

- **Hand-fix the drift and move on.** Rejected — it does not satisfy "impossible to drift again"; the
  same divergence returns the next time a type is added. A machine check is the only durable answer.
- **Generate the prose from the system** (like the catalog table). Rejected for the specs/ROADMAP —
  they are narrative, hand-authored documents, not tables; generating them would flatten the prose.
  Checking derived facts against hand-written prose keeps the writing human while locking the numbers.
- **Check spelled-out numbers too.** Rejected — high false-positive rate ("one of", "a few") for
  little gain; the canonical counts are written as digits and are checked.
- **A custom lint script instead of a vitest test.** Rejected — the conformance suite is the
  established home for "the system must satisfy this invariant" checks (it already runs `catalog.test`);
  a sibling test reuses the runner, the CI wiring, and the reviewer's mental model.
