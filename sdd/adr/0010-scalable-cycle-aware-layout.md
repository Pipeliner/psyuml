# ADR-0010: Scalable, cycle-aware decision-chart layout + parallel-edge fan-out

- **Status:** accepted
- **Date:** 2026-06-15
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §E.1 (State Map), §E.8 (Decision/Navigation chart), §D (accessibility/legibility) · REQ-DECISION-NAV, REQ-NOTATION, REQ-ACCESSIBILITY

## Context
A usability eval surfaced three *information-losing* layout defects, confirmed on screen
**and in exported SVG** — building on ADR-0006's content-fit precedent:

1. **The Decision/Navigation chart collapsed on cycles (critical).** `renderDecisionChart`
   laid out nodes by a Kahn topological longest-path pass. A realistic crisis plan **loops
   back** ("still not safe → go back to the crisis step"), which is a CYCLE: the cycle nodes
   (and everything downstream of them) keep in-degree>0 forever, so Kahn never dequeues them
   and they all settle at `depth 0` — piling into one overlapping top row. The width was also
   fixed at `DEC_W`, so a wide layer crowded, and the two branch labels of a yes/no fork were
   placed at the same midpoint and overprinted.
2. **Parallel edges in the State Map smeared (high).** Two edges between the SAME state pair
   shared one routing lane and placed both labels at the same point, blending into an
   unreadable blur (e.g. "harsfctoiriticisithm partnoerk" from "harsh criticism" + "fight
   with partner").
3. **The decision-chart export dropped the disclaimer (medium).** `renderDecisionChart`
   rendered the title and crisis banner but omitted `model.meta.disclaimer` — present in the
   JSON and on screen — so the exported SVG was not self-complete (unlike the State/Parts/
   Resource maps, which show it).

## Decision
- **Break cycles before layering (standard layered-graph handling).** `layerWithCycleBreak`
  does an iterative DFS from the in-degree-0 roots (or, if all nodes are in a cycle, from the
  first node), classifies **back-edges** (those reaching a node currently on the DFS stack),
  and runs the longest-path layering on the **forward edges only** — now a DAG — so every node
  gets a sensible depth/rank instead of collapsing onto row 0. Separate components and
  unreached nodes are still visited so they get a depth.
- **Grow the canvas to fit the content (mirrors `renderLoopMap`).** The drawing width fits the
  widest layer (each node gets `DNODE_W` + `DNODE_GAP`; the frame never shrinks below
  `DEC_W`), the height grows with depth, and the SVG emits a **content-fit viewBox** computed
  from the actual drawn bounds (incl. any leftward poke and the crisis node's wrapped contact
  lines) plus `DEC_PAD`, instead of a fixed `0 0 DEC_W height`. The crisis banner spans the
  fit width.
- **Stop label/node overlap.** A back-edge points UP, so it routes from the source's top to
  the target's bottom; forward edges route top→bottom as before. Each branch label is placed
  ~0.35 of the way along its own edge (near the deciding fork, away from the next box) and
  wrapped with `wrapLabel`, so the two sibling labels of a split land at different x/y.
- **Fan out parallel edges in the State Map.** Edges are grouped by side (transition vs exit)
  + unordered source/target pair; each edge in a group gets its own lane offset (`STATE_FAN`)
  and a staggered label baseline, so every edge and label stays legible. A lone edge gets
  offset 0 → **byte-identical** output (the committed `state-map.svg` golden is unchanged).
- **Render the disclaimer into the decision-chart SVG**, under the always-visible crisis
  banner (via `fitText`, compressed to the frame width), consistent with the other client-
  facing renderers and inside the content-fit frame.

## Consequences
- **Positive:** a 12–15-node branching+looping crisis plan is legible — distinct rows, no
  piled-up boxes/labels, nothing clipped, all within the viewBox; the small 8-node example
  still renders cleanly; parallel State Map edges are readable; the export now carries the
  disclaimer. Behavioural tests (not just goldens) assert "more than one distinct row",
  width/height growth, in-frame bounds, both labels verbatim, and distinct edge paths.
- **Negative / cost:** the `decision-nav.svg` golden was regenerated (viewBox `0 0 720 570`
  → `-16 0 752 567`; content-fit width + disclaimer). Breaking a cycle drops the back-edge
  from the *layering* only — it is still drawn (as an upward arrow), so no transition is lost.
  A very wide layer makes a wide SVG (correct: content-fit in both directions, per ADR-0006).
- **Impact:** `packages/render/index.ts` (`layerWithCycleBreak`, content-fit
  `renderDecisionChart` + disclaimer, State Map fan-out) and its tests — see
  [`packages/render/IMPACT.md`](../../packages/render/IMPACT.md).

## Alternatives considered
- **Full Sugiyama (crossing minimization, x-coordinate assignment).** Rejected for now —
  heavier than needed; cycle-break + longest-path layering + even slot spacing fixes the
  reported collapse/crowding and keeps output deterministic. Can supersede later if crossings
  become a complaint.
- **Drop back-edges from the drawing entirely.** Rejected — the loop-back is clinically
  meaningful ("go back to the crisis step"); we layer without it but still draw it.
- **Keep the fixed `DEC_W` canvas and just enlarge it.** Rejected — still clips wide/deep
  plans and wastes space for small ones; content-fit is correct in both directions (ADR-0006).
- **Curve/bundle parallel State Map edges instead of lane-offset + label-stagger.** Rejected —
  orthogonal lanes match the existing routing style; offsetting the lane and staggering the
  label is the minimal, legible fix and keeps single-edge output byte-identical.
