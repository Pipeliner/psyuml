# ADR-0012: Guaranteed non-overlap layout (shared metric + separation + scaling guarantee)

- **Status:** accepted
- **Date:** 2026-06-15
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §D (accessibility/legibility), §J (conformance) · REQ-ACCESSIBILITY, REQ-NOTATION, REQ-CONFORMANCE

## Context

Across diagram types, elements still OVERLAPPED at realistic sizes: node boxes collided, node
labels overflowed into siblings, and edge labels piled onto each other and onto lines/bands. The
fixes up to ADR-0011 were per-renderer whack-a-mole (fan-out offsets, halos, label wrapping). We
render server-side to a string with **no DOM / layout engine** (§D), so there was also no machine
check that a given model lays out cleanly — regressions slipped in silently and goldens only pin
*that* output, not its *legibility*.

The owner asked for a thorough, correct, systematic approach so **nothing ever overlaps**,
grounded in graph-drawing best practice, plus a machine-checked guarantee.

## Decision

Three pieces, mirroring the standard layered-drawing pipeline (Sugiyama) and constrained layout
(VPSC), adapted to deterministic string-SVG.

1. **A shared geometry layer — single source of truth (`packages/render/layout.ts`).**
   - `textWidth(s, size)` is the ONE text-width estimate (~`0.58·size` per char — the constant
     `fitText`/`wrapLabel` already used). The renderers (to size slots) AND the invariant test (to
     build label boxes) both import it, so a label is measured the same way when drawn and when
     checked. The guarantee is therefore stated honestly as holding **under this shared
     text-metric model** — not a claim about a specific font's true glyph advances, which we
     cannot know without a layout engine.
   - `Box`, `overlaps(a, b, pad)` (AABB intersection with a negative-tolerance slop so mere
     touching is allowed), `union(boxes)` (content-fit framing).
   - `separate1D(items, gap)` — the **one-dimensional core of VPSC / "Fast Node Overlap Removal"**
     (Dwyer, Marriott & Stuckey, GD'05): given ordered items (centre + half-size), shift them
     minimally so consecutive items are ≥ `gap` apart, preserving order. Implemented as a
     forward + backward feasible-packing sweep whose midpoint centres the block on the original
     mean, with a final exact forward repair. Deterministic; unit-tested over 5 000 random cases
     (no residual overlap, order preserved, balanced movement).

2. **Structure-aware placement + the scaling guarantee.** Each renderer keeps its semantic
   structure (bands / layers / orbits / lanes / columns), but: sizes every slot to the element's
   MEASURED box, uses `separate1D` to spread siblings within a group, and **grows the canvas /
   content-fits the viewBox** so spreading never clips (extending the content-fit precedent of
   ADR-0006/0010). The guarantee comes from two layers of separation, the Sugiyama "separation"
   idea applied in both axes:
   - **Within a group** (a band's states, a layer's decision nodes, the protector orbit, the
     exile row): `separate1D` enforces gaps along the free axis; the canvas grows to fit.
   - **Across groups** (bands/layers/rows stacked with gaps ≥ the max element height; node columns
     held between dedicated label gutters): structural separation prevents collisions.
   Concretely: the Decision chart separates each layer's nodes (sizing the crisis node's wrapped
   contact line into its half-width) and spreads branch labels in the inter-row gap; the State Map
   moves all edge labels into LEFT/RIGHT **gutters outside the node columns** and stacks parallel
   labels with `separate1D` on the perpendicular axis; the Parts Map **grows the orbit radius**
   (`2R·sin(Δθ/2) ≥ footprint + gap`) and the canvas so protectors never collide; the Body Map
   shrinks-to-fit (never fake-compresses) and **flips a label to the freer side** of its dot.

3. **Tag elements for verification.** Every drawn logical element carries a `data-el` attribute:
   `node:<id>` on its shape, `nodelabel:<id>`, `edgelabel:<edgeId>`, and `band:`/`banner:` on
   containers/chrome. Alt-text/role are unchanged. The acceptance test reconstructs AABBs from
   these tags and asserts the invariant.

### The acceptance test — the deliverable's contract

