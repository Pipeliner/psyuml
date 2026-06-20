/**
 * @psyuml/profiles — school profiles, translation table, and the §K extension mechanism.
 *
 * Profiles are view transforms (glyph/palette + layout + vocabulary + extra
 * validators) over the one canonical model. This module also hosts the UML-style
 * **profile/stereotype extension mechanism** (§K): a typed `ExtensionProfile` schema +
 * `validateProfile`, which enforce the four rules for adding a new school/symbol
 * (specialize a core element, default Tier 3, provide glyph/hand/fallback/synonyms/compat,
 * no Tier-1 glyph collision) plus the semver/Tier-1-frozen/deprecation discipline.
 * Traceability: REQ-CROSS-SCHOOL, REQ-RESEARCH-PROFILES, REQ-BODY-MAP, REQ-EXTENSION-MECH.
 */
import { DiagramType, EdgeKind, NodeKind, Tier } from '@psyuml/model';
import { z } from 'zod';

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

// ---------------------------------------------------------------------------
// §K extension mechanism — profiles & stereotypes
// ---------------------------------------------------------------------------

/** The core §A element types a stereotype may specialize (§K rule 1): every NodeKind + EdgeKind. */
export const CORE_BASES: ReadonlySet<string> = new Set<string>([
  ...NodeKind.options,
  ...EdgeKind.options,
]);

/**
 * Tier-1 core glyphs (spec §B/§C), frozen within a MAJOR version (§K). An extension symbol may
 * not collide with these (rule 4 — the semiotic-clarity check). `⚖` is reserved too: the renderer
 * uses it for the contested-origin marker (ADR-0007), so a profile must not repurpose it.
 */
export const CORE_TIER1_GLYPHS = ['◎', '○', 'O', '◇', '⬡', '👁', '▭', '▮', '⤬', '⚖'] as const;

/** A compatibility verdict for a stereotype against an existing diagram type (§K rule 3). */
export const CompatVerdict = z.enum(['ok', 'n/a', 'caution']);
export type CompatVerdict = z.infer<typeof CompatVerdict>;

/** A `«stereotype»` applied to a base element — adds constrained meaning, never removes it (§K). */
export const StereotypeDef = z.object({
  id: z.string().min(1),
  /** §K rule 1: must name a core §A element type (a NodeKind or EdgeKind) to specialize. */
  base: z.string().min(1),
  /** §K rule 2: school-specific symbols default to Tier 3 (Tier 1 is frozen — see validateProfile). */
  tier: Tier.default(3),
  /** §K rule 3 + §D: a printed glyph, a hand-drawn form, and a non-color fallback. */
  glyph: z.string().min(1),
  hand: z.string().min(1),
  nonColor: z.string().min(1),
  colorToken: z.string().optional(),
  /** §K rule 3: at least one synonym. */
  synonyms: z.array(z.string().min(1)).min(1),
  /** §K rule 3: a verdict per existing diagram type (completeness checked in validateProfile). */
  compat: z.record(CompatVerdict).default({}),
  /** §K deprecation: keep rendering with a migration note for one MINOR cycle before removal. */
  deprecated: z.object({ since: z.string().min(1), note: z.string().min(1) }).optional(),
  /**
   * v0.2 §6 cultural-permission. A symbol/rite drawn from a specific tradition declares its
   * `tradition`; if it is from a **closed / initiatory / culturally-restricted** one
   * (`restricted: true`) it `MUST` carry a `permission`/attribution declaration and `MUST NOT`
   * be offered as a generic reusable icon (enforced in `validateProfile`).
   */
  cultural: z
    .object({
      tradition: z.string().min(1),
      restricted: z.boolean().default(false),
      permission: z.string().optional(),
      attribution: z.string().optional(),
    })
    .optional(),
});
export type StereotypeDef = z.infer<typeof StereotypeDef>;

/** An extra vocabulary column a profile contributes to the §G.2 translation table. */
export const ProfileTranslation = z.object({
  concept: z.string().min(1),
  terms: z.record(z.string()),
});
export type ProfileTranslation = z.infer<typeof ProfileTranslation>;

