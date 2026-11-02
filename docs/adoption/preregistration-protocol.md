# Definitive Tier-B studies — pre-registration protocol + ethics pack (DRAFT, not registered)

The study protocol that [`REQ-STUDY-PREREG`](../specification/roadmap-to-v1.md) asks for, written so a
research team can file it (e.g. on OSF, "OSF Preregistration" template) and submit the ethics pack to
its IRB / research-ethics committee **without having to design the studies from scratch**. It turns the
proposed [instruments](comprehension-instruments.md) (A–D) and the [evaluation suite's Stage-4
gate](../evaluation-suite.md) into hypotheses, sample sizes, analysis plans and decision rules fixed in
advance.

> **STATUS — DRAFT. Nothing here has happened yet.** This protocol is **not registered**, **not
> ethics-approved**, and **no participant has been recruited or tested**. It contains **no results** —
> every outcome field is a *placeholder to be filled after the registered study runs*. PsyUML stays
> **unvalidated v0.x** until the registered studies run and their report is published (§L.2). The
> simulated pilots (`../evaluation-suite-pilot*.md`) were LLM dry-runs and are **not** data for any
> analysis below. Numbers in this document are **design parameters** (thresholds, assumptions, sample
> sizes), never findings.

**Who files it:** the study team (PI + an independent statistician). Before registering, run the
feasibility [pilot](comprehension-instruments.md#pilot-study-design-feasibility-scale) and update the
**assumptions** flagged ⚙ below from its estimates — that is the pilot's job. Record every change made
after registration in the [deviations log](#9-deviations-log).

---

## 1. Study overview

| # | Study | Instrument | Stage-4 gate item | Primary outcome |
|---|---|---|---|---|
| S1 | Per-symbol comprehension (ISO 9186) | D | 1 (symbol level) | % correct per symbol vs its bar |
| S2 | Diagram vs prose comprehension (non-inferiority) | A | 1 (diagram level) | core-item correctness, diagram − prose |
| S3 | Inter-rater formulation reliability | B | 2 | Fleiss' κ on core elements + transitions |
| S4 | Multi-school fidelity (modified Delphi) | C | 3 | % endorse / endorse-with-caveats per item |
| S5 | Collaborative validity, editability, utility, sharing harm | new (§4.5) | 1–2 (supporting) + safety | harm-probe rate; fit-to-experience rating |
| S6 | Assistive-technology / WCAG audit with screen-reader users | new (§4.6) | 4 | task success with a screen reader |

The studies are **independent registrations** that share this protocol's ethics pack, stimuli policy and
decision rules. Each can run on its own timeline; v1.0 needs **all** of them to meet their gates (§7).

**Stimuli.** Only synthetic/composite cases (the spec's composite "R.", the shipped `examples/`), never
a participant's own material in S1–S4 and S6. S5 is the one study that uses a participant's own
formulation, and only under the clinical safeguards in §8. Stimuli are frozen at a tagged release of
this repository; record the tag in the registration. Show **rendered images** (monochrome and colour,
counterbalanced), not alt text, for any visual-comprehension claim; screen-reader use is S6's channel.

## 2. Hypotheses (confirmatory)

- **H1 (S1).** For every symbol in `NOTATION_SYMBOLS`, correct-comprehension ≥ **67%**; for every
  safety-critical symbol (currently `exit`), ≥ **85%** with the wrong/opposite-meaning rate **< 5%**.
  Tested per symbol and per audience (laypeople, clients, trainees).
- **H2 (S2).** Core-item correctness for the diagram is **non-inferior** to the matched prose
  formulation, margin **δ = 10 percentage points**, and diagram core-item correctness is **≥ 80%**;
  crisis-action items (Instrument A, C2–C4) are **≥ 95%** correct.
- **H3 (S3).** Independent clinicians formulating the same vignette reach Fleiss' **κ ≥ 0.61**
  ("substantial") on presence of core elements, key transitions and the named exit — with **content**
  agreement scored separately from **notation** correctness.
- **H4 (S4).** For each cross-school rendering, **≥ 75%** of panellists from **each of ≥ 3 schools**
  rate it endorse or endorse-with-caveats, and **no** item is flagged as silently flattening a construct
  by a majority of any one school.
- **H5 (S5, safety — a bound, not a hope).** Fewer than **10%** of clients report a clinically
  meaningful increase in distress after seeing their co-drawn formulation (Chadwick et al. 2003
  reported a meaningful minority; this study measures it for PsyUML instead of assuming it away).

Exploratory (not confirmatory, reported as such): dual-coding lift (glyph alone vs glyph + word),
monochrome vs colour, reading-level and language effects, time-to-correct, 5-second recall, SUS score.

## 3. Sampling plan

| Study | Population | N (target) | Basis ⚙ |
|---|---|---|---|
| S1 | laypeople · clients (lived experience, supported) · trainees | **50 per audience** (150) | ISO 9186 asks ≥ 30; 50 gives a 95% Wilson half-width ≈ ±12.6 pp at p = 0.67 (±16 pp at 30), enough to tell a borderline symbol from a clear pass |
| S2 | laypeople | **160** completers (recruit ~180) | paired (within-subject crossover) non-inferiority for proportions: α = 0.025 one-sided, power 0.80, δ = 0.10, assumed discordance 0.20 ⚙ → n = 155. A between-subjects fallback needs 252 per arm |
| S3 | clinicians, ≥ 3 traditions | **12 raters × 10 vignettes** | κ precision: target 95% CI half-width ≤ 0.10 ⚙ (update the rater count from the pilot's κ variance) |
| S4 | experts, ≥ 3 schools | **≥ 5 per school, ≥ 15 total** | standard Delphi panel sizing; ≥ 5 per school so one school's view is not one voice |
| S5 | clients in active therapy + their clinicians | **60 dyads** | harm-probe precision: 95% upper bound below 10% is reachable if the true rate is ≲ 3% ⚙ |
| S6 | screen-reader users (blind / low-vision) | **12** | qualitative usability norm; task success reported with exact CIs |

**Inclusion (all):** adult (≥ 18), consent capacity, reads the study language. **Exclusion:** for
studies with crisis-chart stimuli, anyone in current crisis or with a recent (≤ 3 months) suicide
attempt or psychiatric admission — screened privately, without stating the reason publicly. **Clients
(S1, S5)** are recruited only through their treating clinician, who confirms suitability and stays
available. **Stopping recruitment:** at the target N, or early under the safety rules in §6.

## 4. Measures and procedures

### 4.1 S1 — per-symbol comprehension (Instrument D)
Each symbol shown in a minimal context, in random order, one per screen. Open response ("what do you
think this means?"), then a matching block. Two coders, blind to audience, code each response
**correct / wrong / opposite / don't-know** against the `concept` gloss; report Cohen's κ between
coders (target ≥ 0.8; disagreements resolved by a third coder). The symbol set is **exactly**
`NOTATION_SYMBOLS` at the registered release (the ledger in
[comprehension-instruments.md](comprehension-instruments.md) is kept equal to it by CI).

### 4.2 S2 — diagram vs prose (Instrument A)
Crossover: each participant sees two vignettes, one as a PsyUML diagram and one as matched prose,
order and vignette-format pairing counterbalanced (Latin square). Core items as in Instrument A
(A.1, A.2). Distress rating (0–10) before and after each block.

### 4.3 S3 — inter-rater reliability (Instrument B)
Each clinician independently formulates every vignette in PsyUML (after the standard workshop, see
[workshop.md](workshop.md)). Coders score element / transition / loop / exit presence against a
consensus key fixed **before** rating begins. Notation errors are logged separately and do not enter κ.

### 4.4 S4 — multi-school Delphi (Instrument C)
Two to three rounds (cap: 3). Round 1 independent ratings + free text, then anonymised feedback, then
re-rating. Stability rule: stop when < 15% of item ratings change between rounds or at the cap.

### 4.5 S5 — collaborative validity, editability, utility, harm (new)
Clinician and client co-draw the client's formulation in the editor over a normal session. Afterwards,
measured **separately and privately**:
- **Fit to experience** (client): "this picture fits how things are for me", 1–7.
- **Editability** (both): System Usability Scale (SUS).
- **Clinical utility** (clinician): 1–7 on usefulness for this case, plus free text.
- **Sharing-harm probe** (client): distress 0–10 before and after seeing the finished formulation,
  plus "did seeing this make things harder for you?" (yes / somewhat / no). A rise of ≥ 3 points or a
  "yes" counts as a meaningful increase for H5.

### 4.6 S6 — assistive-technology / WCAG audit (new)
Participants complete five tasks with their own screen reader on the editor and on exported SVGs
(find the way out; name the states; add a node; change a label; export). Record task success, time,
and every barrier, mapped to WCAG 2.2 success criteria.

## 5. Analysis plan (fixed before data)

- **S1.** Per symbol × audience: proportion correct with 95% Wilson CI. **Pass** = point estimate ≥ the
  bar (67% general / 85% safety) **and**, for safety symbols, wrong + opposite < 5%. Report every
  symbol, including failures. No pooling across audiences for the pass decision.
- **S2.** Paired difference in core-item correctness (diagram − prose) with a 95% CI (Tango's method
  for paired proportions). Non-inferiority if the lower bound > −δ. Crisis items reported separately.
  Primary analysis per-protocol **and** intention-to-treat; conclusions require both.
- **S3.** Fleiss' κ with 95% bootstrap CI (2,000 resamples, clustered by vignette). Content and notation
  agreement reported separately.
- **S4.** Per item: % endorse-or-endorse-with-caveats per school; the "silent flattening" flags listed
  verbatim. No item is reported as endorsed on the pooled panel alone.
- **S5.** Harm-probe rate with exact (Clopper–Pearson) 95% CI; H5 holds if the upper bound < 10%.
  Fit, SUS and utility described with medians and IQRs.
- **S6.** Task success per task with exact CIs; every barrier reported with its WCAG criterion.
- **Missing data:** reported per study; no imputation for primary outcomes. **Multiplicity:** S1 is a
  per-symbol pass/fail gate, not a family-wise claim, so no correction is applied to the gate; any
  pooled claim uses Holm correction.

## 6. Safety rules and stop/revise rules

**Participant safety (all studies).**
- Any participant who reports distress ≥ 7/10, or whose distress rises by ≥ 3 points, is offered an
  immediate break and a debrief with the on-call clinician, and may withdraw without penalty.
- Any disclosure of current risk follows the site's safeguarding procedure, which takes precedence
  over data collection.
- **Study-level stop:** a serious adverse event pauses the study pending ethics-committee review. In
  S5, if the running harm-probe rate exceeds 15% at any of the planned looks (after 20 and 40 dyads),
  the study pauses and the client layer is reviewed before restarting.

**Revise, don't ship (the decision rules).**
- A symbol that fails S1 for any audience is **revised** (participatory redesign with that audience)
  and **re-tested**; it is never relabelled as validated, and the ledger records the failure.
- S2 failing non-inferiority, or crisis items below 95%, is a **design defect**: simplify the diagram
  and re-run S2 — v1.0 does not proceed with a failing chart.
- S3 below κ 0.61 on content: revise the notation or training and re-run; on notation only: fix the
  docs and workshop.
- S4 without consensus for an item: narrow or drop that cross-school claim in the docs before any
  endorsement is stated.
- S5 failing H5: the client layer is revised (wording, what is shown by default, progressive reveal)
  and S5 re-run before any "client-safe" claim.

## 7. What counts as passing (v1.0)

v1.0 is defensible only when **all** of: H1 for every symbol and audience (after any revise loops),
H2, H3, H4, H5, S6 with no blocking WCAG barrier left unfixed, and Tier-A still green — **and** the
results report (§10) is published. Partial passes are reported as partial; they do not move the
version number.

## 8. Ethics / IRB pack

Submit with the registration. Adapt wording to the committee's template and jurisdiction.

**8.1 Consent — key points every information sheet must state**
- This study tests a *drawing notation* (PsyUML), not you. PsyUML is an **unvalidated** research tool;
  it does not diagnose and does not replace professional care.
- What you will see (for S2: a fictional crisis chart), how long it takes, how you are paid, and that
  you can stop at any time without giving a reason and without affecting your care.
- What is recorded, how it is de-identified, who sees it, how long it is kept, and how to withdraw your
  data before the analysis lock.
- Who to contact for support during and after the session, with a local crisis line.

**8.2 Distress protocol.** Pre-session screening (§3 exclusions); distress ratings in session;
thresholds and actions in §6; a debrief script naming real support; a named on-call clinician for every
session that shows crisis material or a client's own formulation.

**8.3 Vulnerable participants (S1 clients, S5).** Recruited through and supported by the treating
clinician; the clinician confirms suitability, is present (S5) or reachable (S1), and the client can
pause or withdraw without any effect on treatment. Clients are never shown another person's real
formulation.

**8.4 Data management.**
- Stimuli: synthetic/composite only, except S5's own formulation.
- S5 formulations are de-identified with `psyuml redact` before leaving the clinical site; raw files
  stay on site.
- Responses are stored pseudonymised; the key is held separately by the PI.
- Retention follows the committee's rule; open data is released de-identified and only with consent
  for sharing.
- **No AI processing** of participant data in any study.

**8.5 Compensation and accessibility.** Pay at the local rate for time. Offer large-print,
high-contrast and screen-reader-friendly materials, and a choice of session length.

## 9. Deviations log

| Date | Study | Change from registration | Reason | Effect on conclusions |
|---|---|---|---|---|
| — | — | *(empty — the protocol is not yet registered)* | — | — |

## 10. Results report (placeholder — to be filled only by the registered studies)

| Study | Registration (DOI / URL) | Ethics approval ref | Status | Result |
|---|---|---|---|---|
| S1 | not yet registered | not yet submitted | not started | — |
| S2 | not yet registered | not yet submitted | not started | — |
| S3 | not yet registered | not yet submitted | not started | — |
| S4 | not yet registered | not yet submitted | not started | — |
| S5 | not yet registered | not yet submitted | not started | — |
| S6 | not yet registered | not yet submitted | not started | — |

When a study reports, its row gets the registration link, the approval reference, and a link to the
published report. The per-symbol ledger in [comprehension-instruments.md](comprehension-instruments.md)
is updated from S1 in the same change. Results are entered **only** from a completed registered study.
