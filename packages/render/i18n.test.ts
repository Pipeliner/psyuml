import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DiagramType, parseModel, type PsyumlModel } from '@psyuml/model';
import { CHROME_LOCALES, chromeLocale, chromeText, type ChromeKey } from './i18n';
import { blankTemplate, render, renderComposite, renderDiff } from './index';

// Issue #3 / ADR-0059: renderer chrome (legends, decorations, headers, default titles, template
// prompts) follows `lang`, with an `en` fallback. Only synthetic example models are used here.

const EN = CHROME_LOCALES.en;
const KEYS = Object.keys(EN) as ChromeKey[];
const placeholders = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort();
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const count = (hay: string, needle: string): number => hay.split(needle).length - 1;
const load = (diagram: string): PsyumlModel =>
  parseModel(
    readFileSync(new URL(`../../examples/showcase-${diagram}.psyuml`, import.meta.url), 'utf8'),
  );

describe('chrome catalog', () => {
  it('ru translates every chrome string, with the same placeholders as en', () => {
    const ru = CHROME_LOCALES.ru;
    for (const k of KEYS) {
      expect(ru[k], k).toBeTruthy();
      expect(placeholders(ru[k]), k).toEqual(placeholders(EN[k]));
    }
    expect(Object.keys(ru).sort()).toEqual([...KEYS].sort());
  });

  it('resolves the base subtag and falls back to en', () => {
    expect(chromeLocale('ru')).toBe('ru');
    expect(chromeLocale('RU-ru')).toBe('ru');
    expect(chromeLocale('de')).toBe('en');
    expect(chromeLocale(undefined)).toBe('en');
    expect(chromeLocale('toString')).toBe('en');
    expect(chromeText('ru', 'edge.exit')).toBe('ВЫХОД');
    expect(chromeText('fr', 'edge.exit')).toBe('EXIT');
  });

  it('interpolates placeholders and leaves unknown ones intact', () => {
    expect(chromeText('en', 'mode.dominance', { value: '0.70' })).toBe('dom 0.70');
    expect(chromeText('ru', 'mode.dominance', { value: '0.70' })).toBe('дом. 0.70');
    expect(chromeText('en', 'template.title')).toBe('{diagram} (blank template)');
  });
});

describe('every renderer localizes its chrome (lang ru)', () => {
  const plain = KEYS.filter((k) => placeholders(EN[k]).length === 0 && !k.startsWith('title.'));
  // A chrome string is "emitted" when it is a whole text node, or long enough that it cannot be a
  // coincidental substring of example content (short fragments like "vs" are tested directly).
  const emits = (svg: string, s: string): boolean =>
    svg.includes(`>${esc(s)}<`) || (s.length >= 12 && svg.includes(esc(s)));
  // Renderers whose only chrome is the default <title> (covered below) or wrapped multi-line text.
  const NO_PLAIN_CHROME = new Set(['intervention-sequence', 'body-map']);
  for (const diagram of DiagramType.options) {
    it(diagram, () => {
      const model = load(diagram);
      const en = render(model, { lang: 'en' }).svg;
      const ru = render(model, { lang: 'ru' }).svg;
      const used = plain.filter((k) => emits(en, EN[k]));
      if (!NO_PLAIN_CHROME.has(diagram))
        expect(used.length, `${diagram} emits no catalog chrome`).toBeGreaterThan(0);
      for (const k of used) {
        expect(ru, `${diagram}: ${k} not localized`).toContain(esc(CHROME_LOCALES.ru[k]));
        expect(count(ru, esc(EN[k])), `${diagram}: ${k} still English`).toBeLessThan(
          count(en, esc(EN[k])),
        );
      }
    });
  }

  it('lang comes from model.language when no option is given', () => {
    const model = parseModel({ ...load('state-map'), language: 'ru' });
    expect(render(model).svg).toContain(esc(CHROME_LOCALES.ru['state.legend.transition']));
  });

  it('an unsupported lang renders byte-identically to en', () => {
    for (const diagram of DiagramType.options) {
      const model = load(diagram);
      expect(render(model, { lang: 'xx' }).svg).toBe(render(model, { lang: 'en' }).svg);
    }
  });

  it('default <title> is localized when the model has no title', () => {
    for (const diagram of DiagramType.options) {
      const m = load(diagram);
      const untitled = parseModel({ ...m, meta: { ...m.meta, title: undefined } });
      const en = render(untitled, { lang: 'en' }).svg;
      const ru = render(untitled, { lang: 'ru' }).svg;
      const key = KEYS.find((k) => k.startsWith('title.') && en.includes(`<title>${esc(EN[k])}`));
      expect(key, `${diagram}: default title not from catalog`).toBeDefined();
      expect(ru).toContain(`<title>${esc(CHROME_LOCALES.ru[key!])}</title>`);
    }
  });

  it('localizes the parts-map stereotype captions and the default crisis line', () => {
    const parts = render(load('parts-map'), { lang: 'ru' }).svg;
    expect(parts).toContain('>менеджер<');
    expect(parts).toContain(' против ');
    expect(render(load('three-circles'), { lang: 'ru' }).svg).toContain('>(защита)<');
    expect(render(load('process-loop'), { lang: 'ru' }).svg).toContain('(ВЫХОД)');
    const body = render(load('body-map'), { lang: 'ru' }).svg;
    expect(body).toContain('Размер метки');
    expect(body).not.toContain('Marker size');
    const decision = load('decision-nav');
    const noCrisis = parseModel({
      ...decision,
      meta: { ...decision.meta, crisisResources: undefined },
    });
    expect(render(noCrisis, { lang: 'ru' }).svg).toContain(
      esc(CHROME_LOCALES.ru['crisis.default']),
    );
  });

  it('roleLabels still win over the localized stereotype caption', () => {
    const svg = render(load('parts-map'), { lang: 'ru', roleLabels: { manager: 'X-term' } }).svg;
    expect(svg).toContain('>X-term<');
    expect(svg).not.toContain('>менеджер<');
  });

  it('blank templates carry prompts in the model language', () => {
    const m = parseModel({ ...load('state-map'), language: 'ru' });
    const blank = blankTemplate(m);
    expect(blank.meta.title).toBe('state-map (пустой шаблон)');
    expect(render(blank).svg).toContain('(состояние…)');
    expect(blankTemplate(load('state-map')).meta.title).toBe('state-map (blank template)');
  });

  it('localizes the diff card and the composite board', () => {
    const m = load('mode-map');
    expect(renderDiff(m, m, { lang: 'ru' }).svg).toContain('Нет отслеживаемых изменений.');
    expect(renderDiff(m, m).svg).toContain('No tracked changes.');
    const board = renderComposite([load('parts-map'), load('mode-map')], { lang: 'ru' }).svg;
    expect(board).toContain('<title>Сводная доска</title>');
  });
});
