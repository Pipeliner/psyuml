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
 * (lint surfaces them), REQ-NOTATION / REQ-ACCESSIBILITY (render).
 */
import { parseModel, PSYUML_MODEL_VERSION, serializeModel, type PsyumlModel } from '@psyuml/model';
import { validate } from '@psyuml/validate';
import { fromDSL, toDSL } from '@psyuml/grammar';
import {
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
  psyuml help | version

Input is auto-detected: a leading "{" is parsed as JSON; otherwise as the text DSL.
lint exits non-zero if any error-severity issue or a load failure is found.`;

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

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
}

function parseArgs(args: string[]): Args {
  const files: string[] = [];
  let layer: Layer = 'clinician';
  let out: string | undefined;
  let color = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--layer') layer = args[(i += 1)] === 'client' ? 'client' : 'clinician';
    else if (a === '-o' || a === '--out') out = args[(i += 1)];
    else if (a === '--color') color = true;
    else if (a === '--mono' || a === '--monochrome') color = false;
    else if (!a.startsWith('-')) files.push(a);
  }
  return { files, layer, out, color };
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

/** Dispatch a `psyuml` invocation. Returns the process exit code. */
export function run(argv: string[], io: CliIO): number {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'lint':
      return cmdLint(rest, io);
    case 'render':
      return cmdRender(rest, io);
    case 'convert':
      return cmdConvert(rest, io);
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
