# PsyUML — Implementation Roadmap

> Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> Language spec: [`specification/psyuml-v0.1.0.md`](./specification/psyuml-v0.1.0.md).

**Agreed direction (from project setup):**
- **Build scope:** *GUI editor first* — a visual, drag-and-drop diagram editor is the primary product, not a text-DSL-first toolchain.
- **Stack:** *TypeScript + web* (see ARCHITECTURE §10).
- **Deliverable of this step:** the planning docs in this repo (you are reading them).

## Sequencing principle

We build in **thin vertical slices**: every milestone renders *something real on
screen* end-to-end (model → validate → render → edit), rather than completing one
horizontal layer before the next. The 8-symbol Tier-1 core (spec §B) is the first
slice; school overlays, longitudinal diff, ritual, and AI-assist are added on top
without breaking earlier diagrams (spec §K versioning: Tier-1 core frozen within a
MAJOR version).

## Relationship to the spec's clinical staging

The spec's **Recommendations (Stage 1–4)** are a *clinical adoption* plan
(formulation aids now → supervised pilot → consented ritual use → validate before
v1.0). This roadmap is the *software* plan that **serves** it: M1–M3 produce the
low-risk Tier-1 aids of clinical Stage 1; M4–M6 produce the dual-layer/translation
features piloted in Stage 2; M7 gates ritual behind Stage 3's consent/secular
requirements; M10 builds the conformance + usability artifacts that Stage 4
demands before any 1.0.

---

## Phase 0 — Foundations

### M0 · Repo & toolchain skeleton
- **Goal:** an installable, CI-green monorepo with empty-but-typed packages.
- **Deliverables:** pnpm workspace; `packages/{model,validate,render,profiles}` + `apps/web` scaffolds; Vite + React app shell; ESLint/Prettier; Vitest + Playwright wired; GitHub Actions (lint, typecheck, test, build); Okabe–Ito color tokens + the 8 core glyphs as SVG assets; `CONTRIBUTING.md`, `LICENSE` (TBD with owner).
- **Done when:** `pnpm i && pnpm build && pnpm test` passes in CI; the web app boots to an empty canvas.

## Phase 1 — Render & edit the Tier-1 core

### M1 · Core model + read-only renderer
- **Goal:** the metamodel exists and renders.
- **Deliverables:** `@psyuml/model` types + JSON Schema for the 8 element categories, typed connectors (§C), and the PT property bag (ARCH §3) — **including `epistemicStatus`** (reported/observed/inferred/planned/symbolic) and **i18n labels** (stable `id` + `{BCP-47 → text}`, Source 3); `@psyuml/render` draws a **static State Map** and **Parts/Agents Map** from a `.psyuml` file, including bands/swimlanes; clinician⇄client and **monochrome** toggles; auto-legend. A library-choice spike (React Flow vs d3/Konva) is resolved here.
- **Acceptance:** the spec's §E.1 and §E.2 ASCII examples reproduce as SVG; monochrome render loses no meaning (manual a11y check); golden-SVG snapshot tests pass; the same `.psyuml` **round-trips** model→JSON→model losslessly.
- **Spec refs:** §A, §B, §C, §D, §E.1, §E.2. **REQ:** REQ-CORE-ONTOLOGY, REQ-NOTATION, REQ-EPISTEMIC-STATUS, REQ-I18N.

