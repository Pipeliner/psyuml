# PsyUML — UX Research & Requirements

> **Status:** research synthesis → requirements (informs the M2 editor and cross-cutting UX).
> **Method:** deep-research synthesis (June 2026) — 5 fan-out web-search angles, sources
> de-duplicated and the load-bearing numbers verified against primary sources (Baumel 2019;
> Stanley 2018; WCAG 2.2; Huckvale 2019; Karyotaki 2018). Each finding below is tagged by
> **evidence tier**: **[E]** empirical (trial/cohort/meta-analysis), **[S]** standard/regulation
> (binding), **[G]** authoritative guidance, **[H]** design heuristic/theory.
> Full references in [Sources](#sources).

This document turns research into **per-persona user stories with acceptance criteria** and a
**MoSCoW-prioritized cross-cutting requirements list**, plus **risks / anti-requirements** and
**open questions for usability testing**. It operationalizes the spec's Audience guide, §D
(accessibility), §E.8 (crisis chart), and §L.2 (ethics), and feeds REQ-EDITOR-MVP (M2),
REQ-DECISION-NAV, REQ-ACCESSIBILITY, REQ-PRIVACY, REQ-SAFETY-TRIAGE, and REQ-AI-ASSIST.

---

## 1. Executive summary

The evidence is unusually consistent about what *not* to over-claim and what to get right:

- **Collaboration is the active ingredient, not the diagram's "correctness."** Clinical guidance
  (BPS/DCP 2011) **[G]** and a 2024 qualitative systematic review (Thrower et al.) **[E]** treat
  *co-creation* — accessible language, pacing, shared authorship — as what makes formulation
  helpful. Clients value formulations (better understanding, feeling understood, an emotional
  shift, a sense of moving forward; Redhead et al. 2015) **[E]** — but a poorly-handled
  formulation can **distress or shame** them. Critically, formulation improving *outcomes* is
  **not established** (Easden 2018) **[E]**; the best-evidenced related practice is
  **progress monitoring / measurement-based care** (Persons) **[E]**.
- **Diagrams help comprehension — but only with plain text and basic graph literacy.**
  Pictures+plain text most help **low-literacy** readers (Houts 2006; Schubbe 2020) **[E]**, yet
  ~1/3 of the public (≈half in lower-SES groups) have **low graph literacy**, the strongest
  predictor of graph comprehension (Galesic & Garcia-Retamero 2011; PLOS One 2020) **[E]**. So:
  a true **~5th–6th-grade plain-language client layer** (AHRQ/AMA/Joint Commission) **[G]**,
  **dual-coded** (shape **+** integrated label, never legend-only; split-attention) **[E/H]**, a
  small **client vocabulary (~6 symbols;** graphic economy / span of absolute judgment) **[H]**,
  and a separate richer **clinician layer** (cognitive fit; Moody 2009) **[H]**.
- **The crisis chart must be designed for cognitive constriction.** Stanley–Brown Safety Planning
  with follow-up was associated with **~45% fewer suicidal behaviours** (3.03% vs 5.29%, OR 0.56)
  and **2× outpatient attendance** (Stanley 2018) **[E]**. Crises are brief/impulsive (~70% <1 h;
  AFSP/Action Alliance) **[E]**, so: **one decision per step**, escalation ladder, **always-visible
  localized crisis resources** (apps fail this 43% of the time; Morrison 2024) **[E]**, an explicit
  **means-restriction** step (the most-omitted component) **[E]**, **no dead-ends**, and human
  escalation — **0 of 29 chatbots** handled escalating suicide risk adequately (Sci Reports 2025;
  Stanford 2025) **[E]**.
- **Design solo mode for brief, episodic use — and for safety, not "engagement."** Real-world
  30-day retention is ~3–6% (Baumel 2019) **[E]**; **guided beats unguided** on completion
  (~76–79% vs ~48–54%; van Ballegooijen 2014) **[E]**; **gamification doesn't reliably help**
  (Lipschitz 2023) **[E]**; structured iCBT does *not* on average raise deterioration (5.8% vs
  9.1% control; Karyotaki 2018) **[E]** but a ~7–14% minority still worsen, and harms are
  under-measured **[E/G]**; open journaling has small benefit and a **rumination risk** **[E]**.
- **Accessibility and privacy are non-negotiable and mostly binding.** WCAG 2.2 **[S]**: text
  alternatives (1.1.1, A), **colour never the only cue** (1.4.1, A), contrast (1.4.3/1.4.11, AA),
  resize to 200% (1.4.4, AA), full keyboard (2.1.1, A), target ≥24×24 px (2.5.8, AA); ~8% of males
  have red-green CVD **[E]**. **92% of audited mental-health apps shared data with third parties**
  (Huckvale 2019) **[E]**; the FTC fined BetterHelp **$7.8M** for it **[S]**. → **local-first, zero
  third-party trackers, GDPR special-category handling, explicit consent.** Any AI must be a
  **bounded, reviewable suggestion** with human oversight (WHO 2024; APA Nov 2025) **[G]** — never
  autonomous advice, diagnosis, or crisis handling.

**Design stance:** PsyUML's existing commitments (dual-audience layers, colour-redundant/
monochrome, crisis-usable chart, collaborative/consent-based, formulation-not-diagnosis,
local-first) are **well-aligned with the evidence**. The research mainly *sharpens* them and adds
hard guardrails. It does **not** support marketing PsyUML as outcome-improving — only as a
comprehension, collaboration, safety-planning, and reflection aid, pending usability validation.

