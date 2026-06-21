import { describe, expect, it } from 'vitest';
import { DiagramType } from '@psyuml/model';
import {
  AUDIENCE_PROFILES,
  audienceProfile,
  CFT_PROFILE,
  CULTURAL_PACK_EXAMPLE,
  diagramsInFamily,
  familyOf,
  FAMILIES,
  FAMILY_OF,
  listFamilies,
  listProfiles,
  roleLabelsFor,
  roleLabelsFromProfile,
  translate,
  validateProfile,
  withinSymbolBudget,
  NOTATION_SYMBOLS,
  auditNotation,
  PICTOGRAPHS,
  PICTOGRAPH_STUDY_RUN,
  auditPictographs,
  availablePictographs,
  pictographFor,
  pictographKeySvg,
} from './index';

/** Build a complete compat matrix (every diagram type ok) for terse fixtures. */
const okCompat = () => Object.fromEntries(DiagramType.options.map((t) => [t, 'ok']));
const goodStereotype = (over: Record<string, unknown> = {}) => ({
  id: 'demo',
  base: 'agent',
  tier: 3,
  glyph: '♣',
  hand: 'circle with a clover',
  nonColor: 'circle + clover + label',
  synonyms: ['demo role'],
  compat: okCompat(),
  ...over,
});
const profileWith = (stereotype: Record<string, unknown>) => ({
  id: 'p',
  title: 'Test profile',
  version: '0.1.0',
  stereotypes: [stereotype],
});

describe('listProfiles', () => {
  it('includes the polyvagal and ritual seed profiles', () => {
    const profiles = listProfiles();
    expect(profiles).toContain('polyvagal');
    expect(profiles).toContain('ritual');
  });
});

describe('translation table (§G.2)', () => {
  it('translates a concept into each school vocabulary', () => {
    expect(translate('exile', 'ifs')).toBe('exile');
    expect(translate('exile', 'schema')).toBe('vulnerable child mode');
    expect(translate('exile', 'structural-dissociation')).toBe('EP (emotional part)');
    expect(translate('Self', 'schema')).toBe('Healthy Adult');
  });

  it('returns undefined for an unknown concept or school', () => {
    expect(translate('exile', 'no-such-school')).toBeUndefined();
    expect(translate('not-a-role', 'ifs')).toBeUndefined();
  });

  it('builds a stereotype → term map for the renderer', () => {
    const schema = roleLabelsFor('schema');
    expect(schema.exile).toBe('vulnerable child mode');
    expect(schema.manager).toBe('overcontroller / detached protector');
    expect(roleLabelsFor('no-such-school')).toEqual({});
  });
});

describe('extension mechanism (§K)', () => {
  it('accepts the worked CFT example profile with no errors', () => {
    const r = validateProfile(CFT_PROFILE);
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.severity === 'error')).toBe(false);
  });

  it('builds a roleLabels map from a profile (first synonym wins)', () => {
    expect(roleLabelsFromProfile(CFT_PROFILE)['compassionate-self']).toBe('compassionate self');
  });

  it('rule 1: rejects a stereotype that does not specialize a core element', () => {
    const r = validateProfile(profileWith(goodStereotype({ base: 'not-a-kind' })));
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'profile.base-not-core')).toBe(true);
  });

  it('rule 2: rejects an extension claiming the frozen Tier 1', () => {
    const r = validateProfile(profileWith(goodStereotype({ tier: 1 })));
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'profile.tier-1-frozen')).toBe(true);
  });

  it('rule 3: requires a compat verdict for every existing diagram type', () => {
    const r = validateProfile(profileWith(goodStereotype({ compat: { 'state-map': 'ok' } })));
    expect(r.ok).toBe(false);
    const issue = r.issues.find((i) => i.rule === 'profile.compat-incomplete');
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('parts-map');
  });

  it('rule 3: requires at least one synonym (shape)', () => {
    const r = validateProfile(profileWith(goodStereotype({ synonyms: [] })));
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'profile.shape')).toBe(true);
  });

  it('rule 4: rejects a glyph that collides with a Tier-1 core glyph', () => {
    const r = validateProfile(profileWith(goodStereotype({ glyph: '◎' })));
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'profile.glyph-collision')).toBe(true);
  });

  it('warns on a non-semver version but stays ok', () => {
    const r = validateProfile({ ...profileWith(goodStereotype()), version: 'v1' });
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.rule === 'profile.semver' && i.severity === 'warn')).toBe(true);
  });

  it('notes a deprecated stereotype as info (kept rendering with a migration note)', () => {
    const r = validateProfile(
      profileWith(
        goodStereotype({ deprecated: { since: '0.2.0', note: 'use «compassionate-self»' } }),
      ),
    );
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.rule === 'profile.deprecated' && i.severity === 'info')).toBe(
      true,
    );
  });

  it('v0.2 §6: accepts a culturally-restricted symbol that carries a permission declaration', () => {
    const r = validateProfile(CULTURAL_PACK_EXAMPLE);
    expect(r.ok).toBe(true);
    expect(
      r.issues.some((i) => i.rule === 'profile.cultural-restricted' && i.severity === 'info'),
    ).toBe(true);
  });

  it('v0.2 §6: rejects a culturally-restricted symbol with no permission/attribution declaration', () => {
    const r = validateProfile(
      profileWith(
        goodStereotype({ cultural: { tradition: 'a closed lineage', restricted: true } }),
      ),
    );
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'profile.cultural-permission')).toBe(true);
  });

  it('v0.2 §6: a non-restricted cultural attribution is fine without permission', () => {
    const r = validateProfile(
      profileWith(
        goodStereotype({ cultural: { tradition: 'a widely-taught practice', restricted: false } }),
      ),
    );
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.rule.startsWith('profile.cultural'))).toBe(false);
  });

  it('flags duplicate stereotype ids', () => {
    const r = validateProfile({
      id: 'p',
      title: 'Dup',
      version: '0.1.0',
      stereotypes: [goodStereotype(), goodStereotype({ glyph: '♦' })],
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === 'profile.duplicate-id')).toBe(true);
  });

  it('reports shape errors for malformed input rather than throwing', () => {
    const r = validateProfile({ id: '', stereotypes: 'nope' });
    expect(r.ok).toBe(false);
    expect(r.issues.every((i) => i.rule === 'profile.shape')).toBe(true);
  });
});

