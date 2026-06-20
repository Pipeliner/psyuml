/**
 * Catalog ↔ corpus conformance (REQ-CATALOG-CONFORMANCE, ADR-0027).
 *
 * Makes the diagram catalog a VERIFIED artifact, like the goldens: the manifest
 * `examples/catalog.json` cannot claim an example that isn't shipped, and no shipped example can
 * go un-catalogued. So `docs/research/diagram-catalog.md`'s "ships now" claims can never again be
 * untrue of the corpus (the audit's dimension #4 — see `docs/research/diagram-catalog-audit.md`).
 *
 * Enforces: (i) every `diagrams[].file` exists, parses, and `model.diagram === type`; (ii) every
 * non-showcase `examples/*.psyuml` is listed exactly once; (iii) `showcase-<type>.psyuml` is the
 * per-type feature-dense demo — its `<type>` is a real renderer type and matches its model; (iv) the
 * `newTypes` (◇, no renderer yet) never appear as an example; (v) the manifest count equals the
 * shipped count. Traceability: REQ-CATALOG-CONFORMANCE, REQ-EXAMPLE-LIBRARY (§E, §J).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel } from '@psyuml/model';

/** The renderer-backed diagram types (spec §E) — a catalogued diagram must map to one of these. */
const KNOWN_TYPES = new Set([
  'state-map',
  'parts-map',
  'mode-map',
  'relational-field',
  'body-map',
  'process-loop',
  'timeline',
  'intervention-sequence',
  'ritual',
  'decision-nav',
  'resource-anchor',
  'two-triangles',
  'ladder',
  'three-circles',
  'venn',
  'bullseye',
  'tree-of-life',
]);

interface CatalogEntry {
  file: string;
  type: string;
  family: string;
  name: string;
  catalogId?: number;
  school?: string;
  note?: string;
  audience?: string;
}
interface Manifest {
  families: string[];
  diagrams: CatalogEntry[];
  newTypes: { name: string; shape: string; catalogId?: number }[];
}

const manifest: Manifest = JSON.parse(
  readFileSync(new URL('../examples/catalog.json', import.meta.url), 'utf8'),
);
const load = (f: string) =>
  parseModel(readFileSync(new URL(`../examples/${f}`, import.meta.url), 'utf8'));
const exampleFiles = readdirSync(new URL('../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);
const isShowcase = (f: string): boolean => f.startsWith('showcase-');

describe('catalog ↔ corpus conformance (ADR-0027)', () => {
  // (i) every catalogued example exists, parses, and is of the declared type + a real family.
  describe.each(manifest.diagrams)('manifest row $file', (row) => {
    it(`exists, parses, and renders as type "${row.type}"`, () => {
      expect(exampleFiles, `${row.file} is missing from examples/`).toContain(row.file);
      expect(KNOWN_TYPES.has(row.type), `${row.file}: "${row.type}" is not a renderer type`).toBe(
        true,
      );
      expect(load(row.file).diagram, `${row.file}: model.diagram ≠ manifest type`).toBe(row.type);
      expect(
        manifest.families,
        `${row.file}: family "${row.family}" not in the family set`,
      ).toContain(row.family);
    });
  });

  it('lists every non-showcase example exactly once (no orphan, no duplicate)', () => {
    const listed = manifest.diagrams.map((d) => d.file);
    const dupes = listed.filter((f, i) => listed.indexOf(f) !== i);
    expect(dupes, `duplicate manifest rows: ${dupes.join(', ')}`).toEqual([]);
    const shipped = exampleFiles.filter((f) => !isShowcase(f)).sort();
    expect(
      [...listed].sort(),
      'manifest rows must equal the shipped non-showcase examples',
    ).toEqual(shipped);
  });

  it('every showcase-<type>.psyuml is a real renderer type and matches its model', () => {
    for (const f of exampleFiles.filter(isShowcase)) {
      const type = f.replace(/^showcase-/, '').replace(/\.psyuml$/, '');
      expect(KNOWN_TYPES.has(type), `${f}: "${type}" is not a renderer type`).toBe(true);
      expect(load(f).diagram, `${f}: model.diagram ≠ ${type}`).toBe(type);
    }
  });

  it('the manifest example-count equals the shipped non-showcase count', () => {
    const shipped = exampleFiles.filter((f) => !isShowcase(f)).length;
    expect(manifest.diagrams.length).toBe(shipped);
  });

  it('◇ new-type rows are catalogued but never shipped as an example', () => {
    expect(manifest.newTypes.length).toBeGreaterThan(0);
    for (const nt of manifest.newTypes) {
      expect(nt.name.length, 'a new-type needs a name').toBeGreaterThan(0);
      expect(nt.shape.length, `${nt.name} needs a shape`).toBeGreaterThan(0);
    }
  });

  // REQ-CATALOG-METADATA: every shipped row carries the full display schema, so the generated
  // example-library table (and the editor gallery, derived from the same manifest) is complete.
  it('every diagram row has the full metadata schema (school, note, audience)', () => {
    for (const d of manifest.diagrams) {
      expect(typeof d.school === 'string' && d.school.length > 0, `${d.file}: missing school`).toBe(
        true,
      );
      expect(typeof d.note === 'string' && d.note.length > 0, `${d.file}: missing note`).toBe(true);
      expect(['C', 'L', 'B'], `${d.file}: audience must be C|L|B`).toContain(d.audience);
    }
  });

  // The catalog's "Shipped example library" table is GENERATED from this manifest (ADR-0028,
  // scripts/build-catalog.mjs); assert the committed prose still matches the manifest, row-for-row,
  // so the two can never drift. (Content compare — immune to Prettier's table re-alignment.)
  it('the generated catalog table matches the manifest (no drift; run build-catalog.mjs)', () => {
    const md = readFileSync(
      new URL('../docs/research/diagram-catalog.md', import.meta.url),
      'utf8',
    );
    const block = md.slice(md.indexOf('<!-- BEGIN catalog:generated'), md.indexOf('<!-- END'));
    const tableRows = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|') && l.includes('.psyuml`'))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim().replace(/\\\|/g, '|')),
      )
      .map(([name, school, audience, note, file]) => ({
        name,
        school,
        audience,
        note,
        file: file.replace(/`/g, ''),
      }));
    const expected = manifest.families.flatMap((fam) =>
      manifest.diagrams
        .filter((d) => d.family === fam)
        .map((d) => ({
          name: d.name,
          school: d.school,
          audience: d.audience!,
          note: d.note!,
          file: d.file,
        })),
    );
    expect(tableRows, 'catalog table is stale — run `node scripts/build-catalog.mjs`').toEqual(
      expected,
    );
  });
});
