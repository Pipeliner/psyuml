# Tier-B pilot 2 — blind symbol comprehension (simulated, NOT evidence)

> **READ FIRST. This is a SIMULATION, not evidence, and not a sample.** It does **not** satisfy
> the Tier-B gate; REQ-EVAL-SUITE and REQ-NOTATION-TESTING stay `in-progress`; the per-symbol
> comprehension **ledger** ([comprehension-instruments.md](adoption/comprehension-instruments.md))
> stays `pending` for **real** studies. PsyUML is **unvalidated v0.x**; it supports, never replaces,
> professional care, and does not diagnose (§L.2). Treat this as an *instrument shake-out + a
> where-to-look signal for real testing* — nothing here counts toward v1.0.

A blind dry-run of **Instrument D** (per-symbol comprehension, ISO 9186-style; v0.2 §5) over the
client/picture-facing symbol set (`NOTATION_SYMBOLS`, `@psyuml/profiles`), improving on
[pilot 1](evaluation-suite-pilot.md) by running participants with **no inside-view context**.

## Method

- **6 blind "participant" agents**, fresh, each a different non-clinical persona (stock assistant,
  history student, retired teacher, software engineer, family carer, electrician).
- **No inside-view context** — each agent received **only** a stimulus sheet + the use-context
  ("a therapist and client making a diagram about the client's feelings, parts, relationships").
  Withheld: the spec, the concept glosses (**answer key**), the alt-text/`aria-label`/`<desc>`
  narration, the diagram models, and this project's conversation. They were told: first instinct,
  few words, no tools, "no idea" allowed.
- **Stimulus:** 14 items — the core glyphs, connectors, parts markers, and the v0.2 CAT loop
  marks — presented as the glyph character or a **neutral shape description**. The way-out (`exit`)
  was shown **twice**: glyph-only (a dashed arrow out of a loop) and **dual-coded** (the same +
  the word "EXIT"), to measure the dual-coding lift.
- **Scoring:** the author scored each free-text guess against the concept gloss as
  correct / partial / wrong, holding the answer key the participants never saw. Reference
  thresholds (ISO 9186): **≥67%** general, **≥85%** safety-critical. With N=6, each step is ~17%.

### Why this is **not** evidence (beyond the tiny N)

- **LLM agents cannot see.** They reasoned over my *text descriptions* of shapes — this measures
  word/semantic association, not visual perception. A real test shows a rendered image to a person.
- **My descriptions leak.** Wording like "a diamond" or "a balance scale" carries priors a drawn
  glyph might not (or a human might share — unknown). The "no inside-view" design removes *design*
  knowledge, not this.
- **LLMs over-read** structured prompts (the standing caveat from pilot 1).

So: directional only. A symbol that fails *here* is a strong candidate to test/redesign; a symbol
that passes here is **not** thereby validated.

## Results (n=6; correct / 6)

| # | Symbol (intended meaning) | Correct | Dominant reading | Verdict |
|---|---|---|---|---|
| 1 | `◎` **Self** (calm core) | **6/6** | "core/true self, the centre" | ✅ strong |
| 2 | `○` **a part** (sub-personality) | 2/6 | "another person" / "empty, not filled in" | ✗ weak — ambiguous |
| 3 | `◇` **Resource/anchor** (a support) | **0/6** | "a choice / decision point" (×6) | ✗✗ **fail — confident misread** |
| 4 | `⬡` **Intervention** (a skill/act) | 2/6 | "safe space / protective part / boundary" | ✗ weak |
| 5 | `👁` **Observing-I** (self-watching) | ~3/6 | "feeling **watched**" vs "being aware" | ✗ borderline — valence wrong-leaning |
| 6 | `▭` **Context/role** (lane) | 4/6 | "area of life / role / swim lane" (vs "boundary") | ~ borderline pass |
| 7 | `▮▮▮` **Band/phase** (arousal zone) | ~1/6 | "a **wall / barrier**" | ✗ fail — and collides with #10 |
| 8 | **Exit** glyph-only (way out) | **0/6** | "pulling away / escaping / leaving" | ✗✗ **safety fail (glyph alone)** |
| 9 | **Exit + word "EXIT"** (way out) | **6/6** | "way out / way out when overwhelmed / how they cope" | ✅ pass **only with the word** |
| 10 | `⤬` **Dissociative barrier** (between parts) | 0/6 | "cut-off / broken connection between **people**" | ✗ fail — reads as relational cutoff |
| 11 | `⚖` **Contested origin** (views disagree) | **0/6** | "balance / weighing up" (×6) | ✗✗ **fail — ~opposite** |
| 12 | **Trap** (self-confirming loop) | **6/6** | "going round in circles / repeating pattern" | ✅ strong |
| 13 | **Dilemma** (false-binary fork) | **6/6** | "a choice splitting two ways" | ✅ strong |
| 14 | **Snag** (self-sabotaged success) | 6/6\* | "held back / blocked from moving forward" | ✅ pass (\*self-caused nuance lost) |

## Findings to take into real testing

1. **The way-out symbol is unsafe without its word — strongest, most actionable signal.** The
   dashed-arrow **alone** read as "escape / pull away / avoidance" (0/6 "a way to get help"); **with
   "EXIT"** it read as "way out when overwhelmed / how they cope" (6/6). This *directly vindicates the
   v0.2 §5 dual-coding rule for safety-critical symbols* and argues for a hard rule: **never render the
   way-out marker without its word** (and a real study should test wording — "EXIT" still carried an
   avoidance/escape tinge; "a way to get help" / "way out" may test better).
2. **`◇` for Resource fails on a strong prior:** universally read as a flowchart **decision point**.
   Candidate to redesign (an anchor/shield/handhold pictograph) or always dual-code.
3. **`⚖` for "contested" fails (~opposite):** read as "balance/equilibrium," not "two views
   disagree." Lower stakes (it's a clinician-analytic marker, hidden in the client profile) but a
   clear redesign/relabel candidate.
4. **`▮▮▮` band ↔ `⤬` barrier confusability:** the band read as "wall/barrier," overlapping the
   actual barrier symbol. The Tier-A `auditNotation()` only catches *exact glyph-string* collisions —
   this is **semantic** confusability, which only human matching/discriminability testing surfaces.
5. **Encouraging:** the core **Self** and, notably, the **new v0.2 CAT loop marks** (trap / dilemma /
   snag) read well as plain shapes (loop / fork / blocked-arrow). The parts `○` and intervention `⬡`
   are weak as bare glyphs and likely need their labels (dual-coding) to disambiguate.

## What changes (and what does not)

- **Does not change:** the gate. REQ-EVAL-SUITE / REQ-NOTATION-TESTING stay `in-progress`; the ledger
  Tier-B cells stay `pending`; no symbol is "validated."
- **Could inform** (hypotheses for *real* studies, not decisions): a hard "way-out never glyph-only"
  rule; redesign candidates for `◇`-resource and `⚖`-contested; a band/barrier discriminability item;
  dual-coding by default for `○`/`⬡`/`👁`.
- **Method win to keep:** the **no-inside-view, blind-participant** setup is a better rehearsal than
  pilot 1's role-play; reuse it (with rendered images + real people) for the actual Tier-B run.
