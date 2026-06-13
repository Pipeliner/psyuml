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
import { parseModel, type Label, type PsyumlModel } from '@psyuml/model';

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

/** De-identify the free-text fields of a model. */
export function deidentify(model: PsyumlModel, options: DeidentifyOptions = {}): DeidentifyResult {
  const ph = { ...DEFAULT_PLACEHOLDERS, ...options.placeholders };
  const terms = (options.terms ?? []).filter((t) => t.trim().length > 0);
  const redactions: Redaction[] = [];

  const scrub = (text: string, path: string): string => {
    // Structured PII first, then name terms — otherwise a term inside an email/url
    // (e.g. redacting "jo" in "jo@x.io") would break detection and leak the rest.
    let out = text;
    out = out.replace(URL_RE, (m) => {
      redactions.push({ path, kind: 'url', original: m });
      return ph.url;
    });
    out = out.replace(EMAIL_RE, (m) => {
      redactions.push({ path, kind: 'email', original: m });
      return ph.email;
    });
    out = out.replace(PHONE_RE, (m) => {
      redactions.push({ path, kind: 'phone', original: m });
      return ph.phone;
    });
    for (const t of terms) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(t)}\\b`, 'gi'), (m) => {
        redactions.push({ path, kind: 'term', original: m });
        return ph.term;
      });
    }
    return out;
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
