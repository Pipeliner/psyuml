# Impact — `packages/model/` (`@psyuml/model`)

**Purpose:** the school-agnostic canonical model — the source of truth every view
projects from. (M0: skeleton; M1: full metamodel.)
**Status:** implemented (M1 — full canonical metamodel + schoolClaims + meta.consent)
**Spec anchor / REQ:** REQ-CORE-ONTOLOGY, REQ-EPISTEMIC-STATUS, REQ-I18N

## Upstream (this depends on)
- Nothing in code — `model` is the root of the dependency DAG (no UI/vendor deps, by design).
- `../../docs/specification/psyuml-v0.1.0.md` §A — the metamodel it encodes.

## Downstream (depends on this) — blast radius
> **Blast radius: highest in the repo.** Everything depends on `model`: `validate`,
> `profiles`, `render`, `grammar`, `interop`, `ai`, `apps/web`, `conformance`. Keep it
> small and stable; a breaking change here ripples everywhere.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/model`, source-level exports) | — | workspace resolution | — | low |
| `index.ts` | Model API (`createEmptyModel`, `PsyumlModel`, `getText`, `serializeModel`; `schoolClaims` — the school-agnostic provenance-claim reader shared by validate + render, ADR-0007). **v0.2 (ADR-0014/0015, additive/backward-compatible):** `EpistemicStatus` gains the §3 provenance values `jointly-agreed` / `clinician-inferred` / `contested`; `INTERPRETIVE_STATUSES` + `isInterpretive()` are the shared descriptive-vs-interpretive predicate (render + lints agree); `Properties.asIf` is the §4/§6 ontology-neutral "as-if" qualifier; `Edge.loopTopology` (`trap`/`dilemma`/`snag`) is the §4 CAT loop-shape tag. **Case file (ADR-0039, REQ-CASE-FILE):** the `CaseFile` schema — `{ version, kind: 'case-file', meta, documents: PsyumlModel[] }` — a **pure container** of several views of one case (the saved Composite board), with `parseCaseFile`/`serializeCaseFile` (lossless round-trip) + `caseFileFrom`; the `kind` literal discriminates a case file from a single model. NEVER a model-schema change — each document is an ordinary `PsyumlModel` | — | all dependents | §A, §G.2, v0.2 §3/§4, §2 / REQ-CORE-ONTOLOGY, REQ-CROSS-SCHOOL, REQ-EPISTEMIC-STATUS, REQ-PROVENANCE-CONFIDENCE, REQ-PATTERN-SEMANTICS, REQ-CASE-FILE, REQ-PROVENANCE-NARRATIVE | **high** |
| `index.test.ts` | Unit tests for the model API | `index.ts` | CI `test` | — | low |

## Change checklist
- [ ] Update the spec §A first if the metamodel's semantics change (§K versioning).
- [ ] Re-test every downstream package (see `sdd/README.md` blast-radius table).
- [ ] Flip the relevant `REQ-…` status in `sdd/traceability.json` as work lands.
- [ ] Ran `node sdd/check.mjs` (green).
