# Comprehension instruments + pilot-study design (PROPOSED — not evidence)

Concrete, **proposed** instruments that operationalize the [evaluation suite](../evaluation-suite.md)'s
**Tier B** — the human studies that gate PsyUML leaving v0.x. They cover three of the Tier-B
dimensions:

- **Comprehension (dim. 1)** — a layperson crisis-chart + State-Map comprehension test (Instrument A),
  and a **per-symbol** comprehension test (Instrument D, ISO 9186) gating the asset library (v0.2 §5).
- **Inter-rater reliability (dim. 2/gate-2)** — an independent-formulation reliability task.
- **Multi-school endorsement (dim. 4/gate-3)** — a Delphi consensus-round sketch.

…plus a small **pilot-study design** that runs these on a feasibility scale, with **go/no-go
thresholds tied to the Stage-4 gate**.

> **READ THIS FIRST. These are PROPOSED, UNVALIDATED instruments. Administering them does NOT
> constitute evidence.** They have not themselves been validated; the items, scoring, and thresholds
> are *design proposals* to be piloted, refined, and pre-registered before they can support any v1.0
> claim. The [simulated pilot](../evaluation-suite-pilot.md) was an **LLM-role-play dry-run** of these
> same instruments — explicitly **not** evidence, and **not** a sample (LLM stand-ins over-read
> structured text and carry no real comprehension load or clinical judgement). PsyUML is **unvalidated
> v0.x**; it **supports, never replaces, professional care**, and **does not diagnose** (§L.2). Do not
> report results from these instruments as findings until the real Tier-B studies run.

## How these plug into Tier B

| Instrument (below) | Evaluation-suite dimension | Stage-4 gate item |
|---|---|---|
| A. Layperson comprehension test | 1. Comprehension (layperson) | Gate 1: comprehension non-inferior to prose |
| B. Inter-rater formulation task | 2. Collaborative validity / reliability | Gate 2: acceptable inter-rater reliability |
| C. Multi-school Delphi round | 4. Cross-school fidelity | Gate 3: multi-school endorsement |
| D. Per-symbol comprehension (ISO 9186) | 1. Comprehension (symbol-level) | Gate 1: symbols ≥67% / safety ≥85% before the asset library is frozen |

Tier **A** (automated) already guarantees the *artifacts* exist — every view renders with a
plain-language client layer and a narrated alt-text, round-trips losslessly, and passes the safety /
privacy / accessibility checks ([evaluation-suite.md](../evaluation-suite.md)). Tier **A green ≠
clinically validated**; these instruments are how the human half gets done.

## Cross-cutting requirements for any real run

Bind these before administering anything to real people:

- **Ethics approval / IRB** appropriate to your jurisdiction; informed consent; the right to
  withdraw. Comprehension testing touches distressing content (crisis charts) — screen for and
  support participant distress, and **never** use a participant's own crisis as test material.
- **Honest participant framing.** Tell participants this is testing the *notation*, not them, and
  that PsyUML is unvalidated.
