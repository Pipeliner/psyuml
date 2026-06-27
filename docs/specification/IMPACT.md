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
| `psyuml-v0.1.0.md` | The v0.1.0 spec: core ontology, notation, the diagram types (the base set; grown to 20 by ADR-0029–0036), ritual, cross-school, worked case, ethics | — | everything | §A–§L | **high** — version-bump and update citing REQs on any normative change |
| `psyuml-v0.2.0.md` | The **v0.2.0** spec — a backward-compatible **evolution** of v0.1 (ADR-0014): collaborative-formulation centre + binding honesty clause; 8 diagram **families** × 3 audience **profiles**; provenance+confidence formalized (`contested` added); CAT **Pattern** semantics (trap/dilemma/snag + exits, ontology-neutral); comprehension-testing release gate (ISO 9186); lossy **FHIR export** mapping; sharpened ethics; system/doc architecture + phased roadmap (M11–M16) + v0.1 migration | `psyuml-v0.1.0.md` (normative core), `../research/v0.2-research-synthesis.md` | `@psyuml/profiles` (families/profiles), roadmap M11–M16, REQ-DIAGRAM-FAMILIES/REQ-AUDIENCE-PROFILES/REQ-NOTATION-TESTING/REQ-INTEROP-FHIR | §0–§10 (extends §A–§L) | medium — additive/MINOR; keeps v0.1 in force |
| `roadmap-to-v1.md` | **Forward spec / gap analysis (NOT normative for v0.x)** — what is *missing* from the current build and the acceptance criteria to close it (ADR-0022). §0 validation gate (the only path to v1.0; the comprehension/utility studies are unrun), §1 notation completeness, §2 `◇` renderers + obstacle-avoiding edge router, §3 product depth (case file, live profiles, i18n content, provenance narrative, raster export), §4 deliberately out-of-scope. Cited as `source` by the 9 `planned` REQ-… rows | `psyuml-v0.1.0.md`, `psyuml-v0.2.0.md`, the ADR known-gaps, `../research/{diagram-catalog,layout-algorithms}.md` | `sdd/traceability.json` (planned REQs M19–M21), `docs/ROADMAP.md` | §0–§4 | low (planned; no code) |

## Change checklist
- [ ] Classify the change (PATCH / MINOR / MAJOR) per §K; Tier-1 core is frozen within a MAJOR.
- [ ] If section numbering changes, update every `REQ-…` `spec[]` ref in `traceability.json`.
- [ ] Update dependent docs (`ARCHITECTURE.md`, `ROADMAP.md`, `idea-incorporation.md`).
- [ ] Ran `node sdd/check.mjs` (green).
