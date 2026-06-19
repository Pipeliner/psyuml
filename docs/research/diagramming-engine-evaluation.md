# Build-vs-adopt: should PsyUML use a mature diagramming engine? — a cited evaluation

A deep-research pass (five parallel angles; web sources fetched + adversarially checked) on whether
PsyUML should replace, or back, its hand-rolled SVG renderer with an existing engine. Confidence +
caveats are kept per claim; this is research input, not clinical guidance.

> **Recommendation (BLUF): No to replacement; no to a layout engine; yes to a *router*.** Keep the
> bespoke, deterministic, accessible SVG renderer — it is PsyUML's differentiator and is *already*
> the gold standard the determinism research points to. Close the one genuine gap (obstacle-avoiding
> edge routing, `REQ-EDGE-ROUTER`) by adding a **deterministic edge router behind a thin
> `EdgeRouter` interface** — preferring a **small, dependency-free, bespoke orthogonal/visibility-graph
> router scoped to PsyUML's diagram types**, with the LGPL **`libavoid-js`** WASM port as a swappable
> fallback if the bespoke router can't reach acceptable quality. Reject the full frameworks
> (Mermaid/GoJS/yFiles/Cytoscape/JointJS+) and the layout engines (ELK/dagre/Graphviz) **for this
> purpose**.

## Why this is the answer (the three load-bearing findings)