/** A named bundle of extensions for a school/modality (§K). */
export const ExtensionProfile = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** semver (§K): MAJOR=core change, MINOR=additive, PATCH=clarification. */
  version: z.string().min(1),
  school: z.string().optional(),
  stereotypes: z.array(StereotypeDef).default([]),
  translations: z.array(ProfileTranslation).default([]),
});
export type ExtensionProfile = z.infer<typeof ExtensionProfile>;

export type ProfileSeverity = 'error' | 'warn' | 'info';
export interface ProfileIssue {
  rule: string;
  severity: ProfileSeverity;
  message: string;
  stereotype?: string;
}
export interface ProfileValidation {
  ok: boolean;
  issues: ProfileIssue[];
  /** The parsed profile, when the input was at least shape-valid. */
  profile?: ExtensionProfile;
}

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].*)?$/;

/**
 * Validate an extension profile against the §K rules. Shape errors (bad/missing fields) come
 * back as `profile.shape` issues; the semantic rules — specialize a core element (rule 1),
 * Tier-1 is frozen (rule 2 / versioning), a complete compat matrix (rule 3), no Tier-1 glyph
 * collision (rule 4), unique ids, semver, deprecation notes — come back as their own rules.
 * `ok` is false iff any error-severity issue is present, mirroring `@psyuml/validate`.
 */
export function validateProfile(input: unknown): ProfileValidation {
  const parsed = ExtensionProfile.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((e) => ({
        rule: 'profile.shape',
        severity: 'error' as const,
        message: `${e.path.join('.') || '(root)'}: ${e.message}`,
      })),
    };
  }
  const profile = parsed.data;
  const issues: ProfileIssue[] = [];
  const add = (rule: string, severity: ProfileSeverity, message: string, stereotype?: string) =>
    issues.push({ rule, severity, message, stereotype });

  if (!SEMVER.test(profile.version))
    add(
      'profile.semver',
      'warn',
      `version "${profile.version}" is not semver (MAJOR.MINOR.PATCH) — §K uses semver to signal compatibility.`,
    );

  const seenId = new Set<string>();
  const seenGlyph = new Map<string, string>();
  for (const s of profile.stereotypes) {
    if (!CORE_BASES.has(s.base))
      add(
        'profile.base-not-core',
        'error',
        `«${s.id}» base "${s.base}" is not a core element — every new symbol MUST specialize a §A NodeKind or EdgeKind (§K rule 1).`,
        s.id,
      );
    if (s.tier === 1)
      add(
        'profile.tier-1-frozen',
        'error',
        `«${s.id}» claims Tier 1, but the Tier-1 core is frozen within a MAJOR version — school-specific symbols default to Tier 3 (§K rule 2).`,
        s.id,
      );
    if ((CORE_TIER1_GLYPHS as readonly string[]).includes(s.glyph))
      add(
        'profile.glyph-collision',
        'error',
        `«${s.id}» glyph "${s.glyph}" collides with a Tier-1 core glyph — pick a distinct symbol (§K rule 4, semiotic clarity).`,
        s.id,
      );
    if (seenId.has(s.id))
      add('profile.duplicate-id', 'error', `Duplicate stereotype id «${s.id}».`, s.id);
    seenId.add(s.id);
    const prevGlyphOwner = seenGlyph.get(s.glyph);
    if (prevGlyphOwner)
      add(
        'profile.glyph-reused',
        'warn',
        `«${s.id}» reuses glyph "${s.glyph}" already used by «${prevGlyphOwner}» — distinct symbols read more clearly.`,
        s.id,
      );
    else seenGlyph.set(s.glyph, s.id);
    const missing = DiagramType.options.filter((t) => !(t in s.compat));
    if (missing.length)
      add(
        'profile.compat-incomplete',
        'error',
        `«${s.id}» is missing a compatibility verdict for: ${missing.join(', ')} — §K rule 3 requires one per existing diagram type.`,
        s.id,
      );
    if (s.deprecated)
      add(
        'profile.deprecated',
        'info',
        `«${s.id}» is deprecated since ${s.deprecated.since}: ${s.deprecated.note}`,
        s.id,
      );
    // v0.2 §6: a culturally-restricted symbol MUST carry a permission/attribution declaration
    // and MUST NOT be offered as a generic reusable icon.
    if (s.cultural?.restricted && !s.cultural.permission?.trim())
      add(
        'profile.cultural-permission',
        'error',
        `«${s.id}» is from a culturally-restricted tradition (${s.cultural.tradition}) but carries no permission/attribution declaration — required, and it MUST NOT be offered as a generic reusable icon (v0.2 §6).`,
        s.id,
      );
    else if (s.cultural?.restricted)
      add(
        'profile.cultural-restricted',
        'info',
        `«${s.id}» (${s.cultural.tradition}) is culturally-restricted — used with permission: ${s.cultural.permission}. Not a generic reusable icon (§6).`,
        s.id,
      );
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues, profile };
}

