# ADR-0039: persisted case file + editor composite authoring

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-CASE-FILE (→ **implemented**) / roadmap-to-v1 §3, §2; follows ADR-0019

## Context
The v0.2 **Composite board** (ADR-0019) renders several views of one case (`renderComposite` +
`sharedNodeIds`), but it is **in-memory and render-only**: there is no way to *save* a multi-view case
and reopen it, and the editor can only hold one model at a time — it cannot **author** a composite as a
durable artefact. REQ-CASE-FILE asks for a persisted multi-document case format + editor composite
authoring, **additively** (a case file is a set of existing models, never a model-schema change).

## Decision
Add a **case-file format** in `@psyuml/model` and **composite authoring** in the editor.

1. **Format (`CaseFile`, `@psyuml/model`).** A small container schema: `{ version, kind: 'case-file',
   meta: { title?, note? }, documents: PsyumlModel[] }`. Each `document` is an ordinary, fully-validated
   `PsyumlModel` (zod defaults applied) — so the case file is **purely a container, never a schema
   change**. The `kind: 'case-file'` literal is the **discriminator** an opener uses to tell a case file
   from a single model (a single model has no `kind`, so `parseCaseFile` rejects it). Helpers:
   `parseCaseFile` / `serializeCaseFile` (a lossless round-trip, like `parseModel`/`serializeModel`)
   and `caseFileFrom(documents, meta)`.
2. **Authoring (editor).** The existing in-memory board *is* the case file's `documents`. The Composite
   panel gains: a **case-title** field, **Save case file** (downloads `<slug>.psyuml-case`), **Open case
   file** (reads a `.psyuml-case`, repopulates the board + title, shows the composite), and a **per-view
   list with Remove** — so a composite can be genuinely *authored* (add / drop a view / reorder by
   re-adding), not only appended-to and cleared. `renderComposite(board)` is unchanged — the board has
   always been `PsyumlModel[]`, which is exactly `documents`.
3. **Verification.** A model round-trip + discrimination unit test, and a Playwright e2e that **authors
   two views, saves the `.psyuml-case`, clears, reopens it, and confirms the board repopulates** — the
   persistence loop checked end-to-end in a real browser.

## Consequences
- **Positive:** a case (several formulation views of one client) is now a **durable, shareable file**,
  and the editor can author it. Zero model-schema change and zero renderer change — the format reuses
  `PsyumlModel` and the board reuses `renderComposite`. The discriminator keeps Open robust (a case
  file and a single model can't be confused).
- **Cost / honest scope:** a case file **aggregates several views of one person → it is more
  identifying** than a single view; the §L.2 disclaimer + de-identification (REQ-PRIVACY / `toFhir`)
  are unchanged and apply **per document** (the case file adds no new PII handling — noted in the
  schema doc). Authoring is snapshot-based (a board view is a copy; editing the single model doesn't
  mutate a board entry — pull it back by re-adding); in-place view editing + reorder-by-drag are future
  polish. No CLI surface yet (the case file is an editor artefact).
- **Impact:** `packages/model/index.ts` (`CaseFile` + `parseCaseFile`/`serializeCaseFile`/
  `caseFileFrom`), `packages/model/index.test.ts` (round-trip + discrimination), `apps/web/App.tsx`
  (the authoring controls + case-title state), `apps/web/styles.css` (`.link-like` remove button),
  `e2e/onboarding.spec.ts` (the round-trip), `sdd/traceability.json` (REQ → implemented).

## Alternatives considered
- **Make `CaseFile` a new top-level model variant (a discriminated union with `PsyumlModel`).**
  Rejected — that entangles the case container with the model schema; a separate container type keeps
  the model untouched and the change additive.
- **Persist the board to `localStorage` instead of a file.** Rejected as the primary path — a *file*
  is shareable/portable and matches the existing `.psyuml`/SVG export model (local-first, ADR-0020);
  `localStorage` autosave could be a future convenience on top.
- **Author the composite layout (positions of the panels).** Deferred — `renderComposite` arranges the
  panels deterministically; bespoke composite layout is out of proportion to the need now.
- **A bespoke `.psyumlcase` binary/zip.** Rejected — plain JSON (`.psyuml-case`) is diff-able,
  inspectable, and round-trips with one zod schema; no packaging dependency.