## 2. Personas

| # | Persona | Core need | Layer |
|---|---|---|---|
| P1 | **Therapist / clinician** | Co-create formulations in session; supervise; hand off; plan | clinician (+client view) |
| P2 | **Client (in therapy)** | Understand own patterns; feel safe; own the map; navigate crises | client |
| P3 | **Solo / self-help user** (no clinician) | Self-guided reflection; safety when unsupported | client |
| P4 | **Researcher** | Code/compare formulations; de-identify; export | clinician/data |
| P5 | **Ritual practitioner / spiritually-integrated** | Map intention/symbol/witness/phase with consent & honest framing | clinician+client |

## 3. Per-persona user stories

Each story: **As a … I want … so that …**, with **acceptance criteria (AC)**, a MoSCoW
**priority**, and **evidence/trace**. AC are written to be usability-testable.

### P1 — Therapist / clinician

- **P1.1 Co-create in session (Must).** *As a therapist, I want to build the map together with my
  client in real time, in their words, so that the formulation is shared rather than imposed.*
  **AC:** two people can edit the same diagram concurrently; node labels accept free text /
  verbatim client quotes; an undo and "draft" state exist; nothing is auto-finalized.
  **Trace:** Thrower 2024, BPS 2011 [E/G]; REQ-EDITOR-MVP, §G collaboration.
- **P1.2 "Where are we on the map" (Should).** *As a therapist, I want to pin/highlight the
  client's current position and add an observing-eye/exit, so that we can step back and reflect.*
  **AC:** any node/region can be marked "current focus"; an observing-eye and exit annotation are
  one action; the mark persists across sessions. **Trace:** CAT SDR [G]; spec §E.4/§E.1.
- **P1.3 Progressive reveal (Must).** *As a therapist, I want to reveal the map gradually and
  control what the client sees, so that I don't dump a distressing "verdict" diagram on them.*
  **AC:** nodes can be hidden/revealed; a client-safe view hides clinician-only fields; the editor
  never forces showing the whole formulation at once. **Trace:** Redhead 2015 (harm) [E]; §D complexity mgmt.
- **P1.4 Re-render in my school (Should).** *As a therapist of school X, I want the same model in
  my vocabulary, so that it fits how I work without re-drawing.* **AC:** a profile switch
  re-labels/re-styles the same model losslessly; provenance tags remain visible. **Trace:** Moody
  cognitive fit [H]; spec §G.