### M2 · GUI editor MVP (the headline deliverable) — built against the UX user stories
- **Goal:** a clinician can *build* a Tier-1 diagram by hand (and co-edit it with a client), save, and export — satisfying the UX MUST requirements.
- **Deliverables:** glyph **palette** (8 core symbols) with drag/drop; node/edge **properties panel** (labels, tier, dominance, valence, consolidation, epistemicStatus); manual layout + connect; save/load `.psyuml` (**local-first**, UX-M5); export SVG/PNG + **text/alt-text** export; covers the three client-facing diagrams (State Map, Resource/Anchor, Crisis/Decision chart) plus Parts Map. **Built against `docs/ux/`:** client/clinician **layer toggle** + **monochrome** toggle (UX-M2/M3); **full keyboard** operation + screen-reader text/outline of the formulation + ≥24×24px targets (UX-M1, WCAG 2.2 AA); **co-authorship** — free-text/verbatim labels, client can relabel/hide/correct, reversible (REQ-COLLAB, UX-M6); **emotional safety** — progressive reveal, save-incomplete, non-pathologizing defaults, standing disclaimer (REQ-CLIENT-SAFETY-UX, UX-M7); no outcome-claim copy (UX-M8).
- **Acceptance:** a new user reproduces the §H.1 State Map and §E.8 crisis chart from scratch in the UI in < 5 min; round-trips through save/load with stable IDs; passes a WCAG 2.2 AA keyboard + colour-redundancy check; the client layer never shows clinician-only fields; nothing is auto-finalized.
- **Spec refs:** §E.1, §E.8, §E.9; "Audience guide"; `docs/ux/ux-research-and-requirements.md`. **REQ:** REQ-EDITOR-MVP, REQ-UX-STORIES, REQ-COLLAB, REQ-CLIENT-SAFETY-UX, REQ-ACCESSIBILITY.

## Phase 2 — Make it safe and cross-school

### M3 · Validation + accessibility + "path of hope" lint
- **Goal:** the editor enforces well-formedness and clinical-safety invariants.
- **Deliverables:** `@psyuml/validate` with all four rule classes (ARCH §7): §A.2 well-formedness; §D accessibility (+ **alt-text/text-summary** per view, Source 3); **path-of-hope** + disclaimer/crisis gating; and the **clinical-hazard / safety-triage** rules (acute-risk→human-review banner; risky-ritual→documentation-only; typed-edge requirement; mixed-school provenance; PII-redact-by-default). Live squiggles + a "formulation health" panel; CI lints the example corpus.
- **Acceptance:** a client-facing diagram with only negative loops is **blocked** from export; a client diagram without disclaimer+crisis fields cannot export; a color-only encoding is flagged; an acute-risk marker raises the escalation banner and disables autonomous formulation.
- **Spec refs:** §A.2, §D, §L.2; ideas A4 (path-of-hope), Source 3 C3/C8. **REQ:** REQ-WELLFORMEDNESS, REQ-ACCESSIBILITY, REQ-PATH-OF-HOPE, REQ-ETHICS-GUARDRAILS, REQ-SAFETY-TRIAGE.

### M4 · School profiles + polymorphic re-render + translation
- **Goal:** the same model renders in multiple schools without losing provenance.
- **Deliverables:** `@psyuml/profiles` with `polyvagal, ifs, schema, cat, genogram, act, cft, narrative`; the **profile switcher** (re-label/re-style/re-layout the same nodes); provenance tags `{school:…}`; the **translation table** (§G.2 + paper Table 2) as data; genogram glyph set (McGoldrick–Gerson–Petry) in the renderer.
- **Acceptance:** the §E.4 loop renders as CBT *and* CAT/SDR from one model; switching schools never mutates core data; opposed origin-claims stay visible as tags (§G.2 caveat).
- **Spec refs:** §C (genogram), §E.3, §E.4, §G; paper ideas A1, A9.

## Phase 3 — Depth: psychodynamic profiles & longitudinal use

### M5 · Research-derived profiles + Body Map
- **Goal:** add the four profiles harvested from Source 2, plus the Source-3 Body Map view.
- **Deliverables (each per §K extension rules — ARCH §5):** **Schema Mode Map** (circle nodes, size=dominance with redundant numeral, HealthyAdult-growth goal); **CAT SDR** (reciprocal roles, traps/dilemmas/snags, observing-eye); **Malan Two Triangles** (Conflict + Person with P/C/T + transference edges); **Karpman Drama Triangle** with **nested historical triangle** (`NestedWithin`); **Body Map** view (body-located sensations, arousal curve, sensory/breath channels; titration/pacing notes).
- **Acceptance:** each profile/view passes a §K collision check (no Tier-1 glyph clash), ships hand-drawn + color/non-color fallbacks, and has compatibility verdicts; a Mode Map's HealthyAdult node visibly grows across two versions (feeds M6).
- **Spec refs:** §E.2, §E.4, §K; `idea-incorporation.md` §2, §5. **REQ:** REQ-RESEARCH-PROFILES, REQ-EXTENSION-MECH, REQ-BODY-MAP.

