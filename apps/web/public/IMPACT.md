# Impact — `apps/web/public/` (static site assets)

**Purpose:** files Vite copies verbatim to the site root — the favicons, PWA icons, web app
manifest, the social (Open Graph/Twitter) preview image, and the published Practitioner
**`handbook.md`**. Referenced from `apps/web/index.html`
(`<link rel="icon|apple-touch-icon|manifest">`, `og:image`) and from `apps/web/App.tsx` (the intro's
"Practitioner handbook" link).
**Status:** active
**Spec anchor / REQ:** REQ-UX-STORIES (polished, installable, shareable editor), REQ-ACCESSIBILITY, REQ-HANDBOOK

## Upstream (this depends on)
- `../../../scripts/gen-icons.mjs` — generates every PNG/ICO + `favicon.svg` + `og-image.png` from
  one on-brand SVG mark (Okabe–Ito blue ◎-Self node-graph), rasterized via Playwright/chromium.
  Regenerate: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/gen-icons.mjs`.
- `../../../docs/handbook.md` — `handbook.md` here is a **published copy** of it (it must ship inside
  `dist/web` to be reachable from the SPA; `docs/` is not part of the build). The copy is kept
  byte-identical by `apps/web/links.test.ts`, which fails if they drift.

## Downstream (depends on this) — blast radius
> **Blast radius: low.** Static assets; `index.html` references the icons/manifest and `App.tsx`
> links to `handbook.md`. The icon links use leading-slash paths so Vite base-rewrites them under the
> Pages base (`/psyuml/`); the manifest's `src`/`start_url` are relative so they resolve under the
> base too. **The `App.tsx` handbook link uses `import.meta.env.BASE_URL` (NOT a relative `../`
> path)** so it resolves to `…/psyuml/handbook.md` on the project site rather than climbing above the
> base — the bug that `links.test.ts` now guards.

## Files
<!-- sdd:cover: *.png, *.ico, *.svg, *.webmanifest -->
The generated brand assets are covered in bulk by the directive above (binary/derived, regenerated
by `scripts/gen-icons.mjs`): `favicon.svg`, `favicon.ico`, `favicon-16/32/48.png`,
`apple-touch-icon.png` (180), `icon-192.png`/`icon-512.png` (PWA, `any maskable`), `og-image.png`
(1200×630 social card), and `site.webmanifest` (name/icons/theme — `theme_color` #0072b2).

| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `handbook.md` | The Practitioner handbook **published with the site** so the editor's intro link resolves on the project-base Pages site. A byte-identical copy of `../../../docs/handbook.md` (single source of truth) — synced by hand and **enforced by `apps/web/links.test.ts`**; `docs/*` is not in the build, so the doc must live here to be deployed | `../../../docs/handbook.md` | `App.tsx` intro link (`${import.meta.env.BASE_URL}handbook.md`) | REQ-HANDBOOK | low |

## Change checklist
- [ ] Re-run `scripts/gen-icons.mjs` after changing the mark; keep the manifest icon list in sync.
- [ ] Keep `og:image`/`og:url` in `index.html` ABSOLUTE (scrapers don't resolve relative URLs).
- [ ] After editing `docs/handbook.md`, re-copy it to `handbook.md` here (CI's `links.test.ts` fails on drift).
- [ ] In-app links must be base-aware (`import.meta.env.BASE_URL`) and target a file shipped in this dir — never a `../docs/…` repo path (it 404s once deployed under `/psyuml/`).
- [ ] Ran `node sdd/check.mjs` (green).
