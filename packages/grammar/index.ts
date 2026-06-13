/**
 * @psyuml/grammar — a human-writable text surface for the model (M9).
 *
 * `toDSL(model)` emits a line-oriented text form; `fromDSL(text)` parses it back through
 * `parseModel` (so zod defaults + validation apply). The pair is a **lossless round-trip**
 * for the canonical corpus: `fromDSL(toDSL(parseModel(x)))` deep-equals `parseModel(x)`.
 * Because both sides are `parseModel`-normalized, default-valued fields (tier 1, pattern
 * none, empty properties, the safety flags) are *omitted* in the text and reconstituted on
 * parse — keeping the surface terse without losing meaning.
 *
 * Grammar (one statement per line; `#` starts a comment; blank lines ignored):
 *   diagram <type>             lang <code>            version <semver>
 *   title "…"  disclaimer "…"  crisis "…"            flag acute|psychosis
 *   ritual framing="…" secular="…"
 *   band <id> order=<n> [pattern=<p>] label="…"
 *   node <id> <kind> [stereotype=… tier=… band=… pos=x,y hidden=true <prop>=… ] label="…" [client="…"]
 *   edge <id> <src> <kind> <tgt> [loop=R|B <prop>=… trigger="…" ] [label="…" client="…"]
 * Free text is double-quoted (with \" and \\ escapes); a label that is not single-language
 * in the model's `lang` falls back to `labeljson="<json>"` so any label stays lossless.
 *
 * Traceability: REQ-TEXT-DSL (§B/§C notation tables are authoritative).
 */
import { parseModel, type Label, type PsyumlModel } from '@psyuml/model';

const DEFAULT_VERSION = '0.1.0';
const NUMERIC_PROPS = ['dominance', 'intensity', 'valence', 'rigidity', 'weight'] as const;

const q = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function unq(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  return s;
}

/** Split a line into tokens, keeping quoted runs (and their \" escapes) intact. */
function splitTokens(line: string): string[] {
  const toks: string[] = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    while (i < n && line[i] === ' ') i += 1;
    if (i >= n) break;
    let tok = '';
    while (i < n && line[i] !== ' ') {
      if (line[i] === '"') {
        tok += '"';
        i += 1;
        while (i < n && line[i] !== '"') {
          if (line[i] === '\\' && i + 1 < n) {
            tok += line[i] + line[i + 1];
            i += 2;
          } else {
            tok += line[i];
            i += 1;
          }
        }
        if (i < n) {
          tok += '"';
          i += 1;
        }
      } else {
        tok += line[i];
        i += 1;
      }
    }
    toks.push(tok);
  }
  return toks;
}

/** Parse the trailing `key=value` tokens of a statement (value may be quoted). */
function parseOpts(tokens: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    o[t.slice(0, eq)] = unq(t.slice(eq + 1));
  }
  return o;
}

// ---- label encode / decode ----------------------------------------------------------

function labelTokens(
  label: Label,
  lang: string,
  mainKey: string,
  clientKey: string,
  jsonKey: string,
): string {
  const clinKeys = Object.keys(label.clinician);
  const simpleClin = clinKeys.length === 1 && clinKeys[0] === lang;
  let simpleClient = true;
  if (label.client) {
    const ck = Object.keys(label.client);
    simpleClient = ck.length === 1 && ck[0] === lang;
  }
  if (simpleClin && simpleClient) {
    let out = ` ${mainKey}=${q(label.clinician[lang] ?? '')}`;
    if (label.client) out += ` ${clientKey}=${q(label.client[lang] ?? '')}`;
    return out;
  }
  return ` ${jsonKey}=${q(JSON.stringify(label))}`;
}