### M6 · Longitudinal: versioning + diff view
- **Goal:** show change over time.
- **Deliverables:** immutable per-session versions; **diff view** (node/edge add·remove·change; dominance deltas; dashed→solid consolidation); Timeline/Trajectory diagram (§E.5); cross-diagram navigation via shared IDs (§H.10).
- **Acceptance:** two saved versions of the §H worked case produce a readable progress diff (e.g. "Punishing Parent" dominance ↓, an Exit consolidated).
- **Spec refs:** §E.5, §H.10; paper idea A6.

## Phase 4 — Ritual, assist, and text surface

### M7 · Ritual modality (first-class), gated by ethics
- **Goal:** ritual structure diagrams with honest, consented framing.
- **Deliverables:** Ritual Structure diagram with van Gennep phase bands (separation→liminal→incorporation); the worked templates (sigil, tarot-as-reflection, rite-of-passage/grief, banishing/boundary — spec §F.2–F.5); **mandatory secular variant** + honest non-medical evidence note as required fields; interop proof — the same intervention hexagon appears as a node in an Intervention Sequence (§E.6) *and* as a trajectory trigger (§E.5), per §F.6.
- **Acceptance:** a ritual template cannot be saved/exported without its secular variant and framing fields (validator error); §F.6 interop demonstrated on the §H.7 grief rite.
- **Spec refs:** §F, §L.2-r3,4,5; clinical Stage 3 gate.

### M8 · Bounded AI-assist (optional)
- **Goal:** narrative → *draft* model for human review.
- **Deliverables:** `@psyuml/ai` panel running the Source-3 pipeline — consent → **PII minimization** → **safety triage** (§7 rule 4) → extraction → view planning → draft → validation → review; proposed nodes/edges/tags at low confidence (`~conf:L~`, `epistemicStatus=inferred`) → human accepts/edits; formulation-only guardrails (no diagnosis/severity); Claude API (model-agnostic, latest capable model); **privacy-by-default** (de-identify/redact exports, role-scoped, audit log).
- **Acceptance:** nothing is ever auto-applied; safety triage halts and escalates on acute-risk/psychosis markers before any formulation; every AI-suggested node is low-confidence until confirmed; removing the AI package leaves the editor fully functional.
- **Spec refs:** §A.3 (formulation not nosology); `idea-incorporation.md` §3–5. **REQ:** REQ-AI-ASSIST, REQ-PRIVACY.
- **Explicitly out of scope:** safeguard-bypass prompting; autonomous diagnosis; live-care treatment recommendations.

### M9 · Text DSL + parser + CLI + interoperability export
- **Goal:** a text surface syntax, headless tooling, and standards export.
- **Deliverables:** `@psyuml/grammar` (text DSL ⇄ model round-trip) ✅; a CLI — shipped as `psyuml lint|render|convert|redact` ✅ (an `export` subcommand arrives with interop, below); Mermaid export; import of the §H examples as DSL; **`@psyuml/interop`** (planned) — FHIR (Observation, QuestionnaireResponse, CarePlan, Goal, Patient/RelatedPerson) + SNOMED-tagged, **de-identified** research export (Source 3).
- **Acceptance:** every `examples/*.psyuml` round-trips DSL→model→DSL losslessly; CLI lints the corpus in CI; a FHIR export validates against its resource schemas and re-imports without meaning loss; exports are de-identified by default.
- **Spec refs:** §B/§C tables (authoritative notation); paper idea A8; Source 3 C6. **REQ:** REQ-TEXT-DSL, REQ-INTEROP-FHIR.

## Phase 5 — Toward v1.0

