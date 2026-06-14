# Introductory workshop + facilitator script

A runnable half-day (≈3 h) workshop to introduce PsyUML to clinicians, plus the facilitator's
talking points and timings. It **teaches from** the [handbook](../handbook.md) and
[cheat-sheets](../cheatsheets.md) and uses the shipped [`examples/`](../../examples/) — it does not
re-explain the notation those docs already cover.

> **Frame this honestly, out loud, at the start and the end.** PsyUML is **unvalidated v0.x**, a
> *formulation-support notation*, not a clinical instrument. This workshop qualifies no one to
> "deploy" it; it introduces a way of *drawing formulations together* for **supervised pilot use**.
> It **supports, never replaces, professional care**, and **does not diagnose** (§L.2).

## Who it's for, and prerequisites

- **Audience:** practising clinicians / trainees who already do case formulation in some tradition
  (CBT, IFS, schema, CAT, systemic, psychodynamic, narrative, …). No software background needed.
- **Group size:** 6–16 works best (pairs for exercises, two facilitators above ~12).
- **Bring/prepare:** the [cheat-sheets](../cheatsheets.md) printed (one clinician sheet each); paper
  + pens (PsyUML is hand-drawable by design — start on paper, not screens); optionally the web
  editor (`pnpm run dev`) on a shared screen for the live-demo segments; the shipped examples open
  in the editor or printed (State Map, Process/Loop, Resource/Anchor, Decision/Crisis chart).
