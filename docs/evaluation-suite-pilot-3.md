# Tier-B pilot 3 — blind formulation comprehension on **real rendered images** (simulated, NOT evidence)

> **READ FIRST. Still a SIMULATION, not evidence, not a sample.** It does **not** satisfy the
> Tier-B gate; REQ-EVAL-SUITE / REQ-NOTATION-TESTING stay `in-progress`; the comprehension ledger
> stays `pending` for **real** studies. PsyUML is **unvalidated v0.x** — supports, never replaces,
> care; does not diagnose (§L.2).

The fix [pilot 2](evaluation-suite-pilot-2.md) asked for: instead of describing symbols in text, the
participant agents **open and look at the actual rendered diagram** (a PNG, via the Read tool). This
runs **Instrument A** (formulation comprehension) on real output.

## Method

- **Stimuli:** three example diagrams rendered in the **client layer, in colour** (what a participant
  would see) via the `@psyuml/render` `render()` dispatcher, then rasterised to **PNG** with headless
  Chromium: the **crisis chart** (`decision-nav`, safety-critical), the **State Map** (`state-map`,
  nervous-system ladder), and the **CAT trap loop** (`cat-sdr`, which carries the v0.2 Pattern marks).
- **A PNG removes the answer key for free.** A raster image has no `aria-label`, `<title>`, `<desc>`,
  or text layer — so unlike an SVG, there is nothing to "narrate" the meaning. The agent sees only
  pixels (shapes + the labels drawn *in* the picture), exactly like a person.
- **4 blind participant agents**, varied non-clinical personas (delivery driver, hospitality worker,
  bus driver, hairdresser). Each was told only to `Read` the image and answer from what they see — no
  spec, no glosses, no project context, no other tools. (All four genuinely opened the images — 4–10
  Read calls each.)
- **Scoring:** the author scored free-text answers against the Instrument A criteria.

### Why this is still **not** evidence (new caveat)

Pilot 2's "can't see" limitation is fixed — the agents really perceived the rendered images. But a
**multimodal model's vision is not a human's**: it may read small text and parse a diagram *more*
reliably than a distracted, first-time, or low-graph-literacy person, and it carries no distress
load. So these (strong) results likely run **optimistic** — read them as a near-upper-bound rehearsal,
not a forecast of real comprehension. N=4, not people. Gate unchanged.

## Results (n=4; all blind)

### Crisis chart — **4/4 on every safety item**
First check ("Am I safe right now?"), what to do if not safe ("call for help now / emergency or crisis
line"), **where to find crisis contacts** (the standing bottom banner), **no dead-ends** (4/4 "No"), a
calming step ("cold water / slow breathing" or "move, look around, text someone"), and "not
broken/ill/diagnosis" (4/4 "No"; one quoted "it does not diagnose"). The safety-critical items — C2
(get help), C3 (find contacts), C4 (no dead-ends) — were at ceiling in this tiny sample.

### State Map — **4/4** on states, way-back, and "not broken"
All four read the three bands (Calm and connected / Wired / Foggy) and the way back down (slow
breathing → calm). The trigger was understood by all, but **2/4 said the text was too small to read
the exact word** — the State Map's wide, short aspect rasterises with small labels. **Legibility flag.**

### CAT trap loop — **4/4** understood the loop *and* found the exit
All four described the self-perpetuating pattern (criticised → people-please to avoid criticism → worn
out → shut down → confirms the role) and identified the **way out** ("check facts, ask early (EXIT)" →
"Say what I need", with the Observing-I "spotting the trap"). The client layer correctly hid the
clinician-only `⚖`/`as-if` markers while keeping the dashed "tentative" border, the **TRAP** label, and
the loop.

## The cross-pilot finding (the useful one)

Symbols that **failed as bare glyphs in pilot 2 read correctly in the real diagram here**:

| Symbol | Pilot 2 (bare glyph) | Pilot 3 (in the rendered diagram) |
|---|---|---|
| Diamond ◇ (way-out / resource) | "a decision point" (0/6) | understood as the **way out** (with its "(EXIT)" + "Say what I need" label), 4/4 |
| Dashed exit arrow | "escape / avoidance" (0/6) | the **way out** of the loop, 4/4 |

This is a clean confirmation of the **dual-coding-everywhere** posture: glyphs are weak *alone*, but
the renderer always pairs them with a label + context — and then the picture communicates. It argues
the right place to harden is the **rule that the renderer never drops the word** (already true for the
way-out marker), not necessarily the glyph shapes.

## What to take forward (hypotheses for *real* testing — nothing decided)

1. **Legibility, not just semantics, is a comprehension risk.** The State Map's small rasterised text
   is a concrete, fixable target (min font size / better fit at a fixed width) — and exactly the kind
   of thing a real, lower-acuity participant would struggle with more than a model. Worth a Tier-A
   legibility check + a real-participant readability item.
2. **Keep dual-coding mandatory**, especially for the way-out/safety marker (pilots 2 + 3 agree).
3. The crisis chart's structure (one decision/step, no dead-ends, standing resources banner) read
   well — carry that layout discipline to other client-facing types.

## Status (unchanged)

REQ-EVAL-SUITE / REQ-NOTATION-TESTING remain `in-progress`; the per-symbol ledger stays `pending`. The
real Tier-B run still needs real people seeing real images — but the **blind, real-image, no-inside-view**
setup here (and in pilot 2) is the right harness to reuse for it.
