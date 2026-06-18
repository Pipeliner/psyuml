# Impact — `apps/web/public/` (static site assets)

**Purpose:** files Vite copies verbatim to the site root — the favicons, PWA icons, web app
manifest, the social (Open Graph/Twitter) preview image, and the **generated, rendered doc pages**
(`handbook.html`, `diagram-catalog.html`). Referenced from `apps/web/index.html`
(`<link rel="icon|apple-touch-icon|manifest">`, `og:image`) and from `apps/web/App.tsx` (the intro's
"Practitioner handbook" link and the About panel's "40+ diagram catalogue" link).
**Status:** active
**Spec anchor / REQ:** REQ-UX-STORIES (polished, installable, shareable editor), REQ-ACCESSIBILITY, REQ-HANDBOOK, REQ-EXAMPLE-LIBRARY

## Upstream (this depends on)
- `../../../scripts/gen-icons.mjs` — generates every PNG/ICO + `favicon.svg` + `og-image.png` from
  one on-brand SVG mark (Okabe–Ito blue ◎-Self node-graph), rasterized via Playwright/chromium.
  Regenerate: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/gen-icons.mjs`.
- `../../../scripts/build-docs.mjs` — renders `docs/handbook.md` + `docs/research/diagram-catalog.md`
  to `handbook.html` + `diagram-catalog.html` here (via `marked`). It runs first in `dev`/`build`;
  the outputs are **generated + gitignored** (`apps/web/public/*.html`), so `docs/*.md` stays the
  single source of truth. The site serves these as `text/html` (rendered), never raw markdown.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** Static assets; `index.html` references the icons/manifest and `App.tsx`
> links to `handbook.html` / `diagram-catalog.html`. The icon links use leading-slash paths so Vite
> base-rewrites them under the Pages base (`/psyuml/`); the manifest's `src`/`start_url` are relative
> so they resolve under the base too. **The `App.tsx` doc links use `import.meta.env.BASE_URL` (NOT a
> relative `../` path)** so they resolve to `…/psyuml/handbook.html` on the project site rather than
> climbing above the base — the bug that `links.test.ts` now guards.

## Files
<!-- sdd:cover: *.png, *.ico, *.svg, *.webmanifest, *.html -->
The generated brand assets are covered in bulk by the directive above (binary/derived, regenerated
by `scripts/gen-icons.mjs`): `favicon.svg`, `favicon.ico`, `favicon-16/32/48.png`,
`apple-touch-icon.png` (180), `icon-192.png`/`icon-512.png` (PWA, `any maskable`), `og-image.png`
(1200×630 social card), and `site.webmanifest` (name/icons/theme — `theme_color` #0072b2).

The `*.html` glob covers the **generated, gitignored** rendered doc pages — `handbook.html`
(from `../../../docs/handbook.md`) and `diagram-catalog.html` (from
`../../../docs/research/diagram-catalog.md`) — produced by `scripts/build-docs.mjs` during
`dev`/`build`. `docs/*.md` is the single source of truth; these are never hand-edited or committed.

## Change checklist
- [ ] Re-run `scripts/gen-icons.mjs` after changing the mark; keep the manifest icon list in sync.
- [ ] Keep `og:image`/`og:url` in `index.html` ABSOLUTE (scrapers don't resolve relative URLs).
- [ ] Edit docs in `docs/*.md`, never the generated `*.html` here; `build-docs.mjs` re-renders them.
- [ ] In-app links must be base-aware (`import.meta.env.BASE_URL`), target a rendered page shipped in this dir, and never a raw `.md` or a `../docs/…` repo path (both 404 / show plain text once deployed under `/psyuml/`). Enforced by `apps/web/links.test.ts`.
- [ ] Ran `node sdd/check.mjs` (green).