- **Facilitator prerequisites:** be fluent in the handbook's [five working principles](../handbook.md#1-five-working-principles)
  and the [safety/ethics section](../handbook.md#7-safety-and-ethics-in-practice); be able to name
  the validator gates (path-of-hope, disclaimer, crisis-resources, no-dead-ends, ritual framing).

## Learning objectives

By the end, a participant can:

1. **Explain what PsyUML is and isn't** — a small, hand-drawable, school-agnostic *notation* for
   case formulation; a working hypothesis, not a diagnosis; a support, not a replacement (§A.3, §L.2).
2. **Read** a client-layer State Map, Process/Loop, Resource map, and Crisis chart and say what each
   claims about the person.
3. **Build, by hand, on paper**: a three-band State Map with at least one **exit**; a maintaining
   **loop** that names a **way out**; a **Resource/Anchor** map as a deliberate counterweight.
4. **Apply the five working principles** in the act of drawing — co-create from the client's words,
   mark uncertainty as uncertainty, reveal progressively, keep a path of hope, keep colour redundant.
5. **State the safety gates and their own duties** — what the validator blocks (disclaimer,
   path-of-hope, crisis resources, no dead-ends, ritual framing) and what is on the clinician (a
   real local crisis contact, non-pathologising language, consent, de-identification, no AI in
   crises).
6. **Locate the honest limits** — PsyUML is unvalidated; cross-school translation is a
   parts-family vocabulary swap, not equivalence; what would still need to be proven before a v1.0
   (the [evaluation suite](../evaluation-suite.md) Stage-4 gate).

> A non-objective: this workshop does **not** teach clinical formulation skill, diagnosis, or any
> specific therapy. It teaches a notation for formulations a clinician already knows how to make.

## Agenda at a glance (≈3 h, including a 10-min break)

| # | Segment | Time | Mode |
|---|---|---|---|
| 0 | Welcome + honest framing | 10 min | facilitator |
| 1 | Why a notation? the formulation gap | 15 min | facilitator + discussion |
| 2 | The core: 8 glyphs, typed links, two layers | 25 min | demo + cheat-sheet |
| 3 | **Exercise A — State Map (with an exit)** | 30 min | pairs, on paper |
| — | Break | 10 min | — |
| 4 | The therapeutic move: loops + the path of hope | 15 min | demo |
| 5 | **Exercise B — a maintaining loop with a way out** | 25 min | pairs, on paper |
| 6 | Counterweight: the Resource/Anchor map | 10 min | demo |
| 7 | **Exercise C — Resource/Anchor map** | 15 min | pairs, on paper |
| 8 | **Safety & ethics segment** (crisis chart + gates) | 25 min | facilitator + walkthrough |
| 9 | Cross-school honesty + what's still unproven | 10 min | facilitator |
| 10 | Close: supervised-pilot next steps + feedback | 10 min | facilitator |

Total ≈ 3 h 0 min. A **90-minute taster** = segments 0–3 + 8 (framing, core, one State-Map
exercise, safety). A **full-day** version adds Parts Map, Decision-chart build, and the
[contributor guide](extension-contributor-guide.md) walkthrough as afternoon segments.

---

## Segment scripts (facilitator talking points)

Each segment lists **goal**, **say** (talking points — paraphrase, don't read aloud), **show**, and
**facilitate**. Keep your own copy of the [handbook](../handbook.md) open; section links point at the
canonical explanation so you teach one consistent story.

### Segment 0 — Welcome + honest framing (10 min)

- **Goal:** set expectations and the ethical frame before anything else.
- **Say:**
  - "PsyUML is a *notation* for case formulation — like staff notation for music or UML for
    software. It is **unvalidated, v0.x**. Today is an introduction for *supervised pilot* use."
  - "Three things it never does: it does not **diagnose**, it does not **replace** care, and it does
    not make decisions for you. It supports the work *between* you and a client (§L.2)."
  - "It's deliberately small — eight core symbols — and **hand-drawable**. We'll mostly use paper."
- **Show:** the standing disclaimer line every client diagram carries (point to it on the
  [cheat-sheet](../cheatsheets.md)).
- **Facilitate:** quick round — "what do you use now to formulate?" Surface the variety; PsyUML aims
  to sit *under* all of those, not replace anyone's model.

### Segment 1 — Why a notation? the formulation gap (15 min)

- **Goal:** motivate the tool with the documented gap, honestly.
- **Say:**
  - "In one audit of 150 psychiatric assessment letters, **94% contained no case formulation at
    all** (Abbas et al., *Academic Psychiatry* 2013). A shareable, plain-language formulation you can
    sketch in two minutes is the target."
  - "Honesty note: that figure has a [documented variant](../specification/psyuml-v0.1.0.md) (an
    earlier unpublished version of the dataset is cited as 84% absent). Both point to the same gap;
    94% is the peer-reviewed number. We don't oversell."
  - "A notation buys you: a *shared* picture the client co-owns; a way to mark what's a guess vs.
    observed; and a built-in safety net (a map of only problems can harm — there must be a way out)."
- **Facilitate:** ask for a recent formulation that was hard to *share* (with a client, a supervisor,
  a team). That sharing problem is the one PsyUML targets.

### Segment 2 — The core: 8 glyphs, typed links, two layers (25 min)

- **Goal:** teach the minimum to start drawing — from the cheat-sheet, not from scratch.
- **Say / Show (use the [clinician cheat-sheet](../cheatsheets.md)):**
  - The **8 Tier-1 glyphs** (State, Agent/Part, Self ◎, Resource ◇, Intervention ⬡, Observing-I 👁,
    Context/lane ▭, Phase/band ▮). "Relation and transition are **links**, not boxes."
  - The **typed connectors** — especially `sequential`, `exit` (a dashed *way out*), `reciprocal`,
    `containment`. "Edges are *typed* — the line means something."
  - The **two layers**: a precise **clinician** label and a plain, the-client's-words **client**
    label over the *same* model ([handbook §2](../handbook.md#2-the-two-layers-clinician-and-client)).
    "Before you ever show a diagram, read it in the client layer as the client would."
  - **Epistemic status** — every element can be tagged `reported` / `observed` / `inferred` (a
    guess) / `planned` / `symbolic`. "Mark guesses as guesses. That's the formulation-not-diagnosis
    move (§A.3)."
- **Show:** open `examples/state-map.psyuml` (editor or print). Toggle the client layer live if you
  have the editor up. Point out colour is **redundant** with shape + text (§D) — it prints in mono.
- **Facilitate:** hand out the cheat-sheets now; participants keep them for the exercises.

### Segment 3 — Exercise A: State Map with an exit (30 min)

- **Goal:** first hands-on build; internalise bands + transitions + a **way out**.
- **Setup:** pairs. **On paper.** Use the handbook's
  [State Map how-to](../handbook.md#4-per-diagram-how-tos) as the recipe.
- **Brief (read to the room):**
  - "Draw a **three-band** State Map of *your own* recent week (use yourself, not a client — this is
    practice, and it keeps it ethical and low-stakes). Bands top-to-bottom: **safe/settled →
    mobilised/revved → shutdown/flat**."
  - "Drop two or three **states** into bands. Connect them with **arrows** and label what *triggers*
    each move."
  - "Now the key step: draw at least one **exit** — a dashed arrow to something that helps you climb
    back up. To leave the bottom band you pass *up through* the middle one."
  - "Add one line of plain-language **client-layer** wording to one state, as if explaining it to
    someone with no training."
- **Facilitate / circulate. Watch for the teachable moments:**
  - A map with **no exit** → "this is exactly what the validator's `safety.path-of-hope` lint
    blocks in the client layer. Where's the way out?" ([handbook §7](../handbook.md#7-safety-and-ethics-in-practice)).
  - A label that reads as a **verdict** ("I'm broken") → coach the non-pathologising rephrase
    ("the part that goes flat").
  - **Colour used alone** → "what carries the meaning if this is photocopied in black and white?"
- **Debrief (5 min):** two pairs share. Name what they noticed about drawing an *exit* deliberately.

### Break (10 min)

### Segment 4 — The therapeutic move: loops + the path of hope (15 min)

- **Goal:** show that *naming the exit* is the therapeutic act, not decoration.
- **Say / Show:** open `examples/process-loop.psyuml`.
  - "A maintaining cycle (a CBT hot-cross-bun, a CAT reciprocal-role trap) keeps itself going. The
    move is to **name a way out early — before it feels inevitable**
    ([handbook Process/Loop](../handbook.md#4-per-diagram-how-tos))."
  - "The renderer lays the steps in **cycle order** so only the closing edge spans the ring — that
    was a real legibility fix from the [pilot](../evaluation-suite-pilot.md). Tooling serves
    readability."
  - "`loop: R` (reinforcing / self-amplifying) vs `B` (balancing / self-correcting) — a badge in the
    centre."
- **Honesty aside:** "A CBT loop and a CAT *reformulation* of the same problem are **different
  formulations**, not one relabelled. PsyUML keeps them as separate maps — more on that in
  segment 9."

### Segment 5 — Exercise B: a maintaining loop with a way out (25 min)

- **Goal:** build a self-maintaining cycle and a realistic exit.
- **Setup:** same pairs, **on paper**.
- **Brief:**
  - "Pick a small, everyday self-maintaining pattern — the kind you'd be comfortable sharing (e.g.
    *procrastinate → guilt → avoid more → more guilt*). Not a clinical disclosure."
  - "Draw the steps in a **ring** with arrows. Mark it **R** (it feeds itself) or **B**."
  - "Now mark **one realistic exit** — a dashed `exit` arrow to an alternative response you could
    actually take *before* the loop closes."
- **Facilitate:** the common error is a loop with **no exit** — return to the path-of-hope point.
  The second is an *unrealistic* exit ("just stop") — coach toward a small, concrete alternative
  response (the CAT "exit" idea).
- **Debrief (3 min):** "where on the loop is it easiest to step out, and why earlier beats later?"

### Segment 6 — Counterweight: the Resource/Anchor map (10 min)

- **Goal:** make resource-mapping a habit, not an afterthought (principle 4).
- **Say / Show:** open `examples/resource-anchor.psyuml`. "Anchors group under **People / Skills /
  Values / Soothing**. A formulation that is all problem and no resource can harm — build this
  *alongside* a problem map, ideally the same session ([handbook Resource map](../handbook.md#4-per-diagram-how-tos))."

### Segment 7 — Exercise C: Resource/Anchor map (15 min)

- **Goal:** quick, affirming build to balance the loop exercise.
- **Brief:** "For the same person you used in Exercise A (yourself), map your anchors under People /
  Skills / Values / Soothing — at least one in each. Use your own words."
- **Facilitate:** keep it brief and positive; note how it *feels* different to draw than the loop.
  That contrast is the clinical point.

### Segment 8 — Safety & ethics segment (25 min)

- **Goal:** the non-negotiable core. What's enforced, what's on the clinician, and why.
- **Say / Show — the Crisis/Decision chart:** open `examples/decision-nav.psyuml`.
  - "Designed for **cognitive constriction under distress**: **one decision per step**, an escalation
    ladder, **crisis resources visible on every screen *and* on the crisis node itself**, a
    means-restriction step, and **no dead-ends** — every path reaches a person
    ([handbook Decision/Crisis chart](../handbook.md#4-per-diagram-how-tos))."
  - "The crisis line is **region-neutral by design** — it points to 'your local number'. We do
    **not** bake in per-country numbers; a stale/wrong crisis number is a hazard (ADR-0008). **You**
    fill in the client's *actual* local contact."
- **Walk the gates the validator enforces** (the editor's "Formulation health" panel; CLI
  `psyuml lint`) — see [handbook §7](../handbook.md#7-safety-and-ethics-in-practice):
  - **Disclaimer** on any client-facing diagram (`ethics.disclaimer`).
  - **Path of hope** — no hopeless-only loop/state map (`safety.path-of-hope`).
  - **Crisis resources present** (`safety.acute-risk-resources`) and **no dead-ends**
    (`safety.no-dead-ends`).
  - **Acute-risk / psychosis flags** → human-review banner + halt autonomous formulation
    (`requiresHumanEscalation`); **ritual under psychosis is blocked** (`safety.psychosis-ritual`).
  - **Ritual** needs honest non-medical framing **and** a secular variant (`ethics.ritual-framing`),
    offered first; never imply a ritual cures medical disease (§L.2-r3).
- **What's on you, the clinician (say plainly):** a **real local crisis contact**;
  **non-pathologising, agentic language**; **consent** and co-authorship (the client can relabel,
  hide, own it); **de-identify before anything leaves the device** (`psyuml redact`); and **no AI in
  a crisis** — assistance halts on a risk flag.
- **Facilitate:** show one deliberately **broken** client diagram (no disclaimer, no exit) and let
  the room call out which gates fire. Then fix it live. The point: the tool makes unsafe artifacts
  *hard to produce by accident* — but judgement is still yours.

### Segment 9 — Cross-school honesty + what's still unproven (10 min)

- **Goal:** inoculate against overclaiming.
- **Say (from [handbook §6](../handbook.md#6-cross-school-honestly) and
  [style-guide §7](../style-guide.md)):**
  - "The 'cross-school' claim is **bounded**: the **School switch** re-labels a Parts Map's
    *vocabulary* across IFS / schema / structural-dissociation / TA — same structure, new words.
    **CAT is deliberately excluded** (its unit, the reciprocal-role pair, is dyadic). Other
    traditions are their **own diagram types**."
  - "When one element is claimed by **two opposed** schools, it renders as a **contested-origin
    marker** (`⚖ A vs B`) and the validator flags it — the claims are **shown, never merged**."
  - "Translations are **approximations, not equivalences**. Provenance preserves the disagreement; it
    does not resolve it."
- **Say (the v1.0 gate):** "What's still **unproven**: real **layperson comprehension**,
  **inter-rater reliability**, **multi-school endorsement**, and formal safety/privacy/accessibility
  audits. Those are the [evaluation suite](../evaluation-suite.md) Stage-4 gate. Until they pass,
  PsyUML stays v0.x." If your group will help run them, point at the
  [comprehension instruments](comprehension-instruments.md).

### Segment 10 — Close: supervised-pilot next steps + feedback (10 min)

- **Goal:** convert interest into responsible next steps, and collect signal.
- **Say:**
  - "If you want to try this with clients, do it as **Stage 2 supervised pilot use**: low-risk Tier-1
    diagrams (State Map, Resource map, Crisis chart drawn *with* the client), in supervision, with
    the safety gates respected."
  - "Want a symbol your tradition needs that isn't here? That's a **proposal**, not a private
    hack — the [contributor guide](extension-contributor-guide.md) shows how to draft and validate
    one."
  - "Help us reach v1.0 honestly: the [comprehension instruments](comprehension-instruments.md) are
    how comprehension/reliability/consensus are *meant* to be tested."
- **Facilitate — collect the post-workshop feedback** (below). Make explicit it is workshop feedback,
  **not** Tier-B evidence.

---

## Facilitator pre-flight checklist

- [ ] Cheat-sheets printed (one clinician sheet per participant); paper + pens for everyone.
- [ ] Examples ready (editor running *or* printed): `state-map`, `process-loop`, `resource-anchor`,
      `decision-nav`.
- [ ] One **deliberately broken** client diagram prepared for the safety segment (no disclaimer, no
      exit) to demo the gates.
- [ ] You can name each validator gate and what triggers it (handbook §7).
- [ ] Honest-framing lines (Segment 0/9) rehearsed: unvalidated v0.x, supervised pilot, not a
      credential, not evidence.
- [ ] A real local crisis contact for *your* region written on the board for the safety segment, as
      a worked example of filling in `crisisResources`.

## Post-workshop feedback form (not Tier-B evidence)

Hand out at the close. This is **facilitation feedback** to improve the workshop — it is **not** a
comprehension study and does **not** count toward the v1.0 gate (for that, see the
[comprehension instruments](comprehension-instruments.md)).

1. I can explain what PsyUML is and is not. (1 strongly disagree – 5 strongly agree)
2. I could draw a State Map with an exit by hand. (1–5)
3. I could draw a maintaining loop and name a realistic way out. (1–5)
4. I can state at least three safety gates / clinician duties. (1–5)
5. I understood the *limits* — that it's unvalidated and translation isn't equivalence. (1–5)
6. One thing that was confusing: ______
7. One symbol or diagram type my tradition needs that I didn't see: ______ (→ a possible
   [extension proposal](extension-contributor-guide.md))
8. Would you try PsyUML in **supervised** pilot use? (yes / not yet / no) — why?

## Slide / deck outline (build your own from this)

This pack is text-first on purpose (versionable, accessible). To make a deck, one slide per beat:

1. Title + the standing "unvalidated v0.x — supports, never replaces" disclaimer.
2. The formulation gap (the Abbas 94%, with the honesty caveat).
3. The 8 glyphs (from the cheat-sheet) — one slide, big glyphs.
4. The typed links + the dashed **exit**.
5. The two layers (clinician vs client) — same model, two readings.
6. Epistemic status — guesses marked as guesses.
7. Exercise A prompt (State Map).
8. Loops + the path of hope (a loop with its exit highlighted).
9. Exercise B prompt (loop with a way out).
10. The Resource/Anchor map + Exercise C prompt.
11. The Crisis chart — one-decision-per-step, no dead-ends, region-neutral line.
12. The safety gates (the validator) + clinician duties — one slide each side.
13. Cross-school, honestly — vocabulary swap, contested origins, not equivalence.
14. What's still unproven — the Stage-4 gate.
15. Next steps — supervised pilot, propose a symbol, help validate. Close on the disclaimer again.

Keep every slide colour-redundant (shape + text), large type, and high-contrast — practise what the
notation preaches (§D).
