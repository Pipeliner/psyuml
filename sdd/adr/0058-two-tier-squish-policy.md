# ADR-0058: the squish policy is two-tier — single-line peers compress, only multi-line wraps shrink (supersedes ADR-0053's `legibleFitSize`)

- **Status:** accepted
- **Date:** 2026-07-02
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-LEGIBLE-COMPRESSION (refined) · §D (notation), §J (conformance); **supersedes the `legibleFitSize` mechanism of ADR-0053**; builds on ADR-0045 (the 8px legibility floor)

## Context

This ADR **records a refinement that already shipped** but was never given its own place in the
decision log — it lived only in `sdd/traceability.json` (the REQ-LEGIBLE-COMPRESSION "REFINED" note)
and in code comments that cite *"ADR-0053, refined"*. An ADR review found the gap: the code and
`legibility.test.ts` point a reader at **ADR-0053** as the authority for the current squish policy,
but ADR-0053's text describes a *different, superseded* mechanism. Under the project's append-only
convention (a decision is superseded by writing a **new** ADR, never by editing the old one), the fix
is this record.

ADR-0053 introduced `legibleFitSize(s, size, maxWidth)` and a **single-tier** rule: *prefer a smaller,
full-proportion font over horizontal squishing* for **every** severely-compressed label — applied to
`fitText`, `wrapLabel`, and the three renderers that emit `textLength` directly (venn region contents,
resource-anchor headers, decisional-balance cells).

A **showcase visual audit** then found that rule over-applied. Shrinking every severely-compressed
label is **wrong for a single line that belongs to a uniform peer set** — the bullseye's six perimeter
labels, the resource-anchor's five column headers. Shrinking the one long member made it visibly
smaller than its siblings; the uniform horizontal **squish**, being same-size and only subtly denser,
actually read as *more* consistent. The genuinely-illegible case is the **multi-line wrap**, where one
crammed line is crushed to a tiny sliver (the safety-behaviour loop node's ~40% second line) — there a
smaller, re-wrapped, full-proportion label is unambiguously better.

## Decision

Split the policy by **how many lines** the label has:

- **Multi-line (`wrapLabel`)** — if wrapping to `maxLines` would squish the widest line below
  `SQUISH_FLOOR` (0.8), **shrink the font toward the 8px floor and re-wrap** so the glyphs keep their
  proportions. (This keeps ADR-0053's intent, scoped to the case that needs it.)
- **Single line** — left to `fitText`'s **uniform horizontal compression** (no shrink); a lone line in
  a peer row is better kept at the row's size, so it is allowed down to a looser *egregious* floor.

Consequently `legibleFitSize` is **removed**, and the three direct-`textLength` sites revert to plain
compression. The `legibility.test.ts` guard becomes correspondingly **two-tier**: a multi-line
(stacked-`<tspan>`) segment must be ≥ `SQUISH_FLOOR` **0.8** or already at the 8px floor; a single line
must be ≥ a looser **0.5** egregious floor (the corpus single-line minimum is ~58%). Either way the
font never drops below the 8px legibility floor and nothing is crushed to a sliver.

This keeps the safety-behaviour multi-line fix (it renders ~8.5px, legible) **and** restores the
uniform peer labels (bullseye / resource-anchor); the six single-line goldens ADR-0053 had shrunk
revert to uniform squish.

**Repoint the citations.** The two load-bearing code comments (`packages/render/index.ts` — the
`SQUISH_FLOOR` doc and the `wrapLabel` two-tier block) and the `legibility.test.ts` describe block now
cite this ADR alongside 0053, so the pointer resolves to a record that actually describes the shipped
policy.

## Consequences

- **Positive:** the decision log is honest again — the code's "refined" citation resolves to an ADR
  that matches the code. Peer rows stay visually uniform; genuinely-illegible wrapped slivers are gone;
  the rule is simpler (line-count is the discriminator, no shared helper to thread through the direct
  sites).
- **No code change ships with this ADR** — the mechanism was already in `index.ts` + `legibility.test.ts`;
  this commit adds the record and the citation pointers only. Verified by re-reading the code:
  `legibleFitSize` has zero occurrences; `wrapLabel` shrinks only when `lines.length > 1`; the guard
  uses `MULTILINE_FLOOR = 0.8` / `SINGLELINE_FLOOR = 0.5`.
- **Scope note — the ADR-0055 study battery is intentionally stricter.** `checkVisualQuality`
  (`study-cases.ts`) keeps a single **flat 0.8** squish check for *all* segments, not this two-tier
  model. That is deliberate and left as-is: a stricter screen never lets a real squish through, and it
  keeps ADR-0055 accurate to its own code. It is not drift.
- **Impact:** `sdd/adr/0058-*.md` (this record), `packages/render/index.ts` + `packages/render/legibility.test.ts`
  (citation comments repointed to ADR-0058), `sdd/traceability.json` (REQ-LEGIBLE-COMPRESSION pointer),
  `sdd/adr/IMPACT.md` (this row).

## Alternatives considered

- **Edit ADR-0053 to describe the two-tier policy.** Rejected — ADRs are append-only historical
  records; 0053 correctly captures the decision *as made on its date*. Superseding is additive.
- **Leave it recorded only in `traceability.json` + code comments.** Rejected — that is the gap this
  ADR closes: the code cites "ADR-0053, refined" as the authority for a policy 0053's own text
  contradicts, so a reader who follows the pointer lands on the superseded `legibleFitSize` mechanism.
- **Make the ADR-0055 battery two-tier as well.** Rejected — it is intentionally conservative (flat
  0.8, stricter than this guard) and matches ADR-0055's text; loosening single lines to 0.5 there would
  create a *new* ADR-0055 drift for zero legibility gain.
- **A universal shrink (keep `legibleFitSize`).** Rejected — that is exactly what the showcase audit
  found wrong: it makes a lone long peer smaller than its row, which reads as *less* uniform than the
  squish it replaces.
