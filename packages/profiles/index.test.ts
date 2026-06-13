import { describe, expect, it } from 'vitest';
import { listProfiles, roleLabelsFor, translate } from './index';

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
