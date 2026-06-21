# PsyUML gap analysis — psychological diagramming techniques not yet supported

> **Status: research deliverable (June 2026), not a spec.** A deep-research pass (5 parallel
> search angles + focused longitudinal sub-studies) mapping psychotherapy & adjacent applied-psychology
> diagramming techniques PsyUML does **not** yet support, calibrated against the 20 shipped diagram
> types and the catalogue's existing exclusions. Findings are grouped by the four gap kinds the scope
> requested. **Honesty clause carries through:** therapy-evidence ≠ diagram-evidence — most of these
> "diagrams" are teaching/clinical aids, not validated instruments; that is flagged per item. Several
> are flagged **contested** or **exclude**. Sources are cited inline; fuller source lists live in the
> research transcripts.

## How to read this

- **Genuine gap** = no renderer and no close existing type.
- **Near-miss** = an existing type approximates it (named); often best shipped as a *preset/extension*,
  not a new type.
- **Out-of-scope-by-design** = clashes with PsyUML's constraints (hand-drawable, accessibility-first,
  dual-audience, deterministic monochrome SVG, no animation/colour-dependence/3D/real-time) or its
  mission (qualitative formulation, not measurement) — recorded as a boundary, not a backlog item.
- Every item carries a **constraint-fit flag** and an **evidence flag**.

---

## Executive summary — the highest-leverage findings

**1. Five cross-cutting *primitives* unlock far more than any single new diagram.** Build these and a dozen
techniques become reachable:

| Primitive | Unlocks | Constraint fit | Priority |
|---|---|---|---|
| **Score/measurement series on a node** (monochrome sparkline + numeral + alt-text) | SUDS-on-a-node, any rating attached to a formulation element; the cleanest bridge to outcome data | **Strong** — small bar/sparkline is hand-drawable, deterministic, fully alt-text-able | **High** |
| **Non-visual magnitude rule** (bounded tier + mandatory numeral + templated alt-text; never colour/saturation/blur) | the *enabler* every magnitude feature needs to stay accessible | this **is** the accessibility constraint, made into a reusable rule | **High** |
| **Weighted / strength edges** (3-tier thickness + numeral + alt-text, lint-gated against over-reading) | Force-Field analysis, static fuzzy-cognitive maps, symptom-network thickness | tense — must be redundant, *not* continuous-saturation/colour | **Medium** |
| **Concentric containment bands** (labelled nested rings) | Bronfenbrenner ecological systems, "circles of influence/control" as *membership*, partial BCW/DMM | OK in monochrome; thin-annulus label placement is the fiddly part | **Medium** |
| **Generic crossed-axes 2×2** (parametric template) | TA OK Corral, MBT mentalizing-dimensions — and prevents type proliferation | excellent (axes + labels, monochrome) | **Medium** |

