/**
 * Documentation ↔ system conformance (REQ-DOC-CONFORMANCE, ADR-0043).
 *
 * Makes the load-bearing FACTUAL claims in the docs UN-DRIFTABLE: the doc-stated diagram-type
 * count + list, the family count, and per-type ★ showcase coverage are derived from the SYSTEM
 * (`DiagramType.options`, `FAMILIES`, the `examples/` corpus) and asserted against the prose. A doc
 * that says "12 diagram types", or a quick-guide table missing a renderer, fails CI — so the drift
 * a human had to fix can never silently return. Companion to `catalog.test.ts` (catalog prose ↔
 * corpus) and the catalog's own generated-table drift check. Traceability: REQ-DOC-CONFORMANCE,
 * REQ-HANDBOOK (§E, §J).
 *
 * Scope (honest): the cited-research archive (`docs/research/**`) is a DATED snapshot with its own
 * drift check and is excluded; append-only ADR history (`sdd/adr/**`) is not a live doc. A digit
 * glued to a version or identifier ("v0.1 diagram types", "v0.2 families", "M15") is not a count —
 * a `(?<![.\w])` lookbehind excludes those, so only standalone count claims ("12 diagram types")
 * are asserted. Historical milestone counts written as prose still need real care.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DiagramType } from '@psyuml/model';
import { FAMILIES } from '@psyuml/profiles';

const TYPE_COUNT = DiagramType.options.length; // the single source of truth
const FAMILY_COUNT = FAMILIES.length;
const examples = readdirSync('examples');
const SHOWCASE_COUNT = examples.filter(
  (f) => f.startsWith('showcase-') && f.endsWith('.psyuml'),
).length;

const read = (p: string): string => readFileSync(p, 'utf8');
/** Strip markdown emphasis so "8 **families**" / "12 *types*" scan as plain text. */
const plain = (s: string): string => s.replace(/[*`_]/g, '');

/** Recursively collect `.md` files under `dir`, skipping paths the predicate rejects. */
function mdFiles(dir: string, skip: (p: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip(p)) continue;
    if (statSync(p).isDirectory()) out.push(...mdFiles(p, skip));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

// The LIVE docs whose factual claims must track the system. The cited-research archive
// (docs/research/**) is a dated snapshot (own drift check); ADR history lives under sdd/.
const DOCS = [
  ...mdFiles('docs', (p) => p.includes(`docs/research`)),
  'packages/model/IMPACT.md',
  'packages/render/IMPACT.md',
  'packages/profiles/IMPACT.md',
  'packages/validate/IMPACT.md',
  'packages/grammar/IMPACT.md',
  'apps/web/IMPACT.md',
];

describe('docs ↔ system conformance (REQ-DOC-CONFORMANCE, ADR-0043)', () => {
  it('the format-reference diagram-type quick-guide lists EXACTLY the renderer types', () => {
    const md = read('docs/format-reference.md');
    const section = md.slice(md.indexOf('## Diagram types'));
    // skip the header row (whose first cell is the literal column name `diagram`): start at the
    // `|---|…` separator so only DATA rows are scanned.
    const body = section.slice(section.indexOf('|---'));
    // each authoring-guide row is "| `<type>` | …" — the first backtick'd cell is the diagram id
    const listed = [...body.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]);
    expect(new Set(listed), 'the quick-guide table must list exactly DiagramType.options').toEqual(
      new Set(DiagramType.options),
    );
    expect(listed.length, 'no duplicate rows').toBe(TYPE_COUNT);
  });

  it.each(DOCS)('%s — every "N diagram types/renderers" claim equals the renderer count', (doc) => {
    const text = plain(read(doc));
    // `(?<![.\w])` rejects a digit glued to a version/identifier ("v0.1 diagram types", "M15") —
    // those are not counts; a genuine count claim ("12 diagram types") always has a separator before it.
    for (const m of text.matchAll(/(?<![.\w])(\d+)\s+diagram\s+(types|renderers)\b/gi)) {
      expect(Number(m[1]), `${doc}: "${m[0].trim()}" should be ${TYPE_COUNT}`).toBe(TYPE_COUNT);
    }
  });

  it.each(DOCS)('%s — every "N families" claim equals the family count', (doc) => {
    const text = plain(read(doc));
    // `(?<![.\w])` rejects version/identifier digits ("v0.2 families") — see the diagram-types claim above.
    for (const m of text.matchAll(/(?<![.\w])(\d+)\s+families\b/gi)) {
      expect(Number(m[1]), `${doc}: "${m[0].trim()}" should be ${FAMILY_COUNT}`).toBe(FAMILY_COUNT);
    }
  });

  it('there is exactly one ★ showcase per diagram type (structural, drift-proof)', () => {
    expect(SHOWCASE_COUNT, 'one showcase-<type>.psyuml per renderer type').toBe(TYPE_COUNT);
    for (const t of DiagramType.options) {
      expect(examples, `missing showcase-${t}.psyuml`).toContain(`showcase-${t}.psyuml`);
    }
  });
});
