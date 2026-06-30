import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { render } from './index';
import { textWidth } from './layout';

// Tier-A legibility + safety guards motivated (NOT validated) by the simulated comprehension
// dry-runs (docs/evaluation-suite-pilot-2.md, -3.md): nothing here is evidence — these are
// machine-checked invariants the pilots pointed at.

const exDir = new URL('../../examples/', import.meta.url);
const models: [string, PsyumlModel][] = readdirSync(fileURLToPath(exDir))
  .filter((f) => f.endsWith('.psyuml'))
  .map((f) => [f, parseModel(readFileSync(new URL(f, exDir), 'utf8'))]);

const fontSizes = (svg: string): number[] =>
  [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));

describe('Tier-A legibility floor (pilot 3 flagged small State-Map text)', () => {
  it.each(models)('%s emits no microtext below the 8px floor (both layers)', (_f, model) => {
    for (const audience of ['clinician', 'client'] as const) {
      const sizes = fontSizes(render(model, { audience }).svg);
      const min = sizes.length ? Math.min(...sizes) : Infinity;
      expect(min).toBeGreaterThanOrEqual(8);
    }
  });

  it('the State-Map trigger/exit labels are sized for legibility (≥12)', () => {
    const stateMap = models.find(([f]) => f === 'state-map.psyuml')![1];
    const svg = render(stateMap).svg;
    const edgeLabelSizes = [
      ...svg.matchAll(/data-el="edgelabel:[^"]*"[^>]*font-size="([\d.]+)"/g),
    ].map((m) => Number(m[1]));
    expect(edgeLabelSizes.length).toBeGreaterThan(0);
    for (const s of edgeLabelSizes) expect(s).toBeGreaterThanOrEqual(12);
  });
});

