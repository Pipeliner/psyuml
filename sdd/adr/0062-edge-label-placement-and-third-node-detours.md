# ADR-0062: place free edge labels clear of nodes, labels and other lines; bend ties around third nodes

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §C, §D, §E.1, §E.3, §J · REQ-EDGE-ROUTER, REQ-LABEL-HALO, REQ-GENOGRAM
  (issues #6 and #8); extends ADR-0024 (routing), ADR-0047 (halos), ADR-0012 (overlap)

## Context
Two issue reports with synthetic repros showed that the corpus-wide invariants only protect the
shapes the committed examples happen to have:

- **#6 state-map.** A routed edge's label rode the routed-path midpoint (`polyMid`), then was only
  y-separated from other routed labels. An exit routed through the gap between two node columns put
  its label behind a state box (the label is drawn before the white-filled states); two crossing
  diagonal triggers stacked their labels at the crossing. Band titles sat on the band's hatch with
  no halo, hard to read in monochrome.
- **#6 mode-map.** Labels sat at the straight midpoint, so two crossing edges overprinted each other;
  an edge collinear with a third mode (manual `pos`) was drawn straight through it, label under it.
- **#8 relational-field.** Ties were straight lines, so a grandmother → index conflict ran straight
  through the mother and read as a grandmother–mother conflict (a different clinical reading); its
  label was hidden behind the mother; ties carried no `data-el`, so the edge↔node and crossing
  invariants never saw them. The frame always started at y = 0, leaving an empty band under the title
  when every `pos` was far from the origin.

## Decision
1. **One small, deterministic placement helper** (`packages/render/label-place.ts`):
   `placeLabelOnPath(pts, text, size, {boxes, segs, frame})` tries fixed candidate spots along the
   edge (midpoint outward, on the line, then pushed to either side of it) and keeps the first whose
   box clears every obstacle box AND every OTHER edge's segments (and stays in the frame); failing
   that, one that clears the boxes; failing that, the midpoint (the invariants catch it). The box is
   the same AABB `introspect.textLineBox` measures.
2. **Single-bend detours** for the hand-placed renderers: `detourWaypoint` searches perpendicular
   offsets from the midpoint for one apex whose smooth quadratic (`bendCurve`, sampled so every line
   style can follow it) clears every non-incident node footprint (glyph + caption). Among clearing
   bends it prefers no new crossing with the other edges (up to 4 extra steps), then the shorter
   detour, then more clearance (`rankAgainst`). If no single bend clears, the existing orthogonal
   `BespokeRouter` is the fallback. A clear straight edge stays straight.
3. **State-map:** routed labels go through `placeLabelOnPath` against the state boxes, band titles,
   gutter labels and earlier routed labels, avoiding the other edges' lines, inside the band area.
   Band titles get a white `paint-order="stroke"` halo (4px).
4. **Mode-map:** mode footprints (circle + the ↑grow / triangle marks + caption block) are built
   first; triggers bend around non-incident footprints; labels are placed as above.
5. **Relational-field:** the same detour (margin 10, so the ±5px zigzag clears), the McGoldrick line
   styles follow a polyline (zigzag by arc length, fused triple by mitred offsets, cutoff ticks at the
   path midpoint, the origin ring at the end), the main stroke of every tie is tagged
   `data-el="edge:<id>"`, and labels are placed as above. The **viewBox is fitted to the content**
   (glyphs, captions, ties, labels) plus padding, a title row and the legend; coordinates stay the
   model's own and the viewBox origin moves (as the loop map already does), so editor drag-to-
   reposition still maps straight back to `pos`. The editor's PNG export now reads a viewBox with a
   non-zero origin.
6. **Verify.** `edge-label-placement.test.ts` pins every issue repro (synthetic models) and runs a
   general battery on each: no label over a non-owner node, no label↔label or text↔text overlap,
   everything in frame, no edge through a non-incident node, every edge label haloed — plus the
   specific checks (crossing labels apart and off each other's line, collinear edge not through the
   third mode, conflict zigzag ≥ 10px from the fused line away from the shared person, ≤ 80px above
   the content). Written first; 9 of 11 failed before the fix.

## Consequences
- **Positive:** the three renderers' free labels can no longer hide behind a node or stack on another
  label or crossing; a tie never visually claims a third person; relational ties are now covered by
  the edge↔node, crossing and overlap invariants (and become hover/focus-highlightable in the editor,
  ADR-0025). English chrome is unchanged; the i18n catalog is untouched.
- **Cost (recorded):**
  - 8 goldens regenerated (state-map, mode-map, relational-field, drama-triangle, family-genogram and
    the three showcase renders): halos, moved labels, bent ties, fitted frames.
  - Measuring relational ties surfaced one structural crossing, pinned in `crossing.test.ts`: the
    drama-triangle origin thread from Victim to the earlier triangle, routed around the Rescuer, now
    crosses the Persecutor–Rescuer side once (before, it ran through the Rescuer).
  - Placement is greedy in model order, not a global optimum; a pathological pile-up can still fall
    back to the midpoint, which the invariants would flag.
- **Honest scope:** an edge still passes through its OWN endpoint's caption when it arrives from that
  side (mode-map triggers leaving downward through the source caption; the ↑grow mark on a target).
  Out of scope here; not a third-node crossing.
- **Honest scope (editor):** because the relational-field frame now follows the content on every
  side, dragging the top- or left-most person moves the frame with it (before, the frame already grew
  when a person was dragged right or down). The drag e2e tests pass; a frame frozen during a drag
  would need editor state and is left as a follow-up.
- **Impact:** `packages/render/label-place.ts` (new), `packages/render/index.ts` (state-map,
  mode-map, relational-field), `packages/render/edge-label-placement.test.ts` (new),
  `packages/render/crossing.test.ts`, `apps/web/App.tsx` (PNG export viewBox parse), 8 goldens,
  `sdd/traceability.json`.

## Alternatives considered
- **Orthogonal router for mode-map / relational-field too.** Rejected as the default: these are
  hand-placed, diagonal-native diagrams; right-angle detours read as a different notation. Kept as the
  fallback when no single bend clears.
- **A lint warning only (issue #8's minimum).** Rejected: the renderer can fix the drawing itself, and
  a warning leaves the misleading picture in place.
- **`deCollide` (ADR-0024) for these labels.** It nudges a label off boxes but has no notion of the
  edge it belongs to, so a nudged label can drift away from its line; sliding the label along its own
  edge keeps the association.
- **Draw labels above the nodes.** Would hide the symptom (a label over a node instead of under it)
  without fixing the collision.
