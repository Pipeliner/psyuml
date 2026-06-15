# ADR-0011: Eval round 2 — label legibility in dense diagrams + never-silently-drop guards

- **Status:** accepted
- **Date:** 2026-06-15
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §D, §E.1/§E.2/§E.8 / REQ-ACCESSIBILITY, REQ-NOTATION, REQ-DECISION-NAV, REQ-EDITOR-MVP

## Context
A second round of agent-driven usability evaluation (three cold Playwright agents) confirmed the
first round's big fixes landed (cycle-aware decision layout, New/Open, client labels, the
state-map `render.node-not-shown` guidance) — but, by clearing the obvious gaps, exposed the next
tier, dominated by **label legibility in dense diagrams** and a recurrence of the "silent drop"
class for **edges**:

- **Decision chart:** node labels were a single un-wrapped `<text>`, so a long clinical step
  overflowed its fixed-width box and collided with its sibling. (The ADR-0010 layout scaled the
  *frame* but never wrapped the node label.)
- **State map:** the ADR-0010 parallel-edge fan-out staggered labels just enough to pass a weak
  test, but they still sat *on* the band-boundary line (struck through) and crowded each other.
- **Parts map:** valid edge kinds the renderer doesn't draw (`conflict`, `invocation`) vanished
  with no warning, and containment edges drew no label (so "soothes"/"numbs"/"protects" all looked
  identical).
- **Editor:** switching diagram type (or New/Open) discarded unsaved work with no confirmation,
  and the diagram selector desynced after Open.

## Decision
- **Wrap node labels inside their shape** on the decision chart (`wrapLabel`, narrower width for the
  tapering question diamond) so a long label never overflows into a neighbour.
- **Halo edge labels** on the state map (`paint-order="stroke"` white outline) + a larger fan/stagger,
  so the band-boundary line and arrows no longer strike through parallel-edge labels.
- **Render the containment relationship label** on the Parts Map curve (haloed), so distinct
  protections are visually distinct.
- **Generalize "never silently drop" to edges:** `validate` emits `render.edge-not-shown` (info)
  for an edge a diagram won't draw (the Parts Map draws only containment + the barrier) — the link
  is saved but the user is told it isn't pictured, rather than it vanishing silently.
- **Guard unsaved work in the editor:** a `dirty` flag (current vs. last-loaded serialized model)
  gates a confirm before a sample switch / New / Open discards edits, and Open now syncs the
  diagram selector to what was loaded.

## Consequences
- **Positive:** dense decision charts and multi-trigger state maps are legible by default; authored
  relationships are either drawn or explicitly flagged, never silently lost; users don't lose work
  to an accidental dropdown change. Goldens regenerated: decision-nav, state-map, parts-map,
  perfectionism-parts.
- **Cost / limits:** extremely long labels still compress their last line (legible but tight);
  the `render.edge-not-shown` map is curated per diagram (Parts Map today), not auto-derived from
  each renderer; rendering `conflict`/`invocation` *visually* on the Parts Map (vs. flagging) and
  parts-map title top-clearance are deferred. The dirty-guard uses serialize-compare, not a
  fine-grained change log.
- **Impact:** `packages/render/index.ts` (decision node-label wrap, state-map label halo + fan,
  parts-map containment label), `packages/validate/index.ts` (`render.edge-not-shown`),
  `apps/web/App.tsx` (dirty-guard + Open selector sync), + tests and the four regenerated goldens.

## Alternatives considered
- **Grow node boxes to fit the label (decision chart).** Rejected for now — it shifts the layered
  positions and risks new collisions; wrapping into the fixed box is simpler and enough.
- **Render every edge kind on every diagram.** Deferred — each needs a sensible glyph and careful
  layout; the info notice is the honest, low-risk step now (render-or-warn, warn first).
- **A full dirty/undo model.** Overkill for the gap; a serialized-baseline compare gates the
  confirm cheaply.
