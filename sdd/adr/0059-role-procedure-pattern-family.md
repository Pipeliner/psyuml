# ADR-0059: a `role-procedure` diagram for the Pattern family, edge stereotypes, and visible parallel / reflexive edges

- **Status:** accepted
- **Date:** 2026-10-20
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** v0.2 §2 (families — Pattern gains its first dedicated type), v0.2 §4 (CAT
  reciprocal roles + loop topology), §K (an EdgeKind specialization now has a field to live in) ·
  REQ-ROLE-PROCEDURE (new), REQ-DIAGRAM-FAMILIES, REQ-EXTENSION-MECH, REQ-NOTATION

## Context

A clinician-facing formulation came up that PsyUML could only half express. Its shape is common in
CAT and TA practice: **one reciprocal role pair** (e.g. *cold, demanding* ⇄ *frightened, trying to
earn warmth*) that is re-enacted in **three planes** — with the original figure, self-to-self, and
with others — plus the **parental messages** that feed it ("don't be…", "be useful", "you used to
be normal"), the **internalization** of those messages into self-to-self stances, a **presented
self** shown to others, a **condition** one plane is lived under (a neurotype), and the **unmet
needs** the whole procedure stands in for. An audit against the current notation found:

1. **Two silent rendering bugs.** Two edges between the same pair (mother→me *cold*, me→mother
   *fear*) were drawn on one segment, so the second label hid the first — this already affected the
   shipped `process-loop` example, whose two anti-parallel chords were drawn as one. And an edge whose
   source is its target (me→me *contempt*) passed lint but was **dropped by every renderer** (it
   survived only in the alt text).
2. **No home for the procedure.** The Pattern family (v0.2 §2) had no type of its own — a single CAT
   loop rendered as a `process-loop` ring, which cannot show *planes*.
3. **Edges could not carry a stereotype.** §K already allowed a profile to specialize an `EdgeKind`
   (`CORE_BASES` includes them), but `Edge` had no `stereotype` field, so "internalization" could not
   be expressed without minting a core edge kind.
4. **No vocabulary** for TA message types, needs, or the presented self.

## Decision

- **Fix the two bugs at the renderer level** (relational-field, process-loop, and the new renderer):
  `parallelOffsets` fans every multi-edge pair out perpendicular to the pair's *canonical* direction
  (anti-parallel edges land on opposite sides, each label on its own outer side; a relational pair
  gains small target arrowheads so direction stays readable), and `selfLoop` draws a reflexive edge
  as a teardrop loop with its label beyond the apex. A lone edge is untouched, so every existing
  golden stays byte-identical **except `process-loop.svg`**, which was regenerated because it was
  exactly the bug (its anti-parallel pair is now visible).
- **Add `Edge.stereotype?: string`** (additive, MINOR) — DSL `stereotype=…` on `edge`, round-tripped.
- **Add the 21st `DiagramType`, `role-procedure`** (family **pattern**), rendered by
  `renderRoleProcedure`:
  - **core** — nodes with `stereotype: reciprocal-role` and **no band**, centred on top, joined by a
    `reciprocal` edge; the R/B + trap/dilemma/snag badge sits beside them;
  - **lanes** — one per band (a *plane*), each with a heading; a lane `context` node is that plane's
    **lens** (drawn under the heading as a condition, not as an item); a band-less `context` is a
    whole-diagram context line;
  - **rows align across lanes**: a node takes the row of the earliest node feeding it from an earlier
    lane (a cross-lane feed wins a tie over an in-lane chain), otherwise follows its in-lane
    predecessor — so *message → internalized belief → enactment* reads on one line. Greedy and
    deterministic;
  - **message cards** (`injunction` / `driver` / `attribution` / `message`) are quoted speech-cards
    with a small-caps tag; `presented-self` gets a dotted outer shell; `observing-eye` an eye glyph;
    `need` nodes form an **underlying-needs strip** under all lanes;
  - edges: straight + clipped, re-routed by the shared `BespokeRouter` only when they would cross a
    non-incident node (ADR-0024); `internalizes` is dash-dot, `transference` dotted, `exit` dashed;
    labels sit beside near-vertical steps and above horizontal ones and are de-collided (ADR-0024);
  - a legend lists only the conventions present; in the clinician layer each `contested` node's
    `provenanceNote` is printed as a footnote — the competing explanations stay side by side.
- **Two worked §K profiles** in `@psyuml/profiles`: `TA_PROFILE` (`injunction`, `driver`,
  `attribution` — Goulding & Goulding, Kahler) and `PATTERN_PROFILE` (`internalizes` on `sequential`,
  `need`, `presented-self`). Both validate clean.
- **Validation:** `role-procedure` is client-facing (disclaimer) and a maintaining pattern
  (path-of-hope); two **info** nudges — `pattern.role-pair` (no reciprocal pair at the top) and
  `pattern.internalizes-plane` (an internalization that never leaves its plane).
- **CLI:** the `render`/`template` map now covers every renderer — it had silently stopped at the 12
  pre-◇ types, so `psyuml render` failed on `ladder`…`secure-base`; `role-procedure` joins them.

## Consequences

- **Positive:** the Pattern family has a real view; a whole CAT/TA procedural formulation fits on
  one sheet with its exit; parallel and reflexive edges are never silently lost again; §K edge
  specializations are now usable.
- **Negative / cost:** one more renderer (~500 lines) under the full invariant suite; the row
  alignment is a heuristic — an in-lane chain can be split by a cross-lane alignment, at which point
  the router detours the in-lane edge (legible, but longer). Chrome text (legend, tags) is English,
  as in the other renderers.
- **Impact:** `packages/model` (Edge.stereotype, DiagramType), `packages/grammar`, `packages/render`
  (`index.ts` + the test renderer maps), `packages/validate`, `packages/profiles`, `packages/cli`,
  `apps/web` (★ showcase item), `examples/` (`showcase-role-procedure` + regenerated
  `process-loop.svg`), `docs/format-reference.md`, `conformance/`.

## Alternatives considered

- **Per-end labels on one `reciprocal` edge** (`sourceLabel`/`targetLabel`) — rejected: with the two
  poles as their own nodes the pair needs no per-end text, and a fanned anti-parallel pair already
  carries one label per direction. Kept the model smaller.
- **A new core edge kind `internalization`** — rejected: a MAJOR-ish change to the frozen core for
  what §K already models as a specialization; `Edge.stereotype` is the additive route.
- **A Composite board** (one diagram per plane) — rejected for this case: the point is the *links
  between* planes (internalization, the cross-plane trap), which a board of separate views can only
  cross-reference by id.