### M10 · Conformance, usability, and release readiness
- **Goal:** the artifacts the spec requires before leaving v0.x.
- **Deliverables:** `conformance/` executable suite (spec §J rubric + §E per-type requirements + the **round-trip invariant**); the **evaluation suite** (Source 3: comprehension, collaborative validity, editability, cross-school fidelity, safety, privacy, interoperability, accessibility); a docs site; a formal accessibility audit; a usability-test protocol for the Tier-1 crisis chart (spec Stage 4); semver/release flow via Changesets (spec §K).
- **Acceptance:** conformance suite green (incl. round-trip); a11y audit passes; **v0.x → v1.0 stays gated** on the spec's Stage-4 evidence (layperson comprehension, inter-rater reliability, multi-school endorsement) — software-ready ≠ clinically-validated.
- **Spec refs:** §J, §K, Recommendations Stage 4, Caveats. **REQ:** REQ-CONFORMANCE, REQ-EVAL-SUITE.

## Phase 6 — The v0.2 evolution (collaborative-formulation centre)

> A **backward-compatible** (MINOR) evolution, not a rewrite — see
> [`specification/psyuml-v0.2.0.md`](./specification/psyuml-v0.2.0.md) and ADR-0014.
> v0.1 stays in force; everything here is additive (metadata/views over the same model).
> Ordering follows the research — **semantics → tested symbols → assets → studies**:
> we don't freeze new symbols before testing their comprehension (M14 gates leaving v0.x).

### M11 · Diagram families + audience profiles foundation *(implementing now)*
- **Goal:** give v0.2 its structural backbone — group the existing 12 diagram types into 8 **families** and define the 3 **audience profiles** — as metadata over the model (no schema break).
- **Deliverables:** `@psyuml/profiles` registry + API — `FAMILIES`/`FAMILY_OF`/`familyOf`/`diagramsInFamily` (Field·Cycle·Parts·Pattern·Journey·Change·Ritual·Composite, every `DiagramType` mapped, no gaps) and `AUDIENCE_PROFILES`/`audienceProfile` (clinician / client / picture, each with its plain-language + interpretive-visibility + symbol-budget posture); unit tests for total coverage and profile posture.
- **Acceptance:** every `DiagramType` resolves to exactly one family; `diagramsInFamily` round-trips the map; the three profiles expose the documented posture (clinician shows interpretive layers; client is plain-language, no interpretive; picture caps symbol kinds); `node sdd/check.mjs` + the profiles tests green.
- **Spec refs:** v0.2 §2, §8. **REQ:** REQ-DIAGRAM-FAMILIES, REQ-AUDIENCE-PROFILES.

### M12 · Pattern family + provenance/confidence surfacing *(implementing now)*
- **Goal:** make the CAT-derived **Pattern** semantics and the provenance/confidence model first-class and *visible*.
- **Deliverables (landed, ADR-0015):** `Edge.loopTopology` (**trap / dilemma / snag**) rendered as a centre marker — a distinct monochrome glyph **plus a redundant uppercase word** — with **exits** retained as the canonical intervention marker (path-of-hope still enforces ≥1 exit/resource/self); `EpistemicStatus` extended with the §3 provenance values (`jointly-agreed` / `clinician-inferred` / **`contested`**), with **interpretive content drawn dashed** (descriptive solid) via the shared `isInterpretive()` predicate; L/M/H **confidence**, the `contested` **⚖** marker, and the ontology-neutral **`as-if`** qualifier surfaced on a redundant (non-colour) channel + echoed in **alt-text**; DSL + JSON round-trip parity; the `cat-sdr` example demonstrates the full story end-to-end.
- **Acceptance (met):** a Pattern diagram renders trap/dilemma/snag + exits distinguishably in monochrome; `contested` standing and confidence survive into alt-text; the overlap invariant (ADR-0012) and monochrome-redundancy checks stay green; **fully backward-compatible** — a plain v0.1 loop renders byte-identically (only `cat-sdr.svg` changed). *Still to come:* per-topology participatory + comprehension-tested glyphs (M14) and editor authoring of topology/as-if (M13).
- **Spec refs:** v0.2 §3, §4. **REQ:** REQ-PATTERN-SEMANTICS, REQ-PROVENANCE-CONFIDENCE (+ REQ-CROSS-SCHOOL, REQ-ACCESSIBILITY).

