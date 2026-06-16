/**
 * @psyuml/cli — headless `psyuml lint | render | convert` (M9).
 *
 * `run(argv, io)` is pure and side-effect-free except through the injected `CliIO`
 * (so it is unit-testable without a real filesystem or a built binary). `bin.ts` wires
 * `io` to Node and is bundled to a runnable script by `scripts/build-cli.mjs`.
 *
 * Validation-first: `lint` is the headline — it loads each model (JSON `.psyuml` or text
 * DSL, auto-detected), runs the same `@psyuml/validate` rules the editor uses, prints the
 * issues, and exits non-zero if any error-severity issue (or a load failure) is present —
 * so it can gate CI / a pre-commit hook the same way the editor gates export.
 *
 * Traceability: REQ-TEXT-DSL (CLI), REQ-WELLFORMEDNESS / REQ-PATH-OF-HOPE / REQ-SAFETY-TRIAGE
 * (lint surfaces them), REQ-NOTATION / REQ-ACCESSIBILITY (render), REQ-EXTENSION-MECH
 * (`lint-profile` validates a §K extension profile).
 */
import { parseModel, PSYUML_MODEL_VERSION, serializeModel, type PsyumlModel } from '@psyuml/model';
import { validate } from '@psyuml/validate';
import { validateProfile } from '@psyuml/profiles';
import { fromDSL, toDSL } from '@psyuml/grammar';
import { deidentify, redactionAudit, scopeToLayer } from '@psyuml/privacy';
import { toFhir, validateFhirBundle, type ExportScope, type FhirCoding } from '@psyuml/interop';
import {
  blankTemplate,
  renderBodyMap,
  renderDecisionChart,
  renderInterventionSeq,
  renderLoopMap,
  renderModeMap,
  renderPartsMap,
  renderRelationalField,
  renderResourceMap,
  renderRitual,
  renderStateMap,
  renderTimeline,
  renderTwoTriangles,
} from '@psyuml/render';

export interface CliIO {
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  out(line: string): void;
  err(line: string): void;
}

type Layer = 'clinician' | 'client';
type Renderer = (
  m: PsyumlModel,
  o?: { layer?: Layer; monochrome?: boolean },
) => { svg: string; altText: string };

const RENDERERS: Record<string, Renderer> = {
  'state-map': renderStateMap,
  'parts-map': renderPartsMap,
  'mode-map': renderModeMap,
  'relational-field': renderRelationalField,
  'body-map': renderBodyMap,
  'process-loop': renderLoopMap,
  timeline: renderTimeline,
  'intervention-sequence': renderInterventionSeq,
  ritual: renderRitual,
  'decision-nav': renderDecisionChart,
  'resource-anchor': renderResourceMap,
  'two-triangles': renderTwoTriangles,
};

const HELP = `psyuml — PsyUML formulation tooling

usage:
  psyuml lint <files...> [--layer clinician|client]
  psyuml render <file> [--layer clinician|client] [--color] [-o out.svg]
  psyuml convert <file> [-o out]      # JSON .psyuml <-> text DSL (auto-detected)
  psyuml redact <file> [--term NAME ...] [--for clinician|client] [-o out]   # de-identify (+ role-scope) before export
  psyuml export <file> [--fhir] [--scope record|client|research|teaching] [--no-deidentify] [--term NAME ...] [--code id=system|code|display ...] [-o out.json]   # lossy, export-only FHIR R4
  psyuml template <file> [--layer L] [--color] [-o out.svg]   # blank printable scaffold
  psyuml lint-profile <files...>      # validate a §K extension profile (JSON)
  psyuml help | version

Input is auto-detected: a leading "{" is parsed as JSON; otherwise as the text DSL.
lint exits non-zero if any error-severity issue or a load failure is found.`;

interface ZodLikeIssue {
  path?: (string | number)[];
  message: string;
}

