# ADR-0060: stereotype-placement lint + graded schema-grid intensity

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §A.2 well-formedness · §D redundancy · REQ-WELLFORMEDNESS,
  REQ-NEW-DIAGRAM-TYPES (issue #7); refines ADR-0034 (schema-grid)

## Context
Issue #7 found two problems in the schema-domains grid:

1. **Silent drop.** A node with `stereotype=impaired-limits` never appeared, because the accepted key
   is `limits`, and `psyuml lint` still said `✓ clean`. Every renderer that buckets nodes by
   `stereotype` behaves the same way (tree-of-life, decisional-balance, secure-base, three-circles;
   venn falls back to document order), and each kept its key list privately in its renderer.
2. **Binary intensity.** `properties.intensity` only switched a cell between plain and bold at 0.5.
   When most schemas scored at or above 0.5, the whole grid looked equally bold and the profile was
   lost.

## Decision
1. **One key list per stereotype-placed diagram, in `@psyuml/model`.** `STEREOTYPE_PLACEMENT` maps
   each such diagram type to `{ keys, noun, missingOk, unknown, fallback? }`. `SCHEMA_DOMAINS` (the
   5 domain keys) and `BODY_REGIONS` (ADR-0061) are exported, and the schema-grid renderer takes its
   columns from `SCHEMA_DOMAINS`, so the renderer and the lint read the same list. A render test
   checks that every listed key of the other renderers is actually drawn. Additive constants only:
   no schema change.
2. **Lint rule `render.stereotype-unknown` (warn).** For a stereotype-placed diagram, a node whose
   stereotype is not a key, or that has none where one is required, gets a warning that says what
   happens to it ("won't appear on the schema-grid" or "is placed by its pos"), lists the valid keys
   and adds a did-you-mean hint (`"impaired-limits"` → `"limits"`, `"feet"` → `"foot-left"` or
   `"foot-right"`). The hint matches the whole string or single hyphen tokens and breaks ties on all
   tokens. It is a **warning**, not an error, the same as the existing `render.node-not-shown`
   notice: it reports a mistake but does not block export.
3. **Graded intensity in the schema grid.** A scored schema (with `properties.intensity`) gets three
   channels that scale with the value, none of them colour: the outline weight
   (`1.3 + 2.2·intensity`), a meter bar along the cell's foot whose filled share equals the
   intensity, and the printed value (`0.95`, `0.6`). The **active** marker (corner wedge + bold
   name at ≥ 0.5) stays as the threshold cue. Unscored schemas keep the thin outline and get no
   meter. Cells are 62 px tall (was 56) to make room for the bar. The legend (en + ru) and the
   alt-text ("Schema A (active, intensity 0.95)") describe the graded mark.

## Consequences
- **Positive:** a typo in a stereotype is reported by lint instead of the node disappearing. A
  schema profile reads at a glance even when most schemas are active, and the printed number keeps
  it precise and accessible.
- **Negative / cost:** the showcase schema-grid golden changes (taller cells, meters). The keys are
  now read from the model, so adding a zone means editing `STEREOTYPE_PLACEMENT` as well; the
  cross-check test fails if the two drift.
- **Impact:** `packages/model/index.ts`, `packages/validate/index.ts` (+ tests),
  `packages/render/index.ts` (`renderSchemaGrid`), `packages/render/i18n.ts` (`schema.legend`),
  `packages/render/schema-grid.test.ts`, `packages/render/overlap.test.ts` (stress model),
  `examples/showcase-schema-grid.svg`, `docs/format-reference.md`.

## Alternatives considered
- **Error instead of warning.** Rejected: lint errors gate client export, and a misplaced item in a
  clinician-only sorter does not make a diagram unsafe. A warning is visible, which is the actual
  fix.
- **Accept the long domain names as aliases** (`impaired-limits`). Rejected for now: the hint
  already points to the key, and aliases would add a second vocabulary to keep in sync.
- **Grey-scale fill by intensity.** Rejected: a fill gradient is hard to compare between cells and
  sits close to "colour as the only channel". Weight + bar + number are each readable on their own.
