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
transference (dashed historical) · nestedWithin (container)`. Semantic edge labels from
Source 3 extend this set: `interprets_as · protects · avoids · targets · supports · blocks ·
symbolizes · witnessed_by · consented_by · contraindicated_by · uncertain_about`. **Edges
must be typed** — unlabeled arrows are allowed only in free-sketch mode (validator rule).

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
| `epistemicStatus` | reported \| observed \| inferred \| planned \| symbolic (ritual: client-believed \| tradition-claimed; never system-confirmed) | edge **line style** (solid/dashed/dotted) + node badge | status word + legend; **collision-checked** vs school line meanings |

`epistemicStatus` (Source 3) makes every element's epistemic standing explicit —
formulation is a working hypothesis, not settled fact. It is the dimension behind
"reported→solid, inferred→dashed, symbolic/tradition-claimed→dotted"; the validator
prevents it from clashing with a profile's own line semantics (spec §J.4 semiotic clarity).

Each node also carries stable `id` (for cross-diagram nav and cross-version diff, spec
§H.10) and `bandId` for states (spec §A.2-r1). **Labels are i18n-ready** (Source 3):
`label` is a map `{ BCP-47 lang → text }` over the stable `id`, with `clinicianLabel` /
`clientLabel` layer variants per language — so a diagram translates without losing identity.

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

**Views vs. profiles.** Source 3 frames diagrams as *views* (reversible projections of
the one graph). PsyUML's nine diagram types are those views; a profile chooses glyphs/
layout/vocabulary within a view. Source 3's six views map onto PsyUML's types, with one
addition — a **Body Map** view (somatic: body-located sensations, arousal curve, sensory
channels), new in §13 — which fills a gap (PsyUML has polyvagal *State* but no body map).

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
- **Text alternative always** (Source 3 / WCAG 2.2): every rendered view also emits a plain-language **text summary + alt text**, so no view depends on vision or color.
- **Exports:** SVG, PNG, and Mermaid (approximate, labeled as such); FHIR/JSON via `@psyuml/interop` (§10).

## 7. Validation & clinical-safety lint (`@psyuml/validate`)

Three rule classes, each with severity (`error | warn | info`) and layer scope:

1. **Well-formedness** (hard errors) — the spec §A.2 predicates in §3 above.
2. **Accessibility lint** (spec §D) — fail any meaning encoded by color alone; require min 14pt text in the client layer; require pattern (not hue) on phase bands; check Okabe–Ito palette use.
3. **Clinical-safety lint** — the **"path of hope" rule** (paper A4): *warn if a diagram contains maintaining/negative loops but no Exit, Resource, Self, or preferred-future element*; **error** in client-facing layer. Plus: client diagrams missing disclaimer/crisis fields = error (§A.2-r7); ritual templates missing the honest-framing + secular-variant fields = error (§F, §L.2-r3).
4. **Clinical-hazard rules** (Source 3) — markers of acute self-harm / violence / psychosis / severe dissociation / urgent medical risk ⇒ **block autonomous formulation** and raise a human-review escalation banner (the AI-assist pipeline, §9, gates on this); risky-ritual materials (fire, blood, substances, fasting, sleep-deprivation, sex, isolation, money/legal acts, weapons) ⇒ force `documentation-only` unless a licensed human approves; every edge must be typed (no unlabeled arrows outside free-sketch); mixed-school diagrams must carry provenance tags; PII in an export ⇒ redact by default (§11).

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
- Pipeline (Source 3): consent check → **PII minimization** → **safety triage** → ontology extraction → view planning → draft → validation → render → collaborative revision → export. Safety triage (§7 rule 4) can halt at any point and route to human review before any formulation is produced.

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
│  ├─ interop/      # @psyuml/interop   FHIR/SNOMED + de-identified research export (M9)
│  └─ ai/           # @psyuml/ai        bounded narrative→draft assist (M8, optional)
├─ apps/
│  └─ web/          # the deployable GUI editor (React + Vite)
├─ examples/        # the §H worked case + per-diagram examples, as .psyuml + golden SVG
└─ conformance/     # spec-conformance test suite (drives v1.0 readiness)
```

**Dependency direction:** `model` ← `validate` ← `profiles` ← `render` ← `apps/web`;
`grammar`, `interop`, and `ai` depend on `model` only. The core (`model`/`validate`) carries
no UI or vendor dependency, so the language stays reusable (CLI, server, other front-ends).

## 11. Accessibility, privacy & ethics as architectural constraints

