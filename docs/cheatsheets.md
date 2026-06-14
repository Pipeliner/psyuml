# PsyUML cheat-sheets

Two one-page quick references — one for the **clinician**, one for the **client** — drawn from
the spec (§B notation, §E diagram types, §L.2 ethics) and what the editor actually does. For the
field-level format see [`format-reference.md`](format-reference.md); the normative source is the
[specification](specification/psyuml-v0.1.0.md).

> Unvalidated v0.x — a formulation-support notation, **not** a clinical instrument. It supports,
> never replaces, professional care, and does not diagnose.

---

## Clinician cheat-sheet

### The 8-symbol Tier-1 core (§B)
| Glyph | Element | Means |
|---|---|---|
| `( … )` rounded rect | **State** | a condition the system can be in (mode, autonomic state) |
| `(○ …)` circle | **Agent / Part** | a sub-personality / actor (part, ego-state, ANP/EP) |
| `◎` circle-with-dot | **Self** | the non-pathological centre (IFS Self, Adult, wise mind) |
| `◇` diamond | **Resource / Anchor** | a stabilising support (skill, safe person, value) |
| `⬡` hexagon | **Intervention** | a deliberate change act (technique, skill, rite) |
| `👁` eye | **Observing-I** | a self-reflective stance (CAT observing eye, mentalising) |
| `▭` lane | **Context / Role** | who/what owns an action (system, field, role) |
| `▮▮▮` band | **Phase / arousal band** | an ordered zone (WoT band, van Gennep phase) |

Relation & Process/Transition are **connectors**, not nodes — see the link set below.

### Typed connectors (§C)
`sequential` (→ transition) · `excitatory` / `inhibitory` · `reciprocal` (⇄ mutual / CAT role) ·
`exit` (a way out of a loop, dashed) · `barrier` (dissociative) · `containment` (protective orbit) ·
`transference` · `nestedWithin` (origin) · genogram: `close` · `conflict` · `fused` · `distant` · `cutoff`.

### Which diagram for which job
- **State Map** — autonomic/mode states + transitions (start here).
- **Parts / Agents Map** — IFS-style parts around the Self; protectors *contain* exiles.
- **Schema Mode Map** — modes sized by dominance; Healthy-Adult is the growth target.
- **Relational Field** — genogram / social field / **drama triangle** (TA).
- **Process / Loop** — a maintaining cycle (CBT hot-cross-bun / **CAT SDR**); name an exit early.
- **Timeline** — trajectory toward a preferred future.
- **Intervention Sequence** — ordered steps in actor lanes.
- **Two Triangles** — Malan conflict + person (clinician aid).
- **Crisis / Decision chart**, **Resource / Anchor map**, **Body Map**, **Ritual Structure**.

### Honesty & safety (built into the model)
- Tag every node's **certainty**: `reported` / `observed` / `inferred` (a guess) / `planned` / `symbolic`.
  Mark guesses as guesses; PsyUML asserts **formulation, not diagnosis** (§A.3).
- **Cross-school**: switch School to re-label vocabulary without flattening differences (provenance tags persist).
- The validator (the "Formulation health" panel) blocks export when:
  a client-facing diagram lacks a **disclaimer**; a maintaining-cycle shows **no way out**
  (path-of-hope); a crisis chart lacks **crisis resources** or has a dead-end; a ritual lacks
  honest framing + a secular variant. Setting the **acute-risk / psychosis** flag raises a
  human-review banner (and contraindicates ritual under psychosis).
- Before sharing/exporting off-device, **de-identify** (CLI `psyuml redact`, or the privacy step).

### In the editor
Pick a diagram → add nodes (any kind/stereotype) → **connect them** in the Links panel →
set certainty/labels → fill Diagram details (title/disclaimer/crisis) → toggle the **Client layer**
to check plain language → Snapshot to track change, Compare to see progress → Save / Export SVG.

---

## Client cheat-sheet (plain language)

This is a **map of your situation you and your therapist draw together** — not a test, not a
diagnosis, and not a replacement for support. It's yours: you can rename anything in your own
words, hide a part you're not ready to look at, and change it any time.

**Reading the map**
- **Rounded box** = a state you can be in (e.g. "calm", "foggy").
- **Circle** = a part of you; **◎** = your steady centre ("you at your calmest").
- **Diamond** = something that helps (a person, a skill, a value).
- **Hexagon** = something you *do* to shift things.
- **Arrows** = what tends to follow what. A **dashed arrow** = a **way out**.
- A loop that comes back on itself = a pattern that keeps itself going — and there's always a way out drawn on it.

**Your say**
- Use your **own words** for every label — if a name doesn't fit, change it.
- Not sure about something? Mark it as a **guess**, or **hide** it until later. Nothing is locked in.
- Toggle **plain-language** view any time.

**If things feel unsafe**
- A crisis map always shows who to contact. **If you're in danger now, call your local emergency
  number or a crisis line (use the number for your country).** This tool can't help in a crisis —
  reach a person.

**What it is / isn't**
- It *supports* the work between you and your therapist. It does **not** diagnose you or replace care.
