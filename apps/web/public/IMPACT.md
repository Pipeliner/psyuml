# Impact — `apps/web/public/` (static site assets)

**Purpose:** files Vite copies verbatim to the site root — the favicons, PWA icons, web app
manifest, and the social (Open Graph/Twitter) preview image. Referenced from `apps/web/index.html`
(`<link rel="icon|apple-touch-icon|manifest">`, `og:image`).
**Status:** active
**Spec anchor / REQ:** REQ-UX-STORIES (polished, installable, shareable editor), REQ-ACCESSIBILITY

## Upstream (this depends on)
- `../../../scripts/gen-icons.mjs` — generates every PNG/ICO + `favicon.svg` + `og-image.png` from
  one on-brand SVG mark (Okabe–Ito blue ◎-Self node-graph), rasterized via Playwright/chromium.
  Regenerate: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/gen-icons.mjs`.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** Static assets; only `index.html` references them. The icon links use
> leading-slash paths so Vite base-rewrites them under the Pages base (`/psyuml/`); the manifest's
> `src`/`start_url` are relative so they resolve under the base too.

## Files
<!-- sdd:cover: *.png, *.ico, *.svg, *.webmanifest -->
The generated brand assets are covered in bulk by the directive above (binary/derived, regenerated
by `scripts/gen-icons.mjs`): `favicon.svg`, `favicon.ico`, `favicon-16/32/48.png`,
`apple-touch-icon.png` (180), `icon-192.png`/`icon-512.png` (PWA, `any maskable`), `og-image.png`
(1200×630 social card), and `site.webmanifest` (name/icons/theme — `theme_color` #0072b2).

## Change checklist
- [ ] Re-run `scripts/gen-icons.mjs` after changing the mark; keep the manifest icon list in sync.
- [ ] Keep `og:image`/`og:url` in `index.html` ABSOLUTE (scrapers don't resolve relative URLs).
- [ ] Ran `node sdd/check.mjs` (green).
