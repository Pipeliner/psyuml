/**
 * build-showcase.mjs — generate the standalone HTML showcase (apps/web/public/showcase.html) from
 * the single-source manifest `examples/showcase.json` + the committed golden `examples/showcase-
 * <type>.svg` renders + each model's own title. The page presents one worked example of every
 * diagram type, framed as four jobs-to-be-done (read it / draw it on paper / choose the right one /
 * use it honestly), grouped by family, with a per-diagram explanation, an on-paper drawing guide,
 * and an honest evidence note.
 *
 * Drift-proofing (REQ-SHOWCASE-PAGE, ADR-0044): the manifest is checked against the SYSTEM and this
 * generated page against the manifest by `conformance/showcase.test.ts` — so the showcase can't fall
 * behind the language. `renderShowcase` + `esc` are exported so the test exercises the generator
 * without the (gitignored) output needing to exist. Runs in `dev`/`build` after build-docs.mjs.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'apps', 'web', 'public');
const examplesDir = join(root, 'examples');

/** Escape text for safe interpolation into HTML element/attribute content. */
export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Human label for an audience code (C/L/B). */
const AUDIENCE = { C: 'Clinician aid', L: 'Client-facing', B: 'Clinician & client' };

/** Honest note for a family that has no dedicated renderer yet (kept out of the gallery). */
const EMPTY_FAMILY_NOTE = {
  pattern:
    'No dedicated renderer yet — a recurring procedure (a CAT-style reciprocal-role / SDR pattern) is currently drawn with the Cycle types above.',
  composite:
    'No single renderer — several views of one case are held together as a case file / board in the editor, not as one diagram.',
};

/** Strip any XML prolog / DOCTYPE so the SVG inlines cleanly inside an HTML document. */
const inlineSvg = (svg) =>
  svg.replace(/^\s*<\?xml[^>]*\?>\s*/i, '').replace(/^\s*<!DOCTYPE[^>]*>\s*/i, '');

const slug = (type) => `d-${type}`;