/**
 * A stereotype → display-term map (the first synonym) for the renderer's `roleLabels`, built
 * from a profile's stereotypes — so a model using those stereotypes renders in the profile's
 * vocabulary, exactly like `roleLabelsFor` does for the built-in translation table.
 */
export function roleLabelsFromProfile(profile: ExtensionProfile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of profile.stereotypes) {
    const term = s.synonyms[0];
    if (term) out[s.id] = term;
  }
  return out;
}

/** Fill a compat matrix: every existing diagram type, defaulting to `ok` unless overridden. */
function compatAll(
  overrides: Partial<Record<string, CompatVerdict>> = {},
): Record<string, CompatVerdict> {
  return Object.fromEntries(DiagramType.options.map((t) => [t, overrides[t] ?? 'ok']));
}

/**
 * A worked example profile (Compassion-Focused Therapy) that satisfies every §K rule — used by
 * the docs, the conformance suite, and as a template for contributors. `validateProfile` returns
 * `ok` with no error issues for it.
 */
export const CFT_PROFILE: ExtensionProfile = ExtensionProfile.parse({
  id: 'cft',
  title: 'Compassion-Focused Therapy',
  version: '0.1.0',
  school: 'cft',
  stereotypes: [
    {
      id: 'compassionate-self',
      base: 'agent',
      tier: 3,
      glyph: '♥',
      hand: 'circle with a small heart inside',
      nonColor: 'circle + heart outline + label',
      colorToken: 'bluishGreen',
      synonyms: ['compassionate self', 'perfect nurturer'],
      compat: compatAll({ 'relational-field': 'n/a', timeline: 'caution' }),
    },
    {
      id: 'soothing-rhythm-breathing',
      base: 'intervention',
      tier: 3,
      glyph: '∿',
      hand: 'hexagon with a wavy line',
      nonColor: 'hexagon + wavy underline + label',
      colorToken: 'skyBlue',
      synonyms: ['soothing rhythm breathing', 'SRB'],
      compat: compatAll({ 'relational-field': 'n/a', 'two-triangles': 'n/a' }),
    },
  ],
  translations: [{ concept: 'Self', terms: { cft: 'compassionate self' } }],
});

/**
 * A worked **cultural-extension pack** (v0.2 §6) showing the cultural-permission flag in use: a rite
 * from a closed / initiatory tradition is declared `restricted` and carries an explicit
 * permission/attribution declaration, so `validateProfile` accepts it (and would **error** if the
 * permission were missing — `profile.cultural-permission`). The tradition here is an *illustrative
 * placeholder*: a real pack names its actual source and authorization. Restricted symbols are **not**
 * generic reusable icons (§6) — that is the whole point of the flag.
 */
export const CULTURAL_PACK_EXAMPLE: ExtensionProfile = ExtensionProfile.parse({
  id: 'cultural-rite-pack',
  title: 'Cultural rite pack (worked example)',
  version: '0.1.0',
  school: 'ritual',
  stereotypes: [
    {
      id: 'initiatory-rite',
      base: 'intervention',
      tier: 3,
      glyph: '⟁',
      hand: 'hexagon with a small triangle inside',
      nonColor: 'hexagon + triangle outline + label',
      synonyms: ['initiatory rite'],
      compat: compatAll({ 'two-triangles': 'n/a' }),
      cultural: {
        tradition: 'a closed initiatory lineage (illustrative placeholder)',
        restricted: true,
        permission:
          'Used only with the documented authorization of the tradition-holder; not a generic icon.',
        attribution: "Attributed to its tradition-holder; see the pack's provenance note.",
      },
    },
  ],
});