- **P1.5 Supervision & handoff export (Should).** *As a therapist, I want to export the map +
  a reformulation-letter/text summary for supervision/continuity, so that colleagues understand the
  case.* **AC:** export produces SVG/PDF + a structured text summary + alt text; de-identified
  option available. **Trace:** team-formulation study 2022 [E]; §H.10, REQ-INTEROP-FHIR.
- **P1.6 Link progress data (Could).** *As a therapist, I want to attach outcome-measure scores to
  the map over time, so that I use the best-evidenced practice.* **AC:** a node/version can carry a
  dated measure value; the diff view shows change. **Trace:** measurement-based care [E]; REQ-VERSIONING-DIFF.

### P2 — Client (in therapy)

- **P2.1 Understand my pattern (Must).** *As a client, I want the map in plain words with my own
  metaphors, so that I actually understand it.* **AC:** client layer reads at ~5th–6th-grade level;
  every node has a plain label; an "explain this link" text is available on demand. **Trace:**
  Houts 2006, graph-literacy [E], AHRQ [G].
- **P2.2 Own and edit my map (Must).** *As a client, I want to relabel, hide, or correct anything,
  so that it's mine.* **AC:** client can edit labels, hide nodes, and add their own; authorship/
  "who added this" is visible; changes are reversible. **Trace:** BPS 2011, Thrower 2024 [E/G]; §L.2-r5.
- **P2.3 Feel safe (Must).** *As a client, I want to pause or save an unfinished map without being
  pushed to "complete" it, so that I'm not overwhelmed.* **AC:** save-incomplete is always allowed;
  no forced completion; soft, non-pathologizing wording; trauma detail is opt-in. **Trace:** Redhead
  2015 (a client could not complete her own formulation when trauma surfaced) [E]; §L.2-r2.
- **P2.4 Navigate a crisis alone (Must).** *As a client in crisis, I want a dead-simple chart that
  tells me one thing to do at a time, so that I can act when I can't think clearly.* **AC:** one
  decision/step per screen; large text; crisis line + emergency visible on **every** screen with a
  **localized** number; means-restriction prompt; every path ends in a human/emergency action; no
  dead-ends. **Trace:** Stanley 2018, Morrison 2024, impulsivity data [E]; spec §E.8, REQ-DECISION-NAV.
- **P2.5 Carry it with me (Could).** *As a client, I want my map/crisis plan on my phone, offline,
  so that it's there when I need it.* **AC:** responsive/mobile layout; works offline; local storage.
  **Trace:** crisis in-the-moment use 68–82% [E]; accessibility.

### P3 — Solo / self-help user (no clinician)

- **P3.1 Reflect safely without a clinician (Must).** *As a solo user, I want structured,
  forward-looking prompts, so that I reflect without spiralling.* **AC:** prompts are structured/
  reframing/problem-solving, not open "write your deepest negative feelings"; intensity can be
  gated; a way out / resource is always present (path-of-hope). **Trace:** expressive-writing
  rumination risk [E]; spec path-of-hope lint, REQ-PATH-OF-HOPE.
- **P3.2 Know the limits & find help (Must).** *As a solo user, I want the tool to be clear it's a
  self-help adjunct and to point me to human help, so that I don't over-rely on it.* **AC:** standing
  "supports, not replaces care" disclaimer; visible crisis resources; an "import/share with a
  clinician" path is offered as the upgrade. **Trace:** APA Nov 2025, over-reliance data, guided>unguided [E/G]; §L.2-r1.
- **P3.3 Quick value, no streak pressure (Should).** *As a solo user, I want each short session to
  be useful on its own, so that a single visit helps even if I never return.* **AC:** value is
  front-loaded; no gamified streaks/dark patterns; reminders are opt-in and gentle. **Trace:**
  Baumel 2019 (3–6% 30-day retention), gamification null/negative [E].