/** Readable, print-friendly, AA light/dark page chrome — no external assets. */
const STYLE = `
:root { color-scheme: light dark; --fg:#1a2733; --bg:#ffffff; --panel:#f7f9fb; --muted:#5a6b7b;
  --accent:#0072b2; --line:#d7dee5; --ink:#0a1722; --good:#1b7837; }
@media (prefers-color-scheme: dark) { :root { --fg:#dce6ef; --bg:#0a1722; --panel:#10202c;
  --muted:#9fb0c0; --accent:#56b4e9; --line:#22323f; --ink:#dce6ef; --good:#7fc97f; } }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 4.5rem; }
body { margin:0; background:var(--bg); color:var(--fg);
  font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
a { color: var(--accent); }
.skip { position:absolute; left:-999px; top:0; background:var(--accent); color:#fff; padding:.5rem .9rem;
  border-radius:0 0 6px 0; z-index:20; }
.skip:focus { left:0; }
.topnav { position:sticky; top:0; z-index:10; background:color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px); border-bottom:1px solid var(--line); }
.topnav .row { max-width:74rem; margin:0 auto; padding:.5rem 1.25rem; display:flex; gap:.4rem .9rem;
  flex-wrap:wrap; align-items:center; font-size:.86rem; }
.topnav .brand { font-weight:700; margin-right:.4rem; }
.topnav a { text-decoration:none; color:var(--muted); }
.topnav a:hover { color:var(--accent); }
.wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.25rem 5rem; }
.hero { padding: 2.5rem 0 1rem; }
.hero h1 { font-size: clamp(1.7rem, 4vw, 2.5rem); line-height:1.12; margin:.2rem 0 .5rem;
  font-family: ui-serif, Georgia, 'Times New Roman', serif; }
.hero .tagline { font-size:1.15rem; color:var(--fg); margin:0 0 .9rem; max-width:48rem; }
.hero .lede { color:var(--muted); max-width:48rem; margin:0 0 1rem; }
.backlink { display:inline-block; font-weight:600; text-decoration:none; }
.herobar { display:flex; gap:1rem; align-items:center; justify-content:space-between; flex-wrap:wrap; margin:0 0 .5rem; }
.printbtn { font:inherit; font-size:.9rem; font-weight:600; cursor:pointer; color:var(--accent);
  background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:.4rem .8rem; }
.printbtn:hover { border-color:var(--accent); }
.totop { position:fixed; right:1rem; bottom:1rem; z-index:15; font-size:.85rem; font-weight:600;
  text-decoration:none; color:var(--accent); background:var(--bg); border:1px solid var(--line);
  border-radius:999px; padding:.45rem .8rem; box-shadow:0 1px 4px rgba(0,0,0,.15); }
.totop:hover { border-color:var(--accent); }
@media print { .printbtn, .totop { display:none !important; } }
.banner { margin:1rem 0; padding:.7rem 1rem; border:1px solid var(--line); border-left:4px solid var(--accent);
  border-radius:0 8px 8px 0; background:var(--panel); font-size:.95rem; }
.jobs { list-style:none; padding:0; margin:1.5rem 0; display:grid; gap:.9rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.jobs li { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:.9rem 1rem; }
.jobs .n { display:inline-grid; place-items:center; width:1.7rem; height:1.7rem; border-radius:50%;
  background:var(--accent); color:#fff; font-weight:700; font-size:.85rem; }
.jobs a { font-weight:700; text-decoration:none; }
.jobs p { margin:.4rem 0 0; color:var(--muted); font-size:.93rem; }
h2.section { font-size:1.5rem; margin:2.6rem 0 .3rem; padding-top:.6rem;
  font-family: ui-serif, Georgia, serif; }
.section-sub { color:var(--muted); margin:.1rem 0 1rem; }
.guide { columns: 2 19rem; column-gap: 2rem; }
.guide p { margin:0 0 .8rem; break-inside: avoid; }
.chooser { display:grid; gap:.8rem; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); margin:1rem 0; }
.fam { border:1px solid var(--line); border-radius:10px; padding:.8rem .95rem; background:var(--panel); }
.fam h3 { margin:0 0 .15rem; font-size:1.05rem; }
.fam .q { color:var(--muted); font-style:italic; margin:0 0 .5rem; font-size:.92rem; }
.fam ul { margin:0; padding-left:1.1rem; font-size:.92rem; }
.fam .none { color:var(--muted); font-size:.9rem; margin:0; }
.card { border:1px solid var(--line); border-radius:14px; padding:1.2rem 1.3rem 1.4rem; margin:1.2rem 0;
  background:var(--bg); break-inside: avoid; }
.card h3 { font-size:1.3rem; margin:0 0 .15rem; font-family: ui-serif, Georgia, serif; }
.card .one { color:var(--muted); margin:0 0 .7rem; }
.badges { display:flex; flex-wrap:wrap; gap:.4rem; margin:0 0 .9rem; }
.badge { font-size:.76rem; font-weight:600; padding:.16rem .5rem; border-radius:999px; border:1px solid var(--line);
  background:var(--panel); color:var(--muted); }
figure.diagram { margin:0 0 1rem; padding:.8rem; border:1px solid var(--line); border-radius:10px;
  background:#fff; overflow-x:auto; }
figure.diagram svg { width:100%; height:auto; max-width:100%; display:block; }
.fields { display:grid; gap:.7rem; }
.field { }
.field .k { font-weight:700; font-size:.82rem; text-transform:uppercase; letter-spacing:.03em;
  color:var(--accent); margin:0 0 .15rem; }
.field.note .k { color:var(--good); }
.field p { margin:0; }
.card .open { margin:1rem 0 0; }
.card .open a { font-weight:600; text-decoration:none; }
.card .open a:hover { text-decoration:underline; }
@media print { .card .open { display:none; } }
.honesty { border:1px solid var(--line); border-radius:14px; padding:1.1rem 1.3rem; background:var(--panel);
  margin:1rem 0; }
.honesty ul { margin:.4rem 0 0; padding-left:1.2rem; }
.honesty li { margin:0 0 .55rem; }
.foot { color:var(--muted); font-size:.88rem; border-top:1px solid var(--line); margin-top:3rem;
  padding-top:1.2rem; }
@media (max-width: 34rem) { .guide { columns:1; } }
@media print {
  html { scroll-padding-top:0; }
  .topnav, .skip { display:none !important; }
  body { color:#000; background:#fff; font-size:10.5pt; }
  .wrap { max-width:none; padding:0; }
  a { color:#000; text-decoration:none; }
  .card, figure.diagram, .fam, .honesty, .jobs li { break-inside:avoid; border-color:#bbb; }
  figure.diagram { background:#fff; }
  .badge { border-color:#bbb; }
}
`;