function readLabel(
  o: Record<string, string>,
  lang: string,
  mainKey: string,
  clientKey: string,
  jsonKey: string,
): Label | undefined {
  if (o[jsonKey] !== undefined) return JSON.parse(o[jsonKey]) as Label;
  if (o[mainKey] === undefined) return undefined;
  const label: Label = { clinician: { [lang]: o[mainKey] } };
  if (o[clientKey] !== undefined) label.client = { [lang]: o[clientKey] };
  return label;
}

// ---- property bag encode / decode ----------------------------------------------------

function propTokens(p: PsyumlModel['nodes'][number]['properties']): string {
  let out = '';
  for (const k of NUMERIC_PROPS) if (p[k] !== undefined) out += ` ${k}=${p[k]}`;
  if (p.consolidation) out += ` consolidation=${p.consolidation}`;
  if (p.confidence) out += ` confidence=${p.confidence}`;
  if (p.epistemicStatus) out += ` epistemic=${p.epistemicStatus}`;
  if (p.provenance && p.provenance.length > 0) out += ` provenance=${p.provenance.join(',')}`;
  if (p.index) out += ` index=true`;
  return out;
}

function readProps(o: Record<string, string>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  for (const k of NUMERIC_PROPS) if (o[k] !== undefined) p[k] = Number(o[k]);
  if (o.consolidation !== undefined) p.consolidation = o.consolidation;
  if (o.confidence !== undefined) p.confidence = o.confidence;
  if (o.epistemic !== undefined) p.epistemicStatus = o.epistemic;
  if (o.provenance !== undefined) p.provenance = o.provenance.split(',');
  if (o.index === 'true') p.index = true;
  return p;
}

// ---- serialize -----------------------------------------------------------------------

/** Serialize a model to the PsyUML text DSL. */
export function toDSL(model: PsyumlModel): string {
  const lang = model.language || 'en';
  const lines: string[] = [];

  lines.push(`diagram ${model.diagram}`);
  if (model.language && model.language !== 'en') lines.push(`lang ${model.language}`);
  if (model.version && model.version !== DEFAULT_VERSION) lines.push(`version ${model.version}`);
  if (model.meta.title) lines.push(`title ${q(model.meta.title)}`);
  if (model.meta.disclaimer) lines.push(`disclaimer ${q(model.meta.disclaimer)}`);
  if (model.meta.crisisResources) lines.push(`crisis ${q(model.meta.crisisResources)}`);
  if (model.meta.ritual) {
    let l = 'ritual';
    if (model.meta.ritual.framing !== undefined) l += ` framing=${q(model.meta.ritual.framing)}`;
    if (model.meta.ritual.secularVariant !== undefined)
      l += ` secular=${q(model.meta.ritual.secularVariant)}`;
    lines.push(l);
  }
  if (model.meta.safety.acuteRiskFlag) lines.push('flag acute');
  if (model.meta.safety.psychosisFlag) lines.push('flag psychosis');

  if (model.bands.length > 0) lines.push('');
  for (const b of model.bands) {
    let l = `band ${b.id} order=${b.order}`;
    if (b.pattern !== 'none') l += ` pattern=${b.pattern}`;
    l += labelTokens(b.label, lang, 'label', 'client', 'labeljson');
    lines.push(l);
  }

  if (model.nodes.length > 0) lines.push('');
  for (const n of model.nodes) {
    let l = `node ${n.id} ${n.kind}`;
    if (n.stereotype) l += ` stereotype=${n.stereotype}`;
    if (n.tier !== 1) l += ` tier=${n.tier}`;
    if (n.bandId) l += ` band=${n.bandId}`;
    if (n.position) l += ` pos=${n.position.x},${n.position.y}`;
    if (n.hidden) l += ` hidden=true`;
    l += propTokens(n.properties);
    l += labelTokens(n.label, lang, 'label', 'client', 'labeljson');
    lines.push(l);
  }

  if (model.edges.length > 0) lines.push('');
  for (const e of model.edges) {
    let l = `edge ${e.id} ${e.source} ${e.kind} ${e.target}`;
    if (e.loop) l += ` loop=${e.loop}`;
    l += propTokens(e.properties);
    if (e.trigger) l += labelTokens(e.trigger, lang, 'trigger', 'triggerclient', 'triggerjson');
    if (e.label) l += labelTokens(e.label, lang, 'label', 'client', 'labeljson');
    lines.push(l);
  }

  return lines.join('\n') + '\n';
}

