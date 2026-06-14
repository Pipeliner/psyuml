# ADR-0008: Region-neutral crisis resources — no baked-in per-country numbers

- **Status:** accepted
- **Date:** 2026-06-14
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** §A.2-r7, §L.2, UX-M4 / REQ-SAFETY-TRIAGE, REQ-DECISION-NAV

## Context
The Tier-B comprehension pilot praised the always-visible crisis line but flagged it as
**US-centric**: the examples (and the illustrative `e.g.`) named "988 in the US" as if it were
universal. The obvious "fix" — ship a registry of national crisis numbers and pick one by
locale — is itself a safety hazard: crisis numbers change, vary within a country, and a wrong
number baked into a safety tool can cause harm. We cannot keep such a table correct or current,
and we should not imply we can.

## Decision
- **Defaults name no country.** The render fallback and the shipped examples use a region-neutral
  line — "call your local emergency number or a crisis line (use your local number)" — instead of
  a specific national number. The crisis chart still shows it **both on the crisis node and in
  the always-visible banner** (the earlier crisis-on-node fix).
- **The author supplies the local contact; the tool guides them.** `meta.crisisResources` is
  author-set, and `validate` already hard-errors (`safety.acute-risk-resources`) when acute risk
  is flagged with no crisis resources at all. Added a locale-agnostic **info** nudge
  (`safety.crisis-localize`): when acute risk is flagged and the crisis line carries **no
  concrete contact** (no digit, URL, `@`, or `www.`), prompt for a real number/URL/service for
  the client's own region. It never blocks export.
- **Region-specific numbers live in author data / docs, not library defaults.** Any concrete
  number belongs in a specific model a clinician fills in for a specific client — clearly editable
  content — not in shipped defaults that masquerade as universal.

## Consequences
- **Positive:** no fragile, potentially-wrong crisis numbers are baked into the library; the
  default is honest for every locale; the tool actively nudges a concrete local contact when risk
  is flagged. De-centers the US without claiming global coverage we can't maintain.
- **Cost / limits:** the out-of-the-box line is less immediately actionable than a number would be
  — by design; actionability is the author's job and the nudge enforces it. The nudge's
  concrete-contact check is a heuristic (digit/URL/handle presence), deliberately info-only.
- **Impact:** `examples/state-map.psyuml`, `examples/decision-nav.psyuml` (neutral line;
  regenerated `decision-nav.svg`); `packages/validate/index.ts` (`safety.crisis-localize` + test);
  the crisis-line boilerplate is intentionally **not** localized per-country in code.

## Alternatives considered
- **Ship a per-country crisis-number registry keyed by locale.** Rejected — correctness/staleness
  liability in a safety-critical field; a wrong number is worse than a neutral prompt.
- **Point the default at a single global directory URL.** Rejected as the *default* — we can't
  guarantee any third-party URL is live/appropriate; an author may add one, and the nudge accepts
  a URL as a concrete contact.
- **Translate the boilerplate per language (full i18n of `crisisResources`/`disclaimer`).**
  Deferred — a larger schema change (string → `LocalizedText`) with wide blast radius; tracked
  separately from this de-US-centering.
