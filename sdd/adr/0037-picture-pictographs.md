# ADR-0037: picture-profile pictographs — the mechanism, honestly gated

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-PICTURE-PICTOGRAPHS (→ **implemented**, the buildable half) / roadmap-to-v1 §1, §8; v0.2 §5; follows ADR-0016, ADR-0017

## Context
The **picture** audience profile (low-literacy / child / AAC) is today just "client layer + a flag"
(ADR-0016): plain words, no drawn symbols. REQ-PICTURE-PICTOGRAPHS asks for real pictographs — but it
is **gated on the comprehension studies** (REQ-STUDY-PREREG): a symbol a child or a distressed adult
*misreads* could do harm (the way-out especially), so a pictograph MUST clear its ISO-9186 bar
**before** it ships, and a failed symbol is **redrawn, never kept**. The studies have not run, and an
LLM dry-run is not a sample.

This is exactly the bind ADR-0017 handled for notation testing: **ship the buildable half honestly,
keep the human-study half gated, never fabricate a result.** The same shape applies here.

## Decision
Build the pictograph **mechanism + candidate registry + Tier-A gate**, in `@psyuml/profiles`, and wire
it in *inert* — nothing unvalidated reaches a diagram.

1. **Registry (`PICTOGRAPHS`).** A small, novice-first set of drawn candidate icons (24×24 SVG), each
   paired one-to-one with a core concept (`self` / `part` / `feeling` / `resource` / `exit` /
   `trigger` / `reach-out`), each **dual-coded** with a redundant word (a pictograph is never
   icon-alone, §D) and each `comprehension: 'pending'`.
2. **Tier-A audit (`auditPictographs`).** The automatable pre-study gate (mirrors `auditNotation`):
   unique id + gloss + drawn icon, **discriminable** icons (no two identical), **every** symbol
   dual-coded (stricter than `auditNotation`, which requires the word only for safety-critical), and
   the **honesty gate** — while `PICTOGRAPH_STUDY_RUN` is `false`, every symbol MUST be `pending`, so a
   symbol can never be marked `passed` (and shipped) without recorded study data.
3. **Gated render hook (`pictographFor`).** Returns a pictograph **only if it has passed** — so in
   v0.x it returns `undefined` for every concept and the picture profile stays "client + flag". The
   mechanism is wired but inert; no golden changes. `availablePictographs()` is `[]`.
4. **Candidate sheet (`pictographKeySvg`).** Renders the set-under-test with a prominent "CANDIDATE …
   NOT validated" banner + each icon's word, gloss, bar, and `⏳ pending` status — the artefact a study
   shows participants. The editor surfaces it in **picture mode** with copy stating the diagram still
   uses words because nothing has passed the gate.
5. **Ledger.** `docs/adoption/comprehension-instruments.md` gains a pictograph ledger (Instrument D
   extension), every row `pending`.

REQ-PICTURE-PICTOGRAPHS → **implemented** for its buildable half (mechanism + registry + Tier-A + the
honest gate); the Tier-B comprehension study remains the v1.0 gate under REQ-STUDY-PREREG.

## Consequences
- **Positive:** the picture-pictograph machinery exists, is CI-checked (Tier-A green), is **visible**
  (the candidate sheet in picture mode) so it can actually be studied, and is **structurally
  honest** — the gate (`PICTOGRAPH_STUDY_RUN` + the audit rule) makes shipping an unvalidated symbol a
  test failure, not a judgement call. Reuses the ADR-0017 pattern, so the project tells one consistent
  story about "buildable now vs gated on people".
- **Cost / honest scope:** the picture profile renders **no drawn symbols yet** — by design. The icons
  are first-draft candidates (ISO 9186 recommends novices, not experts, draft the most transparent
  symbols; a real study may well replace several). `@psyuml/profiles` now emits a little SVG (the key),
  which is a mild widening of its role (it already emits audits/strings); kept dependency-free.
- **Impact:** `packages/profiles/index.ts` (+`PICTOGRAPHS`, `ComprehensionStatus`, `Pictograph`,
  `PICTOGRAPH_STUDY_RUN`, `auditPictographs`, `pictographFor`, `availablePictographs`,
  `pictographKeySvg`), `packages/profiles/index.test.ts` (the Tier-A + gate + anti-fabrication tests),
  `apps/web/App.tsx` (picture-mode candidate panel), `docs/adoption/comprehension-instruments.md` (the
  pictograph ledger), `sdd/traceability.json` (REQ → implemented).

## Alternatives considered
- **Draw the pictographs into the picture render now (ship them).** Rejected — that is exactly the
  unvalidated-symbol harm the REQ guards against; a misread way-out is a safety defect. The gate keeps
  them out until tested.
- **Mark the candidates `passed` from an LLM "dry run".** Rejected outright — fabricated evidence; the
  audit's gate rule makes it a hard failure.
- **Wait for the studies before writing any code (keep REQ planned).** Rejected — the registry, audit,
  gate, and candidate sheet are real, useful, testable work that a study *needs as input*; building
  them now (inert) is honest and unblocks the study, exactly as ADR-0017 did for notation.
- **Put the candidate-sheet renderer in `@psyuml/render`.** Rejected for now — it would add a
  `render → profiles` dependency for one small sheet; profiles already owns the symbol registries and
  audits, so the key lives beside them (render stays independent, zero golden risk).