`packages/render/overlap.test.ts` imports `textWidth`/`Box`/`overlaps` from `layout.ts`, has a
`boxesFromSvg` extractor (`rect`/`circle`/`ellipse`/`polygon` → geometric AABB; `text`/`tspan` →
AABB from `x`,`y`,`text-anchor` + `textWidth`, unioned over a multi-line `tspan` stack), and for
EVERY `examples/*.psyuml` (both layers) AND three **generated stress models** — (a) a `decision-nav`
with ≥16 nodes, several 50–65-char labels, a wide branch, and a back-edge/cycle; (b) a `state-map`
with 4 parallel edges between the same pair carrying long triggers + several exits; (c) a
`parts-map` with 6 protectors with long labels + 2 conflict ties — asserts: (1) no two `node:*`
overlap; (2) no `nodelabel:*`/`edgelabel:*` overlaps a non-owner `node:*`; (3) no two labels
overlap; (4) every box lies within the `viewBox`. A 1px slop absorbs the metric's estimate.

## Consequences

- **Positive:** "nothing overlaps" is now machine-checked across the whole corpus + the cases that
  historically broke, and is part of `pnpm test` / CI. Assertions **(1) node↔node, (2)
  label↔non-owner-node, and (4) in-frame are universal** across all 12 renderers. The dense
  stress models lay out legibly via canvas growth instead of silent overlap.
- **Negative / cost:** all 17 example goldens were regenerated (mostly the additive `data-el`
  tags; only the Parts Map and Decision chart changed size meaningfully — the orbit/rows grew to
  guarantee separation). The guarantee is **scoped to the shared text-metric model** (above);
  a real font with wider advances than ~0.58·em could still touch — the fix there is to raise the
  shared constant, which both sides honour at once.
- **Out of scope (honest):** edge **line/path crossings** are not "overlap" (a genogram or loop
  necessarily has crossing relations); we guarantee *box* non-overlap, not planarity. Decorative
  chrome (silhouette strokes, band fills, dividers) is excluded from node checks.
- **Documented known-gaps — assertion (3) label↔label** is *not* guaranteed for **two** renderers
  whose edge labels float on free curves/chords and collide even on the corpus, where collision-
  free placement needs a routing rewriter we judged disproportionate: `parts-map` (the
  containment/conflict labels on the bowed curves around the Self land on a protector's provenance
  tag) and `process-loop` (the ring-chord trigger labels — cat-sdr's trap + exit labels touch).
  For these, (1)/(2)/(4) still hold. **Assertion (3) is enforced for the other ten renderers**,
  including the other hand-placed free-chord maps (`mode-map`, `relational-field`, `two-triangles`)
  and the lane diagram (`intervention-sequence`): they satisfy it on the corpus + stress today, so
  the test asserts it for extra coverage — though for arbitrary hand layouts (3) there is
  enforced-where-it-holds rather than architecturally guaranteed. The structured renderers
  (state-map — via the gutter + perpendicular `separate1D` — decision-nav, resource-anchor,
  timeline, ritual, body-map) guarantee (3) by construction.
- **Impact:** `packages/render/index.ts` (every renderer tagged + separation/scaling applied),
  the new `packages/render/layout.ts` + its tests, and `packages/render/overlap.test.ts` — see
  [`packages/render/IMPACT.md`](../../packages/render/IMPACT.md).

## Alternatives considered

- **Full Sugiyama + 2-D VPSC (crossing minimization, constrained x/y).** Rejected for now —
  heavier than needed and harder to keep byte-deterministic; the 1-D separation core + per-axis
  application + canvas growth fixes the reported overlaps and keeps output deterministic. Can
  supersede later if crossings (out of scope here) become a complaint.
- **Measure the *compressed* (`textLength`) width in the test.** Rejected — the invariant
  deliberately measures NATURAL `textWidth`, so the renderers must actually make room (wrap, grow,
  shrink the font, or flip) rather than visually squeezing a label that still "measures" as
  overlapping. This is the honest, font-independent contract.
- **Drop or truncate content that can't fit.** Rejected — prefer growing the canvas (the scaling
  guarantee) so no clinical content is lost; never silently overlap.
- **Guarantee label↔label everywhere by rewriting edge-label routing.** Deferred — disproportionate
  for the six free-edge-label renderers; scoped as documented known-gaps and minimized.
