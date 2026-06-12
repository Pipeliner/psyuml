# PsyUML — Implementation Architecture

> Status: design (pre-code). Companion to [`ROADMAP.md`](./ROADMAP.md).
> Source of truth for the language: [`specification/psyuml-v0.1.0.md`](./specification/psyuml-v0.1.0.md).
> Ideas synthesized from the companion paper are tracked in
> [`research/idea-incorporation.md`](./research/idea-incorporation.md).

This document describes **how** we build the PsyUML tooling. The product, per the
agreed direction, is a **web-based GUI diagram editor** (visual-first), written in
**TypeScript**, that lets a clinician (and, in the client layer, a client) build,
render, and version PsyUML formulations across schools.

---

## 1. Goals & non-goals

**Goals**
- A **GUI editor** that makes the 8-symbol Tier-1 core (spec §B) directly drawable, then progressively enrichable with Tier-2/Tier-3 overlays.
- One **school-agnostic model** that can be re-rendered in IFS / schema / CAT / polyvagal / genogram / Malan / Karpman / ritual vocabularies *without losing theoretical provenance* (spec §G).
- **Dual-audience**: every diagram toggles between a clinician layer and a plain, non-pathologizing client layer (spec "Audience guide").
- **Accessibility-first**: no meaning by color alone; monochrome-printable; hand-drawable forms preserved (spec §D).
- **Safe-by-construction**: client-facing diagrams cannot be exported without disclaimer + crisis-resource fields (spec §A.2-r7, §L.2).

**Non-goals (v0.x)**
- Not a diagnosis engine. PsyUML is **formulation-level, not nosology** (spec §A.3). No automated diagnosis or severity scoring.
- Not a therapist. The tool *supports*, never *replaces*, professional care (§L.2-r1).
- No feature whose purpose is to bypass an AI provider's safety systems (see `idea-incorporation.md` §4).

## 2. The central idea: one model, many school views

The architecture's spine is **"immutable core data, polymorphic presentation"**
(adopted from the companion paper, reconciled with spec §G/§K):

```
                 ┌───────────────────────────┐
                 │   Core Model (school-agnostic) │   ← PsyUML Tier-1 ontology (§A)
                 │   nodes · edges · contexts ·   │     stable IDs, provenance tags,
                 │   phases · properties (PT)     │     clinician+client labels
                 └───────────────┬───────────────┘
                                 │ apply a School Profile (a VIEW, not new data)
        ┌────────────┬───────────┼───────────┬────────────┐
        ▼            ▼           ▼           ▼            ▼
     IFS view    Schema view  CAT/SDR    Malan view   Ritual view ...
   (glyphs +    (Mode Map,   (recip.    (two         (van Gennep
    labels +     size=dom.)   roles,     triangles,    phases,
    layout)                   traps)     P/C/T)        secular variant)
```

