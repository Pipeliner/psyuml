# PsyUML adoption pack

Materials for *introducing* PsyUML to clinicians and putting it through **supervised pilot use** —
the bridge between the [handbook](../handbook.md) (how to use the notation) and the
[evaluation suite](../evaluation-suite.md) (how it must eventually be validated). It has three
parts:

1. **[workshop.md](workshop.md)** — a runnable introductory workshop + facilitator script: learning
   objectives, a timed agenda, hands-on exercises (a State Map, a maintaining loop with an exit, a
   Resource map), talking points, and a safety/ethics segment. It *teaches from* the handbook and
   cheat-sheets; it does not duplicate them.
2. **[extension-contributor-guide.md](extension-contributor-guide.md)** — the *process* a clinician
   follows to propose a new symbol / stereotype / profile: how to satisfy the four §K rules, draft
   an `ExtensionProfile`, validate it with `psyuml lint-profile`, what evidence/rationale to attach,
   and how to submit. It builds on the [extension guide](../extension-guide.md), which holds the
   mechanics.
3. **[comprehension-instruments.md](comprehension-instruments.md)** — **proposed, unvalidated**
   instruments that operationalize the evaluation suite's **Tier B**: a layperson crisis-chart
   comprehension test, an inter-rater formulation-reliability task, a multi-school (Delphi)
   consensus-round sketch, and a small pilot-study design with go/no-go thresholds tied to the
   Stage-4 gate.

> **Unvalidated v0.x — read this before you run a workshop or a study.** PsyUML is a
> *formulation-support notation*, not a validated clinical instrument. Adoption is for **supervised
> pilot use** only. It **supports, never replaces, professional care**, and does **not diagnose**.
> The instruments in part 3 are **proposed**, not validated — running them does **not** constitute
> evidence, and a workshop is **not** a credential to deploy PsyUML clinically. Everything here is
> bound by the [Ethical-Use Statement](../specification/psyuml-v0.1.0.md) (§L.2): support-not-replace,
> non-pathologising language, co-creation and consent, an offered secular default for any ritual,
> colour never the sole carrier of meaning, and no pseudo-clinical overreach.

## How the three parts fit the bigger picture

- The **workshop** is the on-ramp. It corresponds to the spec's **Stage 1** ("adopt the Tier-1 core
  now — these are formulation aids, not interventions") and prepares clinicians for the **Stage 2**
  supervised pilot.
- The **contributor guide** is the human process wrapped around the §K mechanism (REQ-EXTENSION-MECH):
  it turns "I wish there were a symbol for X" into a validated, reviewable proposal.
- The **comprehension instruments** are the human-subjects half of REQ-EVAL-SUITE's **Tier B** — the
  studies that gate leaving v0.x. The [simulated pilot](../evaluation-suite-pilot.md) was an
  LLM-role-play *dry-run* of these same instruments (explicitly not evidence); the designs here are
  written for **real participants**.

## What this pack is not

- **Not a clinical training programme.** It introduces a notation; clinical competence, ethics, and
  supervision come from your profession, not from this deck.
- **Not evidence.** Completing the instruments yields pilot signal at best until the Tier-B studies
  run with real samples and pre-registered analysis (see [evaluation-suite.md](../evaluation-suite.md)).
- **Not a substitute** for the [handbook](../handbook.md), [cheat-sheets](../cheatsheets.md),
  [style guide](../style-guide.md), [format reference](../format-reference.md), or
  [extension guide](../extension-guide.md) — it points at them.