// ---------------------------------------------------------------------------
// v0.2 — diagram FAMILIES + audience PROFILES (spec psyuml-v0.2.0 §2)
// ---------------------------------------------------------------------------

/** The eight cognitive families a diagram type can belong to (the *question it answers*). */
export type DiagramFamily =
  | 'field'
  | 'cycle'
  | 'parts'
  | 'pattern'
  | 'journey'
  | 'change'
  | 'ritual'
  | 'composite';

export interface FamilyInfo {
  id: DiagramFamily;
  title: string;
  /** The clinical question this family answers (for grouping the picker + teaching). */
  question: string;
  /** The graph archetype, per the v0.2 research synthesis. */
  archetype: string;
}

/** All eight families. Pattern is realized today via the process-loop renderer (the cat-sdr
 *  example); Composite (a multi-view board) is future — both are defined for the taxonomy. */
export const FAMILIES: readonly FamilyInfo[] = [
  {
    id: 'field',
    title: 'Field',
    question: "Who and what is in the person's world?",
    archetype: 'typed-edge network / sorter',
  },
  {
    id: 'cycle',
    title: 'Cycle',
    question: 'What maintaining loop keeps this going?',
    archetype: 'feedback loop',
  },
  {
    id: 'parts',
    title: 'Parts',
    question: 'What internal multiplicity is in play?',
    archetype: 'parts / process-field',
  },
  {
    id: 'pattern',
    title: 'Pattern',
    question: "What recurring procedure repeats — and where's the exit?",
    archetype: 'node+transition graph (CAT SDR)',
  },
  {
    id: 'journey',
    title: 'Journey',
    question: 'What is the trajectory / story over time?',
    archetype: 'linear path',
  },
  {
    id: 'change',
    title: 'Change',
    question: 'What is the treatment direction / what to do?',
    archetype: 'path with intervention vectors',
  },
  {
    id: 'ritual',
    title: 'Ritual',
    question: 'What symbolic or ceremonial process?',
    archetype: 'phased sequence',
  },
  {
    id: 'composite',
    title: 'Composite',
    question: 'One case across several views.',
    archetype: 'synchronized sub-maps',
  },
];

/** Which family each v0.1 diagram type belongs to (every DiagramType maps to exactly one). */
export const FAMILY_OF: Record<DiagramType, DiagramFamily> = {
  'state-map': 'cycle',
  'process-loop': 'cycle',
  'parts-map': 'parts',
  'mode-map': 'parts',
  'relational-field': 'field',
  'resource-anchor': 'field',
  'body-map': 'field',
  timeline: 'journey',
  'intervention-sequence': 'change',
  'two-triangles': 'change',
  'decision-nav': 'change',
  ladder: 'change',
  'three-circles': 'field',
  ritual: 'ritual',
};

/** The family a diagram type belongs to. */
export function familyOf(diagram: DiagramType): DiagramFamily {
  return FAMILY_OF[diagram];
}

export function listFamilies(): readonly FamilyInfo[] {
  return FAMILIES;
}

/** The diagram types currently in a family (some families — pattern, composite — have none yet). */
export function diagramsInFamily(family: DiagramFamily): DiagramType[] {
  return DiagramType.options.filter((d) => FAMILY_OF[d] === family);
}

/** Same semantics, different visual compression for a given reader (spec §2). */
export type AudienceProfile = 'clinician' | 'client' | 'picture';

export interface AudienceProfileInfo {
  id: AudienceProfile;
  title: string;
  description: string;
  /** Prefer the client's own everyday words over clinical terms. */
  plainLanguage: boolean;
  /** Show interpretive (dashed) nodes + provenance/confidence, vs foreground actionable content. */
  showInterpretive: boolean;
  /** Rough cap on distinct symbol kinds for cognitive load (graphic economy); undefined = no cap. */
  maxSymbolKinds?: number;
}