/** Friendly error text. A zod validation error is rendered as `path: message` lines
 *  instead of dumping the raw issue array (which is developer-facing and noisy). */
const msg = (e: unknown): string => {
  if (
    e &&
    typeof e === 'object' &&
    'issues' in e &&
    Array.isArray((e as { issues: unknown }).issues)
  ) {
    const issues = (e as { issues: ZodLikeIssue[] }).issues;
    return issues.map((i) => `${(i.path ?? []).join('.') || '(root)'}: ${i.message}`).join('; ');
  }
  return e instanceof Error ? e.message : String(e);
};

/** Auto-detect JSON `.psyuml` vs text DSL and parse to a validated model. */
function loadModel(io: CliIO, path: string): PsyumlModel {
  const text = io.readFile(path);
  return text.trimStart().startsWith('{') ? parseModel(text) : fromDSL(text);
}

interface Args {
  files: string[];
  layer: Layer;
  out?: string;
  color: boolean;
  terms: string[];
  /** `--for <layer>`: role-scope a redacted export to a single layer (drops the other). */
  scope?: Layer;
}

function parseArgs(args: string[]): Args {
  const files: string[] = [];
  let layer: Layer = 'clinician';
  let out: string | undefined;
  let color = false;
  const terms: string[] = [];
  let scope: Layer | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--layer') layer = args[(i += 1)] === 'client' ? 'client' : 'clinician';
    else if (a === '--for') scope = args[(i += 1)] === 'client' ? 'client' : 'clinician';
    else if (a === '-o' || a === '--out') out = args[(i += 1)];
    else if (a === '--term') terms.push(args[(i += 1)] ?? '');
    else if (a === '--color') color = true;
    else if (a === '--mono' || a === '--monochrome') color = false;
    else if (!a.startsWith('-')) files.push(a);
  }
  return { files, layer, out, color, terms, scope };
}

function cmdLint(args: string[], io: CliIO): number {
  const { files, layer } = parseArgs(args);
  if (files.length === 0) {
    io.err('usage: psyuml lint <files...> [--layer clinician|client]');
    return 2;
  }
  let bad = false;
  for (const f of files) {
    let model: PsyumlModel;
    try {
      model = loadModel(io, f);
    } catch (e) {
      io.err(`${f}: load error — ${msg(e)}`);
      bad = true;
      continue;
    }
    const report = validate(model, { layer });
    if (report.issues.length === 0) io.out(`${f}: ✓ clean`);
    for (const issue of report.issues) {
      io.out(`${f}: ${issue.severity.toUpperCase()} ${issue.rule} — ${issue.message}`);
    }
    if (!report.ok) bad = true;
  }
  return bad ? 1 : 0;
}

function cmdRender(args: string[], io: CliIO): number {
  const { files, layer, out, color } = parseArgs(args);
  if (files.length !== 1) {
    io.err('usage: psyuml render <file> [--layer L] [--color] [-o out.svg]');
    return 2;
  }
  let model: PsyumlModel;
  try {
    model = loadModel(io, files[0]);
  } catch (e) {
    io.err(`${files[0]}: ${msg(e)}`);
    return 1;
  }
  const renderer = RENDERERS[model.diagram];
  if (!renderer) {
    io.err(`no renderer for diagram type "${model.diagram}"`);
    return 1;
  }
  const { svg } = renderer(model, { layer, monochrome: !color });
  if (out) {
    io.writeFile(out, svg);
    io.out(`wrote ${out}`);
  } else {
    io.out(svg);
  }
  return 0;
}

function cmdConvert(args: string[], io: CliIO): number {
  const { files, out } = parseArgs(args);
  if (files.length !== 1) {
    io.err('usage: psyuml convert <file> [-o out]');
    return 2;
  }
  let result: string;
  try {
    const text = io.readFile(files[0]);
    result = text.trimStart().startsWith('{')
      ? toDSL(parseModel(text)) // JSON -> DSL
      : serializeModel(fromDSL(text)); // DSL -> JSON
  } catch (e) {
    io.err(`${files[0]}: ${msg(e)}`);
    return 1;
  }
  if (out) {
    io.writeFile(out, result);
    io.out(`wrote ${out}`);
  } else {
    io.out(result);
  }
  return 0;
}

