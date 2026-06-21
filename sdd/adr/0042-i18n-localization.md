# ADR-0042: usable localization — an editor locale switch + RTL + a demo pack

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-I18N-LOCALIZATION (→ **implemented**) / roadmap-to-v1 §3; follows REQ-I18N

## Context
The i18n **architecture** already exists (REQ-I18N): labels are concept-keyed dictionaries
(`{ clinician: { en: … }, client: { … } }`), `getText(label, layer, lang)` resolves by language with
fallback, and every view emits alt-text. But it was **not usable**: only `en` content shipped, the
editor had no way to switch language, and there was no right-to-left support. REQ-I18N-LOCALIZATION
asks for real label packs, RTL, and an editor locale switch.

A hard honesty constraint: **clinical content must not be machine/AI-translated and presented as
usable.** A mistranslated clinical term can harm, and an LLM translation is not a validated pack. So
this ships the **mechanism** in full and **one clearly-illustrative demo pack**, not 73 fabricated
clinical translations.

## Decision
1. **Model helpers (`@psyuml/model`).** `isRtl(lang)` (RTL base subtags: ar/he/fa/ur/yi/ps/sd, region
   suffixes handled) and `availableLanguages(model)` (the languages a model's labels actually carry,
   `model.language` first, de-duped) — so the editor only offers languages the model genuinely has (no
   fabricated fallback).
2. **Editor locale switch (`apps/web`).** A **Language** selector listing `availableLanguages(model)`
   (disabled when a model is monolingual); the chosen `lang` flows to `render`/`renderComposite` and
   `getText` localizes the labels. The selection is **clamped** to a language the current model has
   (derived `activeLang`, no stale state on model change).
3. **RTL.** When the active language is RTL, the diagram container gets `dir="rtl"` + `lang`, so the
   writing direction flips and the browser's bidi shaping renders the script correctly.
4. **One demo pack.** `examples/i18n-demo.psyuml` — a generic process-loop (Calm → Worried →
   Overwhelmed → a way through) in **en · es · ar**, so the switch + RTL are exercisable end-to-end.
   Its disclaimer states plainly that the translations are basic and **not** professionally validated.
5. **Verify.** Model unit tests (`isRtl`, `availableLanguages`); a Playwright e2e that loads the demo,
   switches en→es (labels change), en→ar (labels change **and** `dir` flips to `rtl`), and back to
   en (`dir=ltr`).

## Consequences
- **Positive:** the existing i18n architecture is now **usable** — a multilingual model can be authored
  and viewed in each of its languages, RTL included, with the switch driven by the model's real
  content. No schema change (labels were always multi-lang). The honesty boundary is explicit: the
  mechanism is real, the content is one marked-illustrative pack.
- **Cost / honest scope (recorded):**
  - **Renderer chrome stays English.** The renderers' own words — the safety **"EXIT"**, the ladder's
    "harder/easier", the Venn/secure-base banners, the parts-map legend — are hard-coded English; only
    **model content** (labels) localizes. So an Arabic diagram shows Arabic labels next to an English
    "(EXIT)". Localizing renderer chrome is a separate, larger pass (a string table across 20
    renderers) — deferred.
  - **RTL is text-direction, not layout mirroring.** The deterministic geometry is computed LTR; the
    diagram is not mirrored, only the text direction + script shaping are correct.
  - **One demo pack, not clinical packs.** Real multi-language clinical libraries need professional
    translators; this ships the pipeline + a generic demo, not fabricated clinical translations.
  - **`meta.title`/`disclaimer` are monolingual** strings (not concept-keyed) — they don't switch.
- **Impact:** `packages/model/index.ts` (`isRtl`, `availableLanguages`), `apps/web/App.tsx` (the
  Language selector + `activeLang` + `dir`), `examples/i18n-demo.psyuml` (+ manifest row), the model
  tests + the e2e, `sdd/traceability.json` (REQ → implemented).

## Alternatives considered
- **Machine-translate the corpus into several languages.** Rejected outright — fabricated clinical
  translations are an honesty + safety violation; the demo pack is marked illustrative.
- **Offer a fixed locale list (en/es/ar/…) regardless of model.** Rejected — switching to a language a
  model lacks would silently fall back to English, a confusing no-op; listing only the model's real
  languages keeps the switch honest.
- **Localize the renderer chrome now (full string table).** Deferred — a worthwhile but large separate
  effort across 20 renderers; out of proportion to "make the architecture usable", and recorded as the
  honest remaining gap.
- **Mirror the diagram geometry for RTL.** Deferred — the layout is deterministic LTR; full mirroring
  is a large renderer change for modest benefit over correct text direction + shaping.