export const AUDIENCE_PROFILES: readonly AudienceProfileInfo[] = [
  {
    id: 'clinician',
    title: 'Clinician',
    description: 'Full relation types, layered interpretation, provenance + confidence visible.',
    plainLanguage: false,
    showInterpretive: true,
  },
  {
    id: 'client',
    title: 'Client (plain language)',
    description:
      "Everyday / the client's own words; actionable content foregrounded; capped symbols.",
    plainLanguage: true,
    showInterpretive: false,
    maxSymbolKinds: 6,
  },
  {
    id: 'picture',
    title: 'Picture (low-literacy / child)',
    description:
      'Pictographic, manipulable, minimal text. Picture symbols must pass the §5 comprehension gate before they are frozen.',
    plainLanguage: true,
    showInterpretive: false,
    maxSymbolKinds: 5,
  },
];

export function audienceProfile(id: AudienceProfile): AudienceProfileInfo {
  const p = AUDIENCE_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown audience profile: ${id}`);
  return p;
}

/**
 * Whether a diagram's distinct **symbol-kind count** fits an audience profile's graphic-economy
 * budget (v0.2 §2: the client/picture profiles cap the symbol set for cognitive load). A profile
 * with no `maxSymbolKinds` (clinician) always fits. This is the posture check the editor surfaces
 * as a gentle "over budget" nudge — it never blocks; the full pictographic reduction is M14.
 */
export function withinSymbolBudget(
  distinctSymbolKinds: number,
  audience: AudienceProfile,
): boolean {
  const cap = audienceProfile(audience).maxSymbolKinds;
  return cap === undefined || distinctSymbolKinds <= cap;
}

// ---------------------------------------------------------------------------
// Notation comprehension testing (v0.2 §5) — the symbol registry + Tier-A harness
// ---------------------------------------------------------------------------

/** Where a symbol sits in the visual language (for grouping a comprehension study). */
export type SymbolRole = 'core' | 'connector' | 'marker' | 'pattern';

/**
 * A symbol in PsyUML's visual vocabulary, enumerated so a comprehension study (v0.2 §5; ISO 9186)
 * can target each one and record a per-symbol result. `safetyCritical` symbols — those a misread
 * could *harm* (e.g. the way-out / exit) — carry the higher ≥85% bar (vs ≥67% general). `glyph`
 * is the canonical mark (a unicode glyph, or a short descriptor for an SVG-drawn form);
 * `redundantWord` is the dual-coding text drawn alongside it (a safety symbol is never glyph-alone).
 */
export interface NotationSymbol {
  id: string;
  /** Plain-language meaning — the answer key for a "what does this mean?" study item. */
  concept: string;
  glyph: string;
  redundantWord?: string;
  safetyCritical: boolean;
  tier: Tier;
  role: SymbolRole;
}

/**
 * The symbols a client / picture-profile reader must understand. Glyphs follow the canonical table
 * (docs/cheatsheets.md, spec §B/§C). The CAT loop-topology marks (M12) are SVG-drawn and carry a
 * redundant word; like every symbol here they are **untested** until the §5 study runs — this
 * registry is the *set under test*, not a claim that they are understood (see the ledger in
 * docs/adoption/comprehension-instruments.md, all entries `pending`).
 */
export const NOTATION_SYMBOLS: readonly NotationSymbol[] = [
  {
    id: 'self',
    concept: 'the steady, non-pathological centre (Self)',
    glyph: '◎',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'part',
    concept: 'a part / sub-personality / actor',
    glyph: '○',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'state',
    concept: 'a state the person can be in',
    glyph: 'rounded box',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'resource',
    concept: 'a steadying support, strength, or anchor',
    glyph: '◇',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'intervention',
    concept: 'a deliberate change act / skill / technique',
    glyph: '⬡',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'context',
    concept: 'who or what owns an action (context / role)',
    glyph: '▭',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'band',
    concept: 'an ordered zone — an arousal band or phase',
    glyph: '▮▮▮',
    safetyCritical: false,
    tier: 1,
    role: 'core',
  },
  {
    id: 'observing-eye',
    concept: 'a step-back, self-watching stance',
    glyph: '👁',
    redundantWord: 'observing-I',
    safetyCritical: false,
    tier: 2,
    role: 'core',
  },
  {
    id: 'sequential',
    concept: 'leads to / then',
    glyph: '→',
    safetyCritical: false,
    tier: 1,
    role: 'connector',
  },
  {
    id: 'reciprocal',
    concept: 'feeds both ways (mutual)',
    glyph: '↔',
    safetyCritical: false,
    tier: 1,
    role: 'connector',
  },
  {
    id: 'exit',
    concept: 'the way out of a loop — a way to get help',
    glyph: 'dashed arrow',
    redundantWord: 'EXIT',
    safetyCritical: true,
    tier: 1,
    role: 'connector',
  },
  {
    id: 'barrier',
    concept: 'a dissociative barrier between parts',
    glyph: '⤬',
    redundantWord: 'barrier',
    safetyCritical: false,
    tier: 2,
    role: 'marker',
  },
  {
    id: 'containment',
    concept: 'a protector holding or guarding',
    glyph: 'orbit ( )',
    safetyCritical: false,
    tier: 2,
    role: 'marker',
  },
  {
    id: 'contested',
    concept: 'origins disagree — both shown, not merged',
    glyph: '⚖',
    redundantWord: 'contested',
    safetyCritical: false,
    tier: 3,
    role: 'marker',
  },
  {
    id: 'trap',
    concept: 'a self-confirming loop',
    glyph: 'svg: return-loop',
    redundantWord: 'TRAP',
    safetyCritical: false,
    tier: 2,
    role: 'pattern',
  },
  {
    id: 'dilemma',
    concept: 'a false-binary, either/or fork',
    glyph: 'svg: fork',
    redundantWord: 'DILEMMA',
    safetyCritical: false,
    tier: 2,
    role: 'pattern',
  },
  {
    id: 'snag',
    concept: 'self-sabotage of legitimate success',
    glyph: 'svg: blocked-arrow',
    redundantWord: 'SNAG',
    safetyCritical: false,
    tier: 2,
    role: 'pattern',
  },
];

export interface NotationAuditIssue {
  rule: string;
  severity: ProfileSeverity;
  message: string;
  symbol?: string;
}
export interface NotationAudit {
  ok: boolean;
  issues: NotationAuditIssue[];
}

/**
 * Tier-A notation audit (v0.2 §5) — the automatable pre-study gate that runs in CI **before** any
 * human comprehension test. It does **not** measure comprehension (that needs real participants —
 * §5 Tier B, the v1.0 gate); it enforces the *necessary conditions* a symbol set must meet to be
 * worth testing: every symbol is **discriminable** (no two share a glyph), every **safety-critical**
 * symbol is **dual-coded** (a redundant word — never glyph- or colour-alone, §D), and every symbol
 * has a plain-language **gloss** + a unique id (so a study item can be written for it). `ok` is
 * false iff any error-severity issue is present, mirroring `validateProfile` / `@psyuml/validate`.
 */
export function auditNotation(
  symbols: readonly NotationSymbol[] = NOTATION_SYMBOLS,
): NotationAudit {
  const issues: NotationAuditIssue[] = [];
  const ids = new Set<string>();
  const glyphOwner = new Map<string, string>();
  for (const s of symbols) {
    if (ids.has(s.id))
      issues.push({
        rule: 'notation.unique-id',
        severity: 'error',
        message: `Duplicate symbol id "${s.id}".`,
        symbol: s.id,
      });
    ids.add(s.id);
    if (!s.concept.trim())
      issues.push({
        rule: 'notation.gloss',
        severity: 'error',
        message: `Symbol "${s.id}" has no plain-language gloss to test against.`,
        symbol: s.id,
      });
    const owner = glyphOwner.get(s.glyph);
    if (owner)
      issues.push({
        rule: 'notation.discriminability',
        severity: 'error',
        message: `Symbols "${owner}" and "${s.id}" share the glyph "${s.glyph}" — not discriminable.`,
        symbol: s.id,
      });
    else glyphOwner.set(s.glyph, s.id);
    if (s.safetyCritical && !s.redundantWord?.trim())
      issues.push({
        rule: 'notation.dual-coding',
        severity: 'error',
        message: `Safety-critical symbol "${s.id}" must carry a redundant word — never glyph- or colour-alone (§5/§D).`,
        symbol: s.id,
      });
  }
  return { ok: !issues.some((i) => i.severity === 'error'), issues };
}