### M13 · Audience-profile rendering + editor *(implementing now)*
- **Goal:** turn the profile *registry* (M11) into real rendered output and an editor surface.
- **Deliverables (landed, ADR-0016):** a single `@psyuml/render` **`render()` dispatcher** that resolves the audience profile → label `layer` + `showInterpretive`; the client/picture profiles **hide the clinician-analytic surface** (contested ⚖, as-if, confidence, cross-school provenance) while keeping the structural loop, topology, exits, and the honest dashed border; the editor's **family-grouped** diagram picker + an **audience switch** (clinician ⇄ client ⇄ picture) rendering through the dispatcher; a `withinSymbolBudget` **nudge** when a client/picture view exceeds its symbol cap.
- **Acceptance (met):** switching audience profile **never mutates core data** (proven by a render-does-not-mutate test, parallels the school switcher); the client/picture profiles honour their plain-language (client labels) + symbol-budget posture; exports respect the active profile (the SVG/alt-text carry it). **Back-compatible:** explicit `layer`/`showInterpretive` win, so goldens + the CLI are byte-unchanged. *Still to come:* picture-profile **pictographic** symbols via the M14 comprehension gate (picture is "client + a flag" for now).
- **Spec refs:** v0.2 §2, §6, §8. **REQ:** REQ-AUDIENCE-PROFILES, REQ-EDITOR-MVP, REQ-ACCESSIBILITY.

### M14 · Notation comprehension testing — Tier-A harness shipped; Tier-B is the v0.x gate *(in progress)*
- **Goal:** stop guessing whether symbols are understood — and build the gate honestly (a comprehension result needs real people; we never fabricate one).
- **Deliverables (landed, ADR-0017):** the **buildable half** — `@psyuml/profiles` `NOTATION_SYMBOLS` (the enumerated symbol set under test) + the **Tier-A `auditNotation()` harness** (discriminability / dual-coding of safety-critical symbols / gloss, **enforced in CI**); the **ISO 9186 protocol** as `comprehension-instruments.md` **Instrument D** (≥67% general / ≥85% safety-critical, wrong/opposite-meaning reported, participatory generation first) + a **per-symbol ledger**; `evaluation-suite.md` dimension 1, gate, and status updated.
- **Acceptance:** every symbol has a **recorded status** — Tier-A `pass` (automated) + Tier-B `pending` in the ledger. **Tier-B is NOT done:** the human studies (clients/trainees/laypeople, N≥30/audience) require real participants and **remain the v0.x→v1.0 gate**; an LLM dry-run is not a sample and results are never fabricated. Failures (when run) drive a documented symbol revision, not a shipped symbol.
- **Spec refs:** v0.2 §5. **REQ:** REQ-NOTATION-TESTING, REQ-EVAL-SUITE.

### M15 · Lossy FHIR export + audience-scoped exports *(implementing now)*
- **Goal:** interoperate honestly — a clearly **lossy**, export-only standards bridge.
- **Deliverables (landed, ADR-0018):** new **`@psyuml/interop`** (isolated leaf) `toFhir(model, options)` → a FHIR R4 **document Bundle** per the §7 table — Composition + ClinicalImpression (the formulation; **non-diagnostic** — Observation, never Condition), CarePlan + Goal (treatment direction), FamilyMemberHistory + List (relational) — with a **structured `loss` report** (the §7 "limits MUST be documented" made executable) and `validateFhirBundle` (a zod **subset** check + reference integrity, *not* a full FHIR validator); **de-identified + audience-scoped by default** (reuses `@psyuml/privacy`); surfaced as **`psyuml export`** (`--scope`, `--no-deidentify`).
- **Acceptance (met):** the export **validates against the emitted FHIR subset** + reference integrity; **loss is documented** per construct; de-identification + audience scoping are **on by default**; there is **no importer / round-trip** (the diagram stays source-of-truth). *Still to come:* SNOMED/LOINC terminology binding (text CodeableConcepts only today).
- **Spec refs:** v0.2 §7, §6. **REQ:** REQ-INTEROP-FHIR, REQ-PRIVACY.

