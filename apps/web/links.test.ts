import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guards the "deployed link" bug class (the broken `../docs/handbook.md`): a link in the SPA is
// resolved by the BROWSER against the deploy base (…github.io/psyuml/), and only files under
// `apps/web/public/` (Vite's publicDir) are actually published. `docs/*` is NOT in the build, and a
// relative `../` href climbs ABOVE the project base. So every in-app link target must (a) be
// base-aware and (b) ship in public/. These checks fail loudly if that ever regresses.

const appSrc = readFileSync(fileURLToPath(new URL('./App.tsx', import.meta.url)), 'utf8');
const indexHtml = readFileSync(fileURLToPath(new URL('./index.html', import.meta.url)), 'utf8');
const publicFile = (p: string): string => fileURLToPath(new URL(`./public/${p}`, import.meta.url));
const repoFile = (p: string): string => fileURLToPath(new URL(`../../${p}`, import.meta.url));

describe('in-app links resolve on the deployed (project-base) site', () => {
  it('the bundled Practitioner handbook is shipped in public/ and matches docs/ byte-for-byte', () => {
    const deployed = publicFile('handbook.md');
    expect(existsSync(deployed)).toBe(true);
    // single source of truth: the deployed copy must not drift from docs/handbook.md
    expect(readFileSync(deployed, 'utf8')).toBe(readFileSync(repoFile('docs/handbook.md'), 'utf8'));
  });

  it('every base-relative href in App.tsx points at a file present in public/', () => {
    // `href={`${import.meta.env.BASE_URL}foo`}` → foo must exist under apps/web/public/
    const targets = [...appSrc.matchAll(/\$\{import\.meta\.env\.BASE_URL\}([^`]+)`/g)].map(
      (m) => m[1],
    );
    expect(targets.length).toBeGreaterThan(0); // the handbook link uses this form
    for (const t of targets) expect(existsSync(publicFile(t))).toBe(true);
  });

  it('no in-app link points at an undeployed repo path (../docs, /docs, ../../…)', () => {
    // A link target that is a repo path rather than a public/ asset 404s once deployed.
    expect(appSrc).not.toMatch(/href=["'][^"'{]*\.\.\/(docs|packages|sdd)\//);
    expect(appSrc).not.toMatch(/href=["']\/(docs|packages|sdd)\//);
    expect(indexHtml).not.toMatch(/href=["'][^"']*\.\.\/(docs|packages|sdd)\//);
  });
});
