# ADR-0064: process-loop geometry — the cycle on a ring of arcs, everything else as satellites

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-PROCESS-LOOP, REQ-LAYOUT-QUALITY, REQ-EDGE-CROSSING, REQ-TEXT-CONTAINMENT
  · §E.4, §D; fixes issue #5. Supersedes the mechanism of ADR-0050 (resource label outside the
  diamond).

## Context
Issue #5 (repro: `examples/cat-sdr.psyuml`, or a 4-state loop + reciprocal role + observing eye +
exit) found four geometry defects in `renderLoopMap`:
1. every node — the reciprocal-role pole, the observing eye and the resource included — shared one
   ring, so the loop-closing edge became a long chord through the middle, across the R badge and the
   topology glyph, with its label printed on the glyph;
2. every edge was pulled back a fixed 64px from both centres, so arrows were short floating stubs
   that didn't touch their boxes;
3. a resource diamond had a fixed 140×44 ring slot, too flat to hold its label, so the label was
   lifted outside (ADR-0050);
4. the reciprocal-role and exit labels, both near the shared state, collided.

## Decision
1. **Ring = the maintaining cycle.** `longestCycle` finds the longest simple directed cycle over the
   non-exit edges (preferring the one holding the `loop` edge) and rotates it so the step the loop
   returns to is at the top. Each cycle step gets an evenly spaced ring slot, and the radius is the
   smallest at which no two ring nodes come within 30px and the centre badge stays clear. Every edge
   between ring neighbours, the loop-closing one included, is drawn as an **arc of the ring**
   (cubic Béziers ≤ 90°, readable by `pathToSegments`). The centre is left empty for the R/B disc and
   the topology marker, now tagged with an invisible `badge:centre` box. With no ≥3-step cycle, the
   non-resource, non-eye nodes keep the chain-ordered ring (`cycleOrder`). Manual `position`s are
   honoured, and then the badge takes the clearest spot near the centroid.
2. **Arrows touch their nodes.** Every arc and spoke is clipped by bisection to the real outline of
   both nodes (rectangle, rhombus or ellipse), so the arrowhead tip sits on the border.
3. **Satellites.** Nodes off the cycle are placed outside the ring next to the node they link to,
   by a candidate scan: wholly outside the ring, clear of every node, label and the badge, with a
   spoke that crosses no node, label or edge, and long enough (≥48px, or the label's projection +
   36px) to carry its label ON the spoke in a slot that is itself free. A node with no links takes
   the widest open direction. A resource diamond is no longer bound to a ring slot, so it is sized to
   hold its label inside: `diamondFor` wraps the label to 1–3 lines and picks the smallest rhombus
   with w/2/HW + h/2/HH ≤ 1.
4. **Labels.** Ring-arc labels sit just outside the arc's middle. Spoke labels sit on their spoke
   (reserved when the satellite is placed). Placement uses the shared `layout.placeLabel` (ADR-0063).
   Anything left over goes through `deCollide`. The frame is the union of all of it (arcs included),
   widened symmetrically so the nodes stay centred (ADR-0054).

## Verification
`packages/render/parts-loop-geometry.test.ts` (written first, red before the fix), over the repro
and every process-loop example in both layers: the repro's return edge stays within 15% of the ring
radius (an arc, not a chord); no edge segment or edge label touches `badge:centre`; every edge starts
and ends within 2.5px of its nodes' outlines; every resource label line is inside its rhombus; no
edge label sits on another edge's line. `overlap.test.ts` runs the repro through all four overlap
assertions. The edge↔edge crossing baselines for `cat-sdr`, `depression-flower` and
`showcase-process-loop` drop from 1 to 0.

## Consequences
- All process-loop goldens changed (`process-loop`, `cat-sdr`, `panic-cycle`, `ocd-cycle`,
  `depression-flower`, `stages-of-change`, `social-anxiety-loop`, `showcase-process-loop`).
- Lead-in steps (e.g. the social-anxiety event → self-focus → post-mortem chain) are now satellites
  in a chain outside the ring, not ring members. That is truer to the formulation (they feed the
  loop and are not part of it), but the diagram gets wider.
- The no-cycle fallback (e.g. `process-loop.psyuml`, whose loop is a 2-step cycle) keeps a chord for
  non-adjacent links; the badge stays clear of it.
- ADR-0050's "inside or wholly outside" legibility invariant still holds (labels are now always
  inside), so it stays as a guard.
