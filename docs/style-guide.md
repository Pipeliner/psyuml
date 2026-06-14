# PsyUML notation style guide

How to **draw** PsyUML consistently — glyph forms, colour and line semantics, and the
accessibility rules that constrain them. Companion to the field-level
[`format-reference.md`](format-reference.md) and the [`cheatsheets.md`](cheatsheets.md);
the normative source is the [specification](specification/psyuml-v0.1.0.md) §B–§D, §F, §L.2.
The reference renderer (`@psyuml/render`) is the canonical implementation of everything here.

## 1. First principle: meaning never rides on colour alone (§D)

Every visual channel is **redundant with a text or shape channel**, so the diagram survives
greyscale printing, colour-blindness, and screen readers.

- **Monochrome is the default.** Colour is opt-in (`--color`) and only *reinforces* a meaning
  that is already carried by shape, line-style, a label, or a number.
- **Every view emits a text alternative** — `role="img"` + `aria-label` + a `<desc>` that narrates
  the diagram (bands, nodes, links, ways out). Treat the alt text as a first-class deliverable.
- **Labels never clip or overflow** (ADR-0006): the frame fits the content; a long label wraps
  to multiple lines or compresses to fit its box. Keep labels ≤ ~40 chars where you can — the
  validator nudges (`a11y.label-length`) past that.
- **Minimum text size** ~10px; don't rely on hue contrast for legibility.

## 2. The 8 Tier-1 glyphs (§B)

Draw the core small and hand-reproducible. Shape is the primary channel; the colour column is
the *redundant* hue (Okabe–Ito) with its non-colour fallback.

| Element | Shape (hand-drawn) | Stroke | Redundant colour → non-colour fallback |
|---|---|---|---|
| State | rounded rectangle | 2px | neutral grey → label only |
| Agent / Part | circle | 2px (solid border) | blue → solid border |
| Self | circle with a centre dot `◎` | 2px + inner dot | gold → **double ring** |
| Resource / Anchor | diamond | 2px (thick) | green → thick border |
| Intervention | hexagon | 2px | purple → hatched fill |
| Observing-I | small eye (ellipse + pupil) | 2px | — → outline only |
| Context / Role | labelled lane / column | dashed border | — → dashed border + label |
| Phase / arousal band | horizontal stripe | 2px | hue **only as a pattern**, never bare colour |

The **index person** (genogram) gets a **double border**. Tier-2/3 marks (⚑ trigger, △ risk) are
small adornments on a node or edge, never standalone meaning.

## 3. Connector (line) semantics (§C)

Line **style** is the channel; colour is never required to tell links apart.

| Link | Drawn as |
|---|---|
| `sequential` (transition) | solid line, arrowhead |
| `excitatory` / `inhibitory` | solid, arrowhead; the *label* ("triggers" / "hides") carries the sign |
| `reciprocal` | double-headed arrow (mutual) |
| `exit` | **dashed** line + an `(EXIT)` label — always visually distinct as "a way out" |
| `barrier` (dissociative) | heavy line with tick marks; only between parts/states |
| `containment` (protective orbit) | dotted "protects" link |
| `close` / `distant` / `conflict` / `fused` / `cutoff` (genogram) | solid / dashed / zigzag / triple / slashed |
| `transference` | dotted thread |
| `nestedWithin` (origin) | fine-dotted thread ending in a small ring |

Always draw a legend strip; the renderers do (e.g. the genogram and parts legends).

## 4. Encoding clinical properties (redundantly)

- **Epistemic status** — how something is known (`reported` / `observed` / `inferred` /
  `planned` / `symbolic` / `client-believed` / `tradition-claimed`). Carry it on a **redundant,
  collision-checked** channel (a tag and/or a line-style), **never** by a colour alone, and
  **never** let the system "confirm" a `client-believed` / `tradition-claimed` claim as fact.
- **Consolidation** — a forming/liminal element is **dashed**; a consolidated one is **solid**
  (the "dashed→solid" progression you read across versions in a diff).
- **Dominance / intensity** — size, **with a printed number** (e.g. the Schema Mode Map sizes
  circles by dominance and prints the value). Never size-only.
- **Valence** — if shown in colour, pair it with the label's wording; greyscale must still read.
- **Phase / arousal bands** — order top-to-bottom; differentiate with **pattern** (`dots` /
  `diagonal` / `cross-hatch`), not hue.

## 5. Layout conventions

- **Path of hope**: a maintaining-cycle map must show a way out — an `exit`, a Resource, the
  Self, or an Intervention. The validator blocks a hopeless-only client diagram.
- **State Map**: transitions route to the right lane, exits to the **left** lane and dashed.
- **Parts Map**: Self at the centre; protectors orbit; exiles are guarded behind a barrier.
- **Loop / cycle**: arrange on a ring (or hand-place); put the Reinforcing/Balancing badge at
  the centre; name exits *early* (CAT).
- **Timeline**: time left→right; "preferred future" is the structural hope on the right.
- **Two-audience**: keep the clinician layer and the plain-language client layer in sync; the
  client layer is non-pathologising and first-person where natural.

## 6. Ritual, drawn honestly (§F, §L.2)

- A ritual diagram **must** carry an honest **non-medical framing** ("eases subjective anxiety,
  control & meaning — not objective disease; not a medical cure") and a **secular variant**
  (no belief required). The validator enforces both.
- Tag ritual/spiritual elements `symbolic` or `tradition-claimed` — the tool never asserts them
  as clinical fact. Symbolic/ritual modality is **contraindicated under active psychosis**.
- **Cultural sensitivity**: name a tradition's source rather than generic-ising it; don't
  appropriate closed practices; the secular variant exists so no one is required to adopt a
  belief to use the structure.

## 7. Cross-school vocabulary, scoped honestly

The School switch re-labels the **parts-family** vocabulary — IFS / schema /
structural-dissociation / TA — over *one* Parts Map: same structure, new words. **CAT is
deliberately not a swap target** (its unit, the reciprocal *role pair*, is dyadic and doesn't map
onto a single parts slot); CAT, polyvagal, genogram, Malan, Karpman, and ritual are their **own
diagram types**. Re-conceiving a CBT maintenance loop as a CAT reformulation is genuine clinical
**reformulation**, not a vocabulary swap — don't present the two as one model relabelled.

**Provenance tags** record each element's **origin/school** so it isn't silently merged (§G.2).
Surfacing two genuinely *opposed* claims co-present on one element (e.g. IFS innate multiplicity
vs. structural-dissociation's trauma-caused division) — with the renderer showing the conflict —
is the goal; today provenance is a single origin stamp, so treat "preserves the disagreement" as
the intent, not a finished guarantee.