function cmdRedact(args: string[], io: CliIO): number {
  const { files, out, terms, scope } = parseArgs(args);
  if (files.length !== 1) {
    io.err('usage: psyuml redact <file> [--term NAME ...] [--for clinician|client] [-o out]');
    return 2;
  }
  let model: PsyumlModel;
  try {
    model = loadModel(io, files[0]);
  } catch (e) {
    io.err(`${files[0]}: ${msg(e)}`);
    return 1;
  }
  const { model: deident, redactions } = deidentify(model, { terms });
  // Optional role-scoped export: collapse to one layer (drops the other layer's wording,
  // and for the client also drops hidden nodes) — REQ-PRIVACY role-scoped export.
  const clean = scope ? scopeToLayer(deident, scope) : deident;
  const json = serializeModel(clean);
  if (out) {
    io.writeFile(out, json);
    io.out(`wrote ${out}`);
  } else {
    io.out(json);
  }
  const audit = redactionAudit(redactions);
  io.err(`redacted ${audit.total} item(s)${scope ? ` · scoped to ${scope} layer` : ''}`);
  for (const line of audit.lines) io.err(`  ${line}`); // de-identification audit trail
  // Consent is a share-time concern (§L.2-r5): when preparing a client artifact, confirm consent.
  if (scope === 'client' && model.meta.consent?.obtained !== true) {
    io.err(
      'note: no client consent recorded (meta.consent.obtained) — confirm consent before sharing.',
    );
  }
  // Surface a --term that matched nothing, so a misspelled/ill-formed term can't masquerade
  // as a successful de-identification (defense-in-depth for the privacy guarantee).
  const matchedTerms = new Set(
    redactions.filter((r) => r.kind === 'term').map((r) => r.original.toLowerCase()),
  );
  const unmatched = terms.filter((t) => !matchedTerms.has(t.toLowerCase()));
  if (unmatched.length > 0) {
    io.err(`note: these --term values matched nothing: ${unmatched.join(', ')}`);
  }
  return 0;
}

function cmdTemplate(args: string[], io: CliIO): number {
  const { files, layer, out, color } = parseArgs(args);
  if (files.length !== 1) {
    io.err('usage: psyuml template <file> [--layer L] [--color] [-o out.svg]');
    return 2;
  }
  let model: PsyumlModel;
  try {
    model = blankTemplate(loadModel(io, files[0]));
  } catch (e) {
    io.err(`${files[0]}: ${msg(e)}`);
    return 1;
  }
  const renderer = RENDERERS[model.diagram];
  if (!renderer) {
    io.err(`no renderer for diagram type "${model.diagram}"`);
    return 1;
  }
  const { svg } = renderer(model, { layer, monochrome: !color });
  if (out) {
    io.writeFile(out, svg);
    io.out(`wrote ${out}`);
  } else {
    io.out(svg);
  }
  return 0;
}

function cmdLintProfile(args: string[], io: CliIO): number {
  const { files } = parseArgs(args);
  if (files.length === 0) {
    io.err('usage: psyuml lint-profile <files...>');
    return 2;
  }
  let bad = false;
  for (const f of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(io.readFile(f));
    } catch (e) {
      io.err(`${f}: load error — ${msg(e)}`);
      bad = true;
      continue;
    }
    const report = validateProfile(raw);
    if (report.issues.length === 0) io.out(`${f}: ✓ clean`);
    for (const issue of report.issues) {
      const where = issue.stereotype ? ` «${issue.stereotype}»` : '';
      io.out(`${f}: ${issue.severity.toUpperCase()} ${issue.rule}${where} — ${issue.message}`);
    }
    if (!report.ok) bad = true;
  }
  return bad ? 1 : 0;
}

