# Extending PsyUML — profiles & stereotypes (§K)

PsyUML grows **without breaking existing diagrams** through a UML-style *profile* mechanism
(spec §K). A **profile** is a named bundle of extensions for a school or modality (a "CFT
profile," a "Heathen-ritual profile"); a **stereotype** is a `«name»` applied to a base element
that *adds* constrained meaning and never removes the base semantics.

This guide is the practical companion to §K. The mechanism is implemented and **validated** in
[`@psyuml/profiles`](../packages/profiles/index.ts) (`ExtensionProfile`, `validateProfile`,
`roleLabelsFromProfile`, the worked `CFT_PROFILE`), and you can lint a profile from the CLI:

```
psyuml lint-profile my-profile.json
```

## The four rules for adding a new school / symbol / diagram type

`validateProfile` enforces each of these; `lint-profile` prints the rule name on any failure.

1. **Specialize a core element** (`profile.base-not-core`). Every new symbol MUST map to one
   §A core element — a model `NodeKind` (`state`, `agent`, `self`, `resource`, `intervention`,
   `context`, `temporal`) or `EdgeKind` (the connectors). A stereotype is a *constraint on* a base
   element, not a new primitive.
2. **Default to Tier 3** (`profile.tier-1-frozen`). School-specific symbols are Tier 3. The
   **Tier-1 core is frozen** within a MAJOR version — a profile may not claim Tier 1.
3. **Provide the full kit** (`profile.compat-incomplete` + shape checks). Each stereotype carries
   a printed `glyph`, a `hand`-drawn form, a non-color fallback (`nonColor`, §D), **≥1 `synonym`**,
   and a **compatibility verdict for every existing diagram type** (`ok` / `n/a` / `caution`).
4. **Don't collide with a Tier-1 glyph** (`profile.glyph-collision`). The new symbol must be
   visually distinct from the reserved core glyphs (`◎ ○ ◇ ⬡ 👁 ▭ ▮ ⤬`, and `⚖` which marks a
   contested origin) — the semiotic-clarity check.

## Versioning & deprecation (semver)

- **PATCH** = clarification/typo · **MINOR** = additive profile/stereotype (backward-compatible) ·
  **MAJOR** = core glyph/semantics change (may break diagrams). Tier-1 core is frozen within a
  MAJOR version. A non-semver `version` is a warning (`profile.semver`).
- A symbol is marked **deprecated** (with a `since` and a migration `note`) for one full MINOR
  cycle before removal; deprecated symbols keep rendering. `validateProfile` surfaces them as info
  (`profile.deprecated`).

## A worked example

The shipped `CFT_PROFILE` (Compassion-Focused Therapy) passes every rule — use it as a template:

```jsonc
{
  "id": "cft",
  "title": "Compassion-Focused Therapy",
  "version": "0.1.0",
  "school": "cft",
  "stereotypes": [
    {
      "id": "compassionate-self",
      "base": "agent",                       // rule 1: specializes the Agent/Part element
      "tier": 3,                              // rule 2: Tier 3
      "glyph": "♥",                          // rule 4: distinct from the core glyphs
      "hand": "circle with a small heart inside",
      "nonColor": "circle + heart outline + label",   // rule 3 + §D
      "colorToken": "bluishGreen",
      "synonyms": ["compassionate self", "perfect nurturer"],  // rule 3: ≥1
      "compat": { "state-map": "ok", "parts-map": "ok", "relational-field": "n/a", "...": "..." }
    }
  ],
  "translations": [{ "concept": "Self", "terms": { "cft": "compassionate self" } }]
}
```

`roleLabelsFromProfile(profile)` turns a profile's stereotypes into the renderer's `roleLabels`
map (stereotype id → first synonym), so a model tagged with those stereotypes renders in the
profile's vocabulary — exactly like the built-in `roleLabelsFor(school)` does for the §G.2
translation table.

## Ethics

Extensions are bound by the §L.2 Ethical-Use Statement like everything else: keep color
redundant with shape/text, offer a secular variant for any ritual symbol, and don't smuggle a
medical-curative claim into a glyph. New symbols are proposals — see the contributor path in the
adoption pack (planned) for how clinicians can put a stereotype forward.
