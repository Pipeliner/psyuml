# PsyUML — gap analysis & the road to v1.0 (what's missing, specified)

**Status:** forward spec (planned scope). **Not normative for v0.x** — it specifies what is *missing*
from the current build and the acceptance criteria to close each gap. Tracked by the `planned`
`REQ-…` rows that cite this file; nothing here is implemented.

> **Honesty clause (the dominant gap).** PsyUML is an **unvalidated v0.x** communication aid. The
> single largest missing thing is **validation**, not features. Every glyph — including the CAT
> topology marks and the audience profiles — is *distinguishable and word-redundant but NOT
> comprehension-tested* (ADR-0015/0017). So **every other gap below is gated behind §0**: a v1.0 that
> claims "validated" is impossible until the human studies run. Building more renderers does not move
> the project toward validity; running the studies does. This document keeps that ordering explicit.

The current build (v0.x): 12 diagram types in 8 families × 3 audience profiles; a deterministic
SVG renderer with machine-checked non-overlap (ADR-0012) + layout-quality (ADR-0021) invariants; a
browser editor that *is* the help site (39 examples + a 59-entry catalogue); text-DSL + CLI; §K
validated profiles; lossy FHIR **export**; privacy de-identification. What follows is what it is
**not** yet.

---

## §0 — The gate: validation *(Phase 8 — the only thing that earns "v1.0")*

**Missing.** The comprehension, collaborative-validity, editability, and clinical-utility studies
have **never been run with real participants**. `REQ-EVAL-SUITE` and `REQ-NOTATION-TESTING` are
*in-progress*: the harness (`auditNotation`, the ISO-9186 Instrument D, the per-symbol ledger) and
the instruments exist, every Tier-B cell is `pending`, and the only "studies" so far are blind LLM
dry-runs that are explicitly **not evidence** (`docs/evaluation-suite-pilot-*.md`).

**Why it dominates.** No symbol may be claimed "understood"; no diagram "useful"; no profile
"client-safe by test". The topology glyphs are placeholders *pending this gate* (ADR-0015). Until §0
runs, PsyUML stays honestly v0.x.

**Spec — `REQ-STUDY-PREREG` (planned).** Pre-register (e.g. OSF) and run the studies:
- **Samples:** clients (with lived experience, supported), trainees, laypeople, and clinicians,
  **N ≥ 30 per audience** per ISO-9186; inclusion/exclusion + consent + distress-safety protocol.