A **School Profile** is a *transform + palette + validator bundle*, never a
separate copy of the data. Switching schools re-labels, re-styles, and
re-lays-out the same nodes/edges; it never mutates the core. This is what lets the
editor "refactor a Malan triangle into a Mode Map" the way the paper describes —
and what guarantees provenance tags keep opposed origin-claims visible (spec §G.2
caveat: IFS "innate multiplicity" vs structural-dissociation "trauma-caused
division" must never be flattened).

## 3. Metamodel (`@psyuml/model`)

Mapped from the paper's UML-metric framing (OT/RT/PT) onto the spec's element set.

### Object Types — nodes (spec §A.1)
`State · Agent/Part · Self · Relation-anchor · Process/Transition · Intervention ·
Resource/Anchor · Context · TemporalStructure`. Tier-3 specializations attach via
**stereotypes** (spec §K): `«SchemaMode» «CoreState» «DefenseMechanism» «KarpmanRole»
«ReciprocalRole» «ANP» «EP» «MalanVertex» «InvokedFigure»`, etc. A stereotype may
*add* constrained meaning but **must not remove base semantics** (§K).

### Relationship Types — edges (spec §C)
`sequential/causal (--->) · excitatory (==>) · inhibitory (--•) · reciprocal (<-->) ·
reinforcing loop (R) · balancing loop (B) · exit (==EXIT==>) · dissociative barrier (║) ·
containment/orbit (((O)) · invocation (⟿) · genogram ties (zigzag/fused/distant/cutoff) ·
transference (dashed historical) · nestedWithin (container)`.

### Property Types — the typed property bag (PT)
Every node/edge carries a typed bag. Properties may drive visuals, **but every
visual channel stays redundant** with text/shape/numeral (spec §D):

| Property | Range | Visual channel | Mandatory redundancy |
|---|---|---|---|
| `dominance` | 0–1 | node **size** | printed numeral on node |
| `intensity` / `valence` | 0–1 / −1…+1 | **color** (Okabe–Ito) | icon + word (e.g. "!", "calm") |
| `consolidation` | consolidated \| forming \| liminal | **border style** (solid/dashed) | text tag + legend |
| `rigidity` | 0–1 | **hexagon** for defenses | shape + label |
| `weight` (edge) | 0–1 | line thickness | numeral `[w:0.8]` (spec §B) |
| `confidence` | L \| M \| H | — | `~conf:M~` label (spec §B) |
| `tier` | 1 \| 2 \| 3 | reveal/hide layer | always labeled |
| `provenance` | `{school:…}` set | — | bracket tag (spec §B) |

Each node also carries `clinicianLabel`, `clientLabel`, stable `id` (for
cross-diagram nav and cross-version diff, spec §H.10), and `bandId` for states
(spec §A.2-r1).

### Well-formedness (the abstract syntax — spec §A.2)
Encoded as validator predicates (see §7): state ∈ exactly one band or free;
transition has exactly one source/one target; relation joins two agents or two
people; intervention is attached (never floating); a loop is typed R/B and SHOULD
carry an exit; a dissociative barrier separates only agents/states (never people);
client-facing diagrams MUST carry disclaimer + (for decision charts) crisis fields.

## 4. Serialization

- **`.psyuml` (canonical):** a JSON document validated by a published **JSON Schema** (`@psyuml/model`). This is what the GUI reads/writes and what the conformance suite tests against.
- **Text DSL (later, M9):** a concise human/AI-writable surface syntax that parses to the same model — so an agent or a power user can emit diagrams as text (paper idea A8). Mermaid is an **export** target only (it cannot natively draw genogram glyphs or arousal bands — spec Caveats), with native SVG authoritative.

## 5. School Profiles (`@psyuml/profiles`)

A profile bundles: (a) a **glyph/palette map** (which concrete symbol each
stereotype renders as), (b) an optional **layout strategy** (e.g. Self-centered
radial for IFS; banded vertical for polyvagal; triangle for Malan/Karpman), (c) a
**label vocabulary** (clinician + client), and (d) **extra validators**
(e.g. CAT requires ≥1 elaborated exit; Mode Map requires a `HealthyAdult`).

Seed profiles: `polyvagal`, `ifs`, `schema` (+ **Schema Mode Map** with
size=dominance), `cat` (+ **SDR**), `genogram` (McGoldrick–Gerson–Petry set
adopted wholesale, spec §C), `psychodynamic` (**Malan Two Triangles**),
`ta` (**Karpman**, incl. nested historical triangle), `act`, `cft`, `narrative`,
`ritual`. The **translation table** (spec §G.2 + paper Table 2) is data in this
package and powers the profile switcher.

## 6. Rendering pipeline (`@psyuml/render`)

```
Model ──▶ Profile transform ──▶ Layout ──▶ Scene graph ──▶ SVG
          (labels, glyphs,      (auto +     (shapes,        (+ legend,
           stereotype→symbol)    manual      connectors,     disclaimer,
                                 override)    bands, lanes)   crisis fields)
```

- **SVG-first** for fidelity to spec glyphs (rounded-rect state, person-circle agent, ◎ Self double-ring+dot, ◇ resource, ⬡ intervention, 👁 observing-eye, ▭ swimlane, ▮ band) and genogram symbols.
- **Layers & toggles:** clinician ⇄ client; Tier 1 / 2 / 3 reveal; **monochrome preview** (proves the accessibility invariant); hand-drawn ("sketch") style mode that mirrors the "<2 min hand-drawn" guidance per diagram (spec §E).
- **Auto-legend** in the active layer's vocabulary (paper A7).
- **Exports:** SVG, PNG, and Mermaid (approximate, labeled as such).

## 7. Validation & clinical-safety lint (`@psyuml/validate`)

Three rule classes, each with severity (`error | warn | info`) and layer scope:

1. **Well-formedness** (hard errors) — the spec §A.2 predicates in §3 above.
2. **Accessibility lint** (spec §D) — fail any meaning encoded by color alone; require min 14pt text in the client layer; require pattern (not hue) on phase bands; check Okabe–Ito palette use.
3. **Clinical-safety lint** — the **"path of hope" rule** (paper A4): *warn if a diagram contains maintaining/negative loops but no Exit, Resource, Self, or preferred-future element*; **error** in client-facing layer. Plus: client diagrams missing disclaimer/crisis fields = error (§A.2-r7); ritual templates missing the honest-framing + secular-variant fields = error (§F, §L.2-r3).

Lint runs live in the editor (squiggles + a "formulation health" panel) and in CI against the example corpus.

## 8. Persistence, versioning & diff (`@psyuml/model` + app)

- A **formulation** is a set of linked diagrams sharing node IDs (spec §H.10 cross-reference).
- Each save is an immutable **version** (per session/episode). We store versions, not a live "model of the person" — see `idea-incorporation.md` §3.
- **Diff view** (paper A6): given two versions, compute node/edge add·remove·change and render progress — e.g. a `dominance` drop on "Punishing Parent", a `consolidation` flip dashed→solid on an Exit. This is the engine behind the Timeline/Trajectory clinical narrative (spec §E.5) and CAT's "where are we on the map?" ethos.
- Local-first storage (IndexedDB / file export) in v0.x; **no PHI leaves the device** by default. Any sync/backend is opt-in and out of initial scope (privacy-sensitive — clinical data).

## 9. AI-assist (`@psyuml/ai`, optional, late milestone)

A **bounded** authoring aid, not an autonomous analyst (see `idea-incorporation.md` §3–4):

- Input: a narrative the user pastes (or session notes they own).
- Output: a **draft** `.psyuml` model — proposed nodes/edges/provenance tags — surfaced in a review panel. Nothing is applied until the human accepts/edits it.
- Constraints (enforced in code + prompt): formulation-only; **no diagnosis / no severity scoring**; every inferred element is tagged with low confidence (`~conf:L~`) and must be confirmed; the "path of hope" lint runs on any AI draft before it can be saved; honest framing for ritual.
- Model access: a documented public **Claude API** (model-agnostic; default to the latest capable Claude model). We do **not** build "safeguard-bypass" prompting; benign clinical/educational context is stated honestly, which is simply correct usage.

## 10. Tech stack & repository layout

**Stack:** TypeScript · pnpm workspaces (monorepo) · Vite · React (editor UI) ·
SVG rendering (with a graph/interaction lib — React Flow or a thin d3/Konva layer,
chosen in M1 via a spike) · Zod for runtime schema · Vitest (unit) · Playwright
(E2E) · ESLint + Prettier · Changesets for versioning · GitHub Actions CI.

```
psyuml/
├─ docs/                         # spec, this architecture, roadmap, research
├─ packages/
│  ├─ model/        # @psyuml/model     metamodel, JSON Schema, (de)serialize, versioning/diff
│  ├─ validate/     # @psyuml/validate  well-formedness + accessibility + safety lint
│  ├─ render/       # @psyuml/render    model → SVG, layers, monochrome, legend, exports
│  ├─ profiles/     # @psyuml/profiles  school profiles + translation table
│  ├─ grammar/      # @psyuml/grammar   text DSL ⇄ model (M9)
│  └─ ai/           # @psyuml/ai        bounded narrative→draft assist (M8, optional)
├─ apps/
│  └─ web/          # the deployable GUI editor (React + Vite)
├─ examples/        # the §H worked case + per-diagram examples, as .psyuml + golden SVG
└─ conformance/     # spec-conformance test suite (drives v1.0 readiness)
```

**Dependency direction:** `model` ← `validate` ← `profiles` ← `render` ← `apps/web`;
`grammar` and `ai` depend on `model` only. The core (`model`/`validate`) carries no
UI or vendor dependency, so the language stays reusable (CLI, server, other front-ends).

## 11. Accessibility & ethics as architectural constraints

These are **enforced in code**, not left to authoring discipline:
- Color is always redundant (§7 accessibility lint blocks violations; monochrome preview is a first-class view).
- Client-layer exports are gated on disclaimer + crisis fields (§7).
- Ritual templates ship a mandatory secular variant and the honest non-medical evidence note (spec §F/§L.2-r3); the renderer surfaces them.
- Client language is plain/agentic/externalized by default (spec §L.2-r2); the client layer hides clinician jargon fields.
- The "path of hope" lint makes a hopeless-only diagram a blocked state in the client layer (§7).

## 12. Conformance & v1.0 readiness

`conformance/` encodes the spec's own acceptance criteria (§J rubric, §E per-type
requirements) as executable tests, and the spec's **Stage 4** gate
(usability of the Tier-1 crisis chart, inter-rater reliability, multi-school
endorsement) is tracked as the exit criterion to leave v0.x — see ROADMAP M10.
The software roadmap *serves* the spec's clinical staged-validation plan; it does
not replace it.