- **P3.4 Be caught if I'm worsening (Must).** *As a solo user, I want the tool to notice
  distress/deterioration signals and prompt help-seeking, so that I'm not left alone with it.* **AC:**
  distress cues surface crisis resources + help-seeking prompt; no abrupt "here's a hotline" dead-end.
  **Trace:** ~7–14% deteriorate; under-measured harms [E]; REQ-SAFETY-TRIAGE.

### P4 — Researcher

- **P4.1 De-identified export (Must).** *As a researcher, I want a de-identified, structured export,
  so that I can analyze formulations without PHI.* **AC:** export strips names/identifiers by
  default; schema-stable JSON; round-trips losslessly. **Trace:** GDPR special-category, Huckvale
  2019 [S/E]; REQ-PRIVACY, REQ-INTEROP-FHIR.
- **P4.2 Compare across schools/cases (Should).** *As a researcher, I want comparable structures
  with provenance, so that I can code and compare.* **AC:** stable IDs; provenance/`epistemicStatus`
  on elements; batch export. **Trace:** symptom-network research, Source 3 [E]; REQ-EPISTEMIC-STATUS.
- **P4.3 Exploratory, clearly labelled (Should).** *As a researcher, I want weighted/network views
  marked exploratory, so that estimates aren't mistaken for clinical truth.* **AC:** researcher-mode
  views carry an "exploratory" label. **Trace:** no gold standard for person-specific networks [E];
  spec §E.4 Borsboom.

### P5 — Ritual practitioner / spiritually-integrated

- **P5.1 Map a rite with consent (Must).** *As a practitioner, I want to map intention, symbols,
  witnesses, and phases, so that the work is structured and consented.* **AC:** ritual diagram
  captures intention/symbol/witness/phase + a consent field; nothing is imposed. **Trace:** §F, §L.2-r5.
- **P5.2 Honest, non-medical framing (Must).** *As a practitioner, I want the tool to frame ritual
  honestly and offer a secular variant, so that no medical-cure claim is implied.* **AC:** every
  ritual template ships the honest-evidence note + a secular variant; metaphysical claims are tagged
  `client-believed`/`tradition-claimed`, never `system-confirmed`. **Trace:** §F, §L.2-r3, Source 3 C2; REQ-RITUAL.
- **P5.3 Safety boundaries (Must).** *As a practitioner, I want risky-material rituals gated, so that
  the tool can't endorse harm.* **AC:** risky materials (fire/blood/substances/fasting/etc.) force a
  documentation-only mode unless a licensed human approves. **Trace:** Source 3 C3; REQ-SAFETY-TRIAGE.

## 4. Cross-cutting requirements (MoSCoW)

### MUST
- **UX-M1 Accessibility (WCAG 2.2 AA).** Text alternative for every diagram element + a
  screen-reader-navigable text/outline of the whole formulation (1.1.1 A); **no colour-only meaning**
  (1.4.1 A); contrast ≥4.5:1 text / ≥3:1 strokes & controls (1.4.3/1.4.11 AA); usable at 200% zoom
  (1.4.4 AA); **full keyboard** create/select/move/connect with visible focus (2.1.1 A); pointer
  targets ≥24×24 px (2.5.8 AA). **[S]**
- **UX-M2 Plain-language client layer** at ~5th–6th-grade level, dual-coded (shape **+** integrated
  label, never legend-only), client vocabulary ≈6 symbols. **[E/H/G]**
- **UX-M3 Colour-redundant + monochrome.** Every channel redundant with shape/label/pattern; verify
  under a CVD simulator; monochrome-printable. **[S/E]** (already spec §D.)
- **UX-M4 Crisis chart for constriction.** One decision/step; escalation ladder; **localized crisis
  resources on every screen**; means-restriction step; **no dead-ends**; human escalation;
  large text. **[E]**
- **UX-M5 Local-first privacy.** No third-party analytics/advertising SDKs; on-device/user-controlled
  storage by default; GDPR special-category handling; explicit, granular, revocable consent for any
  data egress; export/delete. **[S/E]**