### M16 · Composite board + cultural-extension packs
- **Goal:** the multi-view **Composite** family and culturally-situated symbol sets — as governed extensions, not core changes.
- **Deliverables:** a Composite board that arranges several family views over one model with shared IDs; cultural-extension packs shipped as **§K profiles** with **cultural-permission flags**, validated by `psyuml lint-profile`.
- **Acceptance:** a Composite board cross-navigates its member diagrams via shared IDs; every cultural pack passes the §K collision check and carries its permission/provenance flags; no Tier-1 core change.
- **Spec refs:** v0.2 §2, §6, §K. **REQ:** REQ-EXTENSION-MECH, REQ-DIAGRAM-FAMILIES.

---

## Cross-cutting workstreams (run continuously)
- **Examples corpus** (`examples/`): the entire §H worked case ("R.", CPTSD) built as the canonical regression + demo set, one diagram per type.
- **Accessibility:** monochrome snapshot tests and palette checks in CI from M1 onward.
- **Docs:** keep spec ↔ code in sync; each profile documents its §K extension record.
- **Privacy & governance:** local-first by default; de-identify/redact + role-scoped exports; audit log; conservative "human-supervised formulation infrastructure" posture, not live-care CDS (Source 3; ARCH §11).
- **Epistemic honesty, i18n & alt-text:** carry `epistemicStatus` on every element; keep concept IDs separate from localized labels; emit a text summary + alt text for every view (Source 3; ARCH §3/§6/§13).
- **UX requirements (research-grounded):** every persona-facing milestone is specified against `docs/ux/ux-research-and-requirements.md` (REQ-UX-STORIES) — accessibility (WCAG 2.2 AA), plain-language client layer, co-authorship & client ownership, emotional safety, crisis-for-constriction, local-first privacy, and **no outcome-claims**. The usability open questions are the Stage-4 gate (REQ-EVAL-SUITE).
- **Materials & adoption (external-plan cross-check):** a notation **style guide** + clinician/client **cheat-sheets** + printable session **templates** (REQ-STYLE-GUIDE, REQ-TEMPLATES, M5); a **multi-school worked-case corpus** beyond "R." (REQ-CASE-CORPUS, M6); a **practitioner handbook** and **adoption pack** — workshop/facilitator materials, a notation-extension contributor guide, comprehension-test instruments (REQ-HANDBOOK, REQ-ADOPTION, M10). See `research/idea-incorporation.md` §7.

## Top risks & mitigations
| Risk | Mitigation |
|---|---|
| Genogram + arousal-band fidelity is hard in generic graph libs | SVG-first renderer; treat Mermaid as approximate export only (spec Caveats); M1 library spike de-risks early. |
| Cross-school glyph reuse causes semiotic confusion | Mandatory provenance tags + §K collision check enforced in `validate` (spec §J.4 fix). |
| "Path of hope" / safety lint feels heavy-handed to clinicians | Severity is configurable per layer; hard-block only in the client-facing layer. |
| AI-assist drifts toward diagnosis | Code-level guardrails + low-confidence-by-default + human-in-the-loop; out-of-scope items named in M8. |
| Scope creep across 12 schools | Tier-1 core frozen; new schools enter only via the §K profile mechanism, Tier-3 by default. |
| FHIR interop / regulatory classification pulls scope toward regulated CDS | `@psyuml/interop` is late (M9), optional, export-only, de-identified by default; v0.x stays documentation/reflection infrastructure, not live-care decision support (Source 3). |
| Epistemic line-styles collide with school-specific line meanings | Render `epistemicStatus` on a redundant, **collision-checked** channel + status tag; validator blocks clashes (spec §J.4). |

## How to start (first concrete tasks)
1. Land **M0** scaffold (monorepo, CI, glyph assets, color tokens).
2. Define the `@psyuml/model` JSON Schema for the 8 element categories + connectors + PT bag; encode the §H.1 State Map as the first `examples/*.psyuml`.
3. Stand up the read-only **State Map** render (M1) with the monochrome toggle — the first on-screen proof.

Then proceed milestone by milestone, keeping every step shippable and spec-traceable.
