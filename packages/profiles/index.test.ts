import { describe, expect, it } from 'vitest';
import { listProfiles } from './index';

describe('listProfiles', () => {
  it('includes the polyvagal and ritual seed profiles', () => {
    const profiles = listProfiles();
    expect(profiles).toContain('polyvagal');
    expect(profiles).toContain('ritual');
  });
});
