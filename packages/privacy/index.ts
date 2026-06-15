/**
 * @psyuml/privacy — de-identify a model before it leaves the device (M8, REQ-PRIVACY).
 *
 * `deidentify(model, { terms })` returns a redacted copy plus a report of what was removed.
 * It scrubs the *client-authored* free text (node / edge / band / trigger labels and the
 * title) — not the clinical boilerplate (disclaimer, crisis line, ritual framing), which is
 * public-safe and must survive. Detection is conservative and regex-based (emails, links,
 * phone-like number runs) plus caller-supplied `terms` (e.g. a client's name/initials),
 * because reliable name detection needs NER we deliberately do not ship. The result is a
 * valid model (run through `parseModel`); the original is never mutated.
 *
 * This is the "de-identify / redact exports by default" guardrail the design calls for; it is
 * the PII-minimization step the bounded AI-assist (M8) runs before any extraction, and the
 * basis for a de-identified interoperability export (M9). Local-first: nothing is sent anywhere.
 *
 * Traceability: REQ-PRIVACY (Source 3 C8; ARCH §11).
 */
import { getText, parseModel, type Label, type PsyumlModel } from '@psyuml/model';

export type RedactionKind = 'email' | 'phone' | 'url' | 'term';

export interface Redaction {
  /** Where it was found, e.g. `node:calm.client.en` or `meta.title`. */
  path: string;
  kind: RedactionKind;
  original: string;
}

export interface DeidentifyOptions {
  /** Exact terms to redact as names (whole-word, case-insensitive), e.g. ['Rachel', 'R.']. */
  terms?: string[];
  /** Override the replacement text per kind. */
  placeholders?: Partial<Record<RedactionKind, string>>;
}

export interface DeidentifyResult {
  model: PsyumlModel;
  redactions: Redaction[];
}

const DEFAULT_PLACEHOLDERS: Record<RedactionKind, string> = {
  email: '[email]',
  phone: '[phone]',
  url: '[link]',
  term: '[name]',
};

const URL_RE = /\bhttps?:\/\/[^\s]+/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
// Conservative phone-like run: digit-led, ≥8 chars of digits/separators, digit-ended.
const PHONE_RE = /\+?\d[\d ()\-.]{6,}\d/g;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface TextRedaction {
  kind: RedactionKind;
  original: string;
}

/**
 * De-identify a single free-text string (e.g. a session narrative before AI extraction).
 * Structured PII (links, emails, phone-like runs) is removed first, then caller-supplied
 * name `terms` — otherwise redacting a term inside an email would break detection.
 */
export function redactText(
  text: string,
  options: DeidentifyOptions = {},
): { text: string; redactions: TextRedaction[] } {
  const ph = { ...DEFAULT_PLACEHOLDERS, ...options.placeholders };
  const terms = (options.terms ?? []).filter((t) => t.trim().length > 0);
  const redactions: TextRedaction[] = [];
  let out = text;
  out = out.replace(URL_RE, (m) => {
    redactions.push({ kind: 'url', original: m });
    return ph.url;
  });
  out = out.replace(EMAIL_RE, (m) => {
    redactions.push({ kind: 'email', original: m });
    return ph.email;
  });
  out = out.replace(PHONE_RE, (m) => {
    redactions.push({ kind: 'phone', original: m });
    return ph.phone;
  });
  for (const t of terms) {
    // Use word-adjacency lookarounds rather than \b: a term ending (or starting) in a
    // non-word char — e.g. a client's initials "R." — has no \b at that edge, so \bR.\b
    // never matches and PII would silently survive. (?<![\w]) / (?![\w]) still prevents
    // matching inside a larger word (so "Rachel" won't hit "Rachelle").
    out = out.replace(new RegExp(`(?<![\\w])${escapeRegExp(t)}(?![\\w])`, 'gi'), (m) => {
      redactions.push({ kind: 'term', original: m });
      return ph.term;
    });
  }
  return { text: out, redactions };
}

