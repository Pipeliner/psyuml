# ADR-0001: Adopt Spec-Driven Development with enforced impact docs

- **Status:** accepted
- **Date:** 2026-06-12
- **Deciders:** project owner
- **Spec / REQ touched:** all (cross-cutting)

## Context
PsyUML begins as a detailed **specification** (`docs/specification/psyuml-v0.1.0.md`)
that the codebase must faithfully implement, across 9 diagram types, 12 schools, and a
binding ethical-use statement. Two failure modes are likely without structure:
(1) **drift** — code diverging from the spec with no traceable link back; and
(2) **change blindness** — edits to the small, high-fan-in core (`packages/model`)
silently breaking distant consumers. The project is also greenfield, so conventions set
now are cheap; retrofitting them later is not.

## Decision
Adopt a lightweight **Spec-Driven Development harness** (`sdd/`):

1. A machine-checked **traceability registry** (`traceability.json`) linking every
   `REQ-…` to spec sections, a roadmap milestone, a status, and impl/test paths.
2. A **per-directory impact-analysis doc** convention (`IMPACT.md`) recording purpose,
   upstream/downstream dependencies, blast radius, and a per-file table.
3. A **zero-dependency checker** (`check.mjs`) that enforces 1–2 and runs in CI.

The PsyUML spec remains the source of truth; behavior changes update the spec first
(or in the same change), per the §K semver rules.

## Consequences
- **Positive:** every behavior is spec-traceable; impact analysis is a doc lookup, not
  a code archaeology session; the checker catches undocumented files and stale
  traceability automatically; the harness doubles as living design documentation.
- **Negative / cost:** a small standing tax — new files/dirs require doc updates, and
  the registry must be kept current. The checker is intentionally simple (mention-based
  file coverage, not full dependency parsing), so it verifies *presence* of docs, not
  their accuracy.
- **Impact:** repo-wide. Every directory gains an `IMPACT.md`; CI gains an SDD gate.

## Alternatives considered
- **No harness (rely on README + discipline)** — cheapest, but invites drift and change
  blindness exactly where they hurt most (the core metamodel).
- **Heavy traceability tooling / external SDD framework** — more power, but premature for
  a pre-code, single-spec project and adds dependencies the core is meant to avoid.
- **Doc-per-file (`foo.ts.md`)** — finer granularity, but doubles file count and
  fragments impact analysis; a per-directory table with a row per file is lighter and
  keeps blast-radius reasoning local.