- **UX-M6 Co-authorship & client ownership.** Concurrent/shared editing, free-text & verbatim labels,
  visible authorship, client can relabel/hide/correct, reversible. **[E/G]**
- **UX-M7 Emotional safety.** Progressive reveal; save-incomplete; non-pathologizing default wording;
  trauma detail opt-in; never present a finished "verdict" diagram unprompted. **[E]**
- **UX-M8 Honest framing / no diagnosis.** Standing "supports, not replaces care" disclaimer on
  client-facing views; formulation-not-diagnosis; ritual honest-evidence + secular variant. **[G]**

### SHOULD
- **UX-S1 Versioned, fluid formulation** (drafts, history, easy revision; "we'll change this together"). **[G]**
- **UX-S2 "Where are we on the map"** navigation primitive + observing-eye/exit. **[G]**
- **UX-S3 Progress monitoring** linked to map/versions (best-evidenced element). **[E]**
- **UX-S4 Engagement without dark patterns** — front-load value, gentle opt-in reminders, **no
  gamified streaks**, design for brief/episodic use. **[E]**
- **UX-S5 Bounded AI (only if shipped):** purpose-built, editable suggestion a human accepts/rejects,
  labelled AI-generated, no diagnosis, no autonomous crisis handling, routes distress to humans. **[G]**
- **UX-S6 Distress/deterioration safety net** in solo mode (surface resources + help-seeking). **[E]**

### COULD
- **UX-C1 Hand-drawn / paper parity** — printable blank templates; sketch style. **[H]** (REQ-TEMPLATES.)
- **UX-C2 Mobile/offline** crisis plan & map on phone. **[E]**
- **UX-C3 "Explain this link"** on-demand narrative for low-graph-literacy users. **[E]**

### WON'T (this version)
- Won't maximize engagement as a goal; won't autonomously diagnose or give AI therapy/crisis advice;
  won't sync to third parties; won't claim outcome improvement or that ritual cures disease.

## 5. Risks & anti-requirements

| Risk (evidence) | Anti-requirement / mitigation |
|---|---|
| Formulation can shame/distress a client (Redhead 2015 [E]) | No unprompted "verdict" diagram; progressive reveal; save-incomplete; soft wording; client control |
| Colour-only meaning excludes ~8% of males (CVD [E]) | Colour never the only cue; CVD-sim check (UX-M3) |
| Crisis tools fail under constriction; chatbots mishandle suicide (Stanley/Morrison/SciReports [E]) | One-step chart; localized resources everywhere; no dead-ends; human escalation; no AI crisis handling |
| Mental-health apps leak data (Huckvale 92%; FTC BetterHelp $7.8M [E/S]) | Local-first; zero third-party SDKs; explicit consent (UX-M5) |
| Over-reliance & rumination in solo use (APA 2025; expressive-writing [E/G]) | Adjunct-not-treatment framing; structured forward-looking prompts; help-seeking nudges; deterioration safety net |
| Over-claiming outcomes (Easden 2018 [E]) | Market as comprehension/collaboration/safety/reflection aid only; "unvalidated v0.x" |
| Gamification raises ethical risk, no benefit (Lipschitz 2023 [E]) | No streaks/dark patterns (UX-S4) |
| Engagement design assumes daily use (Baumel 3–6% [E]) | Design for brief/episodic, front-loaded value |

## 6. Open questions for usability testing (the v1.0 gate)

These map to the spec's Stage-4 validation and REQ-EVAL-SUITE:

1. **Can a distressed client navigate the Tier-1 crisis chart unaided?** (role-play under simulated
   distress; success = correct action within N steps). *The headline Stage-4 gate.*
2. **Do clients comprehend causal arrows / loops** given ~1/3 low graph literacy? (comprehension test;
   may force the "explain this link" fallback or simpler causality encoding).
