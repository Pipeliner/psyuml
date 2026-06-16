# Idea Incorporation — companion research papers → PsyUML implementation

This note records, transparently, **which ideas from the companion research papers**
are folded into the PsyUML implementation, which are **adapted**, and which are
**deliberately rejected** — and why.

Sources:
- **Source 2** — [`upml-fable-agent-architecture.ru.md`](./upml-fable-agent-architecture.ru.md) (UPML/Fable, RU). Analyzed in §1–§4 below.
- **Source 3** — [`psyml-fable-agent-spec.md`](./psyml-fable-agent-spec.md) (PsyML Fable-agent spec). Analyzed in §5 below.

(Source 1 is the primary spec itself, `../specification/psyuml-v0.1.0.md`.)

**Governing principle.** Where the companion paper conflicts with the PsyUML
[Ethical-Use Statement (§L.2)](../specification/psyuml-v0.1.0.md) or with the
spec's "formulation-level, not nosology" stance (§A.3), **the PsyUML spec
wins.** PsyUML is collaborative, consent-based, non-diagnostic, accessibility-first,
and "support, not replace." The companion paper is treated as a source of
*notation and feature* ideas, not as a source of clinical authority or AI policy.

---

## 1. Ideas ADOPTED (fold into the core)

| # | Idea (from paper) | How it lands in PsyUML | Plan ref |
|---|---|---|---|
| A1 | **One immutable core model, many school views ("polymorphism")** — "базовая структура данных остается неизменной … визуальный интерфейс становится полиморфным." | Becomes the central architecture rule: a single school-agnostic `Model` (PsyUML Tier-1 ontology, §A) rendered through swappable **School Profiles** (§G/§K). "Refactor a Malan triangle into a Mode Map" = re-render the same model with a different profile. | ARCH §2, §5; ROADMAP M4 |
| A2 | **UML metric framing OT / RT / PT** — n(OT) object types, n(RT) relationship types, n(PT) property types. | Adopted as the metamodel vocabulary: nodes (OT) = the 8 element categories; edges (RT) = the typed connector set (§C); **properties (PT)** = a typed property bag on every node/edge. | ARCH §3 |
| A3 | **Quantitative node properties drive visuals** — dominance/frequency → node size; affect intensity → color; defense rigidity → shape. | Adopted **subject to PsyUML §D**: every property-driven channel (size, hue, line style) must stay *redundant* with a numeral/label/shape. `dominance` → size **+ printed value**; `valence/intensity` → color **+ icon + word**. | ARCH §3, §6 |
| A4 | **Mandatory "path of hope"** — "каждая генерируемая диаграмма содержит визуализированный альтернативный путь (Выход или … Здоровый взрослый)." A diagram of only negative loops is clinically harmful. | Adopted as a **lint rule** generalizing PsyUML §A.2-r5 (exits on loops) to *every* diagram: warn if no Exit / Resource / Self / preferred-future element is present. Configurable severity (client-facing → error). | ARCH §7; ROADMAP M3 |
| A5 | **Liminal / forming = dashed; consolidated = solid** — Turner-derived rendering of in-between states. | Adopted as a `consolidation` property (consolidated \| forming \| liminal) → solid vs dashed border, aligning with PsyUML's `~conf:L/M/H~` tag and dashed connectors (§B/§C). | ARCH §3, §6 |
| A6 | **Longitudinal model + "diff" diagrams** — store prior session graph; render progress (node shrank 20%, dashed Exit → solid). | Adopted as **model versioning + diff view**, built on PsyUML's stable shared node IDs (§H.10). Powers the Timeline/Trajectory clinical use. | ARCH §8; ROADMAP M6 |
| A7 | **Plain-language auto-legend on every diagram.** | Adopted; matches PsyUML's client layer. The renderer emits a legend in the active layer's vocabulary (clinician vs client). | ARCH §6; ROADMAP M2 |
| A8 | **AI-friendly text graph output (Mermaid/Graphviz-style) that both humans and an agent can emit.** | Adopted as the `.psyuml` serialization + an optional text DSL; Mermaid kept as an *export* target. Native SVG renderer remains authoritative for genogram glyphs & arousal bands (which Mermaid can't draw — spec Caveats). | ARCH §6; ROADMAP M2, M9 |
| A9 | **Cross-theoretical translation matrix keyed by the client's own words** (Table 2). | Adopted as seed data for the translation table (§G.2), extended with Malan & Karpman columns. Drives the profile switcher and AI-assist mapping. | ARCH §5; ROADMAP M4 |

## 2. New diagram types / profiles ADDED (from the paper, via §K extension rules)

Each follows PsyUML §K: it **specializes a §A core element**, defaults to **Tier 3**,
and ships a glyph + hand-drawn form + color/non-color fallback + ≥1 synonym +
compatibility verdicts. None collide with a Tier-1 glyph.

| Profile | Specializes (core diagram) | Distinctive feature carried over |
|---|---|---|
| **Schema Mode Map** | Parts/Agents Map (E.2) | Discrete circle nodes; **size = mode dominance/frequency** (redundant numeral); explicit therapeutic goal = grow `HealthyAdult`, shrink maladaptive-coping/critic nodes; red-triangle "child wound" marker. |
| **CAT SDR** (Sequential Diagrammatic Reformulation) | Process/Loop (E.4) | Reciprocal roles in ovals; central core state; typed **traps / dilemmas / snags**; observing-eye; collaboratively drawn; exits elaborated early. |
| **Malan Two Triangles** | new psychodynamic profile: Triangle of Conflict ≈ constrained Loop (impulse→anxiety→defense); Triangle of Person ≈ Relational Field with **P/C/T** roles | Focal-conflict selection; **transference edges** (dashed historical P→C/T links) joining past figures to present relationships. |
| **Karpman Drama Triangle** | Relational Field overlay (E.3) | Victim / Rescuer / Persecutor with **role-switching**; **nested historical triangle** (childhood script) inside the present triangle via a `NestedWithin` container — fractal history→present link. |

(PsyUML already covers polyvagal/State, IFS/Parts, genogram/Relational, CBT &
Borsboom/Loop, narrative/Timeline, phased-treatment/Intervention, ritual,
ACT-choice-point/Decision, CFT-bullseye/Resource — these profiles extend the same nine.)

## 3. Ideas ADAPTED (kept, but reshaped to fit PsyUML's ethics)

| Idea (paper) | Why not as-is | Adapted form in PsyUML |
|---|---|---|
| **Autonomous agent that analyzes the user and emits diagrams** ("Showrunner" therapeutic guide). | PsyUML is collaborative & consent-based; the user chose a **GUI editor** as the primary build. An autonomous analyst conflicts with client authorship (§L.2-r5) and risks the diagnosis line (§A.3). | A **bounded, optional AI-assist panel**: paste a narrative → it proposes a *draft* model (nodes/edges/tags) the clinician/client reviews, edits, and accepts. Human-in-the-loop, formulation-only, never auto-applied. (ROADMAP M8.) |
| **Episodic "state machine" of the user's psyche across sessions.** | Useful, but "state machine of the user's mind" overclaims. | Reframed as **versioned formulations** the clinician saves per session, with a diff view (A6). The model versions the *documents*, not the person. |
| **NLP defense/affect detection from language** (passive voice → Intellectualization, etc.). | Speculative; risks silent mislabeling and pathologizing. | Allowed only as an **opt-in suggestion** inside AI-assist, always surfaced as an editable hypothesis with a confidence tag (`~conf:L~`), never as an automatic node. (ROADMAP M8, flagged research.) |

## 4. Ideas REJECTED (and why)

| Rejected idea | Reason |
|---|---|
| **"Module 1 — Safeguard Mitigation / обход блокировок"** — prompt text engineered to stop a model from "blocking" requests and to bypass safety classifiers. | This is **circumventing AI safety guardrails.** We will not design, ship, or document features whose purpose is to defeat a model provider's safety systems. The *legitimate kernel* — clearly stating the benign, educational, formulation-support context — is kept (it's just good prompting and matches §L.2-r1), but framed as honest context-setting, **not** as "bypass." |
| **Autonomous clinical diagnosis / symptom-severity scoring** ("OpenClaw-Medical-Skills", "автоматизация диагностики ПТСР", auto-adjusting edges from inferred severity). | PsyUML is explicitly **formulation-level, not nosology** (§A.3). Auto-diagnosis from chat is clinically unsafe and out of scope. AI-assist stays formulation-only and human-reviewed. |
| **Unverified platform lore** — "Mythos 1 class", "fallback to Opus 4.8 in ~5% of sessions", "120,040-char leaked system prompt", specific Fable-internal percentages. | Treated as **unverified claims**, not engineering facts. The plan does not depend on any specific vendor-internal behavior. The AI-assist layer targets a documented public API and stays model-agnostic. |
| **Hard dependency on the "Fable Showrunner" simulation environment.** | PsyUML must run as a standalone web app. "Showrunner / persistent agent" is, at most, one possible *deployment surface* later — not an architectural dependency. |