/** A diagram card: title (from the model), one-liner, badges, the inline render, then the fields. */
function renderCard(d, svg, title) {
  const field = (k, v, cls = '') =>
    `<div class="field ${cls}"><p class="k">${esc(k)}</p><p>${esc(v)}</p></div>`;
  return `<article class="card" id="${slug(d.type)}">
  <h3>${esc(title)}</h3>
  <p class="one">${esc(d.oneLiner)}</p>
  <p class="badges">
    <span class="badge">${esc(d.family)}</span>
    <span class="badge">${esc(d.school)}</span>
    <span class="badge">${esc(AUDIENCE[d.audience] || d.audience)}</span>
    <span class="badge"><code>diagram: ${esc(d.type)}</code></span>
  </p>
  <figure class="diagram">${inlineSvg(svg)}</figure>
  <div class="fields">
    ${field('What it shows', d.whatItShows)}
    ${field('When to use it', d.whenToUse)}
    ${field('On paper', d.onPaper)}
    ${field('Honest note', d.evidenceNote, 'note')}
  </div>
  <p class="open"><a href="./?example=showcase-${esc(d.type)}">Open this diagram in the editor →</a></p>
</article>`;
}

/**
 * Render the whole standalone showcase page.
 * @param manifest parsed examples/showcase.json
 * @param assets   { svgs: {type: svgString}, titles: {type: modelTitle} }
 */
