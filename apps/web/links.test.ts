import { describe, expect, it, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guards the "deployed link" bug class (the broken `../docs/handbook.md`): a link in the SPA is
// resolved by the BROWSER against the deploy base (…github.io/psyuml/), and only files under
// `apps/web/public/` (Vite's publicDir) are actually published — `docs/*` is NOT in the build, and a
// relative `../` href climbs ABOVE the project base. Linked docs are also published as *rendered*
// HTML (scripts/build-docs.mjs), never raw `.md` (static hosts serve markdown as plain text / a
// download). So every in-app link must be base-aware AND point at a rendered page shipped in public/.

const appSrc = readFileSync(fileURLToPath(new URL('./App.tsx', import.meta.url)), 'utf8');
const indexHtml = readFileSync(fileURLToPath(new URL('./index.html', import.meta.url)), 'utf8');
const publicFile = (p: string): string => fileURLToPath(new URL(`./public/${p}`, import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

beforeAll(() => {
  // generate the published (gitignored) docs so the on-disk checks below see them
  execSync('node scripts/build-docs.mjs', { cwd: repoRoot, stdio: 'ignore' });
});

describe('in-app doc links resolve and are served rendered (not raw markdown)', () => {
  it('the published docs are generated as standalone HTML pages with tables rendered', () => {
    for (const out of ['handbook.html', 'diagram-catalog.html']) {
      expect(existsSync(publicFile(out))).toBe(true);
      // a real HTML document (not text/markdown a browser would show as plain text)
      expect(readFileSync(publicFile(out), 'utf8').startsWith('<!doctype html>')).toBe(true);
    }
    // the 40+ catalogue is table-heavy — its Markdown tables must come through as HTML <table>s
    expect(readFileSync(publicFile('diagram-catalog.html'), 'utf8')).toContain('<table');
  });

  it('every base-relative href in App.tsx points at a shipped public/ file', () => {
    const targets = [...appSrc.matchAll(/\$\{import\.meta\.env\.BASE_URL\}([^`]+)`/g)].map(
      (m) => m[1],
    );
    // the handbook + the catalogue are both linked from the editor
    expect(targets).toEqual(expect.arrayContaining(['handbook.html', 'diagram-catalog.html']));
    for (const t of targets) expect(existsSync(publicFile(t))).toBe(true);
  });

  it('no in-app link points at an undeployed repo path, and none links a raw .md', () => {
    // a repo path (rather than a public/ asset) 404s once deployed under /psyuml/
    expect(appSrc).not.toMatch(/href=["'][^"'{]*\.\.\/(docs|packages|sdd)\//);
    expect(appSrc).not.toMatch(/href=["']\/(docs|packages|sdd)\//);
    expect(indexHtml).not.toMatch(/href=["'][^"']*\.\.\/(docs|packages|sdd)\//);
    // never link a raw .md (served as plain text / downloaded, not rendered)
    expect(appSrc).not.toMatch(/\$\{import\.meta\.env\.BASE_URL\}[^`]*\.md`/);
  });
});
