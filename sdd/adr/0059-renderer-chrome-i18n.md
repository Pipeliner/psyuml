# ADR-0059: renderer chrome follows `lang` — one typed message catalog (en + ru)

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-I18N-LOCALIZATION (extended) / roadmap-to-v1 §3; closes the "renderer
  chrome stays English" gap recorded in ADR-0042 (issue #3)

## Context
ADR-0042 made model **content** localizable but recorded an honest gap: every string a renderer adds
itself — legends and captions, `(EXIT)` / `(as-if)` / `TRAP`, the parts-map stereotype captions and
"dissociative barrier", the timeline `ACTION` / `IDENTITY` rows, the schema-grid domain headers, the
CFT sub-captions, the crisis-banner header, default `<title>`s, blank-template prompts — stayed
English. A diagram with `lang ru` therefore came out in two languages, which matters most on the
client layer (the plain-language audience).

## Decision
1. **One catalog, `packages/render/i18n.ts`.** `EN` is the source of truth; its keys define the
   `ChromeKey` type and every other locale is typed `Record<ChromeKey, string>`, so a locale that
   misses a string does not compile. `ru` ships as the second locale, complete.
2. **Lookup.** `chromeText(lang, key, vars)` / `translator(lang)` resolve the BCP-47 base subtag
   (`ru-RU` → `ru`), fall back to `en` for any locale without a catalog, and interpolate `{name}`
   placeholders. The catalog and helpers are re-exported from `@psyuml/render`.
3. **Every renderer uses it.** Each `render*` (all 20 diagram types, plus `renderDiff` and
   `renderComposite`) binds `tr = translator(lang)` from the `lang` it already resolves
   (`options.lang ?? model.language`); `blankTemplate` writes its prompts and title in
   `model.language`. `roleLabels` (cross-school vocabulary) still wins over a localized stereotype
   caption.
4. **English output is byte-identical.** No layout change for `en`; the golden SVGs are untouched. Four
   fixed-width chrome lines now go through `chromeLine` (same bytes in English) so a longer translation
   compresses inside the frame instead of spilling past it.
5. **Verify.** `i18n.test.ts`: catalog completeness + placeholder parity, locale resolution, and for
   every diagram type that each catalog string an English render emits is replaced in the `ru` render;
   unsupported `lang` renders byte-identically to `en`; default titles, template prompts, diff and
   composite are localized. `overlap.test.ts` also runs the whole corpus with `ru` chrome.

## Consequences
- **Positive:** a `lang ru` model renders in one language end to end (content from the model, chrome
  from the catalog). Adding a locale is one typed object.
- **Honest scope (recorded):**
  - The `ru` strings are a working translation of interface chrome, **not** a professionally
    validated clinical translation (ADR-0042's honesty constraint still applies to clinical content).
  - **Alt-text** (`<desc>` / `aria-label`) is still composed in English sentences — the remaining gap.
    A few catalog terms (schema-domain names, CFT sub-captions) now appear in those sentences in the
    chosen language.
  - Per-renderer layout tuning for longer translations is left to the layout issues; the overlap
    invariant passes with `ru` chrome on the whole corpus today.
- **Impact:** `packages/render/i18n.ts` (new), `packages/render/index.ts` (all renderers),
  `packages/render/i18n.test.ts` (new), `packages/render/overlap.test.ts`, `sdd/traceability.json`.

## Alternatives considered
- **Keep chrome in each model** (`meta.legend` etc.). Rejected: every author would re-type the same
  safety words, and they would drift between diagrams.
- **An i18n library (i18next, FormatJS).** Rejected for now: the need is a flat string table with
  simple interpolation; a dependency adds weight to a zero-dependency renderer for no gain.
