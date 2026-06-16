# Impact — `packages/interop/` (`@psyuml/interop`)

**Purpose:** a **lossy, export-only** bridge from the canonical model to **FHIR R4** (v0.2 §7) —
so a PsyUML formulation can enter a clinical record without pretending FHIR can hold it. There is
**no importer**; the diagram stays source-of-truth.
**Status:** implemented (M15 — `toFhir` + `validateFhirBundle` + the documented loss report)
**Spec anchor / REQ:** REQ-INTEROP-FHIR, REQ-PRIVACY (v0.2 §7; §6 audience-scoped / de-identified)

## Upstream (this depends on)
- `@psyuml/model` (`PsyumlModel`/`getText` — what to export), `@psyuml/privacy`
  (`deidentify` + `scopeToLayer` — de-identified, audience-scoped by default), `zod` (the FHIR-subset
  schema the validator checks against).
- `../../docs/specification/psyuml-v0.2.0.md` §7 (the mapping table + the documented limits).

## Downstream (depends on this) — blast radius
> **Blast radius: low.** An **isolated leaf** (ARCH / spec §8): nothing in the workspace depends on
> it except the `psyuml export` CLI subcommand. Removing it leaves everything else working.
- `packages/cli` — the `export` subcommand calls `toFhir` + `validateFhirBundle`.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Package manifest (`@psyuml/interop`) | — | workspace resolution | — | low |
| `index.ts` | `toFhir(model, options)` → a FHIR R4 **document Bundle** (Composition + ClinicalImpression + Observation, + CarePlan/Goal for interventions/resources, + FamilyMemberHistory/List for relational diagrams) **+ a structured `loss` report** (§7 MUST: limits documented) + carried consent status; **de-identified + audience-scoped by default** (reuses `@psyuml/privacy`). Non-diagnostic: nodes map to Observation, **never Condition** (§A.3). Optional caller-supplied **terminology binding** (`coding` keyed by node id → SNOMED/LOINC `Coding`) attaches codes to a node's `CodeableConcept`; PsyUML ships **no** code map and never fabricates codes — unmapped concepts stay text-only (recorded in `loss`). `validateFhirBundle` checks the emitted FHIR **subset** (required fields + reference integrity) — not a full FHIR validator. **No `fromFhir` — export-only, not a round-trip** | `@psyuml/model`, `@psyuml/privacy`, zod | cli | v0.2 §7, §6 / REQ-INTEROP-FHIR, REQ-PRIVACY | medium |
| `index.test.ts` | Unit tests: valid Bundle + reference integrity, the §7 resource set, non-diagnostic (no Condition), genogram → FMH+List + edge-loss recorded, de-identification + term redaction, documented loss for topology/bands/provenance/triggers, client-scope layer, dangling-reference detection, consent + no-round-trip | `index.ts` | CI `test` | REQ-INTEROP-FHIR | low |

## Change checklist
- [ ] Keep it **export-only + lossy**: never add a `fromFhir` that claims a lossless round-trip; every
      dropped construct gets a `loss` item (§7 MUST).
- [ ] Keep it **non-diagnostic** (Observation, not Condition) and **de-identified by default** (§A.3, REQ-PRIVACY).
- [ ] If a new resource type is emitted, add it to the FHIR-subset schema + `validateFhirBundle`.
- [ ] Ran `node sdd/check.mjs` (green).
