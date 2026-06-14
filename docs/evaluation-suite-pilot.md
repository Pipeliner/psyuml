# Tier-B pilot — simulated, not evidence

A **dry-run** of the [evaluation suite](evaluation-suite.md)'s Tier-B instruments, run with
**LLM role-play subagents** standing in for human participants. Its purpose is to rehearse the
instruments and catch problems early — **not** to produce Tier-B evidence. LLM stand-ins are not
laypeople or clinicians; nothing here counts toward the v1.0 gate, which still requires real
people. Read it as a usability pre-test that happened to surface real defects.

## Method
Five role-played agents, each seeing only what a participant would:
- **Comprehension ×2** — "regular person, no training" reads a *client-layer* SVG (visual only;
  told to ignore the `<desc>`/aria narration so it tests the picture, not the alt-text).
- **Inter-rater ×2** — two "therapists" independently formulate the **same** vignette as a State
  Map after reading only the cheat-sheet + format-reference.
- **Multi-school ×1** — a "CAT practitioner" stress-tests the cross-school claim against the
  style guide, the profiles translation table, and the CBT/CAT examples.

## What it found

### Comprehension — encouraging, with a flow nit
- **Crisis chart: 5/5.** The layperson traced every branch and **quoted the crisis line exactly**
  ("…call your local emergency number or a crisis line (e.g. 988 in the US)"). Nit: the unsafe
  branch's "Call for help now" box doesn't itself repeat the number — you must spot the bottom
  resources box — and 988 is US-only.
- **Process loop: 3/5.** Got the gist *and the exit* clearly, but found the **arrow direction /
  sequence muddy** (reciprocal double-arrows + the long diagonal loop edge) — corroborating the
  earlier build-a-diagram agents' loop-legibility note.

### Inter-rater — high content concordance, low syntax reproducibility
- Both therapists produced **near-identical formulations**: baseline → "I've failed" + body alarm
  → avoid inbox → guilt/further-behind → "I'm failing" (marked inferred) → **R loop**; exit via
  walk + text-a-friend → re-open. Same states, same loop, same exit — good inter-rater agreement
  on *content*.
- But **both invented a brace/object DSL** (`state x { band: … }`) instead of PsyUML's actual
  line-oriented grammar (`node x state band=… label="…"`), despite reading the format reference.
  A real **learnability gap**: the grammar tables weren't reproducible without a full worked example.

### Multi-school — the headline defect (real overclaim)
The CAT specialist found that the cross-school *claim* oversells the implementation:
- The shipped CBT (`process-loop`) and CAT (`cat-sdr`) examples are **two distinct models**
  (disjoint node ids, different topology), **not one model relabelled**. Re-conceiving a monadic
  CBT loop as a dyadic CAT reciprocal-role trap is genuine **reformulation**, not a vocabulary swap.
- The actual swap mechanism (`roleLabels`/`TRANSLATIONS`) covers only the **parts family**
  (IFS/schema/structural-dissociation/TA); **CAT is correctly excluded** (reciprocal roles are
  dyadic) — which is the most honest thing in the code, but means the table contributes nothing to
  the CBT↔CAT pairing the framing implies.
- **Provenance** as shipped is a uniform per-node `school:…` origin stamp, not two *opposed*
  claims co-present on one element with the renderer surfacing the conflict. The "preserves
  disagreement" promise is aspirational, not demonstrated.
- Verdict: **endorse-with-caveats for teaching** (the SDR is a faithful CAT object; the CBT/CAT
  pair is a useful *contrast*), **object to the "translation" framing**.

## Actions taken (this commit)
- **Scoped the cross-school claim honestly** in the README, `style-guide.md` §7, and
  `REQ-CROSS-SCHOOL`: the School switch re-labels the **parts-family** vocabulary over one model;
  other traditions are their own diagram types; a CBT loop vs a CAT reformulation are different
  formulations; provenance records *origin* (co-present opposed-claim surfacing is future work).
- **Added a full worked DSL example** to `format-reference.md` so the notation is reproducible.
**Follow-ups since done (a second commit):**
- The crisis line now renders **on the crisis node** (wrapped), not only in the bottom banner —
  the layperson's "the box doesn't give a number" nit.
- The Process/Loop now lays nodes out in **cycle order** so steps are adjacent and edges stop
  crossing the middle (only the closing edge spans) — the "tangled / direction muddy" nit.
- `validate` now **surfaces opposed origin-claims at the node** (`provenance.node-mixed-school`,
  info) — a step toward the CAT critique (a single element claimed by >1 school is flagged, not
  silently merged).

**Still open:** localize the crisis line beyond a US example; render multiple co-present
provenance claims visibly (validate flags them; the renderers don't yet show two on one node).

## Caveats (why this isn't evidence)
LLM stand-ins over-read structured text, don't carry real comprehension load or clinical
judgement, and can't be a sample. The comprehension test is also text-mediated (an agent parses
SVG markup, not a rendered raster). Treat all of the above as **hypotheses + usability signals**,
not findings — the Tier-B studies in `evaluation-suite.md` still need real participants.
