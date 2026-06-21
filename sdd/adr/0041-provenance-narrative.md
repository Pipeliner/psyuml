# ADR-0041: the contested-origin disagreement narrative (the "how" behind ⚖)

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-PROVENANCE-NARRATIVE (→ **implemented**) / roadmap-to-v1 §3; v0.2 §G.2; follows ADR-0007

## Context
ADR-0007 made cross-school disagreement visible: a node claimed by ≥2 schools renders the
**contested-origin marker** `⚖ A vs B` and names the conflict in alt-text. But that only says **which**
schools disagree, not **how**. A clinician (or a client reading their own formulation) sees that IFS and
schema therapy both claim the "inner critic" — but not that IFS reads it as a *protector with positive
intent* while schema therapy reads it as a *punitive-parent mode to be limited*. REQ-PROVENANCE-NARRATIVE
asks to capture + render that **substance**, without resolving the disagreement into one view (§G.2 MUST).

## Decision
Add a model field for the disagreement narrative and render it.

1. **Capture (`@psyuml/model`).** A new optional `Properties.provenanceNote: string` — a short narrative
   of HOW the schools in `provenance` differ on this element. Additive; every existing model is
   unchanged.
2. **Render (`renderPartsMap`).** On the clinician/interpretive surface, each contested node (`schoolClaims
   > 1`) that carries a `provenanceNote` contributes a line to a **footnote** above the legend
   (`⚖ <name>: <note>`, plain text — not `data-el`, like the legend/disclaimer, so the overlap invariant
   is untouched) and the same substance is appended to the **alt-text** (`How they differ — …`). The
   canvas grows to fit (the parts-map height already content-fits). The client/picture profiles
   (`showInterpretive: false`) hide it, like the rest of the analytic surface. The ⚖ marker (which) is
   unchanged; this adds the how.
3. **Nudge (`@psyuml/validate`).** A contested node (mixed-school) that has **no** `provenanceNote` gets
   an `info` issue `provenance.narrative-missing` ("shows THAT schools disagree but not HOW — add a
   provenanceNote…"). Info only — never blocks (mirrors the existing `provenance.node-mixed-school`).
4. **Example + tests.** The showcase parts-map's contested "inner critic" gains a real `provenanceNote`;
   a render test (visible footnote + alt-text, gated to clinician), a validate test (the nudge, satisfied
   by a note), and the model parse cover it.

## Consequences
- **Positive:** a contested node now explains the *substance* of the disagreement, in two channels —
  **visible** (the footnote, so it survives PNG/print export) and **accessible** (alt-text/`<desc>`) —
  while the ⚖ marker keeps naming which schools; nothing is merged (§G.2 upheld). The validate nudge
  steers authors toward filling it in. Additive, golden-stable except the one enriched showcase.
- **Cost / honest scope:** rendered in the **parts-map** (the canonical contested-origin renderer,
  ADR-0007); the loop-map's contested surface gets the field + alt-text path but not (yet) the visible
  footnote — recorded as a follow-up. The note is **free text** (one short narrative), not a structured
  per-school table — disagreements aren't always a clean A-says-X / B-says-Y split, so free text is the
  honest, flexible representation; a structured form can come later if needed. Long notes are
  `fitText`-compressed to the canvas width.
- **Impact:** `packages/model/index.ts` (+`provenanceNote`), `packages/render/index.ts` (`renderPartsMap`
  footnote + alt-text), `packages/validate/index.ts` (the nudge), `examples/showcase-parts-map.psyuml`
  (+golden), the model/render/validate tests, `sdd/traceability.json` (REQ → implemented).

## Alternatives considered
- **A structured `provenanceClaims: { school, view }[]`.** Deferred — assumes a clean per-school
  decomposition that real disagreements don't always have; a free-text narrative covers every case and
  is simpler. The structured form is a possible future refinement.
- **Alt-text only (no visible footnote).** Rejected — a clinician's exported PNG/print would lose the
  substance; the visible footnote keeps it on the page (the alt-text is the accessible mirror).
- **Draw the narrative at the node.** Rejected — the parts-map orbit is already dense (role tag +
  wrapped name + provenance + ⚖); a bottom footnote keeps it legible and overlap-clean.
