# Diagram-layout algorithms & machine-checkable quality invariants — a cited survey

A deep-research pass (five parallel angles, web sources fetched + adversarially checked) to harden
PsyUML's SVG-first renderer: how diagrams are laid out, and which geometric guarantees can be
**asserted as tests**. It directly motivates ADR-0021 (the layout-quality invariants) and confirms
the existing ADR-0012 non-overlap design. Confidence + caveats are kept per claim; PDFs that
wouldn't extract are flagged.

> **Bottom line for a small, dependency-free TS renderer:** use **deterministic, structure-aware /
> layered placement** (never stochastic force-directed in the test-critical path); **estimate text
> width** with an average-advance constant and **guarantee fit** by compressing to the box width;
> **clip edges to node borders**; and assert the **deterministic geometric invariants** —
> label-in-box containment, zero node–node overlap, zero edge–node intersection ("edge–vertex
> resolution > 0"), in-frame — with AABB / segment–rectangle primitives. A *universal* zero
> edge–node guarantee needs an obstacle-avoiding router (libavoid-class) that is out of proportion
> here, so enforce it where the layout reserves channels and document the rest (ADR-0021).

## Angle 1 — Fitting text inside node containers

- **Measure width without a browser** via per-glyph **advance widths** summed × (fontSize/unitsPerEm); a relative-width map gives ~6 % error, a single constant ~17 %. Arial's mean advance ≈ **0.477 em**; practitioners use **0.5–0.6 em** for mixed text. Sources: FreeType glyph metrics <https://freetype.org/freetype2/docs/glyphs/glyphs-3.html>; per-char widths <https://pschanely.github.io/2022/04/11/relative-per-character-widths.html>; Arial 0.477 <https://gist.github.com/aminnj/5ca372aa2def72fb017b531c894afdca>. Confidence: high. → **PsyUML uses `CHAR_W = 0.58` (a safe over-estimate)** in `layout.textWidth`, shared by renderers and tests.
- **Four ways to keep a label in its box:** shrink-to-fit, wrap, auto-grow the box, truncate. Graphviz auto-grows (`node = max(min, label + 2·margin)`, margin `0.11,0.055 in`); d3plus wraps+shrinks+ellipsis (`lineHeight 1.2`); dagre delegates measurement to the caller. Sources: <https://graphviz.org/docs/attrs/margin/>, <https://github.com/d3plus/d3plus-text>, <https://github.com/dagrejs/dagre/wiki>. Confidence: high.
- **To GUARANTEE bbox ⊆ box − padding:** compare against `availWidth = boxW − 2·pad` with a small safety margin (estimator error ~6 %). All four techniques are implementable dependency-free in TS. → **PsyUML's `fitText`/`wrapLabel` compress a long label to the box width via SVG `textLength` + `lengthAdjust="spacingAndGlyphs"`**, so the rendered glyph run is ≤ the box; the containment test (`introspect`) honours `textLength`, and uses a few-px slop for unmodeled bold weight.

## Angle 2 — Edge routing that avoids non-incident nodes; boundary clipping

- **Routing modes:** straight (no avoidance), polyline, **orthogonal**, **spline routed around nodes** (Graphviz `dot` default). Non-dot engines draw straight lines and `splines=true` "requires non-overlapping nodes." Sources: <https://graphviz.org/docs/attrs/splines/>, <https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html>. Confidence: high.
- **Graphviz spline routing** is two-phase: a shortest-path **polyline** (Overmars–Welzl inside a polygon, else a **visibility graph**, O(N³)), then a piecewise-Bézier fit that "does not touch a barrier except at an endpoint"; `dot` reserves obstacle-free **channels via over-sized dummy nodes** on long edges. Source: <https://graphviz.org/Misc/spline-o-matic/>, <https://www.graphviz.org/documentation/TSE93.pdf>. Confidence: high (channel claim medium — by-construction, not a theorem).
- **Obstacle-avoiding orthogonal routing** (libavoid / Adaptagrams; Wybrow–Marriott–Stuckey GD'09) = orthogonal visibility graph + **A\*** minimizing (bends, length) + nudging. Real, but a substantial C++ library — **no small TS port** (cf. open React-Flow request). Sources: <https://www.adaptagrams.org/documentation/libavoid.html>, <https://users.monash.edu/~mwybrow/papers/wybrow-gd-2009.pdf>, <https://github.com/xyflow/xyflow/issues/4766>. Confidence: high (shape); low on exact benchmarks (PDFs unextractable).
- **Boundary clipping (the cheap, high-value win):** Liang–Barsky line↔rect, line↔ellipse quadratic, or "shorten by radius" for circles — **O(1), zero deps**; place the arrowhead at the clipped point. Sources: <https://www.geeksforgeeks.org/computer-graphics/liang-barsky-algorithm/>, <https://mathworld.wolfram.com/Ellipse-LineIntersection.html>. Confidence: high. → **PsyUML adds `clipToBox` (Liang–Barsky entry) and clips ritual edges to node borders.**
- **Honest limit:** straight edges cross non-incident nodes in general; eliminating that needs moving nodes or routing around them. Even spline smoothing can bulge into a node unless constrained (ELK `SLOPPY` "may result in edges overlapping nodes"). Source: <https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-edgeRouting-splines-mode.html>. Confidence: high. → **motivates ADR-0021's enforce-where-it-holds + documented gap.**
- **Testing it** is the dual of clipping: flatten each edge to a polyline (sample Béziers), run **segment–rectangle** vs every non-incident node box, exclude the incident endpoints, use an ε. → **exactly `introspect.edgeSegments` + `layout.segIntersectsBox`.**

## Angle 3 — Node-overlap removal & constraint-based layout

- **VPSC** (Dwyer–Marriott–Stuckey, GD'05): minimize Σ wᵢ(vᵢ−dᵢ)² subject to separation constraints `u+gap ≤ v`; 2-D overlap removal = an **x-pass then y-pass**, and the pipeline **provably removes all overlap** (Thm 4) at minimal displacement. The 1-D constraint generation is **O(n log n)** via a scan-line. Source: <https://people.eng.unimelb.edu.au/pstuckey/papers/gd2005b.pdf> (+ GD'06 "Correction"). Confidence: high. → **PsyUML's `separate1D` is the 1-D minimal-displacement, order-preserving VPSC core for a fixed chain** — correct for row/column/slot layouts; the full active-set solver (WebCola `vpsc.ts`, MIT, ~570 LOC, dependency-free) is the reference if arbitrary anchors/weights are ever needed.
- **Alternatives:** PRISM (Delaunay + proximity-stress) still falls back to the VPSC scan-line "until no overlaps remain"; **uniform scaling** removes overlap trivially but inflates area ≥ an order of magnitude. An 8-algorithm benchmark (Chen et al., GD'19) found **VPSC** among the best on compactness + displacement. Sources: <https://www.graphviz.org/documentation/GH10.pdf>, <https://arxiv.org/abs/1908.07363>. Confidence: high. → **no change to the existing approach is warranted.**

## Angle 4 — Layout paradigms & determinism

- **Layered (Sugiyama):** cycle-removal → layer assignment (longest-path / network-simplex) → crossing-min (median/barycenter, NP-hard) → coordinate assignment (**Brandes–Köpf**, ≤2 bends/edge; follow the 2020/2024 erratum). Used by Graphviz `dot`, dagre, ELK. **Deterministic** given fixed tie-breaks. Sources: <https://en.wikipedia.org/wiki/Layered_graph_drawing>, <https://graphviz.org/documentation/TSE93.pdf>, <https://boriskoepf.de/papers/gd01a.pdf>. Confidence: high.
- **Force-directed / stress majorization** suits undirected relationship graphs but is **stochastic** (random start → local minimum) and "extremely susceptible to changes in random numbers" across platforms — **bad for golden tests**. Sources: <https://en.wikipedia.org/wiki/Force-directed_graph_drawing>, <https://rupertoverall.net/blog/fast-force-layout/index.html>. Confidence: high.
- **Recommendation:** for deterministic golden-tested rendering, use **layered / structure-aware rule-based placement** (flow/sequence/state diagrams) and **rule-based templated placement** for genogram/ecomap/field; avoid stochastic force layout. → **PsyUML already places every diagram deterministically (bands, rings, swimlanes, hand positions).**

## Angle 5 — Quality metrics as test invariants

- Classic aesthetics (Purchase et al.) rank **edge-crossing minimization** as most important, but they are *optimization objectives*, not pass/fail. The **deterministic, falsifiable** subset is the geometric one. Sources: <https://en.wikipedia.org/wiki/Graph_drawing>, <https://link.springer.com/chapter/10.1007/BFb0021827>. Confidence: high.
- **Edge–vertex resolution** = min distance between a vertex centre and a non-incident edge; **zero ⇒ an edge passes through a node ⇒ a hard defect** (and falsely implies adjacency). Source: <https://www.sciencedirect.com/science/article/pii/S0925772121000456>. Confidence: high. → **the formal name for PsyUML's edge↔node invariant.**
- **Primitives:** AABB–AABB overlap (node–node, label–label, label–node, **label-in-box containment**); **segment–rectangle** (Liang–Barsky / Cohen–Sutherland) for edge–node; segment–segment orientation test for crossings; point-in-rect for in-frame. Deterministic and float-stable. Sources: <https://www.rose-hulman.edu/class/cs/csse451/AABB/>, <https://en.wikipedia.org/wiki/Liang%E2%80%93Barsky_algorithm>, <https://cp-algorithms.com/geometry/check-segments-intersection.html>. Confidence: high.
- **Prioritized Tier-1 invariants (assert first):** (1) label ⊆ node box; (2) zero node–node overlap; (3) zero edge–node intersection for non-incident nodes; (4) everything in-frame. → **PsyUML now asserts all four: (2)+(4) in `overlap.test.ts` (ADR-0012), (1)+(3) in `layout-quality.test.ts` (ADR-0021).**

## How this maps onto PsyUML (what changed)

| Research finding | PsyUML realization |
|---|---|
| Text-width estimate + compress-to-fit guarantees containment | `layout.textWidth` (CHAR_W 0.58) + `fitText`/`wrapLabel` `textLength`; `introspect` honours `textLength` |
| Containment is an AABB-in-AABB invariant | `layout.contains` + invariant A in `layout-quality.test.ts` (interior labels; captions skipped by centre-outside) |
| Edge–node = segment–rectangle, dual of clipping | `layout.segIntersectsBox` + `introspect.edgeSegments` (flattens M/L/H/V/Q/C) + invariant B |
| Boundary clipping is the cheap win | `layout.clipToBox` (Liang–Barsky entry); ritual edges clipped to node borders |
| 1-D VPSC minimal-displacement core is correct | `layout.separate1D` (unchanged; validated) |
| Universal edge–node needs a heavy router | invariant B enforced where layout reserves channels; documented gap for multi-node bands / cross-phase diagonals / back-edges (ADR-0021) |
| Deterministic layout beats stochastic for golden tests | every renderer is deterministic; no force-directed in the test path |

## Sources & method

Five angle-agents ran parallel `WebSearch` + `WebFetch`, extracted falsifiable claims, and flagged
confidence + unextractable PDFs (several arXiv/Springer PDFs were access-blocked; their algorithm
*shapes* are corroborated across secondary sources, exact benchmark numbers are not quoted). Primary
references are linked inline above. This is research input, not clinical guidance.
