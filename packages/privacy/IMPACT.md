# Impact — `packages/privacy/` (`@psyuml/privacy`)

**Purpose:** de-identify a model's client-authored free text before it leaves the device
(M8 privacy guardrail) — `deidentify(model, { terms })` → redacted copy + a report. The
PII-minimization step the bounded AI-assist runs pre-extraction, and the basis for a
de-identified interoperability export.
**Status:** active (M8 — regex PII (email/phone/link) + caller-supplied name terms)
**Spec anchor / REQ:** REQ-PRIVACY (Source 3 C8; ARCH §11)

## Upstream (this depends on)
- `@psyuml/model` (`parseModel`; the `Label`/`PsyumlModel` types it scrubs).

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A pure leaf library. The CLI `redact` command, the future AI-assist
> (PII minimization), and a future de-identified FHIR export read it. Never mutates inputs.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace manifest (`@psyuml/privacy`) | — | workspace resolution | — | low |
| `index.ts` | `deidentify` — scrubs node/edge/band/trigger labels + title (emails, links, phone-like runs, caller terms); leaves clinical boilerplate (disclaimer, crisis line, ritual framing) intact | `@psyuml/model` | cli, ai (M8), interop (M9) | REQ-PRIVACY | low |
| `index.test.ts` | Unit tests (email/phone/url/term redaction, boilerplate preserved, client layer scrubbed, no-mutation) | `index.ts` | CI `test` | REQ-PRIVACY | low |

## Change checklist
- [ ] Detection is deliberately conservative (no NER); names need explicit `terms`. Document any new detector and its false-positive risk.
- [ ] Never scrub the crisis line / disclaimer — they must survive de-identification.
- [ ] Ran `node sdd/check.mjs` (green).