**2. The single biggest *adjacent* capability PsyUML lacks is a quantitative charting subsystem** (numeric
axes, plotted points, threshold/trend/envelope lines). Eight of nine longitudinal techniques need it.
**The uncomfortable truth: routine-outcome-monitoring and feedback-informed-treatment charts carry the
*best outcome evidence of anything in PsyUML's orbit* — stronger than the qualitative formulation
diagrams already shipped** ([ROM meta-analysis, Lambert & Whipple 2018](https://pubmed.ncbi.nlm.nih.gov/30335463/);
feedback nearly **doubles** reliable change and roughly **halves deterioration** in not-on-track cases,
and cuts dropout ~20%). So excluding charts is a *philosophy* choice, not an *evidence* one — the headline
strategic tension to surface.

**3. Two honest "looks like a win, fails on the merits" traps.** Node **centrality** in symptom networks
is fashionable but **poorly replicable** ([Forbes et al. 2017](https://pubmed.ncbi.nlm.nih.gov/29106281/);
[problems with centrality, PMC7012663](https://pmc.ncbi.nlm.nih.gov/articles/PMC7012663/)) and clashes
with PsyUML's humility stance. **Family Constellations** (Hellinger) is **pseudoscience with documented
harms** ([Wikipedia](https://en.wikipedia.org/wiki/Family_Constellations);
[The Skeptic, 2022](https://www.skeptic.org.uk/2022/04/family-constellation-the-pseudoscience-retraumatising-victims-at-the-approval-of-brazilian-courts/);
the [2021 systematic review (Family Process)](https://onlinelibrary.wiley.com/doi/abs/10.1111/famp.12636)
found only low-quality evidence and urged active monitoring of iatrogenic effects) — **exclude-by-design**.

**4. Best-evidenced genuinely-new in-mission diagram type: the ACT Hexaflex** — flagship 3rd-wave model,
clean constraint fit, cheap to build, client-facing.

---

## Gap kind 1 — net-new diagram types

### In-mission, worth building

| # | Technique (school) | What it adds | Why not covered / near-miss | Evidence flag | Constraint fit | Priority |
|---|---|---|---|---|---|---|
| 1 | **ACT Hexaflex** (ACT, Hayes) | fixed six-process psychological-flexibility hexagon (+ inflexahex poles) | not the ACT matrix/choice-point (already shipped); a fixed radial profile of paired poles | ACT evidenced; the *hexagon* is a teaching/formulation aid, not a measure | excellent (hexagon + labels, monochrome) | **High** |
| 2 | **CFT multiple-selves map** (CFT chairwork; [Bell et al. 2021](https://chairwork.co.uk/wp-content/uploads/2021/07/Bell-2021-Multiple-selves.pdf)) | fixed emotion-self cast (angry/anxious/sad + compassionate) with inter-self *blocking* relations | near-miss to parts-map (IFS topology) & three-circles (systems) — neither shows the emotion-self cast in dialogue | CFT growing evidence; map is a clinical procedure | excellent (4 circles + relation arrows) | **Med-High** |
| 3 | **Minuchin structural-family boundary notation** (SFT) | clear/rigid/diffuse **boundaries** + coalition/triangulation arcs around *subsystems* | **extend `relational-field`** — its genogram ties are person-to-person, not boundary qualities | SFT reasonable base; map is a formulation tool | excellent — line-vocabulary PsyUML already uses | **Med-High** |
| 4 | **Common-Sense Model / illness-perception** (health psych, Leventhal) | parallel *cognitive* vs *emotional* self-regulation loops + 5 representation dimensions | near-miss to single-loop process-loop; **reuse swimlanes** for the two tracks | well-supported (IPQ operationalises it) | good (boxes/arrows, two lanes) | **Medium** |
| 5 | **Metacognitive / CAS model** (MCT, Wells) | one level *up* from content: metacognitive beliefs → CAS (worry/monitoring/coping) | near-miss to maintenance loop, but distinct node ontology MCT loop lacks | MCT moderately-well evidenced | excellent (boxes + reinforcing loop) | **Medium** |
| 6 | **COM-B core** (health psych, Michie) | Capability×Opportunity×Motivation → Behaviour hub | near-miss-by-approximation (tiny hub); ship as **named template** | **strong** (synthesis of 19 frameworks) | clean (few nodes) | **Medium** (as preset) |
| 7 | **Emotion-map / markers-on-a-ground** (Gabb floor-plan; family work) | place markers on a supplied 2-D template (floor-plan), compare members' maps | **generalise `body-map`** (markers on a silhouette → any ground) | novel; single-case evidence — practice innovation | **strong** (inherently static spatial artifact) | **Medium** |
| 8 | **Gestalt contact cycle** (Gestalt) | fixed need-satisfaction cycle + named interruption points | near-miss to process-loop; distinct fixed-stage + interruption markers | Gestalt outcome evidence limited; teaching model | excellent (cyclic stages + markers) | **Low-Med** |
| 9 | **TA script matrix** (TA, Berne/Steiner) | ego-state→ego-state directed messages between generations | partial overlap genogram+timeline; distinct directed bipartite-by-ego-state notation | TA outcome base thin; conceptual diagram | good but dense; jargon-heavy | **Low-Med** |

### Fold into a primitive, or ship as a preset (don't make a bespoke type)
- **TA OK Corral** (self×other life positions) and **MBT mentalizing-dimensions** → the **generic crossed-axes 2×2 primitive**.
- **IPT interpersonal inventory / closeness circles** → **already covered** by `relational-field`/`resource-anchor` concentric-circles client layer; ship as a **named preset**, not a type.

---

## Gap kind 2 — cross-cutting notation

| Capability | What it expresses that PsyUML can't | Near-miss | Evidence flag | Constraint fit | Priority |
|---|---|---|---|---|---|
| **Score/measurement series on nodes** | a measured value (SUDS, a rating) and its change, attached to a formulation element | M6 diff (between-version, coarse); parsed `intensity` | **practice strongly evidenced** (SUDS, MBC); the in-diagram composition is novel + low-risk | **best fit of the set** (monochrome sparkline + alt-text) | **High** |
| **Non-visual magnitude rule** (enabler) | encode a *quantity* redundantly across the language (tier + numeral + alt-text) | per-type size encodings exist ad hoc (mode-map/ladder/bullseye/three-circles) | accessibility lit clear: colour/saturation/thin-width fail non-visual users | this *is* the constraint, made reusable | **High** |
| **Weighted / strength edges** (visual) | "how strong is this link?" readable from the line | `weight` is **parsed but rendered as font-weight, not stroke-width**; `[w:0.8]` numeral | method real; the qgraph *visualisation* is **over-read** (edges unstable — [Forbes 2017](https://pubmed.ncbi.nlm.nih.gov/29106281/)) | clash with monochrome/continuous; only a **bounded tier + numeral** is compliant | **Medium**, lint-gated |
| **Filmstrip / small-multiples over sessions** + **lagged-vs-contemporaneous edge time** | a multi-frame view of one diagram across sessions; "same-window" vs "over-time" edges | M6 diff + timeline + versioned models are a partial substitute | small-multiples **beats animation** for dynamic graphs (evidenced); temporal nets promising-only | good (static); animation correctly excluded | **Medium** (filmstrip) / Low (edge-time) |
| **Stock-and-flow accumulation** (system dynamics) | stocks (accumulations) vs flows (rates) | PsyUML has the *qualitative* CLD layer (R/B loops, delay, ⊕/⊖) — **near-miss, not absent** | mature method but **population-level only**; ~no single-client evidence | glyphs fine; *simulation* out of scope | **Low** |
| **Probabilistic / distributional uncertainty** | continuous probability / a belief distribution on an edge | discrete L/M/H confidence + dashed "interpretive" + `as-if` | graph-uncertainty viz is **known-hard even with colour/animation**; Bayesian causal assumptions strong | best forms (blur/HOPs/animation) all **excluded**; discrete L/M/H may be the right answer | **Low** |
| **Fuzzy cognitive maps** (weighted signed causal + inference) | run-forward "what-if" over a weighted signed map | static form ≈ signed edges + `weight` (already expressible) | weights **subjective, weakly validated**; inference hard to validate | static = weighted-edges tension; inference out of scope | **Low** |
| **Node centrality** | "most connected / best target" (a whole-graph metric) | none — no computed graph metrics by design | **fashionable but poorly replicable**; epistemic clash with humility stance | computable; node-size-by-degree collides with size-by-dominance | **Low / avoid** |

---

## Gap kind 3 — interactive / manipulable

**The real gap here is one capability, not many techniques: client-driven, real-time, *embodied*
manipulation.** PsyUML already supports the spatial **snapshot** of most of these (positions on
`relational-field`, `social-atom`, `body-map`, `tree-of-life`). What it cannot do — **by deliberate
design** — is let the client manipulate in real time or capture embodiment. This is the project's
defining fork: a reproducible, accessible artifact over a live canvas.

| Technique | Verdict | Note |
|---|---|---|
| **Family sculpting** (Satir) | snapshot **already covered** by `relational-field` | weak/"promising" evidence; document as a sculpture-snapshot example |
| **Sociometry / action sociograms** (Moreno) | snapshot **already shipped** (`social-atom`); embodied form is the gap | negative-nomination ethics already flagged in the catalogue |
| **Collective "Tree of Life forest"** (narrative, Ncube/Denborough) | individual tree shipped; **collective forest via `renderComposite`** is a genuine in-scope extension | client-led, culturally rich; practice-based evidence | **Low-Med** |
| **Card sorts / Q-sort / values cards** | **tables, not diagrams** — exclude (residue already in `bullseye`/`ladder`) | tool-evidence ≠ embedding-therapy evidence |
| **Repertory grid** (Kelly PCP) | grid/instrument + quantitative — exclude (class of `schema-grid`, but cells are ratings) | the most rigorously *studied*, but its value is the quantitative analysis |
| **Sandtray / world technique** | out-of-scope (free pictorial-symbol canvas; tactile) | "encouraging but limited" evidence (small-n) |
| **Digital collaborative whiteboards** (Miro/CBT Flow) | **out-of-reach by design** — the defining boundary | only in-scope concession: extend **drag-to-reposition** to more types |
| **Family Constellations** (Hellinger) | **EXCLUDE — pseudoscience, documented harms** | flagged-cautionary at most, like the catalogue's polyvagal treatment |

---

## Gap kind 4 — longitudinal / outcome-over-time

**Mission tension up front:** these are **quantitative charts** (score-axis × time-axis, with cutoff /
trend / envelope lines), a categorically different artifact from a qualitative formulation diagram — and
by the catalogue's own "score-it / list-it ⇒ not a diagram" rule they are presumptively out of scope.
**Yet they carry the strongest outcome evidence in PsyUML's orbit.** The dominant gap is the **absence of
a quantitative charting subsystem**; build it once and items 1–5/7–9 below become reachable.

| # | Technique | Evidence flag (honest) | Near-miss | Audience / safety | Priority *if charts admitted* |
|---|---|---|---|---|---|
| 1 | **Routine Outcome Monitoring / Measurement-Based Care** (score vs cutoff + expected-recovery curve) | **best-evidenced** but **small/heterogeneous**; the *not-on-track* signal is the robust win ([de Jong 2021](https://www.sciencedirect.com/science/article/pii/S0272735821000453); [2024 review, PMC11076375](https://pmc.ncbi.nlm.nih.gov/articles/PMC11076375/)) | none (timeline is qualitative) | clinician-default; **plots deterioration; PHQ-9 has a suicidality item** | **Highest** |
| 2 | **Feedback-Informed Treatment / PCOMS** (ORS+SRS over sessions) | SAMHSA-listed, 9 RCTs; but [meta-analysis](https://www.scottdmiller.com/how-much-more-evidence-is-needed-a-new-meta-analysis-on-feedback-informed-treatment/) finds g≈0.10 psychiatric vs 0.45 counselling + allegiance confound | none | **both — collaborative/client-shown** (most mission-aligned); colour signal violates "no colour alone" | **High** (tied) |
| 3 | **NIMH Life-Chart / mood charting** (mania-up/depression-down course) | instrument **validated** ([Denicoff 2000](https://pubmed.ncbi.nlm.nih.gov/11097079/)); charting-*alone* outcome evidence weak/null | **near-miss: extend the §E.5 timeline** with a signed-amplitude lane | both; captures severe-depression/suicidality days | **Med-High** (best in-family fit) |
| 4 | **Goal Attainment Scaling over time** (−2…+2 → T-score) | validated, **highly responsive** ([systematic review 2024](https://link.springer.com/article/10.1186/s41687-024-00716-w)); scoring needs training | **near-miss: extend goal-ladder/bullseye**; the scaling grid is table-like | both (goals co-set) | **Medium** |
| 5 | **Single-Case Experimental Design / n-of-1** (phase-change + trend lines) | strong *design* standing (WWC, SCRIBE-2016); **visual-analysis inter-rater reliability ~.39–.76** | none | clinician/researcher; reversal designs withhold treatment (ethics) | **Medium** |
| 6 | **Reliable Change Index / Jacobson–Truax plot** (pre×post scatter, RCI bands, quadrants) | field-standard classification; live methodological debates | none | researcher/service; explicit **"deteriorated" quadrant** | **Low-Med** |
| 7 | **Growth-curve / growth-mixture trajectory classes** | research method; classes can be **artifacts** ([Bauer & Curran 2003](https://pubmed.ncbi.nlm.nih.gov/14596495/)) | none | researcher; "non-responder class" label is iatrogenic risk | **Low** |
| 8 | **Idiographic / temporal symptom networks** (mlVAR/GVAR from EMA) | promising but **unstable/non-replicable**, research-only ([Hulsmans 2024](https://www.sciencedirect.com/science/article/pii/S0092656624000163)) | partial: PsyUML renders qualitative loops, but edges are clinician-asserted, **not data-weighted** | researcher; group-to-individual fallacy | **Low** |
| 9 | **SUDS habituation curves** | exposure evidenced, but **"falling SUDS = success" is contested** ([Craske inhibitory learning](https://pmc.ncbi.nlm.nih.gov/articles/PMC4114726/)) | near-miss: fear-ladder ranks by SUDS but plots no curve | both; the "fear didn't drop" misframe is the hazard | **Low** (evidence argues *against* featuring it) |

**Safety is sharper here than for formulation diagrams:** these charts plot deterioration *by design* and
several embed suicidality items — any charting feature would need the **path-of-hope / crisis-resource /
acute-risk** guardrails extended to a context where showing decline is the clinical *point*.

---

## Adjacent applied fields — mostly stretches beyond the psychotherapy mission

- **Forensic / risk** — **offence chains** & **structured risk formulation (HCR-20/SAPROF)** carry the
  **heaviest ethical load** (labelling, court/parole misuse); near-miss to `decision-nav`/`five-ps` but
  **out-of-core** unless a forensic remit is adopted. The **Good Lives Model** is the most
  therapy-compatible (strengths-based; reuse `resource-anchor`/`bullseye`).
- **Health psychology** — **Force-Field Analysis** (Lewin; needs the weighted-edges primitive) is the
  most *in-mission* (ambivalence/change work); **COM-B** core fits as a preset; the **Behaviour Change
  Wheel** (concentric segmented rings) is an out-of-mission policy tool.
- **Developmental** — **Bronfenbrenner nested rings** (the concentric-containment primitive);
  **developmental cascades** (research-leaning); **DMM attachment circumplex** is niche and **contested
  vs mainstream attachment** ([van IJzendoorn critique](https://en.wikipedia.org/wiki/Dynamic-maturational_model_of_attachment_and_adaptation)) — ship only with the ⚖ contested marker if at all.
- **Neuropsychology** — **boxes-and-arrows functional-architecture** & **rehab goal maps** fit the
  notation trivially but are teaching/rehab, **out-of-core** for a psychotherapy tool.

---

## Already covered / excluded-by-design (so they aren't re-counted)

- **Already shipped or a near-miss of a shipped type:** ACT matrix/choice-point, polyvagal "ladder" &
  window-of-tolerance (state-map), triangle-of-insight (= Malan two-triangles), sociogram/social-atom &
  IPT closeness circles (relational-field), individual Tree of Life, secure-base, drama/empowerment
  triangle, stages-of-change wheel.
- **Tables/scales — excluded by the catalogue's own litmus:** card/Q-sorts, repertory grid, TA egogram,
  GROW (mnemonic), Theoretical Domains Framework (checklist), 5 Ps & biopsychosocial grids, stakeholder
  power-interest 2×2, OK Corral as a standalone.
- **Out-of-reach by design (constraints):** real-time collaborative whiteboards, sandtray free-symbol
  canvas, animation, live embodiment, 3D.
- **Exclude (pseudoscience/harm):** Family Constellations (Hellinger).

---

## Consolidated honesty flags

- **Therapy-evidence ≠ diagram-evidence** — ACT, MBT, IPT, MCT, SFT, DBT, CFT being evidenced does **not**
  validate their *figures*; most candidates here are teaching/clinical aids, not validated instruments.
- **Best-evidenced of the whole study:** ROM/MBC and FIT/PCOMS (better-evidenced than the qualitative
  diagrams already shipped), GAS, the SCED *design* methodology, COM-B, Leventhal's CSM.
- **Fashionable-but-weak / contested:** node centrality; idiographic/temporal symptom networks; fuzzy
  cognitive map inference; "falling SUDS = success"; the DMM circumplex; mood-charting *as a therapy*
  (it's a measure).
- **Exclude:** Family Constellations (pseudoscience + documented harms).
- **Animation is correctly out of scope** — the dynamic-graph evidence favours PsyUML's static /
  small-multiples direction.

## Recommended next REQs (if the project pursues this)

1. `REQ-MAGNITUDE-PRIMITIVE` + `REQ-NODE-MEASUREMENT` (sparkline) — highest evidence + cleanest fit; also
   the honest bridge toward outcome data without becoming a stats package.
2. `REQ-HEXAFLEX`, `REQ-CFT-SELVES`, `REQ-STRUCTURAL-BOUNDARIES` (extend relational-field) — the
   best in-mission new types.
3. `REQ-CONCENTRIC-BANDS` + `REQ-CROSSED-AXES` + `REQ-WEIGHTED-EDGES` — three primitives that each unlock
   several techniques (Bronfenbrenner; OK Corral/mentalizing; Force-Field/FCM), all lint-/accessibility-gated.
4. A deliberate, separate **mission decision** on a `REQ-OUTCOME-CHART` subsystem — the biggest adjacent
   gap, best-evidenced, but a philosophy fork (charts vs formulation diagrams) with a real
   safety-guardrail redesign and the strongest accessibility tension.