1. **The engines split into two camps, and only one is even relevant.** *Layout-only* engines
   (ELK/elkjs, dagre, d3-dag, cola.js, Graphviz, OGDF) return coordinates and draw nothing — ELK's own
   docs: *"ELK itself doesn't render the drawing but only computes positions"* (<https://eclipse.dev/elk/>).
   *Full frameworks* (Mermaid, maxGraph, GoJS, yFiles, Cytoscape.js, JointJS) bundle their own
   rendering. Adopting a framework means **discarding PsyUML's renderer** — the part that carries the
   12 bespoke clinical diagram types, the safety/epistemic notation, monochrome+redundant encoding,
   and per-view alt-text. (Angle 1, 3)

2. **A layout engine solves a problem PsyUML doesn't have, and not the one it does.** PsyUML's
   positioning already works deterministically (bands, swimlanes, rings, hand-placed genograms). Its
   one hard gap is *obstacle-avoiding routing on fixed node positions* — and **layered engines
   explicitly cannot do that**: ELK's maintainers wrote *"the existing layout algorithms such as ELK
   Layered cannot [route without changing node positions] … they have specific constraints for
   positioning the nodes,"* which is why **ELK itself adopted libavoid** for the routing case
   (<https://eclipse.dev/elk/blog/posts/2022/22-11-17-libavoid.html>). So elkjs would add ~423 KB +
   floating-point-drift risk to get *positioning PsyUML doesn't need*, not routing. (Angle 2, 5)

3. **PsyUML's rendering approach is already the determinism + accessibility gold standard.** The
   determinism research's own best-practice — *return geometry and serialize the SVG yourself,
   controlling rounding/IDs/attribute order* — is exactly what PsyUML does. Force-directed engines
   (d3-force, cola, neato/fdp) are byte-unstable; Graphviz drifts across versions; **Mermaid needs a
   DOM/Puppeteer for SSR and emits non-deterministic IDs by default** (<https://github.com/mermaid-js/mermaid/issues/727>);
   Canvas engines (GoJS, Cytoscape) have **no DOM/ARIA semantics** so are structurally inaccessible
   (<https://pauljadam.com/demos/canvas.html>); Mermaid conveys **no relationship semantics to screen
   readers** (<https://mermaid.js.org/config/accessibility.html>). Replacing the renderer would mean
   *re-earning* determinism and accessibility on a tool that fights both. (Angle 3, 4)

## Engine survey (Angle 1) — the comparison the decision rests on

| Engine | Category | License | Runtime | Size (gz) | Maintenance |
|---|---|---|---|---|---|
| Graphviz (@hpcc-js/wasm) | layout-only | EPL core / Apache-2.0 wrapper | WASM | ~1.85 MB dist | very active |
| ELK / elkjs | layout-only | **EPL-2.0** (weak copyleft) | pure JS (GWT) | ~423 KB | active (Eclipse) |
| dagre / @dagrejs/dagre | layout-only | MIT | pure JS | ~13 KB | low / maintenance-mode |
| d3-dag | layout-only | MIT | pure TS | ~40 KB | active (solo) |
| d3-force | layout-only | ISC | pure JS | ~6 KB | very active |
| cola.js / WebCola | layout-only | MIT | pure JS | small | **stale (~2018)** |
| OGDF | layout-only | **GPL v2/v3** | native C++ (**no JS port**) | n/a | active (academic) |
| Mermaid | framework | MIT | pure JS (**needs DOM for SSR**) | ~153 KB (+cytoscape) | very active |
| maxGraph | framework | Apache-2.0 | pure TS | — | active, **pre-1.0** |
| mxGraph (draw.io core) | framework | Apache-2.0 | pure JS | — | **EOL 2020 (archived)** |
| GoJS | framework | **commercial $3,995+** | pure JS | n/a | active |
| yFiles | framework | **commercial (5-figure)** | pure JS | n/a | active |
| Cytoscape.js | framework | MIT | pure JS (**Canvas**) | ~131 KB | very active |
| JointJS core / JointJS+ | framework | MPL-2.0 / **commercial $3,490·dev** | pure JS | ~152 KB* | active |

Sources: GitHub LICENSE files, package.json, bundlephobia, vendor docs (per-engine URLs in the angle
reports). *JointJS size bundles `@joint/core`.

**Flags:** commercial-only — GoJS, yFiles, JointJS+. Strong copyleft / no JS port — OGDF (GPL).
Weak copyleft (legal review for a clinical product) — ELK (EPL-2.0), JointJS core (MPL-2.0),
Graphviz core (EPL). Stale/dead — mxGraph (EOL→maxGraph), cola.js (~2018), dagre-d3 (→ -es fork);
dagre core alive but low-momentum. No OSS engine phones home; the privacy footguns are **Mermaid's
CDN install + FontAwesome external font** and the *separate commercial* "Mermaid Chart/.ai" SaaS
analytics — not the OSS library.

## The routing gap (Angle 2) — solvable without owning the renderer

- **libavoid** (Adaptagrams; Wybrow–Marriott–Stuckey GD'09) is the reference obstacle-avoiding
  orthogonal/polyline router and is **deterministic by design — no random seed** (deterministic
  neighbour order + timestamp tie-breaks), ideal for golden tests. License **LGPL-2.1**.
  (<https://www.adaptagrams.org/documentation/libavoid.html>, GD'09 paper)
- It does **not** need a hand-port: maintained JS paths exist — **`libavoid-js`** (WASM, LGPL, ~8–11×
  slower than native but fine for small/medium graphs), **`elkjs-libavoid`** (MIT wrapper that
  routes on positions *you* supply — "you position, libavoid routes"), and **`libavoided-js`** (MIT,
  zero-dep, pure-TS, "deterministic orthogonal obstacle-avoiding" — but brand-new, ~0 stars,
  fidelity unproven). (Angle 2; <https://github.com/MrMint/elkjs-libavoid>, <https://github.com/Aksem/libavoid-js>)
- **Determinism ranking for byte-stable SVG:** libavoid / pure-TS deterministic routers ≈ Graphviz
  `dot` (given fixed input order; cross-version drift caveat) > dagre (deterministic, but *no*
  obstacle routing and no node-overlap guarantee) > ELK-layered > cola / d3-force / neato-fdp
  (random/iterative). (Angle 4)

## What PsyUML actually needs, and the recommended close

PsyUML is **zero-runtime-dependency, offline/local-first, golden-byte-stable, accessibility-first**,
and its layouts are deterministic and structured. The gap is narrow: the documented
`EDGE_NODE_KNOWN_GAP` (state-map multi-node bands, ritual cross-phase diagonals, decision-nav
back-edges; ADR-0021) plus the label↔label known-gap (ADR-0012). The build-vs-adopt literature is
clear: **build/keep your differentiator (domain semantics + safety + accessibility); adopt the
commodity hard algorithm (routing); keep the dependency surface tiny and forkable** — and *reinvent
when a hard constraint justifies it*. "Zero binary deps in an offline clinical tool, permissive
license, byte-stable goldens" is exactly such a constraint.

**Recommended approach for `REQ-EDGE-ROUTER` (ranked):**

1. **A small, deterministic, dependency-free bespoke router behind an `EdgeRouter` interface**
   (input: node boxes + edges with source/target; output: polylines). Scope it to PsyUML's diagram
   types — *good enough for these diagrams*, **not** a libavoid clone: an orthogonal/visibility-graph
   or sparse-grid A* with bend/crossing penalties and deterministic tie-breaks. This preserves
   zero-dep / MIT / offline / golden-stable / accessible, and is consistent with PsyUML already owning
   its geometry layer (`separate1D` is its own 1-D VPSC core). The new router is validated against the
   existing `segIntersectsBox` invariant — i.e. it must shrink `EDGE_NODE_KNOWN_GAP` toward ∅.
2. **Fallback: `libavoid-js` (LGPL WASM)** behind the *same* interface, if the bespoke router can't
   reach acceptable quality. Accept the costs: LGPL review for a clinical product, a `.wasm` binary
   asset + async init (a dent in the "pure-SVG, fully-offline, zero-binary" story), ~8–11× slowdown
   (irrelevant at PsyUML's graph sizes), and a small-maintainer dependency (pin + vendor + be
   fork-ready). Prefer this over `libavoided-js` until the latter is proven.
3. **Rejected — full frameworks** (Mermaid template-locked + weak a11y; GoJS/Cytoscape Canvas = no
   DOM/ARIA; yFiles/GoJS/JointJS+ commercial). They discard the renderer, weaken accessibility, and
   add lock-in.
4. **Rejected for this purpose — layout engines** (ELK/dagre/Graphviz): they solve positioning (not
   needed) not fixed-position routing; importing one adds size + FP-drift risk for no benefit.

The `EdgeRouter` interface is the key design move: it lets PsyUML start with the bespoke router and
swap in `libavoid-js` later **without touching the renderer or the invariants** — the hybrid pattern
React Flow/Mermaid/ELK all use (engine returns geometry → you render), applied to *routing only*.

## Sources & method

Five angle-agents ran parallel `WebSearch` + `WebFetch`, extracted falsifiable claims with confidence
+ caveats, and flagged unextractable PDFs (the GD'09 routing paper and a WASM-perf thesis rendered as
binary; their algorithm shapes/figures are corroborated via secondary sources, exact benchmarks are
not quoted). Primary references are linked inline and in the per-angle notes. Lower-confidence items:
the build-vs-buy TCO percentages (consultancy blogs, directional), yFiles pricing (sales-gated),
`libavoided-js` fidelity (new/unproven), and several commercial bundle sizes (not public).