describe('legibility: every edge label is haloed so its connector never strikes through it (ADR-0047)', () => {
  // An edge label sits ON or beside its connector line; without a white under-glyph halo the line
  // reads straight through the text. The renderers emit a `paint-order="stroke"` white halo on every
  // edge label (via `fitText`/`wrapLabel`'s `halo` option or inline); this guards that so the
  // legibility fix can't silently regress. Other labels over decoration are haloed too, but EDGE
  // labels are the universal case (every connector-borne word), so they are the asserted contract.
  const edgeLabelTags = (svg: string): string[] =>
    [...svg.matchAll(/<text\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((t) => /data-el="edgelabel:/.test(t));

  let totalChecked = 0;
  it.each(models)('%s — every edge label carries a white halo (both layers)', (_f, model) => {
    for (const audience of ['clinician', 'client'] as const) {
      for (const tag of edgeLabelTags(render(model, { audience }).svg)) {
        totalChecked += 1;
        expect(tag, `an edge label is drawn without a paint-order="stroke" halo: ${tag}`).toMatch(
          /paint-order="stroke"/,
        );
      }
    }
  });

  it('the corpus actually exercises this (some examples carry edge labels)', () => {
    expect(totalChecked).toBeGreaterThan(0);
  });
});

describe('legibility: a loop-map resource label never straddles its diamond edges (ADR-0049 follow-up)', () => {
  // A process-loop resource node is a flat 140×44 rhombus. A multi-line label drawn INSIDE it would
  // poke the slanted edges (the rhombus has almost no usable width off its centre line), and the
  // diamond can't grow without breaking the ring spacing. So the renderer keeps a SHORT label on one
  // line inside the widest band and lifts a LONG label fully OUTSIDE the glyph. This guards that:
  // every resource-node label line is either wholly inside the rhombus or wholly clear of the
  // diamond's box — never half-in, cutting across an edge.
  const CW = 0.58; // the one text metric (≈0.58em/char), matching the renderer
  type Box = { cx: number; top: number; bot: number; w: number };

  /** Diamond centre + half-extents from a `node:ID` polygon. */
  function diamond(
    svg: string,
    id: string,
  ): { cx: number; cy: number; hw: number; hh: number } | null {
    const m = svg.match(new RegExp(`<polygon data-el="node:${id}" points="([^"]*)"`));
    if (!m) return null;
    const pts = m[1]
      .trim()
      .split(/\s+/)
      .map((s) => s.split(',').map(Number));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return {
      cx,
      cy,
      hw: (Math.max(...xs) - Math.min(...xs)) / 2,
      hh: (Math.max(...ys) - Math.min(...ys)) / 2,
    };
  }

  /** Per-line ink boxes of a `nodelabel:ID` (single `<text>` or stacked `<tspan>`s). */
  function labelLines(svg: string, id: string): Box[] {
    const m = svg.match(new RegExp(`<text[^>]*data-el="nodelabel:${id}"[\\s\\S]*?</text>`));
    if (!m) return [];
    const block = m[0];
    const size = Number(block.match(/font-size="([\d.]+)"/)?.[1] ?? 11);
    const tspans = [
      ...block.matchAll(/<tspan[^>]*\bx="([\d.]+)"[^>]*\by="([\d.]+)"[^>]*>([^<]*)<\/tspan>/g),
    ];
    const rows =
      tspans.length > 0
        ? tspans.map((t) => ({ cx: Number(t[1]), y: Number(t[2]), s: t[3] }))
        : (() => {
            const one = block.match(
              /<text[^>]*\bx="([\d.]+)"[^>]*\by="([\d.]+)"[^>]*>([^<]*)<\/text>/,
            );
            return one ? [{ cx: Number(one[1]), y: Number(one[2]), s: one[3] }] : [];
          })();
    return rows.map((r) => ({
      cx: r.cx,
      top: r.y - size * 0.78,
      bot: r.y + size * 0.22,
      w: r.s.length * size * CW,
    }));
  }

  const insideRhombus = (
    d: { cx: number; cy: number; hw: number; hh: number },
    x: number,
    y: number,
  ): boolean => Math.abs(x - d.cx) / d.hw + Math.abs(y - d.cy) / d.hh <= 1 + 1e-6;

  const loopResource = models.filter(
    ([, m]) => m.diagram === 'process-loop' && m.nodes.some((n) => n.kind === 'resource'),
  );

  it('there is at least one loop-map resource diamond to check', () => {
    expect(loopResource.length).toBeGreaterThan(0);
  });

  it.each(loopResource)(
    '%s — every resource label line is contained, never edge-cutting (both layers)',
    (_f, model) => {
      for (const audience of ['clinician', 'client'] as const) {
        const svg = render(model, { audience }).svg;
        for (const node of model.nodes.filter((n) => n.kind === 'resource')) {
          const d = diamond(svg, node.id);
          if (!d) continue;
          for (const ln of labelLines(svg, node.id)) {
            const corners = [
              [ln.cx - ln.w / 2, ln.top],
              [ln.cx + ln.w / 2, ln.top],
              [ln.cx - ln.w / 2, ln.bot],
              [ln.cx + ln.w / 2, ln.bot],
            ];
            const fullyInside = corners.every(([x, y]) => insideRhombus(d, x, y));
            const clearOfBox =
              ln.bot < d.cy - d.hh ||
              ln.top > d.cy + d.hh ||
              ln.cx + ln.w / 2 < d.cx - d.hw ||
              ln.cx - ln.w / 2 > d.cx + d.hw;
            expect(
              fullyInside || clearOfBox,
              `${_f}/${audience}: resource label line at (${ln.cx},${ln.top.toFixed(0)}–${ln.bot.toFixed(0)}) w≈${ln.w.toFixed(0)} cuts across node:${node.id} diamond`,
            ).toBe(true);
          }
        }
      }
    },
  );
});

describe('legibility: text is never SEVERELY horizontally squished (ADR-0053)', () => {
  // `textLength`/`spacingAndGlyphs` compresses a label to fit its box — fine when mild, but a label
  // crushed to half-width is illegible (a visual audit found node/zone labels squished to ~40%). The
  // shared helpers now SHRINK the font (toward the 8px floor, keeping glyph proportions) before
  // squishing, so a compressed label is either mildly compressed (≥ SQUISH_FLOOR) OR already at the
  // floor (can't shrink further). This guards that contract: no `textLength` segment is below
  // SQUISH_FLOOR unless its font is at the legibility floor.
  const SQUISH_FLOOR = 0.8;
  const LEG_FLOOR = 8;
  const SLOP = 0.04; // metric estimate tolerance

  const decode = (s: string): string =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

  /** Every (font-size, textLength, content) triple — single-line `<text>` and stacked `<tspan>`s. */
  function compressedSegments(svg: string): { size: number; tl: number; text: string }[] {
    const out: { size: number; tl: number; text: string }[] = [];
    for (const block of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
      const attrs = block[1];
      const size = Number(attrs.match(/font-size="([\d.]+)"/)?.[1] ?? 11);
      const tspans = [...block[2].matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
      if (tspans.length) {
        for (const t of tspans) {
          const tl = t[1].match(/textLength="([\d.]+)"/);
          if (tl) out.push({ size, tl: Number(tl[1]), text: decode(t[2]) });
        }
      } else {
        const tl = attrs.match(/textLength="([\d.]+)"/);
        if (tl) out.push({ size, tl: Number(tl[1]), text: decode(block[2]) });
      }
    }
    return out;
  }

  let checked = 0;
  it.each(models)('%s never crushes a label below the squish floor (both layers)', (_f, model) => {
    for (const audience of ['clinician', 'client'] as const) {
      for (const seg of compressedSegments(render(model, { audience }).svg)) {
        const natural = textWidth(seg.text, seg.size);
        if (natural <= 0) continue;
        checked += 1;
        const ratio = seg.tl / natural;
        expect(
          ratio >= SQUISH_FLOOR - SLOP || seg.size <= LEG_FLOOR + SLOP,
          `${_f}/${audience}: "${seg.text.slice(0, 30)}" squished to ${(ratio * 100).toFixed(0)}% at ${seg.size}px (shrink the font first)`,
        ).toBe(true);
      }
    }
  });

  it('the corpus actually exercises compression (some labels carry textLength)', () => {
    expect(checked).toBeGreaterThan(0);
  });
});

describe('Tier-A safety dual-coding (pilots 2+3: the way-out is unsafe glyph-only)', () => {
  // The bare exit arrow read as "escape/avoidance"; with its word it read as "the way out". So a
  // renderer MUST NOT draw a way-out (`exit` edge) without its word (v0.2 §5).
  const withExit = models.filter(([, m]) => m.edges.some((e) => e.kind === 'exit'));

  it('there is at least one exit-bearing example to check', () => {
    expect(withExit.length).toBeGreaterThan(0);
  });

  it.each(withExit)('%s renders every way-out with its word (never a bare arrow)', (_f, model) => {
    for (const audience of ['clinician', 'client'] as const) {
      expect(render(model, { audience }).svg).toContain('EXIT');
    }
  });
});
