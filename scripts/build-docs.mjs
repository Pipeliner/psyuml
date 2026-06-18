/**
 * build-docs.mjs — publish selected repo Markdown docs as standalone, *rendered* HTML pages into
 * apps/web/public/, so the static site (GitHub Pages, under /psyuml/) serves them as formatted
 * pages rather than raw `text/markdown` that browsers show as plain text or download.
 *
 * Single source of truth stays in docs/*.md; these outputs are generated (gitignored) and rebuilt
 * by the `dev` and `build` npm scripts. `renderDoc` + `DOCS` are exported so tests can exercise the
 * renderer without depending on the generated files existing.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'apps', 'web', 'public');

/** The docs published with the site. `src` is repo-relative; `out` lands in apps/web/public/. */
export const DOCS = [
  { src: 'docs/handbook.md', out: 'handbook.html' },
  { src: 'docs/research/diagram-catalog.md', out: 'diagram-catalog.html' },
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Page chrome — readable typography, Okabe–Ito blue accent, bordered tables, AA dark mode. */
const STYLE = `
:root { color-scheme: light dark; --fg:#1a2733; --bg:#ffffff; --muted:#5a6b7b; --accent:#0072b2;
  --line:#d7dee5; --code-bg:#f3f5f7; --quote:#eef4f8; }
@media (prefers-color-scheme: dark) { :root { --fg:#dce6ef; --bg:#0a1722; --muted:#9fb0c0;
  --accent:#56b4e9; --line:#22323f; --code-bg:#10202c; --quote:#10202c; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
  font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
.wrap { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1.25rem 5rem; }
.back { display:inline-block; margin: 0 0 1.5rem; color:var(--accent); text-decoration:none;
  font-weight:600; }
.back:hover { text-decoration: underline; }
.doc a { color: var(--accent); }
.doc h1,.doc h2,.doc h3 { line-height:1.25; margin: 2rem 0 .6rem; }
.doc h1 { font-size: 1.9rem; margin-top: .5rem; }
.doc h2 { font-size: 1.4rem; border-bottom: 1px solid var(--line); padding-bottom: .3rem; }
.doc h3 { font-size: 1.15rem; }
.doc table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .92rem; display:block;
  overflow-x: auto; }
.doc th,.doc td { border: 1px solid var(--line); padding: .4rem .55rem; text-align: left;
  vertical-align: top; }
.doc th { background: var(--code-bg); }
.doc code { background: var(--code-bg); padding: .1rem .35rem; border-radius: 4px;
  font-size: .9em; }
.doc pre { background: var(--code-bg); padding: .9rem 1rem; border-radius: 8px; overflow-x: auto; }
.doc pre code { background: none; padding: 0; }
.doc blockquote { margin: 1rem 0; padding: .5rem 1rem; background: var(--quote);
  border-left: 4px solid var(--accent); border-radius: 0 6px 6px 0; color: var(--fg); }
.doc hr { border: none; border-top: 1px solid var(--line); margin: 2rem 0; }
.note { color: var(--muted); font-size: .9rem; margin-top: 3rem; }
`;

/** Render a Markdown source string into a complete, standalone HTML document. */
export function renderDoc(md, { title }) {
  const body = marked.parse(md, { gfm: true });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#0072b2" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a1722" media="(prefers-color-scheme: dark)" />
<link rel="icon" href="./favicon.svg" />
<title>${esc(title)} — PsyUML</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<a class="back" href="./">← Back to the PsyUML editor</a>
<article class="doc">
${body}
</article>
<p class="note">Rendered from the PsyUML repository documentation. Unvalidated v0.x — supports, not
replaces, professional care.</p>
</div>
</body>
</html>
`;
}

/** Derive a page title from the first Markdown H1, else fall back to the filename. */
function titleFrom(md, fallback) {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].replace(/[`*_]/g, '') : fallback;
}

function main() {
  mkdirSync(pub, { recursive: true });
  for (const { src, out } of DOCS) {
    const md = readFileSync(join(root, src), 'utf8');
    const html = renderDoc(md, { title: titleFrom(md, out.replace(/\.html$/, '')) });
    writeFileSync(join(pub, out), html);
    console.log(`rendered ${src} -> apps/web/public/${out} (${html.length} bytes)`);
  }
}

// Run when invoked directly (node scripts/build-docs.mjs), not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