- **Measures:** ISO-9186 comprehension % and comprehensibility/legibility; a collaborative-validity
  measure (does a co-drawn formulation match the client's experience?); an editability/usability
  measure (SUS-style); a clinical-utility measure; and a **harm probe** (did sharing distress a
  meaningful minority? — Chadwick 2003).
- **Analysis + stop/revise rules, pre-stated.** A symbol below the ISO-9186 acceptance threshold is
  **revised, not shipped** (a documented revision loop), never relabelled "validated".
- **Acceptance:** a pre-registered protocol + ethics/IRB note + a published results report that drives
  symbol/profile revisions. Only after this may any artefact be described as validated, and only then
  is a v1.0 release defensible.

Out of this also come the deferred **assistive-technology / WCAG audit with real screen-reader
users** (automated a11y checks are done; human testing is part of this gate) and the
**multi-school clinical-utility corpus** beyond the fictional cases.

---

## §1 — Notation completeness *(Phase 9 — gated on §0)*

- **Picture-profile pictographs (`REQ-PICTURE-PICTOGRAPHS`, planned, gated on §0).** The picture
  profile is today "client layer + a flag" (ADR-0016); real pictographic symbols do not exist. They
  MUST pass the §0 comprehension threshold *before* shipping — until then picture stays client+flag.
- **Topology-glyph finalization.** trap/dilemma/snag glyphs are placeholders (ADR-0015); finalized by
  §0's comprehension-revision loop, no separate REQ.

---

## §2 — Expressiveness: renderers & edge routing *(Phase 9)*

- **`◇` new-type renderers (`REQ-NEW-DIAGRAM-TYPES`, planned).** The catalogue lists seven shapes
  with no renderer (catalogued, not faked): **Venn / overlapping-circles** (DBT states-of-mind,
  schema-domain overlap), **three-circles** (CFT threat/drive/soothe), **2×2 sorter / grid** (schema
  18-EMS in 5 domains, ACT matrix), **ranked ladder** (values/goal ladder beyond
  intervention-sequence), **radial bullseye** (ACT values bullseye), **tree / branching**
  (decision/parts hierarchy), **hub / hexagon** (ACT hexaflex). Each new type needs a renderer +
  golden + clean overlap/legibility/layout-quality + an honest catalogue example.
- **Obstacle-avoiding edge router (`REQ-EDGE-ROUTER`, planned).** An orthogonal / visibility-graph
  router (libavoid-class, per `docs/research/layout-algorithms.md`) to close **`EDGE_NODE_KNOWN_GAP`**
  (state-map multi-node bands, ritual cross-phase diagonals, decision-nav back-edges; ADR-0021) and
  the **label↔label known-gap** for parts-map + process-loop free edge labels (ADR-0012) — turning
  two documented "enforced-where-it-holds" invariants into universal guarantees, or documenting the
  irreducible residue. **(implemented — ADR-0023/0024; both gaps empty.)**
- **Edge↔edge crossings in scope (`REQ-EDGE-CROSSING`, implemented — ADR-0025).** ADR-0012 honestly
  scoped edge line/path crossings OUT of the overlap guarantee: clinical graphs (genograms, loops) are
  routinely non-planar and node order is meaningful, so universal *planarity is impossible*. Instead of
  ignoring crossings, bring them into scope the way the other gaps were closed — **measure + bound +
  make legible**: (1) a machine-checked invariant (`crossing.test.ts`) counts the proper crossings
  between non-incident edges in every rendered example and asserts the count never exceeds a pinned
  per-file baseline (a NEW gratuitous crossing fails CI); (2) the corpus is already near-planar — only
  the few *structural* crossings remain (a cross-ring EXIT chord, a cross-map POLARIZATION tie), pinned
  + documented; (3) each is rendered with a **bridge / line-hop casing** (the metro-map convention,
  monochrome + accessibility-first) so a reader can trace which line passes over which. Crossings are
  also minimized where the renderer controls ordering (e.g. decision-nav's cycle-aware layering). No
  planarity is claimed — the honest guarantee is *bounded + legible*, not *zero*.
- **More live examples (folded into `REQ-NEW-DIAGRAM-TYPES`).** ecomap, social atom, empowerment
  triangle, structural dissociation, cultural genogram — some `◐` on existing renderers, some on the
  new types above.

---

## §3 — Product depth: editor, interop, i18n *(Phase 10)*

- **Persisted multi-document case file (`REQ-CASE-FILE`, planned).** The Composite board is in-memory
  and render-only (ADR-0019); there is no saved "case file" of several views, and the editor cannot
  *author* a composite. Spec a persisted multi-document case format + editor composite authoring.
- **Live profile + cultural-pack loading (`REQ-LIVE-PROFILES`, planned).** `§K` profiles are
  validated but applied in the editor only as `roleLabels` (ADR-0009); cultural packs ship only as a
  worked example (ADR-0019). Spec live loading/applying of a validated profile or cultural pack
  (with the §6 permission gate enforced in the UI).
- **Real i18n localization (`REQ-I18N-LOCALIZATION`, planned).** The architecture is done (concept
  IDs separate from localized labels; alt-text per view — `REQ-I18N` implemented), but only `en`
  label packs exist. Spec real multi-language label packs, RTL layout, and an editor locale switch.
- **Provenance-disagreement narrative (`REQ-PROVENANCE-NARRATIVE`, planned).** `⚖` names *which*
  schools disagree, not *how* (ADR-0007). Spec capturing + rendering the disagreement narrative so a
  contested node explains the substance of the disagreement, not only its existence.
- **Raster / print export (`REQ-EXPORT-RASTER`, planned).** The editor exports `.psyuml` + SVG; spec
  PNG/PDF + a print stylesheet for clinicians who need a paper copy.
- **Small follow-ups (no REQ — change-checklist items):** refactor the CLI onto the `render()`
  dispatcher (drop its private `RENDERERS` map, ADR-0016); namespace duplicate composite marker defs
  fully; the cross-school `schoolClaims` narrative reader.

---

## §4 — Deliberately OUT of scope (boundaries, not gaps)

These are **not** missing features — they are scope lines PsyUML holds on purpose (spec §L.2, ARCH
§11; Source-3 posture):

- **Autonomous diagnosis, live-care clinical decision support, outcome/treatment recommendations,
  safeguard-bypass prompting** — permanently out of scope.
- **FHIR / interop IMPORT & round-trip.** Interop is **export-only**, de-identified, audience-scoped
  documentation/reflection infrastructure — *not* live-care CDS. An importer would pull scope toward
  regulated clinical decision support; revisit only behind a deliberate governance/regulatory review,
  never as a default. (This is why there is no `REQ-…IMPORT`.)
- **Reifying contested theory** (parts, polyvagal, structural dissociation) as literal mechanism —
  the model stays ontology-neutral (`as-if`, `contested`, epistemic status) by design.

---

## Sequencing & the v1.0 definition

| Phase | Theme | Planned REQs |
|---|---|---|
| **8** | **Validation gate (the only path to v1.0)** | `REQ-STUDY-PREREG` |
| **9** | Notation + expressiveness completeness | `REQ-NEW-DIAGRAM-TYPES`, `REQ-EDGE-ROUTER`, `REQ-EDGE-CROSSING`, `REQ-PICTURE-PICTOGRAPHS` |
| **10** | Product depth | `REQ-CASE-FILE`, `REQ-LIVE-PROFILES`, `REQ-I18N-LOCALIZATION`, `REQ-PROVENANCE-NARRATIVE`, `REQ-EXPORT-RASTER` |

**v1.0 is defined by §0, not by §1–§3.** PsyUML may ship every renderer in §2 and still be a v0.x
*unvalidated* tool. It becomes v1.0 only when the pre-registered studies have run and their results
have driven revisions — i.e. when "validated" is earned, not asserted. §1–§3 make the language more
expressive and the product deeper; §0 makes it *true*.
