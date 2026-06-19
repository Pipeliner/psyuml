# ADR-0024: the `EdgeRouter` interface + two backends (bespoke grid-A* and libavoid)

- **Status:** accepted
- **Date:** 2026-06-18
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-EDGE-ROUTER (planned → in-progress) / executes ADR-0023, validated against ADR-0021's `segIntersectsBox`

## Context
ADR-0023 decided *what* to do about the edge↔node gap: keep the bespoke renderer and add a
deterministic obstacle-avoiding **router behind an interface**, with a bespoke implementation
preferred and `libavoid-js` as a fallback. The owner then cleared the open question — "the project is
pretty open, LGPL is not a problem" — and asked to **spec the interface and build both
implementations in parallel**. This ADR records the realized design.

## Decision
1. **`EdgeRouter` interface (`packages/render/router.ts`).** `route(obstacles, edges, options)` →
   one polyline per edge; `obstacles` are id+`Box`, `edges` name their source/target obstacle ids
   (endpoints, which are NOT avoided). `route` is **synchronous** (so the renderers stay sync); a
   backend needing async setup does it once in optional `init()` (awaited at startup). A documented
   **contract**, machine-checked in `router.test.ts` with the existing `segIntersectsBox`: (i) every
   routed edge avoids every non-incident obstacle box (edge–vertex resolution > 0 — the same property
   `layout-quality.test.ts` asserts on SVGs); (ii) endpoints connect to the source/target boxes;
   (iii) `route` is deterministic. `routeToPath` serializes a polyline to an SVG path the renderers
   draw (tagged `data-el="edge:…"`, so the invariant reads it back).
2. **`BespokeRouter` (`router-bespoke.ts`, default).** Dependency-free, deterministic **orthogonal
   grid-A***: per edge, build a sparse grid from the non-incident obstacle boundaries (grown by the
   margin) + the endpoints + the channel midpoints, then A* with a bend penalty and a total-order
   tie-break; endpoints clipped to the node borders via `clipToBox`; straight shot when nothing
   blocks. Scoped to PsyUML's small structured diagrams — *good enough for these*, **not** a libavoid
   clone (ADR-0023). Consistent with PsyUML already owning its geometry (`separate1D`).
3. **`LibavoidRouter` (`router-libavoid.ts`, alternative).** The reference GD'09 router via the
   LGPL-2.1 `libavoid-js` WASM port, behind the *same* interface. Verified incantation: numeric
   `RouterFlag.OrthogonalRouting.value` (2) into `new Router()`, `RoutingParameter.shapeBufferDistance`
   (the embind enum object) for the margin, point `ConnEnd`s at the clipped endpoints, one transaction
   **per edge over the non-incident shapes only** (so the contract holds exactly), router freed per
   edge. `libavoid-js` is pulled in by a **dynamic `import()` inside `init()`**, so the wasm payload
   loads *only if this backend is selected* — the bespoke router stays the zero-binary default.
4. **Dependency:** `libavoid-js@0.5.x` added to `@psyuml/render` (LGPL accepted). A minimal typed
   facade wraps the embind surface (the shipped `.d.ts` is loose/partly wrong).

Both backends pass one shared contract suite (straight-when-clear, detour-around-a-mid-node, a
reconstructed 3-node-band gap, determinism), proving they are genuinely swappable.

## Consequences
- **Positive:** the gap-closing capability exists and is proven for both backends behind one
  interface — the renderer can adopt either without change, and start with the bespoke (zero-dep,
  golden-stable) one. The contract test reuses `segIntersectsBox`, so router output and the rendered
  edge↔node invariant are checked with identical geometry.
- **Negative / cost:** `libavoid-js` is now a render dependency (a WASM binary; LGPL; small-maintainer
  — pinned, dynamically loaded, and behind the swappable interface to bound the risk). The libavoid
  backend is async-init + allocates per-edge embind objects (freed via `router.delete()`; fine at
  PsyUML's graph sizes). REMAINING work to mark REQ-EDGE-ROUTER *implemented*: wire a router into the
  three `EDGE_NODE_KNOWN_GAP` renderers (`routeToPath`) so the layout-quality invariant enforces them,
  then shrink/empty the gap — deferred to keep this change focused (it changes goldens + needs the
  pipeline to call `init()` once for the libavoid path).
- **Impact:** `packages/render/router*.ts` (new) + `router.test.ts` + `index.ts` exports;
  `packages/render/package.json` (+libavoid-js); REQ-EDGE-ROUTER → in-progress. No renderer/golden
  change yet.

## Alternatives considered
- **One libavoid transaction with all shapes + connection pins** (more efficient, enables inter-edge
  nudging). Deferred — per-edge-over-non-incident-shapes matches the contract exactly with simpler,
  more predictable code; inter-edge nudging isn't needed (edge↔edge crossings are out of scope).
- **`libavoid-js` as a hard/eager dependency of every render path.** Rejected — dynamic-import keeps
  the bespoke default binary-free; the wasm loads only when `LibavoidRouter.init()` is called.
- **Async `route()` (await routing each call).** Rejected — would make the whole render pipeline
  async; instead the async cost is isolated to one-time `init()` and `route()` stays sync.
- **Build only one backend now.** Rejected — the owner asked for both; and having both behind one
  contract is what lets the bespoke-vs-libavoid choice be made empirically when wiring the renderers.

## Update (2026-06-19): the deferred "REMAINING work" is now done — REQ-EDGE-ROUTER `implemented`

Both gaps this ADR's REQ named are now universal guarantees:

1. **edge↔node — wired.** `renderRitual`, `renderDecisionChart`, and `renderStateMap` route any edge
   whose default (clipped-straight / gutter-lane) path would cross a non-incident node through the
   shared `BespokeRouter` (sync, deterministic, zero-dep), drawn via `routeToPath`; a routed edge's
   label rides the routed-path midpoint (`polyMid`), and state-map's routed labels are y-separated
   (`separate1D`). Non-crossing edges stay byte-identical (only `showcase-ritual.svg`,
   `relapse-prevention.svg`, `showcase-state-map.svg` changed). `EDGE_NODE_KNOWN_GAP` is **empty** →
   the edge↔node (edge–vertex resolution > 0) invariant is enforced for every tagged-edge renderer.
   Bespoke-router fix found here: round endpoints to the 0.1 grid `axis` snaps to (non-integer-coord
   contract test added).
2. **label↔label — de-collided.** The free edge labels ADR-0012 scoped out (`process-loop` ring
   chords, `parts-map` bowed containment/conflict labels) are separated by `deCollide` in `layout.ts`
   (a deterministic 2-D Force-Scan relaxation) off the node boxes / node labels and each other —
   parts-map measures its fixed obstacles from the rendered node fragment via `boxesFromSvg`, so they
   are exactly what the overlap invariant checks. `LABEL_LABEL_KNOWN_GAP` is **empty**; only
   `cat-sdr.svg`, `depression-flower.svg`, `parts-map.svg`, `showcase-parts-map.svg` moved a label.

This is the same accepted decision carried to completion (no new architectural choice), so it is
recorded here as an append rather than a new ADR. REQ-EDGE-ROUTER → **implemented**. The `deCollide`
label-placement helper is a complement to the router (label geometry, not edge geometry); both live
in `@psyuml/render` and share `layout.ts`/`introspect.ts` geometry with the invariants.