## 5. Source 3 — PsyML Fable-agent spec (adopted; aligned with our ethics)

Source 3 ([`psyml-fable-agent-spec.md`](./psyml-fable-agent-spec.md)) **converges**
with PsyUML's architecture ("one canonical graph + reversible views, disposable
renderings") and is ethically careful — it already frames the agent as *decision/diagram
support, not an autonomous therapist*. Almost everything is **adopted**; nothing is
rejected outright. New ideas folded in:

| # | Idea (Source 3) | How it lands in PsyUML | Plan ref / REQ |
|---|---|---|---|
| C1 | **Canonical graph; views are reversible projections; renderings disposable; round-trip is the key invariant** | Confirms A1; elevate **round-trip** (JSON ⇄ any view ⇄ JSON, lossless) to an explicit architectural invariant + conformance test. | ARCH §2, §12; REQ-CROSS-SCHOOL, REQ-CONFORMANCE |
| C2 | **Epistemic status on every node/edge** — `reported \| observed \| inferred \| planned \| symbolic`; ritual/spiritual = `client-believed \| tradition-claimed \| symbolic`, **never `system-confirmed`** | New first-class `epistemicStatus` property; case formulation = working hypothesis. Rendered via a **redundant, collision-checked** channel (line style + tag), not by overloading glyphs. | ARCH §3, §13; **REQ-EPISTEMIC-STATUS** (M1) |
| C3 | **Safety triage + clinical-hazard validation rules** — acute self-harm/violence/psychosis/severe-dissociation/medical-risk ⇒ stop autonomous formulation, escalate to human review; risky-ritual materials (fire/blood/substances/fasting/sleep-deprivation/sex/isolation/money/legal/weapons) ⇒ `documentation-only`; inferred ⇒ dashed+confidence; spiritual claims ⇒ require epistemic status; PII ⇒ redact by default; client-safe view strips clinician-only labels; mixed schools ⇒ tag provenance | New **clinical-hazard lint class** + a **risk/psychosis safety gate** in the AI-assist pipeline. | ARCH §7, §9; **REQ-SAFETY-TRIAGE** (M3); strengthens REQ-AI-ASSIST |
| C4 | **Body Map view** — somatic: interoception, arousal curve, sensory channels, body-located sensations | New diagram **view** (a genuine gap — PsyUML has polyvagal *State* but no body map). | ARCH §5, §13; **REQ-BODY-MAP** (M5) |
| C5 | **Risk/contraindication as first-class** + richer **edge vocabulary** (`interprets_as, protects, avoids, targets, witnessed_by, consented_by, contraindicated_by, uncertain_about`) + **forbid unlabeled arrows** (except free-sketch) | `«Risk»` stereotype on Context/Intervention; extend the RT vocabulary; validator rule requiring typed edges. | ARCH §3; folded into REQ-WELLFORMEDNESS / REQ-EPISTEMIC-STATUS |
| C6 | **FHIR/SNOMED interoperability** — export to Observation, QuestionnaireResponse, CarePlan, Goal, Patient/RelatedPerson; de-identified research export | New `@psyuml/interop` package; conservative and **later** (regulation-sensitive). **Realized M15** (v0.2 §7, ADR-0018) as a **lossy, export-only** FHIR R4 bridge — Composition/ClinicalImpression/Observation/FamilyMemberHistory+List/CarePlan+Goal (non-diagnostic, never Condition), de-identified by default, **no round-trip**; SNOMED/LOINC binding still deferred. | ARCH §10, §13, §15; **REQ-INTEROP-FHIR** (M9→M15) |
| C7 | **Multilingual** — stable concept IDs separate from language-specific labels; BCP 47 tags; Unicode | i18n baked into the model from the start (`label` becomes `{lang → text}` over a stable `id`). | ARCH §3, §13; **REQ-I18N** (M1) |
| C8 | **Alt-text + text summary for every rendered view** (WCAG 2.2) | Renderer always emits a textual summary + alt text alongside SVG. | ARCH §6, §13; extends REQ-ACCESSIBILITY |
| C9 | **Four personas + per-persona UX flows** (therapist / client / researcher / ritual practitioner); **researcher mode** = weighted/dynamic networks, de-identify, batch-compare, clearly labeled *exploratory* | Extends the dual-audience model to four personas; researcher mode reuses the §E.4 Borsboom network. | ARCH §13 |
| C10 | **Privacy-by-default** (de-identification, role-based export, audit logs, redaction, consent) + **clinical-safety governance** (hazard log / safety case; FDA CDS context-sensitivity; "implement first as human-supervised formulation infrastructure") | Privacy NFRs + a conservative governance posture; no live-care treatment recommendations in v0.x. | ARCH §11, §13; **REQ-PRIVACY** (M8) |
| C11 | **Evaluation suite** — comprehension, collaborative validity, editability, cross-school fidelity, safety, privacy, interoperability, accessibility | Becomes the conformance + Stage-4 metric set. | **REQ-EVAL-SUITE** (M10) |