/** De-identify the free-text fields of a model. */
export function deidentify(model: PsyumlModel, options: DeidentifyOptions = {}): DeidentifyResult {
  const redactions: Redaction[] = [];

  const scrub = (text: string, path: string): string => {
    const r = redactText(text, options);
    for (const red of r.redactions) redactions.push({ path, ...red });
    return r.text;
  };

  const scrubDict = (dict: Record<string, string>, base: string): Record<string, string> => {
    const next: Record<string, string> = {};
    for (const [lang, text] of Object.entries(dict)) next[lang] = scrub(text, `${base}.${lang}`);
    return next;
  };

  const scrubLabel = (label: Label, base: string): Label => {
    const next: Label = { clinician: scrubDict(label.clinician, `${base}.clinician`) };
    if (label.client) next.client = scrubDict(label.client, `${base}.client`);
    return next;
  };

  const clone: PsyumlModel = JSON.parse(JSON.stringify(model));
  if (clone.meta.title) clone.meta.title = scrub(clone.meta.title, 'meta.title');
  clone.bands = clone.bands.map((b) => ({ ...b, label: scrubLabel(b.label, `band:${b.id}`) }));
  clone.nodes = clone.nodes.map((n) => ({ ...n, label: scrubLabel(n.label, `node:${n.id}`) }));
  clone.edges = clone.edges.map((e) => {
    const next = { ...e };
    if (e.label) next.label = scrubLabel(e.label, `edge:${e.id}`);
    if (e.trigger) next.trigger = scrubLabel(e.trigger, `edge:${e.id}.trigger`);
    return next;
  });

  return { model: parseModel(clone), redactions };
}

/**
 * Role-scoped export: reduce every label to a single layer's text so the *other* layer's
 * wording can't leak in a shared artifact (REQ-PRIVACY). For `'client'` it reads ONLY the
 * client text (never falling back to clinician wording — an absent client label becomes
 * `(not shared)`) and drops progressive-reveal `hidden` nodes and their incident edges
 * (content not yet meant for the client). For `'clinician'` it keeps the clinician text.
 * The result is a valid model; the original is never mutated. Pair with `deidentify` for a
 * "prepare to share with the client" step.
 */
export function scopeToLayer(model: PsyumlModel, layer: 'clinician' | 'client'): PsyumlModel {
  const lang = model.language || 'en';
  const collapse = (label: Label): Label => {
    const text =
      layer === 'client'
        ? (label.client?.[lang] ?? Object.values(label.client ?? {})[0] ?? '(not shared)')
        : getText(label, 'clinician', lang);
    return { clinician: { [lang]: text } };
  };
  const clone: PsyumlModel = JSON.parse(JSON.stringify(model));
  const keptNodes = layer === 'client' ? clone.nodes.filter((n) => !n.hidden) : clone.nodes;
  const keptIds = new Set(keptNodes.map((n) => n.id));
  clone.bands = clone.bands.map((b) => ({ ...b, label: collapse(b.label) }));
  clone.nodes = keptNodes.map((n) => ({ ...n, label: collapse(n.label) }));
  clone.edges = clone.edges
    .filter((e) => keptIds.has(e.source) && keptIds.has(e.target))
    .map((e) => {
      const next = { ...e };
      if (e.label) next.label = collapse(e.label);
      if (e.trigger) next.trigger = collapse(e.trigger);
      return next;
    });
  return parseModel(clone);
}

export interface RedactionAudit {
  total: number;
  byKind: Record<RedactionKind, number>;
  /** One human-readable line per removal — a de-identification audit trail to persist/log. */
  lines: string[];
}

/** Summarize a de-identification's removals into an auditable record (REQ-PRIVACY audit log). */
export function redactionAudit(redactions: Redaction[]): RedactionAudit {
  const byKind: Record<RedactionKind, number> = { email: 0, phone: 0, url: 0, term: 0 };
  for (const r of redactions) byKind[r.kind] += 1;
  return {
    total: redactions.length,
    byKind,
    lines: redactions.map((r) => `${r.path}: ${r.kind} redacted`),
  };
}
