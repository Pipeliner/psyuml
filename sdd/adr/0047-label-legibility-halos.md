# ADR-0047: white legibility halos on every label that sits over a line or decoration

- **Status:** accepted
- **Date:** 2026-06-28
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-LABEL-HALO (→ **implemented**) / §D (notation), §J (conformance); extends ADR-0011 (eval-round-2 halos) and ADR-0045/0046 (the legibility/containment invariants)

## Context

The diagram audit (and the goal "continue improving legibility/clarity/UX") surfaced a pervasive,
low-grade legibility problem: a word drawn ON or beside a line read with the line striking straight
through it. It was everywhere a label meets geometry — `process-loop`'s "trigger" on its arrow,
`mode-map`'s "attacks"/"yields" and the `dom` numeral on the trigger edges, `two-triangles`'
"hides"/"stirs" on the triangle sides, `intervention-sequence`'s guard labels on the connectors,
`relational-field`'s tie labels, `secure-base`'s "SECURE BASE" / "SAFE HAVEN" banners crossing the
circle, and `body-map`'s sensation labels crossing the body outline.

The fix already existed in the codebase but was applied ad hoc: a white **under-glyph halo**
(`paint-order="stroke"` + a white stroke) so the line/shape is interrupted around the text — used by
`state-map` parallel-edge labels (ADR-0011), `parts-map`/`venn`/`tree-of-life`. Only **4 of 8** raw
edge-label emissions had it, and the `fitText`/`wrapLabel` helpers had no halo option at all, so the
labels they produced (intervention-sequence, decision-nav branches, mode-map names, secure-base
banners, body-map sensations) were bare.

## Decision

1. **Make the halo a first-class option of the shared text helpers.** `TextOpts.halo?: number` +
   a `haloAttr()` emitter; `fitText` and `wrapLabel` paint a white `paint-order="stroke"` halo of that
   width under the glyphs when set. One mechanism, used everywhere, invisible on the blank background
   (it only shows where text crosses a line or shape).

2. **Apply it to every label that can sit over geometry** — all edge labels (the 4 bare raw emissions
   + the `fitText`/`wrapLabel` ones), plus the over-decoration node labels (secure-base banners,
   body-map sensations, mode-map name + `dom` + "↑ grow").

3. **Guard it.** `legibility.test.ts` asserts **every `data-el="edgelabel:"` element carries
   `paint-order="stroke"`**, for every example × both layers — edge labels are the universal
   connector-borne case, so they are the machine-checked contract; a future bare edge label fails CI.

## Consequences

- **Positive:** every connector-borne and over-decoration word is now legible — the line breaks
  cleanly around the text instead of through it — across the whole corpus and both audiences, via one
  shared option. Purely additive (a white stroke under existing glyphs); geometry is unchanged, so the
  overlap/containment/crossing invariants are untouched. The legibility win can't regress (CI guard).
- **Cost (recorded):**
  - **25 goldens regenerated** — the halo is a visible attribute, so the committed renders updated;
    the change is stroke-only (no positions moved).
  - **Halo widths are hand-tuned per call** (3–4px) to the font size — wide enough to clear the line,
    narrow enough not to erode neighbouring glyphs; the metric isn't derived, just bounded by the
    existing legibility floor (`legibility.test.ts` still passes, no microtext).
  - The guard asserts edge labels specifically; over-decoration node-label halos (banners, body
    sensations) are applied but not separately asserted (they are not a uniform, enumerable class the
    way `data-el="edgelabel:"` is) — a reasonable scope, consistent with how the invariants target
    tagged elements.
- **Impact:** `packages/render/index.ts` (`TextOpts.halo` + `haloAttr` + `fitText`/`wrapLabel` +
  ~10 call sites), `packages/render/legibility.test.ts` (the halo invariant), 25 regenerated goldens,
  `sdd/traceability.json` (REQ-LABEL-HALO → implemented; M24).

## Alternatives considered

- **Route every edge label off its own line** (into a gutter, like state-map's parallel labels).
  Rejected — far more invasive across 8 renderers, moves geometry (golden churn + overlap re-checks),
  and a label *on* its edge is the clearest association; a halo keeps the placement and the legibility.
- **A solid white background rect behind each label.** Rejected — a rect is an opaque box that can
  itself overlap neighbours and reads heavier; `paint-order="stroke"` follows the glyph shape and is
  the lighter, already-established idiom here.
- **Leave it as ad-hoc per renderer.** Rejected — that is exactly how 4 of 8 edge labels ended up
  bare; a shared option + a CI guard is the durable fix.
