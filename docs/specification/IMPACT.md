# Impact — `docs/specification/`

**Purpose:** the **normative PsyUML specification** — the single source of truth for
the language. Everything else implements or references it.
**Status:** stable (v0.1.0; changes follow §K semver: PATCH/MINOR/MAJOR)
**Spec anchor / REQ:** §A–§L (the whole spec)

## Upstream (this depends on)
> None. This is the root of the dependency tree for *meaning* in the project.

## Downstream (depends on this) — blast radius
> **Blast radius: highest in the repo.** A normative change here can invalidate
> requirements, tests, rendered output, and saved diagrams.
- `sdd/traceability.json` — most `REQ-…` cite a section of this file as `source`.
- `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` — derived from it.
- All future `packages/*`, `apps/web`, `conformance/` — implement and test against it.
- `docs/research/idea-incorporation.md` — maps companion-paper ideas onto its sections.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `psyuml-v0.1.0.md` | The v0.1.0 spec: core ontology, notation, 9 diagram types, ritual, cross-school, worked case, ethics | — | everything | §A–§L | **high** — version-bump and update citing REQs on any normative change |

## Change checklist
- [ ] Classify the change (PATCH / MINOR / MAJOR) per §K; Tier-1 core is frozen within a MAJOR.
- [ ] If section numbering changes, update every `REQ-…` `spec[]` ref in `traceability.json`.
- [ ] Update dependent docs (`ARCHITECTURE.md`, `ROADMAP.md`, `idea-incorporation.md`).
- [ ] Ran `node sdd/check.mjs` (green).
