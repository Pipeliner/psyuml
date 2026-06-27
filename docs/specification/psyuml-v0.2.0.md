# PsyUML v0.2.0 — specification (evolution of v0.1.0)

**Status:** draft · **Supersedes:** none (extends) · **Normative core:** [`psyuml-v0.1.0.md`](psyuml-v0.1.0.md)
**Evidence base:** [`../research/v0.2-research-synthesis.md`](../research/v0.2-research-synthesis.md) (deep research, June 2026) + the prior synthesis.

v0.2 is an **evolution, not a rewrite.** Everything normative in v0.1 (the §A 8-category ontology, §B/§C notation, §D accessibility, §E diagram types, §F ritual, §G cross-school, §J self-eval, §K extension, §L ethics) **remains in force**. v0.2 *reframes the centre*, *groups* the existing diagram types into families, *formalizes* provenance/confidence, *adds* CAT-derived pattern semantics and audience profiles, *specs* a lossy FHIR export and a comprehension-testing gate, and sharpens the ethics. **All v0.1 `.psyuml` documents remain valid v0.2 documents** (§9 Migration). `MUST`/`SHOULD`/`MAY` are normative.

> **Standing honesty clause (binding, §L.2-extended).** PsyUML is an **unvalidated** notation. The deep research is unambiguous: case formulations are **not reliably reproducible** between clinicians, and the tools PsyUML unifies (genograms, formulations, parts-models, CAT maps) are **clinically popular but weakly evidenced *as interventions*.** v0.2 is a **collaborative shared-meaning / communication aid**, and MUST NOT be presented as a validated diagnostic or therapeutic instrument, nor claim to improve outcomes. (Flinn 2015; Eells 2025; Joseph 2023.)

## 1. The centre of gravity: collaborative formulation (§0)

v0.1 began from *notation*; v0.2 names the true centre: **collaborative psychological formulation** — a *hypothesis* that is biopsychosocial, contextual, **co-created**, and **revisable**, explicitly distinct from diagnosis (BPS 2011; PTMF). This reframes, not replaces, the ontology. Normatively:

- A PsyUML document `MUST` be expressible as a *working hypothesis*, never as an objective record of a person. Diagnosis `MAY` appear only as an optional annotation/profile, never as the required starting point (v0.1 §A.3 — reaffirmed).
- Every interpretive element `MUST` carry **provenance** and `SHOULD` carry **confidence** (§3).
- The notation `MUST` support **revision over time** (versioning/diff — already shipped) and **visible authorship**; a formulation behaves like *versioned working notes*, not a chart.
- Client-facing profiles `MUST` favour the client's own words and graded disclosure; over-simplification that becomes *reductive* is a failure mode to avoid, not a goal (Thrower 2024).
- Sharing a formulation is **double-edged** (it can validate *or* distress/feel imposed). v0.2 therefore keeps the export gates (disclaimer, path-of-hope, crisis-resources) and adds an **audience-scoped export** model (§6).

## 2. Diagram families and audience profiles (§E-extended)

v0.1 shipped 12 *types* (the language now has 20). v0.2 groups them into **eight families** (a cognitive map for users; the type is the concrete renderer, the family is the *question it answers*). The research confirms diagrams converge on a small set of archetypes; families make that explicit.

| Family | Question it answers | v0.1 types in this family | Archetype |
|---|---|---|---|
| **Field** | Who/what is in the person's world? | relational-field, genogram, drama-triangle, resource-anchor, body-map | typed-edge network / sorter |
| **Cycle** | What maintaining loop keeps this going? | process-loop | feedback loop |
| **Parts** | What internal multiplicity is in play? | parts-map, mode-map | parts / process-field |
| **Pattern** | What recurring procedure repeats over time, and where's the exit? | cat-sdr (process-loop today) → **pattern-map** (§4) | node+transition graph |
| **Journey** | What is the trajectory / story over time? | timeline | linear path |
| **Change** | What is the treatment direction? | intervention-sequence, two-triangles | path with intervention vectors |
| **Ritual** | What symbolic/ceremonial process? | ritual | phased sequence (v0.1 §F) |
| **Composite** | One case across several views | (future board) | synchronized sub-maps |

