import { describe, expect, it } from 'vitest';
import { createEmptyModel, PSYUML_MODEL_VERSION } from './index';

describe('createEmptyModel', () => {
  it('returns an empty, versioned model', () => {
    const model = createEmptyModel();
    expect(model.version).toBe(PSYUML_MODEL_VERSION);
    expect(model.nodes).toHaveLength(0);
    expect(model.edges).toHaveLength(0);
  });
});