**Reconciliation (kept PsyUML as source of truth):**
- **Glyph conflicts.** Source 3's primitive set assigns shapes differently from PsyUML §B
  (it uses hexagon = self-state, circle = emotion/sensation, octagon = risk; PsyUML uses
  hexagon = intervention, circle = agent). We **keep PsyUML §B glyphs** and adopt Source 3's
  *concepts* (epistemic line styles, risk-as-entity) via stereotypes + a redundant,
  collision-checked encoding — never by silently overloading a Tier-1 glyph (spec §J.4
  semiotic clarity). The dashed/dotted **line-style** semantics (reported→solid,
  inferred→dashed, symbolic/tradition-claimed→dotted) align well and are adopted for edges,
  with the validator guarding against clashes with school-specific line meanings.
- **Naming.** "PsyML" = a parallel name for the same endeavor; the project keeps **PsyUML**.
- **Scope caution (not rejection).** FHIR interop and a formal clinical-safety case are real
  but heavyweight and regulation-sensitive; they are sequenced **late** and kept optional, per
  Source 3's own advice to ship first as human-supervised formulation infrastructure.

## 6. Net effect on the plan

Across the two companion papers, PsyUML is meaningfully **enriched** without changing its
ethical core. From Source 2: a typed **property system** (PT) with redundant visual
encodings, **four psychodynamic/schema profiles**, **longitudinal versioning + diff**, and a
**bounded AI-assist**. From Source 3: a first-class **epistemic-status** dimension, a
**clinical-hazard/safety-triage** lint class, a new **Body Map** view, **FHIR
interoperability**, **i18n** and **alt-text** baked in, a **round-trip** invariant, four
**personas**, and **privacy-by-default** with conservative governance. Everything
safety-sensitive is reframed honestly or sequenced conservatively; the rejected items remain
those from Source 2 (safeguard-bypass, autonomous diagnosis). PsyUML's Ethical-Use Statement
(§L.2) stays the binding constraint, and the PsyUML spec stays the source of truth on any
conflict (notably notation/glyphs).