These are **enforced in code**, not left to authoring discipline:
- Color is always redundant (§7 accessibility lint blocks violations; monochrome preview is a first-class view); every view also emits a text summary + alt text (§6).
- Client-layer exports are gated on disclaimer + crisis fields (§7).
- Ritual templates ship a mandatory secular variant and the honest non-medical evidence note (spec §F/§L.2-r3); the renderer surfaces them.
- Client language is plain/agentic/externalized by default (spec §L.2-r2); the client layer hides clinician jargon fields.
- The "path of hope" lint makes a hopeless-only diagram a blocked state in the client layer (§7).

**Privacy-by-default (Source 3; HIPAA/GDPR-informed).** Local-first storage (§8); no PHI
leaves the device without explicit, role-specific export consent; **de-identification and
redaction are the default** for any export (`@psyuml/interop`); exports are role-scoped
(client-safe vs clinician vs de-identified research); an **audit log** records exports and
AI-assist actions. No live-care *treatment recommendations* in v0.x — PsyUML ships as
**human-supervised formulation infrastructure** (Source 3's conservative regulatory framing;
FDA CDS classification is use-context-dependent).

## 12. Conformance & v1.0 readiness

`conformance/` encodes the spec's own acceptance criteria (§J rubric, §E per-type
requirements) as executable tests, and the spec's **Stage 4** gate
(usability of the Tier-1 crisis chart, inter-rater reliability, multi-school
endorsement) is tracked as the exit criterion to leave v0.x — see ROADMAP M10.
The software roadmap *serves* the spec's clinical staged-validation plan; it does
not replace it.

## 13. Additions from the PsyML Fable-agent spec (Source 3)

Source 3 (`docs/research/psyml-fable-agent-spec.md`) converges with this architecture and
adds the items below. Most are already threaded into §2–§12; this section is the index plus
the pieces that live only here. Full adopt/adapt analysis: `idea-incorporation.md` §5.

- **Round-trip invariant (elevated to a hard rule).** A client-safe SVG, a clinician-grade
  view, and the machine-readable JSON must all round-trip back to the *same* canonical graph.
  Views are reversible projections; renderings are disposable. This is a conformance test
  (§12) and the single most load-bearing architectural choice.
- **Epistemic status** on every node/edge (§3) — formulation as working hypothesis.
- **Clinical-hazard / safety-triage** lint class + AI-assist gate (§7 rule 4, §9).
- **i18n** labels and **alt-text/text-summary** for every view (§3, §6).
- **`@psyuml/interop`** — FHIR/SNOMED + de-identified research export (§10), privacy-gated (§11).

**Four personas, four default flows** (extends the clinician/client duality):

| Persona | Default flow | Notes |
|---|---|---|
| Therapist | draft formulation → review uncertainty → edit → share selected layers | full Tier-1/2/3 |
| Client | plain-language summary → 1–2 views max → reflect & correct | client layer only; safety lints hard-block |
| Researcher | de-identify → normalize schema → batch-compare; **weighted/dynamic network** views | reuses §E.4 Borsboom net; labeled **exploratory** (no gold standard) |
| Ritual practitioner | state intention + tradition → map sequence/symbols/witnesses/boundaries → record contraindications + consent | epistemic status mandatory; risky-material gate (§7) |

**Body Map view (new).** A body outline with sensations placed by location, an arousal
curve, and sensory/breath/movement channels. Specializes the State/Resource elements;
Tier-3; ships hand-drawn + monochrome fallbacks; titration/pacing notes per the trauma-safety
guidance. Tracked as REQ-BODY-MAP (M5).

**FHIR / standards mapping (`@psyuml/interop`, conservative, M9):**

| PsyUML element | FHIR / terminology target |
|---|---|
| Person (client/therapist/relative/witness) | Patient · RelatedPerson · Practitioner |
| Concern / symptom | Observation (+ SNOMED CT where apt) |
| Cognition · Emotion · Sensation | Observation / QuestionnaireResponse item |
| Behavior · Intervention / practice | CarePlan activity |
| Value / goal | Goal |
| Risk / contraindication | safety flag + CarePlan constraint |
| Evidence / provenance · epistemicStatus | Provenance metadata |
| Labels | BCP 47 language tags |

Export stays **de-identified by default** and role-scoped (§11); regulatory classification is
use-context-dependent, so v0.x is documentation/reflection infrastructure, not live-care CDS.

**Evaluation suite (Source 3 → REQ-EVAL-SUITE, M10):** comprehension · collaborative validity
· editability · cross-school fidelity · safety · privacy · interoperability · accessibility —
operationalizing the spec's §J rubric and Stage-4 gate.