// ---- parse ---------------------------------------------------------------------------

/** Parse the PsyUML text DSL back into a validated model (throws on invalid input). */
export function fromDSL(text: string): PsyumlModel {
  const obj: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {};
  const safety: Record<string, boolean> = {};
  const bands: unknown[] = [];
  const nodes: unknown[] = [];
  const edges: unknown[] = [];
  let version = DEFAULT_VERSION;
  let language = 'en';

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const toks = splitTokens(line);
    const kw = toks[0];

    switch (kw) {
      case 'diagram':
        obj.diagram = toks[1];
        break;
      case 'lang':
        language = toks[1] ?? 'en';
        break;
      case 'version':
        version = toks[1] ?? DEFAULT_VERSION;
        break;
      case 'title':
        meta.title = unq(toks[1] ?? '');
        break;
      case 'disclaimer':
        meta.disclaimer = unq(toks[1] ?? '');
        break;
      case 'crisis':
        meta.crisisResources = unq(toks[1] ?? '');
        break;
      case 'flag':
        if (toks[1] === 'acute') safety.acuteRiskFlag = true;
        else if (toks[1] === 'psychosis') safety.psychosisFlag = true;
        break;
      case 'ritual': {
        const o = parseOpts(toks.slice(1));
        const r: Record<string, string> = {};
        if (o.framing !== undefined) r.framing = o.framing;
        if (o.secular !== undefined) r.secularVariant = o.secular;
        meta.ritual = r;
        break;
      }
      case 'band': {
        const o = parseOpts(toks.slice(2));
        const b: Record<string, unknown> = {
          id: toks[1],
          label: readLabel(o, language, 'label', 'client', 'labeljson'),
        };
        if (o.order !== undefined) b.order = Number(o.order);
        if (o.pattern !== undefined) b.pattern = o.pattern;
        bands.push(b);
        break;
      }
      case 'node': {
        const o = parseOpts(toks.slice(3));
        const node: Record<string, unknown> = { id: toks[1], kind: toks[2] };
        if (o.stereotype !== undefined) node.stereotype = o.stereotype;
        if (o.tier !== undefined) node.tier = Number(o.tier);
        if (o.band !== undefined) node.bandId = o.band;
        if (o.pos !== undefined) {
          const [x, y] = o.pos.split(',').map(Number);
          node.position = { x, y };
        }
        if (o.hidden === 'true') node.hidden = true;
        node.label = readLabel(o, language, 'label', 'client', 'labeljson');
        node.properties = readProps(o);
        nodes.push(node);
        break;
      }
      case 'edge': {
        const o = parseOpts(toks.slice(5));
        const edge: Record<string, unknown> = {
          id: toks[1],
          source: toks[2],
          kind: toks[3],
          target: toks[4],
        };
        if (o.loop !== undefined) edge.loop = o.loop;
        const props = readProps(o);
        if (Object.keys(props).length > 0) edge.properties = props;
        const trigger = readLabel(o, language, 'trigger', 'triggerclient', 'triggerjson');
        if (trigger) edge.trigger = trigger;
        const label = readLabel(o, language, 'label', 'client', 'labeljson');
        if (label) edge.label = label;
        edges.push(edge);
        break;
      }
      default:
        throw new Error(`Unknown PsyUML DSL statement: "${kw}"`);
    }
  }

  obj.version = version;
  obj.language = language;
  if (Object.keys(safety).length > 0) meta.safety = safety;
  obj.meta = meta;
  obj.bands = bands;
  obj.nodes = nodes;
  obj.edges = edges;
  return parseModel(obj);
}
