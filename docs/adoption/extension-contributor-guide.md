# Proposing a new symbol / stereotype / profile — the clinician's contributor guide

So your tradition has a construct PsyUML doesn't draw yet, and you want to add it. This guide is the
**process** for putting that forward: how to satisfy the four §K rules, draft an `ExtensionProfile`,
validate it locally, gather the rationale/evidence, and submit it for review.

It is **not** the mechanics — those live in the [extension guide](../extension-guide.md) (the
`ExtensionProfile`/`StereotypeDef` shape, `validateProfile`, `roleLabelsFromProfile`, semver,
deprecation, and the worked `CFT_PROFILE`). Read that first, or alongside. This is the wrapper:
*how a clinician turns an idea into a reviewable proposal.*

> **A new symbol is a proposal, not a private hack.** PsyUML's value is a *shared* notation: if
> everyone invents glyphs, semiotic clarity collapses (§J). Extensions are additive and versioned so
> they don't break existing diagrams — and they're bound by the [Ethical-Use Statement](../specification/psyuml-v0.1.0.md)
> (§L.2) like everything else. This is also distinct from the developer `CONTRIBUTING.md` (code/PR
> conventions); this guide is for *notation* contributors who may not write code.

## When to propose an extension (and when not to)

Reach for a §K extension when:

- A construct your tradition uses **specialises** an existing core element but needs its own label,
  glyph, or constrained meaning (e.g. CFT's *compassionate self* as a kind of Self/Agent — the
  shipped worked example).
- An existing diagram type *almost* fits but lacks a stereotype to name a recurring role.

**Don't** propose an extension when:

- The construct is **already expressible** — a free-text label, an existing stereotype, or the
  client layer covers it. Check the [cheat-sheets](../cheatsheets.md) and
  [format reference](../format-reference.md) first.
- You actually need a **whole new diagram type** (a new topology, not a new symbol on an existing
  one). That's a larger change — open a discussion referencing the relevant §E section rather than a
  profile.
- The construct is really a **different formulation** of the same material (e.g. re-conceiving a CBT
  loop as a CAT reciprocal-role trap). Per [handbook §6](../handbook.md#6-cross-school-honestly),
  that's a separate *model*, not a relabel — the vocabulary swap only covers the parts family.

## The proposal workflow at a glance

```
1. Check it isn't already expressible        →  cheat-sheets / format-reference / extension-guide
2. Map it to a §A core element (rule 1)       →  pick the base NodeKind/EdgeKind
3. Draft the ExtensionProfile JSON            →  copy CFT_PROFILE as a template
4. Validate locally                           →  psyuml lint-profile my-profile.json   (fix every rule)
5. Write the rationale + evidence/provenance  →  the proposal template below
6. Submit                                      →  open an issue/PR with profile + rationale
7. Review                                      →  maintainers + (ideally) a multi-school check
8. Accept → ships as a MINOR (additive)        →  semver; deprecation path if ever removed
```

## Step 2 — satisfy the four §K rules

`validateProfile` enforces all four and `psyuml lint-profile` prints the rule name on any failure.
The [extension guide](../extension-guide.md#the-four-rules-for-adding-a-new-school--symbol--diagram-type)
has the authoritative detail; in proposal terms:

1. **Specialise a core element** (`profile.base-not-core`). Name the one §A core element your symbol
   is a *kind of* — a model `NodeKind` (`state · agent · self · resource · intervention · context ·
   temporal`) or an `EdgeKind` connector. If you can't pick one, you may not have a stereotype (you
   may have a new diagram type — see above). A stereotype **adds** constrained meaning and **never
   removes** the base semantics.
2. **Default to Tier 3** (`profile.tier-1-frozen`). School-specific symbols are Tier 3. The Tier-1
   core is **frozen** within a MAJOR version — your proposal may not claim Tier 1.
3. **Provide the full kit** (`profile.compat-incomplete` + shape checks). Every stereotype needs a
   printed `glyph`, a `hand`-drawn form, a non-colour fallback (`nonColor`, §D — because colour is
   never the sole carrier), **≥1 `synonym`**, and a **compatibility verdict for every existing
   diagram type** (`ok` / `n/a` / `caution`). Think through each diagram type honestly — "n/a" is a
   fine, common answer.
4. **Don't collide with a Tier-1 glyph** (`profile.glyph-collision`). Your glyph must be visually
   distinct from the reserved core set `◎ ○ ◇ ⬡ 👁 ▭ ▮ ⤬` (and `⚖`, which marks a contested origin).
   This is the semiotic-clarity check — a reused glyph silently means two things.

`lint-profile` also checks unique ids, warns on a non-semver `version` (`profile.semver`), and
surfaces deprecations (`profile.deprecated`).

## Step 3 — draft the `ExtensionProfile`

Copy the shipped `CFT_PROFILE` (it passes every rule) and edit. The full annotated template is in
the [extension guide](../extension-guide.md#a-worked-example); the skeleton:

```jsonc
{
  "id": "your-profile-id",
  "title": "Your School / Modality",
  "version": "0.1.0",                 // semver; additive profiles ship as a MINOR
  "school": "your-school",
  "stereotypes": [
    {
      "id": "your-stereotype",
      "base": "agent",               // rule 1: a core NodeKind/EdgeKind
      "tier": 3,                      // rule 2: Tier 3
      "glyph": "…",                  // rule 4: distinct from the reserved core glyphs
      "hand": "how to draw it by hand",
      "nonColor": "shape + outline + label (no meaning by colour alone)",   // rule 3 + §D
      "colorToken": "bluishGreen",   // an Okabe–Ito token; colour stays redundant
      "synonyms": ["primary term", "another name"],                          // rule 3: ≥1
      "compat": { "state-map": "ok", "parts-map": "ok", "relational-field": "n/a", "...": "..." }
    }
  ],
  "translations": [{ "concept": "Self", "terms": { "your-school": "your term" } }]
}
```

`roleLabelsFromProfile(profile)` turns this into the renderer's `roleLabels` map (stereotype id →
first synonym), so a model tagged with your stereotypes renders in your vocabulary.

## Step 4 — validate locally

```sh
psyuml lint-profile my-profile.json      # exits non-zero on any error; prints the rule name on failure
```

Fix everything until it's clean. If you can't run the CLI, the maintainers will run it on your
submission — but a clean local run makes review faster and shows you've done the §K homework. (Build
the CLI with `pnpm run build:cli`; see the [README](../../README.md).)

