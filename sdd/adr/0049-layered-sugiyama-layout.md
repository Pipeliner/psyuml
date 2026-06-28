# ADR-0049: a proper layered (Sugiyama) layout module — crossing minimisation + aligned coordinates

- **Status:** accepted
- **Date:** 2026-06-28
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-LAYERED-LAYOUT (→ **implemented**) / §D (notation), §J (conformance); builds on ADR-0010 (cycle-aware decision-nav layering) and the cited survey `docs/research/layout-algorithms.md` (Angle 4)

## Context

The research (`layout-algorithms.md`, Angle 4) names the **Sugiyama** framework as the SOTA for
directed/flow diagrams and its four steps: cycle removal → layer assignment → **crossing
minimisation** → **coordinate assignment** (Brandes–Köpf). The decision-nav crisis chart (the one
free-ordering layered diagram in the corpus) implemented only steps 1–2 inline (`layerWithCycleBreak`
= DFS back-edge break + longest-path rank). Within each layer it ordered nodes by **model/discovery
order**, and assigned x by `separate1D`-centring each layer **independently** — so it skipped the two
quality steps: it did no crossing reduction, and it never aligned a node with its neighbours (a
convergence node sat wherever its layer centred, not under its parents). That is "improper" layered
layout by the SOTA definition.

## Decision

Implement the full deterministic Sugiyama pipeline as a reusable module `packages/render/layered.ts`
(`layeredLayout(nodeIds, edges, {half, gap})`), and use it in `renderDecisionChart`:

1. **Cycle removal + layer assignment** — DFS back-edge classification, longest-path rank of the
   forward DAG (the old behaviour, moved into the module; `layerWithCycleBreak` deleted).
2. **Crossing minimisation (the missing step)** — the **median heuristic** (Eades–Wei) over
   down/up sweeps, keeping the best order seen, then **adjacent-transpose** improvement. Crossings are
   counted by edge-pair inversions between adjacent layers.
3. **Coordinate assignment** — **median alignment**: each node is pulled toward the median x of its
   neighbours over down/up sweeps, with the VPSC 1-D core `separate1D` restoring order + gap at
   minimal displacement. This straightens parent→child edges (a convergence node now centres under
   its parents) while guaranteeing non-overlap.

**Determinism** (required for golden tests; the research flags stochastic force-layout as unfit): every
tie breaks by original index, sorts are stable, sweeps are a fixed count → identical output per input.

## Consequences

- **Positive:** decision-nav now uses the canonical SOTA layered algorithm. The headline addition is
  real crossing minimisation (it generalises — a larger or messier crisis plan no longer crosses just
  because of model order), and the median coordinate step visibly straightens edges (the "Still stuck
  after 15 min?" convergence node now sits centred under its two parents). The module is reusable,
  unit-tested, and deterministic. No new dependency. The geometry invariants (overlap, layout-quality
  containment + edge↔node, edge↔edge crossings ≤ baseline) all still hold; decision-nav stays
  crossing-free (baseline 0).
- **Cost / honest scope (recorded in the module + REQ):**
  - **Coordinate step is median/priority, not full Brandes–Köpf.** BK (≤2 bends/edge, the balanced
    median of four alignments) is the gold-standard coordinate method named in the research; the
    median-alignment + VPSC method here is a strong deterministic alternative, with BK noted as the
    future upgrade (the same honest-scope pattern as `separate1D` = "1-D VPSC core, full active-set
    solver is the reference", and the bespoke router with libavoid noted).
  - **No dummy-node chains for long edges.** Edges spanning >1 layer connect endpoint-to-endpoint, so
    crossing counts over multi-layer edges are approximate (fine at the corpus's scale; dummy chains
    are the upgrade for dense multi-layer graphs).
  - **Applies to the free-ordering layered diagram only.** `intervention-sequence` is **swimlane**-
    constrained (x is fixed by the audience lane, not free), a different layout regime, so it keeps its
    lane layout; the module targets decision-nav, where x-order is free.
  - **3 goldens regenerated** (decision-nav, showcase-decision-nav, act-choice-point — all decision-nav
    type); the change is layout-only, geometry-valid.
- **Impact:** `packages/render/layered.ts` (new), `packages/render/layered.test.ts` (new),
  `packages/render/index.ts` (decision-nav uses `layeredLayout`; `layerWithCycleBreak` removed),
  3 regenerated goldens, `sdd/traceability.json` (REQ-LAYERED-LAYOUT → implemented; M26).

## Alternatives considered

- **Adopt a layout engine (ELK/dagre/Graphviz).** Already rejected in ADR-0023 (deep research): they
  discard the deterministic accessible SVG renderer, add lock-in, and solve positioning PsyUML mostly
  doesn't need (its diagrams are fixed-structure bands/rings/lanes). The layered module is the small,
  deterministic, dependency-free piece for the *one* free-ordering diagram.
- **Full Brandes–Köpf coordinates now.** Deferred — ~250 LOC with the 2020/2024 erratum and real
  correctness risk, for a modest delta on a near-planar chart; the median method captures most of the
  edge-straightening benefit deterministically. Documented as the upgrade.
- **Force-directed / stress layout.** Rejected (research Angle 4) — stochastic, platform-sensitive,
  unfit for golden tests.
- **Stay with model-order + per-layer centring.** Rejected — that is precisely the "improper" layered
  layout this closes; it crosses on adversarial input and never aligns edges.
