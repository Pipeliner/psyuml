# Idea Incorporation — UPML/Fable paper → PsyUML implementation

This note records, transparently, **which ideas from the companion research
paper** ([`upml-fable-agent-architecture.ru.md`](./upml-fable-agent-architecture.ru.md))
are folded into the PsyUML implementation, which are **adapted**, and which are
**deliberately rejected** — and why.

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

## 5. Net effect on the plan

The companion paper meaningfully **enriches** PsyUML in four concrete places:
the metamodel gains a typed **property system** (PT) with redundant visual
encodings; the catalog gains **four psychodynamic/schema profiles**; the tool
gains **longitudinal versioning + diff**; and a **bounded AI-assist** authoring
layer is added as a late, optional milestone. Everything safety-sensitive in the
paper is either reframed honestly or rejected outright, with PsyUML's
Ethical-Use Statement as the binding constraint.