3. **What client symbol-count is comprehensible** before errors rise? (validate the ≈6-symbol cap).
4. **Does collaborative/real-time editing change perceived alliance or distress** vs therapist-drawn?
5. **Is the diff/progress view understood** by clients and clinicians, or misread?
6. **Does the plain-language layer actually hit ~5th–6th grade** and feel non-pathologizing?
7. **Inter-rater reliability** of clinician formulations (a known weakness; Easden 2018).
8. **Harm surveillance:** can we detect/curb rumination, over-reliance, and distress in solo mode?

Until these pass, PsyUML stays v0.x and its UX claims remain design arguments, not validated results.

## 7. How this maps to the build
- **M2 (editor)** must ship UX-M1, M2, M3, M6, M7 and the SHOULD nav/versioning primitives.
- **Crisis chart (REQ-DECISION-NAV)** must ship UX-M4.
- **Privacy (REQ-PRIVACY/M8)**, **AI-assist (REQ-AI-ASSIST/M8)**, **ritual (REQ-RITUAL/M7)**, and
  **eval (REQ-EVAL-SUITE/M10)** carry UX-M5, S5, M8/P5, and §6 respectively.

---

## Sources

**Collaborative formulation & outcomes:** BPS/DCP (2011) *Good Practice Guidelines on
psychological formulation* https://explore.bps.org.uk/content/report-guideline/bpsrep.2011.rep100 ·
Thrower et al. (2024) *Factors that contribute to creating a collaborative psychological
formulation*, Clin Psychol Psychother https://onlinelibrary.wiley.com/doi/full/10.1002/cpp.2998 ·
Redhead, Johnstone & Nightingale (2015) *Clients' experiences of formulation in CBT*, PAPT
https://bpspsychub.onlinelibrary.wiley.com/doi/abs/10.1111/papt.12054 · Easden (2018) *Case
conceptualization research in CBT*, J Clin Psychol https://onlinelibrary.wiley.com/doi/10.1002/jclp.22516 ·
Persons, *The Case Formulation Approach to CBT* (Guilford) https://www.guilford.com/excerpts/persons.pdf ·
Kuyken, Padesky & Dudley, *Collaborative Case Conceptualization* https://www.guilford.com/excerpts/dimidjian2_ch13.pdf ·
Tyrer & Masterson (2019), Clin Psychol Psychother https://pubmed.ncbi.nlm.nih.gov/30303262/.

**Readability / notation:** Houts et al. (2006) *Role of pictures in health communication*, PEC
https://pubmed.ncbi.nlm.nih.gov/16122896/ · Schubbe et al. (2020) *Using pictures to convey health
information*, PEC https://www.sciencedirect.com/science/article/abs/pii/S073839912030197X · Galesic
& Garcia-Retamero (2011) *Graph Literacy*, Med Decis Making
https://journals.sagepub.com/doi/abs/10.1177/0272989X10373805 · *Graph literacy matters* (2020),
PLOS One https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0241844 · AHRQ Health
Literacy Universal Precautions Toolkit (Tool 11)
https://www.ahrq.gov/sites/default/files/wysiwyg/professionals/quality-patient-safety/quality-resources/tools/literacy-toolkit/healthlittoolkit2_tool11.pdf ·
Larkin & Simon (1987) *Why a Diagram is (Sometimes) Worth Ten Thousand Words*, Cognitive Science
https://onlinelibrary.wiley.com/doi/10.1111/j.1551-6708.1987.tb00863.x · Moody (2009) *The "Physics"
of Notations*, IEEE TSE https://www.semanticscholar.org/paper/73f214edc7e36c1c9aeca212ed828116a2db5522 ·
Green & Blackwell, *Cognitive Dimensions of Notations*
https://www.cl.cam.ac.uk/~afb21/publications/BlackwellGreen-CDsChapter.pdf · Miller (1956) *The
Magical Number Seven*.