## 7. External project-plan cross-check (alternative funding plan)

A separately-authored 6-milestone project plan for "PsyUML" was reviewed for ideas worth
lifting. It **independently converges** with this project's architecture (a multi-view language
over one canonical model, a Mermaid-style text DSL + parser + SVG renderer, a school-
compatibility matrix with translation guides, a §K-style extension mechanism, and
Moody-Physics-of-Notations evaluation) — useful validation, but little of it is new to our
spec/plan. The genuinely **additive deliverables** lifted from it:

| Idea (alt plan) | Status here | Lifted as |
|---|---|---|
| **Notation style guide** — color semantics, line weights, emotional-valence encoding, cultural-sensitivity notes for ritual symbols | new (we have `assets/tokens.json` + glyphs but no written guide) | REQ-STYLE-GUIDE (M5) |
| **Printable blank templates** for paper/session use + **clinician & client cheat-sheets** | new | REQ-TEMPLATES (M5) |
| **Worked case studies across multiple schools** (CBT panic, IFS, family genogram, grief-ritual, …) | partial — we have the single composite case "R." (§H) | REQ-CASE-CORPUS (M6) — grow `examples/` beyond one case |
| **Practitioner handbook / tutorial** — per-diagram how-tos, co-creating-in-session guidance, exercises with answers, self-guided-reflection chapter | new | REQ-HANDBOOK (M10) |
| **Adoption pack** — workshop decks + facilitator scripts, a *notation-extension* contributor guide (for clinicians proposing symbols, distinct from the dev `CONTRIBUTING.md`), comprehension-test instruments + pilot-study design | new (extends REQ-EVAL-SUITE) | REQ-ADOPTION (M10) |
| DSL **error messages designed for non-programmers** | refinement | folded into REQ-TEXT-DSL (M9) |

**Confirmed already-covered (no action):** the core spec/metamodel, the diagram-type catalog,
cross-school compatibility + translation tables (§G), the symbol SVG library (`assets/glyphs`),
accessibility/readability (§D), the extension/versioning mechanism (§K), and the evaluation
rubric (§J / REQ-EVAL-SUITE). A standalone "notation landscape review with citations" is
largely covered by the spec's per-type originating-schools notes (§E) plus `docs/research/`, so
it is not separately scheduled.

Nothing in the alternative plan conflicts with PsyUML's ethics or architecture, so nothing is
rejected; the lifted items are documentation/materials, sequenced late and kept optional.