`familyOf(diagramType)` is normative metadata (implemented in `@psyuml/profiles`, §8). Each family `SHOULD` offer **three audience profiles** sharing identical *semantics* but different *visual compression*:

- **Clinician profile** — full relation types, layered interpretation, provenance/confidence visible.
- **Client profile** — capped symbol set, everyday/client language, actionable foreground, interpretive nodes de-emphasized.
- **Picture profile** (low-literacy / child) — pictographic, manipulable, minimal text (Padesky reduce-to-pictures; play formats). Picture-profile symbols `MUST` pass the §7 comprehension gate before they are frozen.

Profiles `MUST NOT` change the underlying model — only its rendering (this preserves a single source of truth and round-tripping).

## 3. Provenance and confidence as first-class (§A.4, formalizing v0.1)

v0.1 already carries `provenance` tags and an `epistemicStatus` enum. v0.2 makes the **two orthogonal axes** explicit and `SHOULD`-required on interpretive elements:

- **Provenance** — *where the content came from*: `reported` · `observed` · `jointly-agreed` · `clinician-inferred` · `contested`. (`contested` is a v0.2 addition responding to the lived-experience critique that "jointly-agreed" can mask clinician dominance.) This subsumes/aligns with v0.1 `epistemicStatus`.
- **Confidence** — *how strongly it is held*: `L`/`M`/`H` (already in the v0.1 property bag).

Rendering `MUST` distinguish **descriptive** from **interpretive** content (v0.1: solid vs dashed border) and `SHOULD` surface a `contested` marker. The reliability evidence (Flinn 2015) means a single formulation is a hypothesis, **never** presented as fact — provenance is the mechanism. *(Well-evidenced direction; the exact 5-value scheme is a design-inference.)*

## 4. Pattern family — CAT-derived semantics, ontology-neutral (§E.4-extended)

CAT's SDR is PsyUML's strongest native ancestor. v0.2 adds **Pattern** semantics on the Cycle/Pattern renderers, lifting the *school-agnostic* machinery and keeping the *theory-laden* parts optional:

