# ADR-0025: edge↔edge crossings — bounded by a machine-checked baseline + made legible with bridges

- **Status:** accepted
- **Date:** 2026-06-19
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-EDGE-CROSSING (planned → implemented) / completes ADR-0012's honest boundary; reuses ADR-0021's `introspect` polylines

## Context
ADR-0012 guaranteed *box* non-overlap (nodes, labels) but **honestly scoped edge line/path crossings
OUT**: "a genogram or loop necessarily has crossing relations; we guarantee box non-overlap, not
planarity." After the edge↔node and label↔label gaps were driven to zero (ADR-0021/0024), edge↔edge
crossings were the one remaining out-of-scope layout concern. The owner asked to **bring it into
scope — spec and implement**.

Universal planarity is genuinely impossible here: clinical graphs (genograms with multiple relation
types, maintaining loops with a cross-ring exit, parts maps with a polarization tie) are routinely
non-planar, and the node order is *clinically meaningful* (a cycle's sequence, a protector arc), so
"reorder until planar" would change what the diagram says. So the honest move is not "guarantee zero"
but the same pattern used for the other gaps: **measure, bound, and make legible.**

A census (`introspect.edgeSegments` + a proper-crossing test over the whole corpus) showed the corpus
is *already near-planar*: only **4 of 39** examples have any non-incident edge crossing, each just 1–2,
all of one structural kind — a dashed **EXIT** chord escaping across a cycle ring (`cat-sdr`,
`depression-flower`, `showcase-process-loop`) and a cross-map **POLARIZATION** tie
(`showcase-parts-map`). There are essentially no *gratuitous* crossings to remove.

## Decision
1. **Primitive (`layout.segSegCross`).** Proper segment intersection (both parameters strictly inside
   (0,1)) → the interior crossing point or `null`; shared vertices / endpoint touches do NOT count, so
   incident edges meeting at a node are never "crossings." Deterministic.
2. **Detection (`introspect.edgeCrossings`).** Every proper crossing between two distinct
   `data-el="edge:*"` polylines (curved edges flattened via the now-exported `pathToSegments`),
   ordered as drawn (so the bridge pass knows which edge is on top). Incidence is filtered by the
   *caller* (this layer has no model); two edges sharing a node meet, they don't cross.
3. **Invariant (`crossing.test.ts`, REQ-EDGE-CROSSING).** For every example (both layers — geometry is
   layer-invariant), count non-incident crossings and assert `count <= CROSSING_BASELINE[file]`
   (default 0). A NEW gratuitous crossing fails CI — the regression guard. The 4 structural crossings
   are pinned + documented in the baseline; reducing one means updating its baseline (a deliberate,
   reviewed act).
4. **Legibility — the bridge / casing (`addCrossingBridges` in `index.ts`).** At each non-incident
   crossing, draw a short white casing + black re-stroke on the **over** edge (the SOLID one, so the
   re-stroke is continuous; tie-broken to the later-drawn edge), centred on the crossing along the
   over-edge's local direction — the metro-map / circuit "line hop". Monochrome and redundant with no
   colour (accessibility-first, spec §D). The marks carry **no `data-el`**, so they are decorative: the
   invariant still COUNTS the structural crossing (we don't pretend it away), but a reader can trace
   which line passes over which. Wired into the two renderers that actually cross (`renderLoopMap`,
   `renderPartsMap`); a crossing-free diagram gets zero marks and stays byte-identical.
5. **Minimization where the renderer orders siblings** is the first resort (e.g. decision-nav's
   cycle-aware layered layout, ADR-0010); the census shows nothing gratuitous remains to minimize, so
   no speculative re-ordering code was added (YAGNI — the invariant would flag a future regression).

## Consequences
- **Positive:** edge↔edge is now a **first-class, machine-checked, bounded** property instead of an
  ignored one — the honest analog of the node/label guarantees. The few unavoidable crossings are
  *legible* (bridged), not hidden. Detection reuses the ADR-0021 `introspect` polylines, so the test
  and the bridge pass reason about identical geometry. Tiny, contained churn: only 4 goldens gained
  bridge marks; +78 invariant cases.
- **Negative / honest scope:** this is **not planarity** and never claims to be — the guarantee is
  *bounded + legible*, and the baseline pins a (currently 4-crossing) residue that is structural, not a
  bug. A pathological future diagram with a true tangle would fail the invariant and be triaged
  (minimize, accept+bridge+pin, or document) — the same disciplined path the other gaps used.
- **Impact:** `packages/render/layout.ts` (+`segSegCross`), `introspect.ts` (+`edgeCrossings`,
  `pathToSegments` exported), `index.ts` (+`addCrossingBridges`/`edgeIncidence`, wired into
  loop/parts), `crossing.test.ts` (new); 4 goldens; REQ-EDGE-CROSSING → implemented; ADR-0012's
  "out of scope" boundary updated by an append-only note pointing here.

## Alternatives considered
- **Promise zero crossings (planarize).** Rejected — impossible for non-planar clinical graphs without
  destroying meaningful node order; would force long detours or dishonest re-labelling.
- **Topologically lift the over-edge so the lines truly don't touch (count → 0).** Rejected — a simple
  semicircular hop still intersects the under-line geometrically (it only moves WHERE they cross), so
  it cannot make the count zero without real rerouting; the honest model is "count the crossing, bridge
  it for legibility."
- **Route edges around each other (edge↔edge avoidance via the router).** Rejected for now — the
  `EdgeRouter` (ADR-0024) avoids NODES; edge-edge avoidance can create new crossings and long detours,
  disproportionate when the residue is 4 structural crossings. The invariant leaves the door open.
- **Global white casing on every edge (automatic bridges everywhere).** Rejected — doubles every edge
  element and churns all 39 goldens with heavier-looking lines, for a 4-crossing payoff; per-crossing
  bridges keep non-crossing diagrams byte-identical.
