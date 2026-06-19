# ADR-0023: keep the bespoke renderer; adopt an edge *router*, not a diagramming engine

- **Status:** accepted
- **Date:** 2026-06-18
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-EDGE-ROUTER (planned; this sets its approach), REQ-LAYOUT-QUALITY, REQ-ACCESSIBILITY / extends ADR-0012, ADR-0021

## Context
"Maybe we need a mature diagramming engine instead of our own?" A five-angle deep-research pass
(`docs/research/diagramming-engine-evaluation.md`) surveyed Graphviz, ELK/elkjs, dagre, d3-dag,
d3-force, cola.js, OGDF, Mermaid, maxGraph, GoJS, yFiles, Cytoscape.js, JointJS on layout/routing
capability, license, runtime, determinism, offline/SSR, accessibility, size, and the build-vs-adopt
economics.

Three findings decided it:
1. Engines split into **layout-only** (return coordinates; ELK/dagre/cola/Graphviz/d3) and **full
   frameworks** (bring their own rendering; Mermaid/GoJS/yFiles/Cytoscape/JointJS). Adopting a
   framework means discarding PsyUML's renderer — the carrier of its 12 bespoke clinical diagram
   types, safety/epistemic notation, monochrome+redundant encoding, and per-view alt-text.
2. PsyUML's **positioning already works deterministically**; its one hard gap is *obstacle-avoiding
   routing on fixed positions* — which layered engines explicitly cannot do (ELK's own maintainers
   said so and themselves adopted libavoid for it). So a layout engine solves a problem PsyUML
   doesn't have and not the one it does.
3. PsyUML's "emit geometry/SVG yourself, control rounding/IDs/order, deterministic string output"
   is exactly the determinism gold standard the research names; full frameworks would *regress*
   determinism (Mermaid needs a DOM + non-deterministic IDs; Graphviz drifts across versions;
   force layouts are byte-unstable) and accessibility (Canvas engines have no DOM/ARIA; Mermaid
   conveys no relationship semantics to screen readers).

## Decision
1. **Do not replace the renderer, and do not adopt a diagramming engine or a layout engine.** Keep
   the bespoke deterministic SVG renderer; it is the differentiator and is already best-in-class for
   the project's two non-negotiables (golden-byte determinism, WCAG accessibility).
2. **Close the one real gap (`REQ-EDGE-ROUTER`) with a deterministic edge router behind a thin
   `EdgeRouter` interface** (node boxes + edges → polylines), validated against the existing
   `segIntersectsBox` invariant so it must shrink `EDGE_NODE_KNOWN_GAP` (ADR-0021) and the
   label↔label gap (ADR-0012).
3. **Implementation preference (finalized at build time):** (a) a *small, dependency-free, bespoke*
   orthogonal/visibility-graph (or sparse-grid A*) router scoped to PsyUML's diagram types — keeps
   zero-runtime-deps / MIT / offline / golden-stable, consistent with PsyUML already owning its
   geometry layer (`separate1D`); (b) fallback to the LGPL **`libavoid-js`** WASM port behind the
   same interface if the bespoke router can't reach acceptable quality (accept LGPL review + a
   `.wasm` binary asset + async init + a small-maintainer dependency). Prefer `libavoid-js` over the
   unproven MIT `libavoided-js` until the latter is validated.

## Consequences
- **Positive:** keeps 100% of the determinism + accessibility + safety + domain-semantics investment;
  fills the gap with the right *class* of algorithm (independent connector routing) rather than a
  framework or a positioning engine; the interface makes the router swappable + testable without
  touching the renderer or the invariants (the hybrid "engine returns geometry → you render" pattern,
  applied to routing only). No new runtime dependency in the primary (bespoke) path.
- **Negative / cost:** the bespoke router is real work and must NOT chase libavoid's general-case
  quality — it is scoped to "good enough for these diagram types," so some exotic future layout could
  still need the `libavoid-js` fallback (and then a `.wasm` asset + LGPL review enter the build). The
  decision is recorded now but the router is unbuilt (`REQ-EDGE-ROUTER` stays `planned`).
- **Impact:** `docs/research/diagramming-engine-evaluation.md` (new); sets the approach for
  `REQ-EDGE-ROUTER`; `sdd/adr/IMPACT.md` + `docs/research/IMPACT.md` rows. No code; nothing in
  `packages/*`/`apps/*` changes.

## Alternatives considered
- **Adopt a full framework (Mermaid / GoJS / yFiles / Cytoscape / JointJS+).** Rejected — discards the
  renderer (the differentiator), regresses accessibility (Canvas = no DOM/ARIA; Mermaid no
  relationship semantics) and determinism (Mermaid DOM + random IDs), and adds lock-in / commercial
  license cost (GoJS $3,995+, yFiles 5-figure, JointJS+ $3,490/dev).
- **Adopt a layout engine (ELK/elkjs, dagre, Graphviz) for positioning.** Rejected — PsyUML's
  positioning already works deterministically; layered engines don't route on fixed positions
  anyway, and importing one adds size + cross-architecture floating-point-drift risk to the golden
  suite for no benefit.
- **Hand-port libavoid from C++.** Rejected — highest cost, lowest marginal value; a maintained WASM
  port already exists, so the only build worth doing in-house is the *small scoped* router, not a
  libavoid clone.
- **Use the WASM `libavoid-js` as the primary path now.** Deferred to fallback — it conflicts with the
  zero-binary-dependency / pure-SVG / fully-offline posture and adds LGPL obligations; reach for it
  only if the bespoke router proves insufficient.