- **Loop topologies** (`SHOULD` be taggable on a cycle): **trap** (a self-confirming loop — actions meant to escape confirm the belief), **dilemma** (a false-binary fork — polarized either/or), **snag** (a self-truncating loop — sabotaging legitimate success). These are three named *shapes of maladaptive loop* and are plausibly cross-school.
- **Exit** (already an `EdgeKind`) is the canonical **intervention marker on the graph** — where a procedure is broken. Every Pattern/Cycle map `MUST` retain v0.1's path-of-hope rule (≥1 exit).
- **Reciprocal role** and **observing-eye** are **optional node tags**, `MUST NOT` be required, and carry a `school:` provenance — they are a CAT *dialect*, not universal primitives (the SDR's own centre shifted historically; ontology-neutrality is the lesson).
- **Internal nodes are ontology-neutral** (§6): tag as `part`/`mode`/`ego-state`/`voice`/`role`/`state` with an optional `as-if`/`metaphor` qualifier; the model `MUST NOT` bake in one metaphysics of mind.

*Honesty: the SDR works **through the therapeutic alliance**, not as an independent active ingredient (Tyrer & Masterson 2019). v0.2 adds it for expressivity, not as an outcome mechanism.*

## 5. Notation testing is a release gate (§J-extended, validation-first)

The research is decisive: **participatory symbol design + comprehension testing belong *before* freezing the asset library**, and a *validated* method exists. v0.2 adopts a two-tier gate (extending v0.1 §J / the evaluation suite):

- **Tier A (automatable, enforced in CI):** the existing conformance + accessibility + **overlap invariant** (ADR-0012) + monochrome-redundancy checks. A symbol set `MUST NOT` rely on colour alone (v0.1 §D — and note PoN itself is *not* accessibility-validated, so v0.1's rule is ahead of it). Two further Tier-A invariants, motivated by the simulated dry-runs (`docs/evaluation-suite-pilot-2.md`, `-3.md` — rehearsals, **not** evidence):
  - **Safety dual-coding (`MUST`):** a safety-critical symbol (e.g. the way-out / `exit`) `MUST` carry a redundant word — **never glyph- or colour-alone** — and a renderer `MUST NOT` emit it wordless (the bare exit arrow read as "escape/avoidance"; with its word it read as "the way out"). Enforced by `auditNotation` (registry) + a render invariant (every `exit` edge is worded).
  - **Legibility floor (`MUST`):** rendered label text `MUST NOT` fall below a minimum size (no microtext); primary trigger/way-out labels are sized for legibility. Enforced by a corpus font-size guard.
- **Tier B (human studies, gates leaving v0.x):** ISO-9186 comprehension testing of every client/picture-profile symbol — **≥67% correct comprehension** for general symbols, **≥85%** for risk/self-harm markers, with the **wrong/opposite-meaning rate reported** (a confidently-misread symbol is disqualifying); plus matching (discriminability), time-to-correct, 5-second recall, and dual-coding lift. Run with **clients, trainees, and laypeople** (≥30/audience for the quantitative gate), with **participatory generation** of candidate symbols first (novices design more transparent symbols than experts). Symbols that fail are iterated, not shipped.

The instruments + protocol live in the adoption pack / evaluation suite; v0.2 ships the *protocol and a Tier-A harness*, and treats the Tier-B studies as the v1.0 gate (real participants required).

## 6. Ethics, safety, cultural extensibility (§L.2-extended)

- **Non-diagnostic default + ontology-neutral parts** (§4): internal nodes never auto-map to a diagnosis; tagging is school-neutral. (IFS reification critique; FHIR ClinicalImpression deliberately doesn't fix a diagnosis.)
- **Cultural-permission flag (`MUST`):** any symbol/rite from a **closed, initiatory, or culturally-restricted** tradition `MUST` carry a permission/attribution declaration and `MUST NOT` be offered as a generic reusable icon. Spiritual-resource mapping is supported (spiritual genograms; AMP) as an *extension*, not a default. (v0.1 §F/§L.2 reaffirmed + sharpened.)
- **Audience-scoped exports + redaction (`SHOULD`):** exports `SHOULD` support client-facing / record / research / teaching scopes with de-identification and explicit consent status (v0.1 privacy/`redact` exists; v0.2 generalizes to audience scopes). Genograms especially may be reread as records and viewed differently by different family members.
- **The honesty clause** (top) `MUST` appear on every client-facing export.

## 7. Interoperability — a *lossy* FHIR export (§M, new, _implemented — M15/ADR-0018_)

FHIR has **no native formulation or genogram resource**; v0.2 specs an export (not a round-trip source of truth) so PsyUML content can enter a record:

| PsyUML | → FHIR (R4) | Notes / limits |
|---|---|---|
| Whole formulation/diagram | `Composition` | sections = zones; narrative + references; attestable document |
| The assessment/formulation text | `ClinicalImpression` (`summary` + `finding`) | closest native match; does **not** fix a diagnosis (good — non-diagnostic) |
| Internal nodes, cycles, symptoms | `Observation` | use `Condition` **only** where a node *is* a diagnosable problem |
| Genogram / relational structure | `FamilyMemberHistory` + `List` (+ Genetic-Pedigree profile) | **lossy** — edge semantics (cutoff/fusion/conflict/attachment-quality) do **not** survive; needs a custom extension; the diagram stays source-of-truth |
| Treatment direction | `CarePlan` + `Goal` | referenced from the ClinicalImpression |

Stated limits (`MUST` be documented in any FHIR-export feature): no native formulation/genogram resource; relational/edge semantics are lossy; PsyUML node-typing lives in **extensions/profiles**, not core. *(Design-inference; implement post-spec — previously shelved, re-opened by the research's concrete mapping.)*

## 8. System & documentation architecture

**System (evolution of `docs/ARCHITECTURE.md`).** The one-immutable-model / many-views design holds. v0.2 adds, without breaking the DAG:
- `@psyuml/profiles` gains the **families + audience-profiles registry** (`familyOf`, `listFamilies`, `audienceProfiles`, `profileFor`) — *implemented in this release* (§ below). This is metadata over the existing model; no schema break.
- `@psyuml/model` `MAY` gain optional fields for the §4 loop-topology tag and the `as-if` qualifier (additive/optional — backward-compatible).
- `@psyuml/validate` `MAY` gain a Tier-A "notation-testing" lint surface; the comprehension-test instruments are docs.
- A future `@psyuml/interop` package owns the §7 FHIR export (planned, isolated leaf — nothing depends on it).
- The editor (`apps/web`) groups the diagram picker **by family** and offers the **audience profile** switch (client/clinician/picture) — future UI, on top of the registry.

**Documentation architecture.** v0.2 docs are organized as: **(1) Specs** — `psyuml-v0.1.0.md` (normative core) + this `psyuml-v0.2.0.md` (evolution); **(2) Research** — `v0.2-research-synthesis.md` + the prior synthesis + idea-incorporation; **(3) Practitioner** — handbook, cheatsheets, format-reference, style-guide, extension-guide; **(4) Process/quality** — evaluation-suite (+ the §7 comprehension protocol), ADRs, traceability. Each spec change `MUST` bump the version and update citing REQs (v0.1 §K semver).

## 9. Migration from v0.1 (backward-compatible)

- **No `.psyuml` document changes are required.** v0.1 documents are valid v0.2 documents; all v0.1 diagram types, glyphs, connectors, validators, and the editor continue unchanged.
- New v0.2 capabilities are **additive and optional**: families/profiles are *metadata* over existing types; provenance `contested`, loop-topology tags, and the `as-if` qualifier are new optional values; FHIR export and the picture profile are new *outputs*, not new requirements.
- Versioning follows v0.1 §K semver: v0.2 is a **MINOR** (additive, backward-compatible) step; Tier-1 core glyphs remain frozen.

## 10. Phased roadmap (validation-first)

Ordering follows the research: **semantics → tested symbols → assets → studies** (don't freeze symbols before testing them).

- **M11 — Families & profiles foundation** *(this release: the registry + API + tests + spec).* Group the types into 8 families; define the 3 audience profiles. ✔ shipping now.
- **M12 — Pattern family + provenance/confidence surfacing.** Loop-topology tags (trap/dilemma/snag) + exits as first-class; `contested` provenance + confidence rendered; ontology-neutral `as-if`. Gated by the overlap invariant + monochrome redundancy.
- **M13 — Audience-profile rendering + editor.** Client/picture profiles in the renderers + the editor's family-grouped picker and profile switch. Picture symbols enter the **comprehension-testing** pipeline.
- **M14 — Notation comprehension testing (Tier-B).** Run the ISO-9186 + participatory protocol with clients/trainees/laypeople; iterate symbols; record results in the evaluation suite. (Gates leaving v0.x.)
- **M15 — FHIR export (lossy) + audience-scoped exports.** `@psyuml/interop` Composition/ClinicalImpression/Observation/CarePlan export with documented limits; audience/consent-scoped redaction.
- **M16 — Composite board + cultural-extension packs** (with cultural-permission flags), as §K profiles validated by `lint-profile`.

Each milestone keeps every step shippable, spec-traceable, and bound by the honesty clause: PsyUML organizes and communicates formulations; it does not validate them.
