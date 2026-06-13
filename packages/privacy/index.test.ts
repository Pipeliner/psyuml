import { describe, expect, it } from 'vitest';
import { parseModel } from '@psyuml/model';
import { deidentify } from './index';

const make = (clinician: string, opts: Record<string, unknown> = {}) =>
  parseModel({
    version: '0.1.0',
    diagram: 'state-map',
    meta: { disclaimer: 'Email the clinic at help@clinic.org', ...opts },
    nodes: [{ id: 'a', kind: 'state', label: { clinician: { en: clinician } } }],
  });

describe('deidentify', () => {
  it('redacts an email and reports it', () => {
    const { model, redactions } = deidentify(make('Reach me at jo@example.com please'));
    expect(model.nodes[0]?.label.clinician.en).toBe('Reach me at [email] please');
    expect(redactions.some((r) => r.kind === 'email' && r.original === 'jo@example.com')).toBe(
      true,
    );
  });

  it('redacts a phone-like number and a URL', () => {
    const { model } = deidentify(make('call +1 (555) 123-4567 or see https://me.example.com/x'));
    expect(model.nodes[0]?.label.clinician.en).toContain('[phone]');
    expect(model.nodes[0]?.label.clinician.en).toContain('[link]');
  });

  it('redacts caller-supplied name terms (whole word, case-insensitive)', () => {
    const out = deidentify(make('Rachel and RACHEL but not Rachelle'), { terms: ['Rachel'] });
    expect(out.model.nodes[0]?.label.clinician.en).toBe('[name] and [name] but not Rachelle');
    expect(out.redactions.filter((r) => r.kind === 'term')).toHaveLength(2);
  });

  it('redacts nothing when there is no PII and no terms given', () => {
    const { redactions } = deidentify(make('Calm and connected'));
    expect(redactions).toEqual([]);
  });

  it('leaves clinical boilerplate (disclaimer, crisis line) intact', () => {
    const { model } = deidentify(
      make('Calm', {
        crisisResources: 'Call 988 (US) — a public line',
        disclaimer: 'Supports care',
      }),
    );
    expect(model.meta.crisisResources).toContain('988');
    expect(model.meta.disclaimer).toBe('Supports care');
  });

  it('scrubs the client layer label too', () => {
    const m = parseModel({
      version: '0.1.0',
      diagram: 'state-map',
      meta: { disclaimer: 'x' },
      nodes: [
        {
          id: 'a',
          kind: 'state',
          label: { clinician: { en: 'Calm' }, client: { en: 'ask jo@x.io' } },
        },
      ],
    });
    const { model } = deidentify(m);
    expect(model.nodes[0]?.label.client?.en).toBe('ask [email]');
  });

  it('returns a valid model and never mutates the input', () => {
    const m = make('write to jo@example.com');
    const snap = JSON.stringify(m);
    const { model } = deidentify(m);
    expect(() => parseModel(model)).not.toThrow();
    expect(JSON.stringify(m)).toBe(snap);
  });
});
