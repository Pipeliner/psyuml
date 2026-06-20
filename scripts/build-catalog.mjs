/**
 * Generate the catalog's "Shipped example library" tables FROM `examples/catalog.json`
 * (REQ-CATALOG-METADATA, ADR-0028), so the prose and the manifest cannot drift: the manifest is the
 * single source, this writes the per-family tables into `docs/research/diagram-catalog.md` between
 * the markers below. Run by `dev`/`build` (package.json) and guarded by `conformance/catalog.test.ts`
 * (a drift check). Pure `renderTables` is exported so the test reasons about the same output.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MD = new URL('../docs/research/diagram-catalog.md', import.meta.url);
const MANIFEST = new URL('../examples/catalog.json', import.meta.url);
export const BEGIN = '<!-- BEGIN catalog:generated -->';
export const END = '<!-- END catalog:generated -->';

const esc = (s) => String(s).replace(/\|/g, '\\|');

/** The per-family markdown tables for the shipped example library, derived from the manifest. */
export function renderTables(manifest) {
  const out = [];
  for (const fam of manifest.families) {
    const rows = manifest.diagrams.filter((d) => d.family === fam);
    if (!rows.length) continue;
    out.push(`### ${fam}`, '');
    out.push('| Diagram | School | Aud. | What it shows (honest note) | Example |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const d of rows) {
      out.push(
        `| ${esc(d.name)} | ${esc(d.school)} | ${d.audience} | ${esc(d.note)} | \`${d.file}\` |`,
      );
    }
    out.push('');
  }
  return out.join('\n').trimEnd();
}

/** The full marker-delimited block (header + tables). */
export function buildBlock(manifest) {
  const head =
    `_Generated from \`examples/catalog.json\` by \`scripts/build-catalog.mjs\` — do not edit by hand. ` +
    `${manifest.diagrams.length} shipped examples across ${manifest.families.length} families, each a ` +
    `verified row (ADR-0027/0028). Audience: **C** clinician · **L** client · **B** both._`;
  return `${BEGIN}\n\n${head}\n\n${renderTables(manifest)}\n\n${END}`;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replace the marker block in `md` with a freshly-generated one. */
export function regenerate(md, manifest) {
  const re = new RegExp(`${escRe(BEGIN)}[\\s\\S]*?${escRe(END)}`);
  if (!re.test(md)) throw new Error('diagram-catalog.md is missing the catalog:generated markers');
  return md.replace(re, buildBlock(manifest));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  writeFileSync(MD, regenerate(readFileSync(MD, 'utf8'), manifest));
  console.log(`catalog tables regenerated: ${manifest.diagrams.length} rows`);
}
