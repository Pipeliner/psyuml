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