export function renderShowcase(manifest, { svgs, titles }) {
  const { intro, jobs, readingGuide, paperGuide, honesty, families, diagrams } = manifest;
  const byFamily = new Map(families.map((f) => [f.title, []]));
  for (const d of diagrams) byFamily.get(d.family)?.push(d);

  const jobCard = (j, i) =>
    `<li><p><span class="n">${i + 1}</span> <a href="#job-${esc(j.id)}">${esc(j.label)}</a></p>
      <p>${esc(j.summary)}</p></li>`;

  // The chooser doubles as a per-family table of contents.
  const famCard = (f) => {
    const items = byFamily.get(f.title) || [];
    const body = items.length
      ? `<ul>${items
          .map((d) => `<li><a href="#${slug(d.type)}">${esc(titles[d.type] || d.type)}</a></li>`)
          .join('')}</ul>`
      : `<p class="none">${esc(EMPTY_FAMILY_NOTE[f.id] || 'No diagram in this family yet.')}</p>`;
    return `<div class="fam"><h3>${esc(f.title)}</h3><p class="q">${esc(f.question)}</p>${body}</div>`;
  };

  // The gallery, grouped by family in registry order (families with no renderer are skipped here
  // but still appear in the chooser above, honestly noted).
  const gallery = families
    .filter((f) => (byFamily.get(f.title) || []).length)
    .map((f) => {
      const cards = byFamily
        .get(f.title)
        .map((d) => renderCard(d, svgs[d.type], titles[d.type] || d.type))
        .join('\n');
      return `<section class="famgroup" id="fam-${esc(f.id)}">
  <h2 class="section">${esc(f.title)}</h2>
  <p class="section-sub">${esc(f.question)}</p>
  ${cards}
</section>`;
    })
    .join('\n');

  const navLinks = families
    .filter((f) => (byFamily.get(f.title) || []).length)
    .map((f) => `<a href="#fam-${esc(f.id)}">${esc(f.title)}</a>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#0072b2" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a1722" media="(prefers-color-scheme: dark)" />
<meta name="description" content="${esc(intro.tagline)}" />
<link rel="icon" href="./favicon.svg" />
<title>${esc(intro.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#main">Skip to the diagrams</a>
<nav class="topnav" aria-label="Diagram families">
  <div class="row">
    <span class="brand">PsyUML showcase</span>
    <a href="#read">Read</a><a href="#paper">On paper</a><a href="#choose">Choose</a>
    ${navLinks}
    <a href="#honest">Honesty</a>
    <a href="./" style="margin-left:auto;font-weight:600;color:var(--accent)">← Editor</a>
  </div>
</nav>
<div class="wrap" id="top">
<header class="hero">
  <p class="herobar">
    <a class="backlink" href="./">← Back to the PsyUML editor</a>
    <button class="printbtn" type="button" onclick="window.print()">🖨 Print / Save as PDF</button>
  </p>
  <h1>${esc(intro.title)}</h1>
  <p class="tagline">${esc(intro.tagline)}</p>
  <p class="lede">${esc(intro.lede)}</p>
  <p class="banner"><strong>${esc(honesty[0])}</strong></p>
  <ul class="jobs">
    ${jobs.map(jobCard).join('\n    ')}
  </ul>
</header>

<main id="main">

<section id="read">
<h2 class="section" id="job-read">How to read these diagrams</h2>
<p class="section-sub">${esc(jobs.find((j) => j.id === 'read')?.summary || '')}</p>
<div class="guide">${readingGuide.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
</section>

<section id="paper">
<h2 class="section" id="job-paper">How to draw them on paper</h2>
<p class="section-sub">${esc(jobs.find((j) => j.id === 'paper')?.summary || '')}</p>
<div class="guide">${paperGuide.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
</section>

<section id="choose">
<h2 class="section" id="job-choose">Choose the right diagram</h2>
<p class="section-sub">${esc(jobs.find((j) => j.id === 'choose')?.summary || '')} Eight families, eight questions — jump to any of them.</p>
<div class="chooser">${families.map(famCard).join('')}</div>
</section>

<h2 class="section">The diagrams</h2>
<p class="section-sub">One worked, fully-rendered example of every diagram type, grouped by family. Each render is a real model — open the editor to build your own.</p>
${gallery}

<section class="honesty" id="honest">
<h2 class="section" id="job-honest" style="margin-top:.4rem">Use them honestly</h2>
<p class="section-sub">${esc(jobs.find((j) => j.id === 'honest')?.summary || '')}</p>
<ul>${honesty.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
</section>

</main>
<footer class="foot">
<p>Generated from the PsyUML repository — <code>examples/showcase.json</code> + the committed golden
renders. Every diagram is a real, validated model. Unvalidated v0.x — supports, and does not replace,
professional care. <a href="./">Back to the editor</a> · <a href="./handbook.html">Practitioner handbook</a> ·
<a href="./diagram-catalog.html">Full diagram catalogue</a>.</p>
</footer>
</div>
<a class="totop" href="#top" aria-label="Back to top">↑ Top</a>
</body>
</html>
`;
}

/** Read the manifest, the golden SVGs, and each model's title; write the page into public/. */
export function main() {
  const manifest = JSON.parse(readFileSync(join(examplesDir, 'showcase.json'), 'utf8'));
  const svgs = {};
  const titles = {};
  for (const d of manifest.diagrams) {
    svgs[d.type] = readFileSync(join(examplesDir, `showcase-${d.type}.svg`), 'utf8');
    const model = JSON.parse(readFileSync(join(examplesDir, `showcase-${d.type}.psyuml`), 'utf8'));
    titles[d.type] = model.meta?.title || d.type;
  }
  const html = renderShowcase(manifest, { svgs, titles });
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, 'showcase.html'), html);
  console.log(
    `rendered examples/showcase.json -> apps/web/public/showcase.html (${html.length} bytes, ${manifest.diagrams.length} diagrams)`,
  );
}

// Run when invoked directly (node scripts/build-showcase.mjs), not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
