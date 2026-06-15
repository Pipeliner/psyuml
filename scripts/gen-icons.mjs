/**
 * Generate the editor's favicons + PWA icons + social (OG) image from one on-brand SVG mark,
 * using Playwright/chromium as the rasterizer (no native image deps). Outputs land in
 * apps/web/public/ (Vite copies them to the site root) and are committed; this script makes them
 * reproducible. Regenerate with:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/gen-icons.mjs
 *
 * The mark: an Okabe–Ito blue (#0072B2) rounded tile with a white ◎-Self core (ring + dot) linked
 * to three satellite nodes — a tiny "map of the self", echoing the PsyUML notation. Kept inside the
 * maskable safe zone so it survives Android's circle/squircle masks.
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public');
const BLUE = '#0072B2';

/** The scalable mark (64×64). Full-bleed tile + a self-map motif within the safe zone. */
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${BLUE}"/>
  <g stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none">
    <line x1="32" y1="32" x2="32" y2="15"/>
    <line x1="32" y1="32" x2="17" y2="45"/>
    <line x1="32" y1="32" x2="47" y2="45"/>
  </g>
  <g fill="#fff">
    <circle cx="32" cy="15" r="5"/>
    <circle cx="17" cy="45" r="5"/>
    <circle cx="47" cy="45" r="5"/>
  </g>
  <circle cx="32" cy="32" r="8.5" fill="${BLUE}" stroke="#fff" stroke-width="3"/>
  <circle cx="32" cy="32" r="2.6" fill="#fff"/>
</svg>`;

const page = await (
  await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
).newPage();

/** Rasterize the mark to a transparent-corner PNG of the given pixel size. */
async function png(name, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${markSvg}`,
  );
  const buf = await page.screenshot({ omitBackground: true });
  writeFileSync(join(pub, name), buf);
  return buf;
}

const p32 = await png('favicon-32.png', 32);
await png('favicon-16.png', 16);
await png('favicon-48.png', 48);
await png('apple-touch-icon.png', 180);
await png('icon-192.png', 192);
await png('icon-512.png', 512);

// favicon.ico — wrap the 32×32 PNG (modern browsers accept PNG-in-ICO).
const ico = Buffer.alloc(22 + p32.length);
ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(1, 4); // count
ico.writeUInt8(32, 6); // width
ico.writeUInt8(32, 7); // height
ico.writeUInt8(0, 8); // palette
ico.writeUInt8(0, 9); // reserved
ico.writeUInt16LE(1, 10); // planes
ico.writeUInt16LE(32, 12); // bpp
ico.writeUInt32LE(p32.length, 14); // bytes
ico.writeUInt32LE(22, 18); // offset
p32.copy(ico, 22);
writeFileSync(join(pub, 'favicon.ico'), ico);

// favicon.svg — the scalable source itself.
writeFileSync(join(pub, 'favicon.svg'), `${markSvg}\n`);

// og-image.png — 1200×630 social card (HTML/CSS gives us real text).
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  body{width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 84px;
    background:linear-gradient(135deg,#0a4f7a 0%,#0072B2 55%,#1f8fce 100%);color:#fff}
  .mark{width:248px;height:248px;flex:none;filter:drop-shadow(0 8px 24px rgba(0,0,0,.25))}
  h1{font-size:104px;font-weight:800;letter-spacing:-2px;line-height:1}
  p{font-size:37px;font-weight:500;opacity:.95;margin-top:20px;line-height:1.3}
  .tag{margin-top:26px;font-size:25px;opacity:.85;font-weight:600}
</style></head><body>
  <div class="mark">${markSvg.replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" width="248" height="248"')}</div>
  <div><h1>PsyUML</h1>
  <p>A visual, cross-school, dual-audience<br/>case-formulation editor for psychotherapy.</p>
  <div class="tag">Unvalidated v0.x · supports, not replaces, care</div></div>
</body></html>`);
writeFileSync(join(pub, 'og-image.png'), await page.screenshot());

await page.context().browser().close();
console.log('icons + og-image written to apps/web/public/');
