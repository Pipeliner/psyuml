# PsyUML practitioner handbook

A practical guide to *using* PsyUML in clinical work: how to choose a diagram, build each one,
co-create it with a client, and stay inside the ethical guardrails. It complements the other docs
rather than repeating them:

- **[cheatsheets.md](cheatsheets.md)** — one-page quick references (glyphs, connectors, which
  diagram, safety gates). Keep it open while you work.
- **[format-reference.md](format-reference.md)** — every `.psyuml` field, range, and default, plus
  the text DSL.
- **[style-guide.md](style-guide.md)** — how the notation *looks* (glyph forms, colour-redundant
  encoding, cross-school).
- **[extension-guide.md](extension-guide.md)** — adding a school/symbol (§K).
- **[specification/psyuml-v0.1.0.md](specification/psyuml-v0.1.0.md)** — the normative source.

> **Unvalidated v0.x.** PsyUML is a *formulation-support notation*, not a clinical instrument. It
> **supports, never replaces, professional care**, and it does **not diagnose**. The utility
> claims here are design arguments grounded in notation science and the source traditions — not
> trial results. See [§9](#9-against-pseudo-clinical-overreach).

## Contents
1. [Five working principles](#1-five-working-principles)
2. [The two layers: clinician and client](#2-the-two-layers-clinician-and-client)
3. [Choosing a diagram](#3-choosing-a-diagram)
4. [Per-diagram how-tos](#4-per-diagram-how-tos)
5. [Co-creating in session](#5-co-creating-in-session)
6. [Cross-school, honestly](#6-cross-school-honestly)
7. [Safety and ethics in practice](#7-safety-and-ethics-in-practice)
8. [Exercises and self-guided reflection](#8-exercises-and-self-guided-reflection)
9. [Against pseudo-clinical overreach](#9-against-pseudo-clinical-overreach)

---

## 1. Five working principles

Everything below rests on five commitments from the spec's Ethical-Use Statement (§L.2) and its
epistemics (§A.3). They are not decoration — most are enforced by the validator (the editor's
"Formulation health" panel; the CLI `psyuml lint`).

1. **Support, not replace.** A diagram is an aid to the work between clinician and client, never a
   substitute for care. Every client-facing diagram carries a standing disclaimer and crisis
   resources; the validator blocks export without them.
2. **Formulation, not diagnosis.** A map is a *working hypothesis*. Tag each element's standing —
   `reported` (the client said it), `observed` (you saw it), `inferred` (your guess), `planned`,
   `symbolic` — and mark guesses *as* guesses. PsyUML asserts a formulation; it does not diagnose.
3. **Co-created, not imposed.** Draw *with* the client. They keep authorship and the right to
   relabel anything in their own words, hide what they're not ready to look at, and change it later.
4. **Always a path of hope.** A map of only problems can harm. A maintaining loop must show a way
   out; a crisis chart must reach help and never dead-end. The validator enforces both.
5. **Accessible by design.** Colour is *always* redundant with shape and text — never the only
   carrier of meaning — and every diagram is hand-drawable and ships with alt-text.

## 2. The two layers: clinician and client

Every label has a **clinician layer** (precise, technical) and an optional **client layer**
(plain, the client's own words). The same model renders either way — toggle the layer in the
editor, or `--layer client` on the CLI.

- Author the **clinician layer** for your notes and supervision; add the **client layer** in the
  client's language ("revved up", "the part that goes blank") for anything you'll show them.
- Before you share a diagram, switch to the client layer and read it as the client would. If a box
  reads as a verdict rather than a description, rephrase it (principle 2 + non-pathologising
  language, §7).
- Labels are also multilingual (`en`, `fr`, …); the renderer falls back gracefully when a language
  is missing.

## 3. Choosing a diagram

Start from the clinical question, not the picture. The cheat-sheet has the one-liner list; here is
the *why*:

| If you want to map… | Use | Start here because… |
|---|---|---|
| Autonomic / mood states and what moves between them | **State Map** | it's the most general and the easiest to draw in session |
| Internal parts and how they protect each other | **Parts / Agents Map** | it externalises "a part of me" without pathologising |
| Schema modes by how much they dominate | **Mode Map** | dominance sizing shows the work target (Healthy Adult) |
| The relationships around a person | **Relational Field** (genogram / drama triangle) | it uses the standard genogram set clinicians already know |
| A self-maintaining cycle | **Process / Loop** | naming the **exit** early is the therapeutic move |
| A trajectory over time toward a preferred future | **Timeline** | it holds story-so-far and hoped-for direction together |
| The ordered steps of a plan, by who does them | **Intervention Sequence** | lanes make ownership explicit |
| A defended conflict (clinician aid) | **Two Triangles** (Malan) | it's a teaching/formulation tool, not for clients |
| What to do when not OK | **Decision / Crisis chart** | one decision per step, help always one box away |
| What steadies this person | **Resource / Anchor map** | a deliberate counterweight to problem-focus (principle 4) |
| Where distress shows up in the body | **Body Map** | somatic anchoring for trauma/affect work |
| A grief / transition / boundary rite | **Ritual Structure** | only with consent, honest framing, a secular default (§7) |

## 4. Per-diagram how-tos

Each entry: **when** to reach for it, **how** to build it, an **in-session** tip, a **pitfall**,
and a shipped **example** to open in the editor. Notation details are in the
[style guide](style-guide.md); fields are in the [format reference](format-reference.md).

### State Map — `examples/state-map.psyuml`
- **When:** the client moves between recognisable states (calm / anxious / shut down) and you want
  the triggers and the ways back.
- **How:** make three ordered **bands** (ventral/safe, sympathetic/mobilised, dorsal/shutdown);
  drop **states** into bands; connect with **sequential** edges carrying **trigger** flags; add at
  least one **exit** edge to a regulating resource. The ladder is a hierarchy — to leave shutdown
  you pass *up through* mobilisation, so route a dorsal→ventral move through the middle band.
- **In session:** ask "what gets you here?" (triggers) and "what helps you climb?" (exits).
- **Pitfall:** a map with no exit. The validator's `safety.path-of-hope` flags it (an error in the
  client layer). Draw the way out.

### Parts / Agents Map — `examples/parts-map.psyuml`
- **When:** "a part of me wants X, another wants Y." Externalise the parts around the Self.
- **How:** put **◎ Self** at the centre; orbit **protectors** (managers = proactive,
  firefighters = reactive); place **exiles** inside a **containment** orbit; draw a **barrier**
  (double bar) only between parts/states. Type each part with a stereotype.
- **In session:** keep Self non-pathological ("you at your calmest") and ask what each protector is
  *protecting*.
- **Pitfall:** flattening a part claimed by two schools. Tag provenance (e.g. `IFS`, `schema`,
  `SD`); a part claimed by >1 school renders as a **contested origin** (`⚖ A vs B`) instead of
  being merged — see [§6](#6-cross-school-honestly).

### Mode Map — `examples/mode-map.psyuml`
- **When:** schema-therapy work; you want the modes and which one runs the show.
- **How:** add modes as nodes; set `dominance` (0–1) so the renderer sizes them; mark the
  **Healthy Adult** as the growth target.
- **In session:** name the mode that's "driving right now" and the one you're growing.
- **Pitfall:** treating a mode as the whole person. It's a state the person *enters*, not an
  identity.

### Relational Field — `examples/relational-field.psyuml`, `examples/drama-triangle.psyuml`
- **When:** family/social context, or a recurring **drama triangle** (persecutor / rescuer /
  victim).
- **How:** use the genogram set wholesale — square/circle/diamond people, double border = index
  person; tie types `close` / `conflict` / `fused` / `distant` / `cutoff`. For a drama triangle,
  use a relational field with the three roles and a `nestedWithin` link to its origin.
- **In session:** locate the client in the field; ask which ties they'd want to change.
- **Pitfall:** inventing genogram glyphs — PsyUML adopts the standard set; don't compete with it.

### Process / Loop — `examples/process-loop.psyuml`, `examples/cat-sdr.psyuml`
- **When:** a self-maintaining pattern (CBT hot-cross-bun, a CAT reciprocal-role trap).
- **How:** lay the steps in a cycle with **sequential**/**reciprocal** edges; mark a **reinforcing
  (R)** or **balancing (B)** loop; **name an exit early** (a dashed `exit` edge to an alternative
  response). The renderer lays steps in cycle order so only the closing edge spans the ring.
- **In session:** trace the loop in the client's words, then ask "where could we step out?" before
  it feels inevitable.
- **Pitfall:** a loop with no exit (the `safety.path-of-hope` gate again). A CBT loop and a CAT
  reformulation of "the same" problem are *different formulations*, not one relabelled — keep them
  as separate maps.

### Timeline — `examples/timeline.psyuml`
- **When:** narrative-therapy trajectory; story-so-far → preferred future.
- **How:** order events left→right; mark the **preferred future** as the direction of travel; use
  `planned`/`symbolic` status for what hasn't happened yet.
- **In session:** anchor strengths and exceptions on the line, not only the problem story.
- **Pitfall:** a deterministic line. Leave the future open and `planned`.

### Intervention Sequence — `examples/intervention-sequence.psyuml`
- **When:** a therapy roadmap — ordered steps, who does what.
- **How:** put actors in **context lanes**; place **intervention** nodes in order; every
  intervention must attach to something (a floating intervention is flagged
  `wf.intervention-attached`).
- **In session:** make ownership explicit ("this step is yours / mine / ours").
- **Pitfall:** steps with no owner or no attachment.

### Two Triangles — `examples/two-triangles.psyuml`
- **When:** a Malan conflict/person formulation. **Clinician aid — not a client-facing diagram.**
- **How:** the defence/anxiety/hidden-feeling triangle and the other/parent/therapist triangle,
  linked via `transference`.
- **In session:** use it for your own formulation/supervision; don't hand it to the client.
- **Pitfall:** showing it to a client as if it were their self-map.

### Decision / Crisis chart — `examples/decision-nav.psyuml`
- **When:** a client-usable "what to do when not OK" plan; cognitive constriction under distress.
- **How:** one decision per step; an escalation ladder; **crisis resources visible on every
  screen** and on the crisis node itself; a means-restriction step; **no dead-ends**. Keep the
  crisis line region-neutral — point to "your local number" and fill in the client's actual local
  contact (see [§7](#7-safety-and-ethics-in-practice)).
- **In session:** rehearse it; a layperson should navigate it unaided.
- **Pitfall:** a branch that dead-ends (`safety.no-dead-ends`) or a missing crisis contact
  (`safety.acute-risk-resources` / `safety.crisis-localize`). No AI ever handles a crisis.

### Resource / Anchor map — `examples/resource-anchor.psyuml`
- **When:** you need a deliberate counterweight to a problem-saturated picture (principle 4).
- **How:** group anchors under People / Skills / Values / Soothing; a CFT footer ties them to the
  soothing system.
- **In session:** build this *alongside* a problem map, in the same session if you can.
- **Pitfall:** skipping it. A formulation that is all problem and no resource can harm.

### Body Map — `examples/body-map.psyuml`
- **When:** somatic / trauma / affect work — where distress is felt.
- **How:** place sensations on the body with `intensity`; labels sit beside their dots.
- **In session:** track sensation, not interpretation; let the client name it.
- **Pitfall:** over-reading bodily signs as diagnosis.

### Ritual Structure — `examples/ritual.psyuml`
- **When:** a grief / transition / boundary rite, **only** where the client requests or endorses it.
- **How:** model the rite as an intervention with phases; it **must** carry honest non-medical
  **framing** and a **secular variant** (the validator's `ethics.ritual-framing` blocks export
  otherwise). Ritual is a meaning-making / emotion-regulation modality — never imply it cures
  medical disease.
- **In session:** offer the secular variant first; obtain explicit, informed consent; handle
  cultural content respectfully and flag appropriation risks.
- **Pitfall:** ritual under active psychosis is contraindicated (`safety.psychosis-ritual` — a hard
  block until specialist review).

## 5. Co-creating in session

The drawing *is* the intervention (CAT's collaborative ethos; Imber-Black on co-created, not
imposed, ritual). A workable loop:

1. **Start from the client's words.** Capture states/parts/loops in their language first; tidy the
   clinician layer later.
2. **Draw together, out loud.** Narrate each glyph as you add it; let the client correct you. Use
   the client layer on screen.
3. **Mark uncertainty honestly.** Anything you're guessing → `inferred`. The client can see you're
   hypothesising, not pronouncing.
4. **Reveal progressively.** Hide a node (and its edges) the client isn't ready for; bring it back
   when it's safe. The map can stay partial.
5. **Let them relabel and own it.** It's their map; renaming is encouraged.
6. **Snapshot and compare.** Take a snapshot at the end; next time, the diff renders a "what
   changed" progress card — useful for the client and for outcome notes.
7. **De-identify before it leaves the device.** Use the privacy step / `psyuml redact` before any
   off-device share or export (see [§7](#7-safety-and-ethics-in-practice)).

The editor flow: pick a diagram → add nodes → **connect them in the Links panel** (no text DSL
needed) → set certainty/labels → fill Diagram details (title / disclaimer / crisis) → toggle the
client layer → Snapshot / Compare → Save / Export SVG. The same actions exist headless:
`psyuml lint | render | convert | redact | template`.

## 6. Cross-school, honestly

PsyUML is multi-school, but it does **not** claim every model translates into every school. What it
actually does (see [style-guide §7](style-guide.md) and the [extension guide](extension-guide.md)):

- **Vocabulary swap (parts family only).** The **School** switch re-labels one Parts Map across
  IFS / schema / structural-dissociation / TA — same structure, new words. CAT is deliberately
  *not* a swap target (its unit, the reciprocal role pair, is dyadic). Other traditions are their
  own diagram types.
- **Provenance preserves disagreement.** Tag an element's origin school. When one element is
  claimed by **two opposed** schools (e.g. IFS's innate part vs. structural dissociation's
  trauma-made part), it renders as a **contested-origin marker** (`⚖ A vs B`) and the validator
  flags it (`provenance.node-mixed-school`, info) — the claims are *shown*, never merged.
- **Different formulations are different maps.** Re-conceiving a CBT maintenance loop as a CAT
  reformulation is genuine reformulation, not a relabel. Keep them as distinct models.
- **Adding a school** means writing a §K profile and validating it (`psyuml lint-profile`) — see
  the extension guide.

## 7. Safety and ethics in practice

The §L.2 Ethical-Use Statement, operationalised. Most of this is enforced; the rest is on you.

**Enforced by the validator (export gates):**
- **Disclaimer** on any client-facing diagram (`ethics.disclaimer`).
- **Path of hope** — no maintaining loop / state map without a way out (`safety.path-of-hope`).
- **Crisis charts** — crisis resources present (`safety.acute-risk-resources`), no dead-ends
  (`safety.no-dead-ends`).
- **Acute-risk / psychosis flags** raise a human-review banner and halt autonomous formulation
  (`requiresHumanEscalation`); ritual under psychosis is blocked (`safety.psychosis-ritual`).
- **Ritual** needs honest framing + a secular variant (`ethics.ritual-framing`).

**On you (the clinician):**
- **Non-pathologising language.** Plain, agentic, externalising — the problem is the problem, not
  the person. Read the client layer as the client would.
- **A real, local crisis contact.** Defaults are region-neutral on purpose — there is no single
  global number, and a stale/wrong one is a hazard (ADR-0008). Put the client's actual local
  number/line in `crisisResources`; if you flag acute risk and leave it generic, `safety.crisis-
  localize` nudges you.
- **Consent for ritual**, the secular variant offered first, cultural humility, appropriation risks
  named. Never imply a ritual changes objective disease.
- **Privacy.** Keep work on-device; **de-identify before sharing** (`psyuml redact` scrubs names,
  emails, phone-like runs, but never the disclaimer/crisis line). PsyUML egresses no PHI by design.
- **No AI in crises**, and no autonomous AI formulation — assistance halts on a risk flag.

## 8. Exercises and self-guided reflection

> If you are working through these on your own: this is a reflection aid, not therapy, and it
> cannot help in a crisis. **If you're in danger now, call your local emergency number or a crisis
> line (use the number for your country).**

- **Your states.** Draw a three-band State Map of a recent week. Name one trigger that moves you
  down a band and one thing that helps you climb. (Notice you drew an *exit*.)
- **A maintaining loop.** Pick a pattern that keeps itself going. Draw the cycle, then mark one
  realistic place you could step out *before* it feels inevitable.
- **Your anchors.** Build a Resource/Anchor map — People, Skills, Values, Soothing. Keep it next to
  any problem map you make.
- **A part, not a verdict.** Name a "part of you" and what it's trying to protect. Write its label
  in your own kind words.

For teaching, the same prompts work as paired clinician/client-layer exercises; the
[evaluation suite](evaluation-suite.md) describes how comprehension is meant to be tested for real.

## 9. Against pseudo-clinical overreach

PsyUML is a **design specification, v0.x, unvalidated**. To use it honestly:

- It is a **formulation aid**, not an assessment, a diagnosis, or a treatment. Don't present a map
  as a clinical finding.
- Its comprehension and utility claims are **design arguments**, not trial results. Formal
  usability, inter-rater reliability, and multi-school (Delphi) consensus are still owed before any
  clinical v1.0 — see the [evaluation suite](evaluation-suite.md)'s Stage-4 gate.
- **Ritual evidence is bounded:** robust for *subjective* outcomes and meaning, weak-to-absent for
  *objective* disease markers. Frame it that way.
- **Theoretical translations are approximations**, not equivalences — the cross-school mappings
  connect visually similar constructs whose underlying claims genuinely conflict. Provenance
  preserves the conflict; it does not resolve it.
- When in doubt, fall back to principle 1: **support, not replace.** A map that starts to stand in
  for clinical judgement, consent, or care has overreached.
