# ADR-0021: layout-quality invariants — text-in-container + edges-don't-cross-nodes

- **Status:** accepted
- **Date:** 2026-06-18
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §D (notation legibility), §J (conformance) / REQ-LAYOUT-QUALITY (new), extends ADR-0006 (fit-to-box), ADR-0012 (guaranteed non-overlap)

## Context
ADR-0012 made "nothing overlaps" a machine-checked invariant — but it scoped two things OUT, by its
own honest admission: a node's **own** label could still overflow its box (containment was never
asserted — check #2 explicitly *skips* the owner node), and **edge line/path crossings** ("an arrow
through a node") were declared out of scope. Those are exactly the two defects a user flagged:
"ensure inner nodes (including text) always fit their container, and arrows don't intersect nodes."

A deep-research pass on diagram-layout algorithms (`docs/research/layout-algorithms.md`, five cited
angles) established the state of the art and, crucially, what is *deterministically testable*:

- **Text fit** is guaranteed by estimating width (average-advance ≈ 0.5–0.6·em) and **compressing a
  long label to the box width**; PsyUML already does this (`fitText`/`wrapLabel` emit SVG
  `textLength`+`lengthAdjust`). The missing piece was *honouring `textLength` when measuring* and
  *asserting containment*.
- **Edge↔node** has a formal name — **edge–vertex resolution > 0** — and a deterministic test: flatten
  the edge to a polyline and run **segment–rectangle** intersection against every non-incident node
  (the dual of boundary-clipping math).
- **A universal zero edge–node guarantee needs an obstacle-avoiding router** (visibility-graph /
  libavoid-class, Wybrow–Marriott–Stuckey GD'09) — a substantial library with no small dependency-
  free TS port. So a blanket guarantee is out of proportion for this renderer; the honest move is to
  enforce where the deterministic layout reserves channels and document the rest (as ADR-0012 did for
  label↔label).

Constraint: additive, dependency-free, deterministic (golden-test-stable).

## Decision
1. **New geometry primitives in `layout.ts`** (pure, unit-tested): `contains` (AABB-in-AABB),
   `segIntersectsBox` (Liang–Barsky segment↔rectangle, with a slop pad), `clipToBox` (Liang–Barsky
   entry point). The existing `separate1D` (1-D VPSC core) is **validated unchanged** by the research.
2. **Shared introspection `introspect.ts`** — `boxesFromSvg` (moved out of `overlap.test.ts` so both
   invariants share ONE extractor) now **honours `textLength`** (a compressed label measures at its
   rendered width, not the natural estimate), and `edgeSegments` flattens each `data-el="edge:*"`
   path (`M/L/H/V/Q/C`) / line into polyline segments. Every renderer now tags edges
   **`data-el="edge:<id>"`**.
3. **`layout-quality.test.ts`** asserts, over the corpus in both layers:
   - **(A) Containment** — every *interior* node label (centre inside its node box) is contained
     within that box (a few-px slop for the shared metric's unmodeled bold weight / sub-pixel
     advances). Enforced for the **label-in-box** renderers (state-map, timeline,
     intervention-sequence, ritual, two-triangles, decision-nav, process-loop). Captions drawn
     beside/below a glyph **by design** (body-map markers, relational-field genogram symbols,
     parts-map circles, mode-map glyphs, resource-anchor chips, the observing-eye eye, the
     crisis-resources contact line) are recognised by their **centre being outside** the node box and
     skipped — no renderer-specific allow-list.
   - **(B) Edge↔node** — no edge segment passes through a non-incident node. Enforced for every
     tagged-edge renderer EXCEPT a documented **`EDGE_NODE_KNOWN_GAP`**.
4. **Boundary clipping** is applied where an edge ran centre-to-centre: ritual edges now use
   `clipToBox`, so the arrowhead lands on the target's border.

## Consequences
- **Positive:** the two user-named defects are now machine-checked. Containment turns the
  *implicit* `textLength` fit-guarantee into an *asserted* one; edge↔node closes ADR-0012's explicit
  gap with the literature's exact primitive. One shared `introspect` keeps both invariants and the
  overlap invariant measuring identical geometry (honouring `textLength` also makes the overlap test
  more truthful). All additive; no schema/Tier-1 change.
- **Negative / cost:** **`EDGE_NODE_KNOWN_GAP` = {state-map, ritual, decision-nav}** — three
  renderer-routed cases where a straight edge can still cross a node and closing it needs an
  obstacle-avoiding router we judged disproportionate: *state-map* (a band may hold several nodes in
  one row; the side-lane H-segment can cross a sibling), *ritual* (a cross-phase edge is a diagonal
  that can clip a stacked phase node — clipping fixes the endpoints, not the middle), *decision-nav*
  (a back-/long edge can cross an intervening-layer node). This is the honest scope, recorded so it
  can be closed later (e.g. an orthogonal/visibility-graph router, or per-renderer rerouting). The
  containment slop (~3px) tolerates the shared metric's bold/sub-pixel error rather than modelling
  bold widths. Edge tagging changed every golden SVG (regenerated; node/label geometry unchanged).
- **Impact:** `packages/render/layout.ts` (+ primitives, + test), `packages/render/introspect.ts`
  (new), `packages/render/overlap.test.ts` (refactored onto `introspect`),
  `packages/render/layout-quality.test.ts` (new), `packages/render/index.ts` (edge `data-el` tags +
  ritual `clipToBox`); traceability REQ-LAYOUT-QUALITY + milestone M18; `docs/research/layout-algorithms.md`.

## Alternatives considered
- **Implement obstacle-avoiding orthogonal routing (libavoid-class) to GUARANTEE edge↔node
  everywhere.** Rejected for now — a large algorithm (orthogonal visibility graph + A* + nudging),
  no small dependency-free TS port; disproportionate vs. enforcing where channels already exist +
  documenting three gaps. Recorded as the future path to shrink `EDGE_NODE_KNOWN_GAP`.
- **Auto-grow every node to its label instead of compressing the text.** Rejected — growing a node
  forces layout re-flow/overlap resolution and churns goldens; the existing compress-to-`textLength`
  fit is deterministic and already guarantees containment. (Auto-grow stays available via the layout
  primitives if a future renderer wants it.)
- **Assert containment against the glyph for label-beside designs (genogram, body-map, …).**
  Rejected — those labels are *meant* to sit outside the small glyph; the right container is the
  node's reserved cell, which isn't a tagged box. The centre-outside rule skips them without a
  per-renderer allow-list, and they remain covered by overlap #2 (label↔non-owner-node) + #4
  (in-frame).
- **Loosen ADR-0012's overlap test to also catch edge crossings.** Rejected — overlap is about
  *boxes*; edge↔node is segment geometry. Keeping them as separate, named invariants (and separate
  ADRs) is clearer and matches the research's metric taxonomy.