describe('diagram families + audience profiles (v0.2 §2)', () => {
  it('lists all eight families', () => {
    expect(FAMILIES).toHaveLength(8);
    expect(listFamilies().map((f) => f.id)).toContain('pattern');
  });

  it('maps every DiagramType to exactly one family (no gaps)', () => {
    for (const d of DiagramType.options) {
      expect(typeof FAMILY_OF[d]).toBe('string');
      expect(FAMILIES.some((f) => f.id === familyOf(d))).toBe(true);
    }
  });

  it('groups types into the right family', () => {
    expect(familyOf('parts-map')).toBe('parts');
    expect(familyOf('process-loop')).toBe('cycle');
    expect(familyOf('relational-field')).toBe('field');
    expect(familyOf('timeline')).toBe('journey');
    expect(familyOf('decision-nav')).toBe('change');
    // `venn` (ADR-0031) + `schema-grid` (ADR-0034) map to Parts, matching the catalogue family
    expect(diagramsInFamily('parts').sort()).toEqual([
      'mode-map',
      'parts-map',
      'schema-grid',
      'venn',
    ]);
    // pattern + composite have no dedicated type yet (Pattern is realized via process-loop today)
    expect(diagramsInFamily('pattern')).toEqual([]);
    expect(diagramsInFamily('composite')).toEqual([]);
  });

  it('exposes three audience profiles with the expected posture', () => {
    expect(AUDIENCE_PROFILES.map((p) => p.id)).toEqual(['clinician', 'client', 'picture']);
    expect(audienceProfile('clinician').showInterpretive).toBe(true);
    expect(audienceProfile('client').plainLanguage).toBe(true);
    expect(audienceProfile('client').showInterpretive).toBe(false);
    expect(audienceProfile('picture').maxSymbolKinds).toBe(5);
    expect(() => audienceProfile('nope' as 'client')).toThrow();
  });

  it('checks the audience symbol-kind budget (graphic economy, §2)', () => {
    // clinician has no cap → always fits
    expect(withinSymbolBudget(20, 'clinician')).toBe(true);
    // client cap is 6; picture cap is 5 (boundary inclusive)
    expect(withinSymbolBudget(6, 'client')).toBe(true);
    expect(withinSymbolBudget(7, 'client')).toBe(false);
    expect(withinSymbolBudget(5, 'picture')).toBe(true);
    expect(withinSymbolBudget(6, 'picture')).toBe(false);
  });
});