- **De-identification.** Any stimulus drawn from real clinical material must be de-identified first
  (`psyuml redact`); prefer **synthetic/composite** vignettes (e.g. the spec's composite "R.").
- **Pre-registration.** Before the *definitive* studies, pre-register hypotheses, primary outcomes,
  sample size, and analysis. The pilot below is explicitly *not* the definitive study.
- **Accessibility of administration.** Offer large-print/screen-reader stimuli; the notation is
  colour-redundant by design, so test that comprehension holds in monochrome.
- **Test the picture, not the alt-text** (for the *visual* comprehension claim): show the rendered
  image; if a participant uses a screen reader, that's a separate (also valid) accessibility
  measure — record which channel was used.

---

## Instrument A — Layperson comprehension test

**Maps to:** evaluation-suite dimension 1; **Stage-4 gate item 1** (layperson comprehension
non-inferior to prose).

**Question.** Can a non-clinician read a *client-layer* diagram and state what it says about the
person — and, for a crisis chart, what to *do*?

**Design.** Within-subjects or between-subjects comparison of a **PsyUML client-layer diagram** vs. a
**matched prose formulation** of the *same* content. Counterbalance order/format. Stimuli: the
client-layer **Crisis/Decision chart** (`examples/decision-nav.psyuml`) and the **State Map**
(`examples/state-map.psyuml`), rendered to SVG (the *image*, not the alt-text).

**Procedure (≈20–30 min/participant).**

1. Brief + consent + distress safeguarding (a crisis chart is the stimulus).
2. Show stimulus 1 (diagram *or* prose). **Free recall:** "In your own words, what does this say
   about this person, and what should they do if things get bad?"
3. **Targeted questions** (scored, below).
4. Repeat with stimulus 2 in the other format.
5. Brief preference/confidence + debrief, including signposting to real support.

### A.1 Crisis-chart comprehension items (sample)

Scored against the `decision-nav` example (one decision per step; resources on every screen and on
the crisis node; no dead-ends; region-neutral line):

| # | Item | Correct-answer criterion | Score |
|---|---|---|---|
| C1 | "What's the **first thing** this chart asks you to check?" | Names the first decision (e.g. "am I safe right now?") | 0/1 |
| C2 | "If the answer is **not safe**, what does it tell you to do?" | Identifies the escalation/contact-a-person step | 0/1 |
| C3 | "Where would you find **who to contact** in a crisis?" | Points to the crisis resources (on the crisis node *and* the standing banner) | 0/1 |
| C4 | "Is there ever a box with **nowhere to go** next?" | Correctly says **no** — every path leads somewhere (no dead-ends) | 0/1 |
| C5 | "What's one step about **making things safer** right now?" | Identifies the means-restriction / make-safer step | 0/1 |
| C6 | "Whose phone number goes in the crisis box?" | Understands it's *their own local* contact (region-neutral), not a fixed number | 0/1 |

**Free-recall coding (separate):** 1 point each for correctly mentioning (a) the first decision,
(b) at least one **way to get help**, (c) the idea of escalation, (d) no dead-end. Two raters,
report agreement (e.g. Cohen's κ).

### A.2 State-Map comprehension items (sample)

Scored against the `state-map` example (three bands; transitions with triggers; at least one exit):

| # | Item | Correct-answer criterion | Score |
|---|---|---|---|
| S1 | "How many different **states** can this person be in?" | Correct count of states | 0/1 |
| S2 | "What **moves** them from a calmer state to a more wound-up one?" | Names a trigger on a transition | 0/1 |
| S3 | "Is there a **way back** to feeling steadier? Point to it." | Identifies an **exit**/way-out edge (the path of hope) | 0/1 |
| S4 | "Does the picture say this person is **broken** or **ill**?" | Correctly says **no** — it shows states, not a verdict/diagnosis | 0/1 |
| S5 | "Could you tell **someone else** what this person goes through, from this picture?" | Self-rated 1–5 + a one-line summary scored for accuracy | 1–5 + 0/1 |

### A.3 Scoring & success criterion

- **Primary outcome:** % of participants who correctly identify, for the diagram condition, (i) the
  **states**, (ii) **at least one way out / way to get help**, and (iii) the **crisis action**.
- **Proposed success threshold** (from the evaluation suite, dimension 1): **≥80%** correct on those
  core items, **and** the diagram is **non-inferior to prose** (define a non-inferiority margin in
  pre-registration; e.g. diagram comprehension not worse than prose by more than a pre-set δ).
- **Safety floor:** crisis-action comprehension (C2 + C3) and "no dead-ends" (C4) should approach
  **ceiling** — a person must be able to find help. Treat a low score here as a *design defect to
  fix*, not just a number (this is exactly how the [simulated pilot](../evaluation-suite-pilot.md)
  surfaced the "the box doesn't repeat the number" nit, now fixed).
- **Watch distress** throughout (emotional-safety items below); comprehension is not worth harm.

---

## Instrument B — Inter-rater formulation reliability task

**Maps to:** evaluation-suite dimension 2; **Stage-4 gate item 2** (acceptable inter-rater
reliability).

**Question.** Do independent clinicians, given the **same** case, produce **concordant** PsyUML
formulations?

**Design.** N independent clinicians (target ≥6 for a pilot; more for the definitive study) each read
the *same* de-identified vignette and build a PsyUML diagram of it (start with the **State Map**;
extend to Process/Loop) using only the [cheat-sheets](../cheatsheets.md) +
[format reference](../format-reference.md). Compare formulations on structure and content.

**Procedure.**

1. Distribute the vignette + the cheat-sheets/format-reference (and the worked DSL example — the
   pilot found the grammar wasn't reproducible *without* one, since fixed in the format reference).
2. Each clinician builds independently (paper or editor), time-boxed (~15–20 min).
3. Collect; two coders extract a structured summary per formulation.

**What to compare (proposed coding).**

- **State/element concordance** — do raters identify the same core states/parts? (e.g. Jaccard
  overlap of element sets, or % agreement on a pre-listed element checklist.)
- **Transition/loop concordance** — same key transitions; same loop (R/B) identified; **same exit**
  named.
- **Epistemic marking** — agreement on what's marked `inferred` vs `reported`/`observed`.
- **Reliability statistic** — for categorical element/edge presence across raters, report an
  appropriate coefficient (e.g. Fleiss' κ for >2 raters, or an intraclass correlation for graded
  features like dominance). Pre-register which.

**Proposed success criterion.** "Acceptable" inter-rater reliability per pre-registration (e.g. κ in
a substantial range for core elements/transitions). The simulated pilot saw **high *content*
concordance** (same states, same loop, same exit) but **low *syntax* reproducibility** (raters
invented a brace DSL) — so the task separately records **content** agreement from **notation**
correctness, and notation errors feed the [workshop](workshop.md) and docs, not the reliability
score.

---

## Instrument C — Multi-school (Delphi) consensus-round sketch

**Maps to:** evaluation-suite dimension 4; **Stage-4 gate item 3** (multi-school endorsement).

**Question.** Do practitioners across **≥3 traditions** agree the cross-school renderings (and the
core notation) are **faithful** — that no school's construct is silently flattened?

**Design.** A modified **Delphi** process (mirroring how, e.g., BCTTv1 reached consensus across ~400
experts — referenced in the spec's Stage-4 recommendation, here at pilot scale). An expert panel
spanning **≥3 schools** (e.g. IFS, schema, structural-dissociation, TA for the parts family; plus
CAT, systemic, psychodynamic as critics of the *boundaries* of the claim).

**Procedure (proposed, 2–3 rounds).**

1. **Round 1 (independent rating).** Each panellist rates a set of renderings/translations for
   fidelity (e.g. 1–5 "this faithfully represents the construct without merging it with another")
   and flags any silent flattening, with free-text rationale. Stimuli: the parts-family vocabulary
   swap; the contested-origin marker (`⚖ A vs B`); the CBT vs CAT examples *as a contrast, not a
   translation*.
2. **Feedback.** Anonymised aggregate ratings + collated rationales returned to the panel.
3. **Round 2 (re-rate).** Panellists revise in light of the group. Repeat until stability or a
   pre-set round cap.
4. **Endorse / object / endorse-with-caveats** verdict per item, with a target consensus level
   (e.g. % agreement) set in advance.

**What it must protect.** The honest scope from
[handbook §6](../handbook.md#6-cross-school-honestly) / [style-guide §7](../style-guide.md): the swap
is the **parts family only**; **CAT is excluded** (dyadic reciprocal roles); other traditions are
their **own diagram types**; provenance **shows** opposed claims, never merges them. The simulated
CAT critique already produced an **endorse-with-caveats for teaching, object-to-"translation"-framing**
verdict — the definitive Delphi must surface and resolve (or honestly bound) exactly that kind of
disagreement.

**Proposed success criterion.** Pre-registered consensus (e.g. ≥X% endorse-or-endorse-with-caveats)
across ≥3 schools that the renderings are faithful **and** that no item is judged to silently flatten
a construct.

---

## Instrument D — Per-symbol comprehension (ISO 9186; v0.2 §5)

**Maps to:** evaluation-suite dimension 1; **gate item 1 (symbol-level half)**. Where Instrument A
asks whether someone reads a whole *diagram*, Instrument D asks whether each individual **symbol** is
understood — the spec §5 requirement that PsyUML **comprehension-test its symbols before freezing the
asset library**, using a validated method (ISO 9186), and design them *with* novices first.

**Symbols under test.** The set is enumerated in code as `NOTATION_SYMBOLS` (`@psyuml/profiles`) — the
core element glyphs, the connectors (incl. the safety-critical **exit / way-out**), the parts markers,
and the CAT loop-topology marks (trap/dilemma/snag). The same list drives the **Tier-A harness** and
the **ledger** below, so "every picture-profile symbol" is a closed, checkable set.

**Tier A first (automated, runs in CI — `auditNotation()`).** Before any human sees a symbol, the
harness enforces the *necessary conditions*: each symbol is **discriminable** (no two share a glyph),
each **safety-critical** symbol is **dual-coded** (a redundant word — never glyph- or colour-alone),
and each has a plain-language **gloss** + unique id. Tier-A green is a prerequisite, **not** evidence
of comprehension.

**Tier B (human study — the real gate; ISO 9186).** Run with **clients, trainees, and laypeople**
(≥30 per audience for the quantitative gate), after a **participatory generation** round (novices
draft candidate symbols first — they tend to design more transparent ones than experts):

1. **Comprehension/recognition (ISO 9186-1).** Show each symbol *in a minimal context*; "What do you
   think this means?" Code each response as **correct / wrong / opposite / don't-know** against the
   `concept` gloss, two raters (report κ).
2. **Matching (discriminability).** Match symbols to meanings from a set — catches confusable pairs.
3. **Also record:** time-to-correct, **5-second recall**, and the **dual-coding lift** (glyph alone vs
   glyph + word).

**Thresholds (per symbol).**

| Class | Correct-comprehension bar | Hard constraint |
|---|---|---|
| General symbols | **≥ 67%** | — |
| Safety-critical (e.g. exit / way-out) | **≥ 85%** | the **wrong/opposite-meaning rate is reported**; a *confidently-misread* symbol is **disqualifying**, not just low-scoring |

A symbol that misses its bar is **iterated and re-tested, not shipped** (and never silently kept).

### Symbol comprehension ledger (status: PENDING — no study has been run)

> Honest status. **Every entry is `pending`.** Tier-A is automated and green; the Tier-B column needs
> real participants and **must not** be filled with numbers until a study runs (an LLM dry-run is not a
> sample — see the banner up top). This table is the record that will hold the evidence, not the
> evidence.

| Symbol (`id`) | Meaning to convey | Bar | Tier-A (auto) | Tier-B comprehension (humans) |
|---|---|---|---|---|
| `self` ◎ | steady, non-pathological centre | ≥67% | ✅ pass | ⏳ pending |
| `part` ○ | a part / sub-personality | ≥67% | ✅ pass | ⏳ pending |
| `state` (box) | a state one can be in | ≥67% | ✅ pass | ⏳ pending |
| `resource` ◇ | a steadying support / anchor | ≥67% | ✅ pass | ⏳ pending |
| `intervention` ⬡ | a deliberate change act | ≥67% | ✅ pass | ⏳ pending |
| `context` ▭ | who/what owns an action | ≥67% | ✅ pass | ⏳ pending |
| `band` ▮▮▮ | an ordered zone / phase | ≥67% | ✅ pass | ⏳ pending |
| `observing-eye` 👁 | a step-back, self-watching stance | ≥67% | ✅ pass | ⏳ pending |
| `sequential` → | leads to / then | ≥67% | ✅ pass | ⏳ pending |
| `reciprocal` ↔ | feeds both ways | ≥67% | ✅ pass | ⏳ pending |
| **`exit`** (dashed + "EXIT") | **the way out / way to get help** | **≥85%** | ✅ pass | ⏳ pending |
| `barrier` ⤬ | a dissociative barrier | ≥67% | ✅ pass | ⏳ pending |
| `containment` ( ) | a protector holding/guarding | ≥67% | ✅ pass | ⏳ pending |
| `contested` ⚖ | origins disagree (shown, not merged) | ≥67% | ✅ pass | ⏳ pending |
| `trap` (+ "TRAP") | a self-confirming loop | ≥67% | ✅ pass | ⏳ pending |
| `dilemma` (+ "DILEMMA") | a false-binary either/or | ≥67% | ✅ pass | ⏳ pending |
| `snag` (+ "SNAG") | self-sabotage of success | ≥67% | ✅ pass | ⏳ pending |

### Picture-profile pictograph ledger (status: PENDING — no study has been run)

> The **picture audience** (low-literacy / child) needs *drawn* symbols, not glyphs. These candidate
> pictographs are enumerated in code as `PICTOGRAPHS` (`@psyuml/profiles`) and made visible by
> `pictographKeySvg()` (the candidate sheet the editor shows in picture mode). They drive a **Tier-A
> pictograph audit** (`auditPictographs()` — discriminable icons, every symbol dual-coded with a word,
> a gloss + unique id, **and** the honesty gate: while no study has run, every entry MUST stay
> `pending`). **None has passed**, so the picture profile still renders **client + a flag** (words) —
> `pictographFor()` returns nothing and no pictograph enters a diagram. A symbol that misses its bar is
> **redrawn and re-tested, never shipped** (REQ-PICTURE-PICTOGRAPHS, gated on this study; ADR-0037).

| Pictograph (`id`) | Word (dual-coding) | Meaning to convey | Bar | Tier-A (auto) | Tier-B comprehension (humans) |
|---|---|---|---|---|---|
| `self` | STEADY ME | the steady, settled centre of me | ≥67% | ✅ pass | ⏳ pending |
| `part` | A PART | a part of me / a sub-personality | ≥67% | ✅ pass | ⏳ pending |
| `feeling` | A FEELING | a feeling or state I can be in | ≥67% | ✅ pass | ⏳ pending |
| `resource` | A STRENGTH | a strength, support, or anchor | ≥67% | ✅ pass | ⏳ pending |
| **`exit`** | **WAY OUT** | **a way out / a way to get help** | **≥85%** | ✅ pass | ⏳ pending |
| `trigger` | A SPARK | a spark that sets a pattern off | ≥67% | ✅ pass | ⏳ pending |
| **`reach-out`** | **REACH OUT** | reach out / tell someone / ask for help | **≥85%** | ✅ pass | ⏳ pending |

---

## Pilot-study design (feasibility scale)

A small study to **rehearse all three instruments with real people**, surface defects, and estimate
parameters for the definitive (pre-registered) Tier-B studies. **This pilot is not the gate** — it
de-risks the gate.

### Objectives

1. Check the instruments are **administrable** and the items **understood as intended**.
2. Surface **design defects** in PsyUML itself (as the simulated pilot did — and those count: fixing
   a comprehension defect is the point).
3. Estimate **effect sizes / variances** to power the definitive studies.
4. Confirm **safety and ethics procedures** (distress handling, consent, de-identification) work.

### Participants (pilot scale)

- **Comprehension (A):** ~15–20 laypeople (non-clinicians); diverse reading level, age, and
  language where feasible; the evaluation suite names **N ≥ 20** as the comprehension-study target —
  the pilot can run smaller to test feasibility.
- **Inter-rater (B):** ~6 clinicians, ideally spanning a couple of traditions.
- **Delphi (C):** ~6–9 experts across **≥3 schools**.
- Recruit ethically; compensate appropriately; exclude anyone for whom the crisis-chart stimulus is
  contraindicated (recent crisis).

### Procedure

1. Ethics approval + consent + distress safeguarding in place.
2. Run A, B, C as above on the pilot samples; collect quantitative scores + free-text + facilitator
   notes on administration problems.
3. Two raters code free-recall / formulations; report inter-coder agreement.
4. Debrief participants; signpost real support.

### Measures

- **Comprehension:** the A.3 primary outcome (% correct on core items) + the prose comparison +
  preference/confidence + **distress** (an emotional-safety check — e.g. a brief distress rating
  before/after, with a stop rule).
- **Reliability:** the B coding (element/transition/loop/exit concordance) + the chosen reliability
  statistic, **content** vs **notation** separated.
- **Endorsement:** the C ratings + consensus level + the catalogue of "silent flattening" flags.
- **Feasibility:** completion rates, time-on-task, items participants found confusing, administration
  glitches.

### Go / no-go thresholds (tied to the Stage-4 gate)

These mirror the [evaluation suite's v1.0 go/no-go gate](../evaluation-suite.md#the-v10-go--no-go-gate).
**At pilot scale they are go/no-go for *proceeding to the definitive study*, not for v1.0 itself.**

| Stage-4 gate item | Pilot signal to **proceed** | If not met |
|---|---|---|
| 1. Layperson comprehension non-inferior to prose | Diagram comprehension ≥ the proposed **80%** core-item threshold and ≥ prose (within the non-inferiority margin); **crisis-action items near ceiling** | Treat as a **design defect**: simplify the chart/labels and re-pilot (the spec's "simplify to a single-page two-decision flow" contingency) |
| 2. Inter-rater reliability acceptable | Content concordance high and the reliability statistic in the pre-registered acceptable range | Improve notation learnability (worked examples, workshop), then re-pilot; if structure itself diverges, revisit the notation |
| 3. Multi-school endorsement | ≥3 schools reach the pre-set consensus that renderings are faithful and nothing is silently flattened | Re-scope the cross-school claim honestly (as the pilot already forced once) before any endorsement claim |
| 4. Tier A green + safety/privacy/a11y audits | Tier A remains green; no new safety/privacy/a11y defect surfaced | Fix before proceeding — safety defects block |

> **Crossing these pilot thresholds does NOT leave v0.x.** Only the **definitive, pre-registered,
> adequately-powered** Tier-B studies — comprehension, inter-rater reliability, and multi-school
> endorsement, with the formal safety/privacy/accessibility audits — can satisfy the
> [Stage-4 gate](../evaluation-suite.md#the-v10-go--no-go-gate). Until then PsyUML stays **v0.x**, and
> every surface keeps the "unvalidated — not a clinical instrument" framing.

### Threats to validity (state them up front)

- **Stimulus-specific results** — comprehension of *these* examples may not generalise; vary stimuli.
- **Text-mediated comprehension** — test the **rendered image**, not the alt-text, for the visual
  claim (the simulated pilot's main artefact was an agent parsing SVG markup, not viewing a raster).
- **Small / non-representative samples** at pilot scale — hence "feasibility", not "evidence".
- **Demand characteristics** — participants may flatter a tool they know is the point of the study;
  blind format where possible and keep framing neutral.
- **Coder bias** in free-recall/formulation coding — use ≥2 coders and report agreement.

### Outputs of the pilot

1. Refined instruments (items, scoring, thresholds) ready to **pre-register**.
2. A list of PsyUML **design defects** to fix (these are real value, not failures).
3. Parameter estimates to **power** the definitive Tier-B studies.
4. Confirmation the **safety/ethics procedures** are adequate.

None of these outputs is Tier-B *evidence*. They make the eventual evidence-gathering sound.
