# ADR-0044: a standalone, drift-proof HTML showcase — generated from a manifest + the goldens

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-SHOWCASE-PAGE (→ **implemented**) / §E (example library); follows ADR-0027/0028 (single-source-then-drift-check), ADR-0043 (docs conformance)

## Context

The goal asked for "an html showcase file with multiple complex diagrams and their explanations and
usage guide (including outside of our software — on paper), with the best possible UX." The editor
already ships a live gallery, and the handbook/catalogue are published as HTML — but there was no
single, self-contained page that (a) shows one worked example of **every** diagram type, (b) explains
each one, (c) teaches how to **hand-draw** them away from the software, and (d) is pleasant enough to
read and to print.

Two constraints shaped the design. First, the same drift problem ADR-0043 just solved for prose
applies here: a hand-built page listing the diagrams would silently fall behind the language the next
time a type is added. Second, the established repo pattern for published pages is *generate into
`apps/web/public/` at build, gitignore the output* (build-docs.mjs), with the **source** version-
controlled and conformance-checked (catalog.json + catalog.test.ts).

## Decision

1. **Single-source manifest.** `examples/showcase.json` holds, per diagram type, the editorial prose
   only — `oneLiner`, `whatItShows`, `whenToUse`, `onPaper`, `evidenceNote`, `school`, `audience`,
   `family` — plus page-level content: the four JTBD jobs, a reading guide, an **on-paper** drawing
   guide, the honesty notes, and a family chooser. It does **not** duplicate facts the system already
   owns: each diagram's **title** is pulled from its model, the **render** from the committed golden
   `examples/showcase-<type>.svg`, and `family`/the chooser are checked against `FAMILY_OF`/`FAMILIES`.

2. **Bespoke generator for real UX.** `scripts/build-showcase.mjs` (exporting a pure `renderShowcase`
   + `esc`, plus a `main()` that does the file IO) emits a self-contained `apps/web/public/
   showcase.html` — inline CSS + inline SVG, **no external assets**. The page is framed as four
   jobs-to-be-done (read it / draw it on paper / choose the right one / use it honestly), grouped by
   family, with a sticky family nav, a chooser keyed on each family's "question it answers", per-
   diagram cards (the render is the hero; explanation, when-to-use, on-paper steps and a green
   *honest note* below), light/dark theming, and a **print stylesheet** so the page itself prints
   cleanly onto paper. It runs in `dev`/`build` after build-docs.mjs; the output is gitignored.

3. **TDD drift guard.** `conformance/showcase.test.ts` (written first, red before the generator
   existed) checks the manifest against the system — `diagrams` cover EXACTLY `DiagramType.options`,
   one per type; each `family` equals `FAMILY_OF`; the chooser block equals `FAMILIES`; each entry's
   prose is substantive and has its committed golden + model — and the generated page against the
   manifest (self-contained; inlines every render + each REAL model title; carries every explanation,
   on-paper guide, JTBD job, chooser question and honesty note). `apps/web/links.test.ts` additionally
   generates and link-checks the page like the other published docs.

4. **Discoverable both ways.** The editor links the showcase from its intro note (base-aware, like the
   handbook/catalogue), and the page links back to the editor, the handbook and the catalogue.

## Consequences

- **Positive:** there is now one polished, offline, printable page that documents the whole visual
  language — what each diagram is, when to reach for it, and how to draw it by hand — generated from a
  single source and **drift-locked** to the system. Adding the 21st type forces a showcase entry
  (CI fails otherwise), and the page can't lose a diagram, a title, a render, or the honesty framing.
  No new runtime dependency; the generator is plain Node string-building, consistent with build-docs.
- **Cost / honest scope (recorded):**
  - **One example per type, not per technique.** The showcase presents the 20 renderer types via their
    feature-dense `showcase-<type>` models; it is not the 40+ catalogue (that stays the catalogue's
    job). It is the "every diagram, explained, and drawable on paper" page, not an exhaustive corpus.
  - **Editorial prose is hand-authored.** The drift guard locks structure and coverage, not wording;
    the per-diagram explanations and on-paper steps are written by hand and carry the usual honesty
    burden — the evidence notes deliberately distinguish well-evidenced therapies from useful-but-
    unproven diagrams (therapy-evidence ≠ diagram-evidence).
  - **Two families render empty.** `pattern` and `composite` have no dedicated renderer yet; the
    chooser shows them honestly (a CAT pattern is drawn with the Cycle types; a composite is the case
    file/board) rather than hiding them.
  - **Output is gitignored.** Like handbook.html/diagram-catalog.html, the generated page isn't
    committed; it is rebuilt by `dev`/`build` and by the link test. The reviewable artifacts are the
    manifest, the generator, and the conformance test.
- **Impact:** `examples/showcase.json` (new), `scripts/build-showcase.mjs` (new),
  `conformance/showcase.test.ts` (new), `apps/web/App.tsx` (intro-note link), `apps/web/links.test.ts`
  (generate + link-check), `package.json` (`dev`/`build` run the generator), the IMPACT docs, and
  `sdd/traceability.json` (REQ-SHOWCASE-PAGE → implemented).

## Alternatives considered

- **Generate a Markdown doc and run it through build-docs.mjs** (like the handbook). Rejected — a
  generic markdown render can't give the per-diagram cards, family nav, badges and print layout the
  "best possible UX" ask calls for. A bespoke generator is worth the extra file.
- **Hand-write the HTML once.** Rejected — it would drift from the language immediately (the exact bug
  ADR-0043 was created to kill). Generated-from-a-checked-manifest is the only durable option.
- **Commit the generated HTML and byte-compare it** (a stricter drift check). Rejected — it breaks the
  repo's gitignore-the-output convention and makes the check brittle to incidental formatting; testing
  the generator's output against the manifest in-memory is sufficient and matches build-docs.
- **A new editor route/SPA view instead of a file.** Rejected — the goal asked for a standalone *file*
  that also works outside the software (offline, on paper); a self-contained HTML page delivers that,
  and is still linked from the editor.
- **Duplicate titles/families into the manifest.** Rejected — titles come from the models and families
  from `FAMILY_OF`/`FAMILIES`, so the page tracks the system instead of a hand-kept copy.