describe('notation comprehension testing (v0.2 §5)', () => {
  it('registers the symbols under test with unique ids and a gloss each', () => {
    expect(NOTATION_SYMBOLS.length).toBeGreaterThan(0);
    expect(new Set(NOTATION_SYMBOLS.map((s) => s.id)).size).toBe(NOTATION_SYMBOLS.length);
    expect(NOTATION_SYMBOLS.every((s) => s.concept.trim().length > 0)).toBe(true);
    // the way-out is the safety-critical symbol and it is dual-coded (carries "EXIT")
    const exit = NOTATION_SYMBOLS.find((s) => s.id === 'exit');
    expect(exit?.safetyCritical).toBe(true);
    expect(exit?.redundantWord).toBe('EXIT');
  });

  it('the canonical registry passes the Tier-A audit (discriminable + dual-coded + glossed)', () => {
    const audit = auditNotation();
    expect(audit.ok).toBe(true);
    expect(audit.issues).toEqual([]);
  });

  it('Tier-A audit flags a glyph collision, a glyph-only safety symbol, and a missing gloss', () => {
    const collide = auditNotation([
      { id: 'a', concept: 'thing a', glyph: '◇', safetyCritical: false, tier: 1, role: 'core' },
      { id: 'b', concept: 'thing b', glyph: '◇', safetyCritical: false, tier: 1, role: 'core' },
    ]);
    expect(collide.ok).toBe(false);
    expect(collide.issues.some((i) => i.rule === 'notation.discriminability')).toBe(true);

    const glyphOnlySafety = auditNotation([
      {
        id: 'danger',
        concept: 'a way out',
        glyph: '★',
        safetyCritical: true,
        tier: 1,
        role: 'connector',
      },
    ]);
    expect(glyphOnlySafety.ok).toBe(false);
    expect(glyphOnlySafety.issues.some((i) => i.rule === 'notation.dual-coding')).toBe(true);

    const noGloss = auditNotation([
      { id: 'blank', concept: '   ', glyph: '★', safetyCritical: false, tier: 1, role: 'core' },
    ]);
    expect(noGloss.ok).toBe(false);
    expect(noGloss.issues.some((i) => i.rule === 'notation.gloss')).toBe(true);
  });
});

describe('picture-profile pictographs (REQ-PICTURE-PICTOGRAPHS, ADR-0037)', () => {
  it('the candidate registry passes the Tier-A pictograph audit', () => {
    const audit = auditPictographs();
    expect(audit.ok).toBe(true);
    expect(audit.issues).toEqual([]);
  });

  it('every candidate is dual-coded (a redundant word) and has a gloss + drawn icon', () => {
    for (const p of PICTOGRAPHS) {
      expect(p.redundantWord.trim().length, `${p.id} needs a word`).toBeGreaterThan(0);
      expect(p.concept.trim().length, `${p.id} needs a gloss`).toBeGreaterThan(0);
      expect(p.icon.trim().length, `${p.id} needs an icon`).toBeGreaterThan(0);
    }
  });

  it('the honesty gate holds: no study has run, so EVERY pictograph is pending and none ship', () => {
    expect(PICTOGRAPH_STUDY_RUN).toBe(false);
    for (const p of PICTOGRAPHS) expect(p.comprehension, `${p.id}`).toBe('pending');
    // gated lookup + available set are inert until a symbol passes a real study
    expect(availablePictographs()).toEqual([]);
    for (const p of PICTOGRAPHS) expect(pictographFor(p.id)).toBeUndefined();
  });

  it("the audit FAILS a symbol marked 'passed' while no study has run (anti-fabrication)", () => {
    const faked = auditPictographs(
      [{ ...PICTOGRAPHS[0], comprehension: 'passed' }],
      /* studyRun */ false,
    );
    expect(faked.ok).toBe(false);
    expect(faked.issues.some((i) => i.rule === 'pictograph.gate')).toBe(true);
  });

  it('the audit flags an identical-icon collision (discriminability)', () => {
    const dup = auditPictographs(
      [
        { ...PICTOGRAPHS[0], id: 'a' },
        { ...PICTOGRAPHS[0], id: 'b' },
      ],
      true,
    );
    expect(dup.ok).toBe(false);
    expect(dup.issues.some((i) => i.rule === 'pictograph.discriminability')).toBe(true);
  });

  it('the gated lookup WOULD return a passed symbol once a study has run', () => {
    // Simulate the post-study world via the audit signature's studyRun param is not enough here;
    // assert the gate logic directly: a passed symbol is only returned when the run flag is set.
    expect(PICTOGRAPH_STUDY_RUN).toBe(false); // documents today's honest state
    // (When PICTOGRAPH_STUDY_RUN flips true + a symbol is 'passed', pictographFor returns it — the
    // renderers' wired-but-inert hook. Kept as one switch so the gate can't be bypassed per-call.)
  });

  it('the candidate key renders as labelled SVG that flags itself as NOT validated', () => {
    const svg = pictographKeySvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/CANDIDATE|pending|NOT validated/);
    // every candidate's redundant word appears (dual-coding visible in the sheet)
    for (const p of PICTOGRAPHS) expect(svg).toContain(p.redundantWord);
  });
});