## Step 5 — the rationale + evidence the proposal must carry

A passing lint means the symbol is *well-formed*. Review also asks whether it *should exist*. Attach:

- **Construct & source tradition.** What is it, in which school, with a citation or canonical source.
  Be precise about provenance — PsyUML preserves opposed claims, it doesn't merge them
  ([handbook §6](../handbook.md#6-cross-school-honestly)).
- **Why existing notation is insufficient.** Show you checked (step 1). What can't be said today?
- **The base-element justification (rule 1).** Why *this* core element is the right parent, and what
  constrained meaning the stereotype adds without removing base semantics.
- **A worked example.** A small `.psyuml` (or DSL) diagram using the new stereotype, ideally with a
  rendered SVG, so reviewers see it in context.
- **Compatibility reasoning (rule 3).** A line per diagram type justifying each `ok`/`n/a`/`caution`
  verdict — not just the matrix, the *why*.
- **Ethics & safety check (§L.2).** Confirm: colour stays redundant with shape/text; if the symbol is
  ritual/spiritual, a **secular variant** is offered and no medical-curative claim is smuggled into
  the glyph; the symbol doesn't pathologise the person; nothing implies diagnosis.
- **Evidence honesty.** State the evidential status plainly. Most extensions are **design proposals
  grounded in a tradition**, *not* validated instruments — say so. Don't claim clinical efficacy for
  a glyph. (Comprehension/utility of new symbols would itself be a Tier-B question — see the
  [comprehension instruments](comprehension-instruments.md) and the
  [evaluation suite](../evaluation-suite.md).)

## Step 6 — submit

Open an issue or PR (per the repository's `CONTRIBUTING.md` for the mechanics) containing:

1. the `ExtensionProfile` JSON,
2. a clean `psyuml lint-profile` result (paste it, or note that it lints),
3. the worked example diagram (+ SVG if you can),
4. the rationale/evidence/ethics write-up from step 5, using the template below.

Label it as a **notation extension** so it's routed to the right reviewers (not the code queue).

## Step 7 — what review looks for

- **§K compliance** — the four rules (lint must pass).
- **Semiotic clarity** — the glyph reads distinctly; hand-drawn form is unambiguous (§J).
- **Honest provenance** — the source tradition is named; opposed claims are preserved, not merged.
- **Ethics (§L.2)** — colour-redundant, secular variant for ritual content, non-pathologising, no
  diagnostic/curative overreach.
- **Multi-school sanity** — ideally a practitioner from *another* tradition sanity-checks that the
  symbol doesn't quietly overwrite their construct. (This is the small-scale cousin of the Delphi
  consensus round in the [comprehension instruments](comprehension-instruments.md).)

## Step 8 — acceptance, semver, and deprecation

- An accepted additive profile/stereotype ships as a **MINOR** version bump — backward-compatible, no
  existing diagram breaks (§K semver; the [extension guide](../extension-guide.md#versioning--deprecation-semver)
  has the rules). A PATCH is a clarification/typo; a MAJOR (a core glyph/semantics change) is rare and
  separate.
- If a symbol is ever removed, it's marked **deprecated** (with a `since` and a migration `note`) for
  one full MINOR cycle and keeps rendering with the note — no silent breakage.

## Proposal template (copy into your issue/PR)

```md
### Extension proposal: <symbol / stereotype name>

**Profile id / school:** <id> / <school>
**Construct & source tradition:** <what it is; school; citation/source>
**Base core element (rule 1):** <state|agent|self|resource|intervention|context|temporal | edgekind>
  — and what constrained meaning the stereotype adds (without removing base semantics).
**Why existing notation is insufficient:** <what can't be said today; what you checked (step 1)>
**Glyph / hand form / non-colour fallback (rules 3–4):** <glyph> · <hand> · <nonColor> — distinct
  from the reserved core glyphs.
**Synonyms (≥1):** <...>
**Compatibility verdict per diagram type (rule 3), with reasons:**
  - state-map: ok|n/a|caution — <why>
  - parts-map: ... (one line per diagram type)
**Worked example:** <attach .psyuml/DSL + SVG if possible>
**lint-profile result:** <paste output, or "lints clean">
**Ethics & safety (§L.2):** colour redundant ✔ · secular variant offered (if ritual) ✔/n/a ·
  non-pathologising ✔ · no diagnostic/curative claim ✔
**Evidence honesty:** <state evidential status — typically "design proposal grounded in <tradition>,
  not a validated instrument">
```