**Crisis / safety planning:** Stanley & Brown (2012) *Safety Planning Intervention*, Cogn Behav
Pract https://zerosuicide.edc.org/resources/resource-database/safety-planning-intervention-brief-intervention-mitigate-suicide-risk ·
Stanley et al. (2018) *SPI+ vs usual care*, JAMA Psychiatry https://pubmed.ncbi.nlm.nih.gov/29998307/ ·
AFSP *Lethal Means Safety* https://afsp.org/policy-priority-lethal-means-safety/ · Action Alliance /
Means Matter, *Reducing a Suicidal Person's Access to Lethal Means*
https://theactionalliance.org/sites/default/files/inline-files/Reducing%20a%20Suicidal%20Persons%20Access%20to%20Lethal.pdf ·
Morrison et al. (2024) *Safety-planning mHealth app features*, JMIR Ment Health
https://mental.jmir.org/2024/1/e52763 · Pichowicz et al. (2025) *Chatbots & suicidal ideation*, Sci
Reports https://www.nature.com/articles/s41598-025-17242-4.

**Engagement / harms:** Baumel et al. (2019) *Objective user engagement with mental health apps*,
JMIR https://www.jmir.org/2019/9/e14567/ · Lipschitz et al. (2023) *The engagement problem*, Curr
Treat Options Psychiatry https://pmc.ncbi.nlm.nih.gov/articles/PMC10883589/ · van Ballegooijen et al.
(2014) *Adherence to iCBT*, PMC4100736 https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4100736/ ·
Eysenbach (2005) *The Law of Attrition*, JMIR https://www.jmir.org/2005/1/e11/ · Karyotaki et al.
(2018) *Is self-guided iCBT harmful?*, Psychol Med https://pmc.ncbi.nlm.nih.gov/articles/PMC6190066/ ·
Boettcher et al. (2014) *Negative effects of internet interventions*, Cogn Behav Ther
https://www.tandfonline.com/doi/full/10.1080/16506073.2015.1008033 · Ruini & Mortara (2021) *Writing
techniques across psychotherapies*, J Contemp Psychother https://link.springer.com/article/10.1007/s10879-021-09520-9.

**Accessibility / privacy / AI:** W3C (2023) *WCAG 2.2* https://www.w3.org/TR/WCAG22/ · *Global
Perspective of Color Vision Deficiency* (2025), PMC12385717
https://pmc.ncbi.nlm.nih.gov/articles/PMC12385717/ · Huckvale, Torous & Larsen (2019) *Data sharing
& privacy of depression/smoking apps*, JAMA Netw Open https://pmc.ncbi.nlm.nih.gov/articles/PMC6481440/ ·
FTC (2023) *BetterHelp order* https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising ·
Mozilla *Privacy Not Included — mental health & prayer apps* (2022–2023)
https://www.mozillafoundation.org/en/privacynotincluded/articles/top-mental-health-and-prayer-apps-fail-spectacularly-at-privacy-security/ ·
EU GDPR Arts. 5, 9, 25 · Henson, Peck & Torous (2019) *Digital alliance*, PMC6381418
https://pmc.ncbi.nlm.nih.gov/articles/PMC6381418/ · APA (Nov 2025) *Health Advisory: generative AI
chatbots & wellness apps* https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-chatbots-wellness-apps ·
Moore, Haber et al. (Stanford, 2025) https://news.stanford.edu/stories/2025/06/ai-mental-health-care-tools-dangers-risks ·
WHO (2024) *Ethics & Governance of AI for Health: LMMs* https://iris.who.int/server/api/core/bitstreams/e9e62c65-6045-481e-bd04-20e206bc5039/content.

*Note on evidence: standards (WCAG, GDPR) and the FTC action are binding; trials/cohorts/
meta-analyses are empirical; APA/WHO/BPS are authoritative guidance; Moody/CDN and the ≈6-symbol cap
are design heuristics grounded in perceptual limits. Where the agents flagged thin or contested
evidence (diagram-memorability, collaboration→outcomes, the >50% attrition figure), this document
treats it as suggestive, not settled.*
