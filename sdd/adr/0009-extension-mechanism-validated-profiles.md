# ADR-0009: §K extension mechanism as a validated profile registry

- **Status:** accepted
- **Date:** 2026-06-14
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §K (extension), §B/§C (notation), §D / REQ-EXTENSION-MECH

## Context
§K specifies how PsyUML grows without breaking existing diagrams: a UML-style **profile**
mechanism with **stereotypes** that specialize core elements, four rules for adding a new
school/symbol/diagram type, semver discipline (Tier-1 core frozen within a MAJOR version), and a
deprecation cycle. It was the earliest still-planned requirement. The project's standing
directive is "validation first," so the mechanism should be enforced, not merely described.

## Decision
Implement §K in `@psyuml/profiles` as a **typed, validated registry**:

- **Schemas** (`ExtensionProfile`, `StereotypeDef`, zod): a profile bundles stereotypes (each with
  `base`, `tier`, `glyph`, `hand`, `nonColor`, `synonyms`, a `compat` matrix, optional
  `deprecated`), optional translation columns, and a semver `version`.
- **`validateProfile(input)`** enforces §K and mirrors `@psyuml/validate`'s `{ ok, issues }`
  shape (`ok` false iff any error). It checks: rule 1 — `base` is a core element, derived from the
  model's own `NodeKind`/`EdgeKind` (`CORE_BASES`), so the legal set can't drift from the model;
  rule 2 — an extension may not claim the frozen Tier 1; rule 3 — a complete `compat` verdict for
  every `DiagramType` plus the shape kit (glyph/hand/nonColor/≥1 synonym); rule 4 — no collision
  with a reserved Tier-1 glyph (`CORE_TIER1_GLYPHS`, from §B/§C, plus the `⚖` contested-origin
  marker). Also: unique ids, a semver warning, and a deprecation-info note. Malformed input comes
  back as `profile.shape` issues rather than throwing, so it can lint arbitrary JSON.
- **`roleLabelsFromProfile`** turns a profile into the renderer's `roleLabels` map, so a tagged
  model renders in the profile's vocabulary — same contract as the built-in `roleLabelsFor`.
- **`CFT_PROFILE`** is a shipped worked example that passes every rule (template + test/doc fixture).
- **Surfaces:** `psyuml lint-profile <file>` validates a profile JSON from the CLI; the conformance
  suite asserts the §K invariants (CFT clean; `CORE_BASES` == model elements; the four rules fire).
- **Docs:** `docs/extension-guide.md` is the practical companion to §K.

## Consequences
- **Positive:** §K is executable and "validation first" — a contributor's profile is checked
  against the four rules, the Tier-1 freeze, and the glyph-collision check before use, from code or
  CLI. Tying `CORE_BASES` to the model enums means the extension surface tracks the core
  automatically.
- **Cost / limits:** the reserved Tier-1 glyph set is a curated constant (sourced from §B/§C); if
  the core notation gains a glyph, add it there. Profiles are validated but not yet *applied* in the
  editor's School switcher beyond `roleLabelsFromProfile` (live profile loading is future). The
  compat matrix is author-asserted, not auto-verified against each renderer.
- **Impact:** `packages/profiles/{index.ts,index.test.ts,package.json}` (+ `@psyuml/model`, `zod`
  deps), `packages/cli/*` (`lint-profile`), `conformance/*` (§K invariants), `docs/extension-guide.md`.

## Alternatives considered
- **Free-form `stereotype` strings only (status quo).** Rejected — no rules, no collision/Tier
  checks, no way to lint a contribution; the §K guarantees would stay aspirational.
- **Put the schema/validator in `@psyuml/model`.** Rejected — `model` is school-agnostic and
  shouldn't host school registries or the notation glyph set; profiles is the right home.
- **A JSON-Schema file instead of zod.** Rejected — zod already gives parse + types + friendly
  errors the CLI reuses, and the §K rules need imperative checks (collision, completeness) anyway.