function cmdExport(args: string[], io: CliIO): number {
  const VALID: ExportScope[] = ['record', 'client', 'research', 'teaching'];
  let scope: ExportScope = 'record';
  let deid = true;
  const terms: string[] = [];
  const coding: Record<string, FhirCoding> = {};
  const files: string[] = [];
  let out: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--scope') scope = args[(i += 1)] as ExportScope;
    else if (a === '--no-deidentify') deid = false;
    else if (a === '--term') terms.push(args[(i += 1)] ?? '');
    else if (a === '--code') {
      // --code nodeId=system|code[|display] — caller-supplied terminology binding (never fabricated)
      const [id, spec] = (args[(i += 1)] ?? '').split('=');
      const [system, code, display] = (spec ?? '').split('|');
      if (id && system && code) coding[id] = display ? { system, code, display } : { system, code };
      else {
        io.err('usage: --code <nodeId>=<system>|<code>[|<display>]');
        return 2;
      }
    } else if (a === '-o' || a === '--out') out = args[(i += 1)];
    else if (a === '--fhir')
      continue; // FHIR is the only format; accepted for clarity
    else if (!a.startsWith('-')) files.push(a);
  }
  if (files.length !== 1) {
    io.err(
      'usage: psyuml export <file> [--fhir] [--scope record|client|research|teaching] [--no-deidentify] [--term NAME ...] [--code id=system|code|display ...] [-o out.json]',
    );
    return 2;
  }
  if (!VALID.includes(scope)) {
    io.err(`unknown --scope "${scope}" (expected: ${VALID.join(', ')})`);
    return 2;
  }
  let model: PsyumlModel;
  try {
    model = loadModel(io, files[0]);
  } catch (e) {
    io.err(`${files[0]}: ${msg(e)}`);
    return 1;
  }
  const res = toFhir(model, { scope, deidentify: deid, redactTerms: terms, coding });
  const check = validateFhirBundle(res.bundle); // sanity-check our own output before emitting
  const json = JSON.stringify(res.bundle, null, 2);
  if (out) {
    io.writeFile(out, json);
    io.out(`wrote ${out}`);
  } else {
    io.out(json);
  }
  // The honest companion to the bundle: this is lossy + export-only (§7).
  io.err(`FHIR R4 export (lossy, export-only) · scope=${scope}${deid ? ' · de-identified' : ''}`);
  io.err(`round-trip not supported; ${res.loss.items.length} documented limitation(s):`);
  for (const item of res.loss.items) io.err(`  - ${item.what}: ${item.detail}`);
  for (const i of check.issues) io.err(`  ! ${i.rule}: ${i.message}`);
  // Consent is a share-time concern (§L.2-r5): warn before a shareable/research artifact.
  if ((scope === 'research' || scope === 'client') && model.meta.consent?.obtained !== true) {
    io.err(
      'note: no client consent recorded (meta.consent.obtained) — confirm consent before sharing.',
    );
  }
  return check.ok ? 0 : 1;
}

/** Dispatch a `psyuml` invocation. Returns the process exit code. */
export function run(argv: string[], io: CliIO): number {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'lint':
      return cmdLint(rest, io);
    case 'lint-profile':
      return cmdLintProfile(rest, io);
    case 'render':
      return cmdRender(rest, io);
    case 'convert':
      return cmdConvert(rest, io);
    case 'redact':
      return cmdRedact(rest, io);
    case 'export':
      return cmdExport(rest, io);
    case 'template':
      return cmdTemplate(rest, io);
    case 'version':
    case '--version':
    case '-v':
      io.out(PSYUML_MODEL_VERSION);
      return 0;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      io.out(HELP);
      return 0;
    default:
      io.err(`unknown command: ${cmd}\n\n${HELP}`);
      return 2;
  }
}
