/**
 * @psyuml/profiles — school profiles + translation table (M0 skeleton).
 *
 * Profiles are view transforms (glyph/palette + layout + vocabulary + extra
 * validators) over the one canonical model. The switcher, translation table,
 * and the research-derived profiles land in M4–M5.
 * Traceability: REQ-CROSS-SCHOOL, REQ-RESEARCH-PROFILES, REQ-BODY-MAP.
 */

/** Seed profile identifiers; each gains a full definition in M4–M5. */
export const SEED_PROFILES = [
  'polyvagal',
  'ifs',
  'schema',
  'cat',
  'genogram',
  'psychodynamic',
  'ta',
  'act',
  'cft',
  'narrative',
  'ritual',
] as const;

export type ProfileId = (typeof SEED_PROFILES)[number];

export function listProfiles(): readonly ProfileId[] {
  return SEED_PROFILES;
}

export interface Translation {
  /** School-agnostic role concept (matches a node stereotype). */
  concept: string;
  /** Per-school display term, keyed by school id. */
  terms: Record<string, string>;
}

/**
 * Parts-family translation table (spec §G.2). This swaps only the *displayed vocabulary*
 * — the map's structure and the node names are unchanged, and provenance tags keep the
 * genuinely opposed origin-claims visible (IFS innate multiplicity vs. structural
 * dissociation's trauma-caused division, etc.). It does NOT flatten those differences.
 */
export const TRANSLATIONS: Translation[] = [
  {
    concept: 'Self',
    terms: {
      ifs: 'Self',
      schema: 'Healthy Adult',
      'structural-dissociation': 'integrated self',
      ta: 'Adult',
    },
  },
  {
    concept: 'manager',
    terms: {
      ifs: 'manager',
      schema: 'overcontroller / detached protector',
      'structural-dissociation': 'ANP',
      ta: 'Parent',
    },
  },
  {
    concept: 'firefighter',
    terms: {
      ifs: 'firefighter',
      schema: 'detached self-soother',
      'structural-dissociation': 'EP (defensive)',
      ta: 'rebellious Child',
    },
  },
  {
    concept: 'exile',
    terms: {
      ifs: 'exile',
      schema: 'vulnerable child mode',
      'structural-dissociation': 'EP (emotional part)',
      ta: 'wounded Child',
    },
  },
];

/** Schools that have a translation column (for a switcher). */
export const TRANSLATABLE_SCHOOLS = ['ifs', 'schema', 'structural-dissociation', 'ta'] as const;

/** The school-specific term for a concept, if any. */
export function translate(concept: string, school: string): string | undefined {
  return TRANSLATIONS.find((t) => t.concept === concept)?.terms[school];
}

/**
 * A stereotype → display-term map for a school, suitable for the renderer's `roleLabels`
 * option. The same canonical model then renders in that school's vocabulary.
 */
export function roleLabelsFor(school: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of TRANSLATIONS) {
    const term = t.terms[school];
    if (term) out[t.concept] = term;
  }
  return out;
}
