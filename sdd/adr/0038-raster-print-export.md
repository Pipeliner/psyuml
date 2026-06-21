# ADR-0038: raster (PNG) export + a print/PDF stylesheet

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-EXPORT-RASTER (→ **implemented**) / roadmap-to-v1 §3; follows ADR-0013

## Context
The editor exports a model (`.psyuml`) and the rendered **SVG**, but a clinician who wants to paste a
formulation into a case note, an email, or a printed handout needs a **flat image** (PNG) or a **paper
copy** (PDF/print). SVG is the wrong artefact for those uses. REQ-EXPORT-RASTER asks for PNG/PDF + a
print stylesheet — and the project is **dependency-light + deterministic**, so the obvious heavy route
(bundle a headless rasterizer / a PDF library) is unattractive.

## Decision
Add **PNG export** and a **print/PDF path**, both dependency-free, in `apps/web`.

1. **PNG (`downloadPng`)** — rasterize the existing deterministic SVG string **in the browser**: read
   the `viewBox` for intrinsic size, draw the SVG into an `<Image>`, paint it onto a `<canvas>` at
   **2× scale** over an **opaque white ground** (so a transparent SVG doesn't go black in dark
   viewers), then `canvas.toBlob('image/png')` → download. The SVG carries **no external references**,
   so the canvas is not tainted and `toBlob` succeeds. An **Export PNG** button sits beside Export SVG
   (gated by the same `exportBlocked`/health check), filename from the title slug.
2. **Print / PDF (a stylesheet + a Print button)** — an `@media print` block in `styles.css` hides the
   interactive editor chrome (toolbar, the node/link editors, version/diff panels, buttons/inputs) and
   prints the **diagram + its honest "about" caption**; the diagram SVG already draws the disclaimer,
   so the **humility note travels onto the page**. A **Print** button calls `window.print()`; the
   browser's *Save as PDF* is the PDF path (no bundled PDF library).
3. **Verification** — a new Playwright e2e clicks **Export PNG**, captures the download, and asserts a
   real PNG (the 8-byte signature + a non-trivial size) — so the rasterization is checked in a real
   browser, not mocked.

## Consequences
- **Positive:** clinicians get a paste-able PNG and a clean printed/PDF page with **zero new
  dependencies** and no bundle-size or supply-chain cost; the deterministic SVG is the single source,
  so the PNG/print output can't drift from the on-screen diagram. The disclaimer is on every exported
  artefact (SVG draws it; PNG rasterizes it; print keeps the caption).
- **Cost / honest scope:** PNG rasterization is **browser-only** (it uses `<canvas>`/`<Image>`), so the
  CLI still emits SVG only — a headless PNG path would need a rasterizer and is out of scope. "PDF" is
  **print-to-PDF**, not a generated PDF file. Raster of a *very* large diagram is bounded by the
  browser's max canvas size (not hit by the current corpus). Older/dark-mode print quirks are handled
  by forcing white grounds in the print block.
- **Impact:** `apps/web/App.tsx` (`downloadPng` + Export PNG / Print buttons), `apps/web/styles.css`
  (the `@media print` block), `e2e/onboarding.spec.ts` (the PNG-download test),
  `sdd/traceability.json` (REQ → implemented).

## Alternatives considered
- **Bundle a rasterizer (`resvg`/`sharp`) or a PDF lib (`pdf-lib`/`jspdf`).** Rejected — heavy
  dependency + supply-chain surface for what the browser already does natively (canvas) and the
  browser's print engine already does (PDF). Keeps the no-new-dependency stance (ADR-0013).
- **Server-side render-to-PNG.** Rejected — there is no server; the editor is local-first/static
  (ADR-0020). Client-side canvas keeps it offline-capable.
- **A custom on-screen "print view" route.** Rejected as over-built — an `@media print` stylesheet on
  the existing DOM is simpler, accessible, and reuses the rendered diagram as-is.
