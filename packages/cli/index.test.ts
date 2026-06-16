import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { run, type CliIO } from './index';

/** A CliIO backed by the real example files, with an optional in-memory override map
 *  and captured output, so `run` can be exercised without touching the disk for writes. */
function fakeIO(files: Record<string, string> = {}): CliIO & {
  stdout: string[];
  stderr: string[];
  written: Record<string, string>;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const written: Record<string, string> = {};
  return {
    stdout,
    stderr,
    written,
    readFile: (p) =>
      p in files ? files[p] : readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'),
    writeFile: (p, d) => {
      written[p] = d;
    },
    out: (s) => stdout.push(s),
    err: (s) => stderr.push(s),
  };
}

describe('psyuml cli', () => {
  it('lint reports a clean example and exits 0', () => {
    const io = fakeIO();
    const code = run(['lint', 'examples/state-map.psyuml'], io);
    expect(code).toBe(0);
    expect(io.stdout.join('\n')).toContain('✓ clean');
  });

  it('lint exits 1 and reports the rule on a model with an error', () => {
    const io = fakeIO({
      'bad.psyuml': JSON.stringify({
        version: '0.1.0',
        diagram: 'state-map',
        nodes: [{ id: 'a', kind: 'state', label: { clinician: { en: 'A' } } }],
        edges: [{ id: 'x', kind: 'sequential', source: 'a', target: 'ghost' }],
      }),
    });
    const code = run(['lint', 'bad.psyuml'], io);
    expect(code).toBe(1);
    expect(io.stdout.join('\n')).toContain('wf.edge-endpoints');
  });

  it('reports an invalid model with a readable message, not a raw zod array', () => {
    const io = fakeIO({
      'bad-enum.psyuml': JSON.stringify({ version: '0.1.0', diagram: 'not-a-real-type' }),
    });
    const code = run(['lint', 'bad-enum.psyuml'], io);
    expect(code).toBe(1);
    const err = io.stderr.join('\n');
    expect(err).toContain('diagram:'); // path-prefixed, friendly
    expect(err).not.toContain('"code"'); // not the raw zod issue dump
  });

  it('lint accepts the text DSL too (auto-detected)', () => {
    const io = fakeIO({ 'm.psy': 'diagram parts-map\nnode self self label="Self"\n' });
    const code = run(['lint', 'm.psy'], io);
    expect(typeof code).toBe('number');
    expect(io.stdout.join('\n')).toContain('m.psy:');
  });

  it('render writes a monochrome SVG to the output file', () => {
    const io = fakeIO();
    const code = run(['render', 'examples/state-map.psyuml', '-o', 'out.svg'], io);
    expect(code).toBe(0);
    expect(io.written['out.svg'].startsWith('<svg')).toBe(true);
    expect(io.written['out.svg']).toContain('role="img"');
    expect(io.written['out.svg'].toLowerCase()).not.toMatch(/#(009e73|e69f00|d55e00)/);
  });

  it('convert turns JSON into the text DSL', () => {
    const io = fakeIO();
    const code = run(['convert', 'examples/state-map.psyuml'], io);
    expect(code).toBe(0);
    expect(io.stdout.join('\n')).toContain('diagram state-map');
  });

  it('convert turns the text DSL into JSON', () => {
    const io = fakeIO({ 'm.psy': 'diagram state-map\nnode a state label="Hi"\n' });
    const code = run(['convert', 'm.psy'], io);
    expect(code).toBe(0);
    expect(io.stdout.join('\n')).toContain('"diagram": "state-map"');
  });

  it('redact de-identifies labels and reports the count on stderr', () => {
    const io = fakeIO({
      'pii.psyuml': JSON.stringify({
        version: '0.1.0',
        diagram: 'state-map',
        meta: { disclaimer: 'x' },
        nodes: [
          { id: 'a', kind: 'state', label: { clinician: { en: 'ask Jo or email jo@x.io' } } },
        ],
      }),
    });
    const code = run(['redact', 'pii.psyuml', '--term', 'Jo'], io);
    expect(code).toBe(0);
    expect(io.stdout.join('\n')).toContain('[email]');
    expect(io.stdout.join('\n')).toContain('[name]');
    expect(io.stdout.join('\n')).not.toContain('jo@x.io');
    expect(io.stderr.join('\n')).toContain('redacted');
  });

  it('redact warns when a --term matched nothing (no silent privacy failure)', () => {
    const io = fakeIO();
    const code = run(['redact', 'examples/state-map.psyuml', '--term', 'Nonexistent'], io);
    expect(code).toBe(0);
    expect(io.stderr.join('\n')).toContain('matched nothing: Nonexistent');
  });

  it('redact --for client role-scopes the export and reports it', () => {
    const io = fakeIO({
      'dual.psyuml': JSON.stringify({
        version: '0.1.0',
        diagram: 'state-map',
        meta: { disclaimer: 'x' },
        nodes: [
          {
            id: 'a',
            kind: 'state',
            label: { clinician: { en: 'Hypervigilant (clinical)' }, client: { en: 'On edge' } },
          },
        ],
      }),
    });
    const code = run(['redact', 'dual.psyuml', '--for', 'client', '-o', 'client.psyuml'], io);
    expect(code).toBe(0);
    expect(io.written['client.psyuml']).toContain('On edge');
    expect(io.written['client.psyuml']).not.toContain('clinical'); // clinician wording dropped
    expect(io.stderr.join('\n')).toContain('scoped to client layer');
    expect(io.stderr.join('\n')).toContain('no client consent recorded'); // share-time consent check
  });

  it('template renders a blank printable scaffold (no original labels)', () => {
    const io = fakeIO();
    const code = run(['template', 'examples/state-map.psyuml', '-o', 'blank.svg'], io);
    expect(code).toBe(0);
    expect(io.written['blank.svg'].startsWith('<svg')).toBe(true);
    expect(io.written['blank.svg']).toContain('(state…)');
    expect(io.written['blank.svg']).not.toContain('Calm / connected');
  });

  it('lint-profile passes a well-formed §K profile and fails a rule-breaking one', () => {
    const ok = fakeIO({
      'p.json': JSON.stringify({
        id: 'demo',
        title: 'Demo',
        version: '0.1.0',
        stereotypes: [
          {
            id: 's',
            base: 'agent',
            glyph: '♣',
            hand: 'circle w/ clover',
            nonColor: 'circle + label',
            synonyms: ['demo'],
            compat: Object.fromEntries(
              [
                'state-map',
                'parts-map',
                'relational-field',
                'process-loop',
                'timeline',
                'intervention-sequence',
                'ritual',
                'decision-nav',
                'resource-anchor',
                'body-map',
                'mode-map',
                'two-triangles',
              ].map((t) => [t, 'ok']),
            ),
          },
        ],
      }),
    });
    expect(run(['lint-profile', 'p.json'], ok)).toBe(0);
    expect(ok.stdout.join('\n')).toContain('✓ clean');

    // base not a core element + Tier-1 claim → exit 1, rules named
    const bad = fakeIO({
      'bad.json': JSON.stringify({
        id: 'x',
        title: 'X',
        version: '0.1.0',
        stereotypes: [
          {
            id: 'bad',
            base: 'not-a-kind',
            tier: 1,
            glyph: '◎',
            hand: 'h',
            nonColor: 'n',
            synonyms: ['z'],
            compat: {},
          },
        ],
      }),
    });
    expect(run(['lint-profile', 'bad.json'], bad)).toBe(1);
    const out = bad.stdout.join('\n');
    expect(out).toContain('profile.base-not-core');
    expect(out).toContain('profile.glyph-collision');
  });

  it('help and version succeed; unknown command and no-files fail', () => {
    const help = fakeIO();
    expect(run(['help'], help)).toBe(0);
    expect(help.stdout.join('\n')).toContain('usage:');
    expect(run(['version'], fakeIO())).toBe(0);
    expect(run(['wat'], fakeIO())).toBe(2);
    expect(run(['lint'], fakeIO())).toBe(2);
  });
});

describe('psyuml export (lossy FHIR, v0.2 §7)', () => {
  it('emits a FHIR document Bundle, de-identified by default, with a documented loss note', () => {
    const io = fakeIO();
    const code = run(['export', 'examples/state-map.psyuml'], io);
    expect(code).toBe(0);
    const bundle = JSON.parse(io.stdout.join('\n'));
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry[0].resource.resourceType).toBe('Composition');
    expect(io.stdout.join('\n')).toContain('Patient/anonymous'); // de-identified subject
    const err = io.stderr.join('\n');
    expect(err).toContain('lossy, export-only');
    expect(err).toContain('round-trip not supported');
  });

  it('writes to -o and warns about consent for a research-scoped export', () => {
    const io = fakeIO();
    const code = run(
      ['export', 'examples/state-map.psyuml', '--scope', 'research', '-o', 'out.json'],
      io,
    );
    expect(code).toBe(0);
    expect(io.written['out.json']).toContain('"resourceType": "Bundle"');
    expect(io.stderr.join('\n')).toContain('no client consent recorded');
  });

  it('rejects an unknown scope', () => {
    const io = fakeIO();
    expect(run(['export', 'examples/state-map.psyuml', '--scope', 'public'], io)).toBe(2);
    expect(io.stderr.join('\n')).toContain('unknown --scope');
  });

  it('binds a caller-supplied --code to a node Observation', () => {
    const io = fakeIO({
      'm.psyuml': JSON.stringify({
        version: '0.1.0',
        diagram: 'state-map',
        meta: { disclaimer: 'x' },
        nodes: [{ id: 'numb', kind: 'state', label: { clinician: { en: 'Numb' } } }],
      }),
    });
    const code = run(
      [
        'export',
        'm.psyuml',
        '--no-deidentify',
        '--code',
        'numb=http://snomed.info/sct|247750002|Numb',
      ],
      io,
    );
    expect(code).toBe(0);
    const bundle = JSON.parse(io.stdout.join('\n'));
    const obs = bundle.entry.find(
      (e: { resource: { resourceType: string } }) => e.resource.resourceType === 'Observation',
    );
    expect(obs.resource.code.coding[0].system).toBe('http://snomed.info/sct');
    expect(obs.resource.code.coding[0].code).toBe('247750002');
  });

  it('rejects a malformed --code', () => {
    const io = fakeIO();
    expect(run(['export', 'examples/state-map.psyuml', '--code', 'oops'], io)).toBe(2);
    expect(io.stderr.join('\n')).toContain('--code');
  });
});
