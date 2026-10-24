/**
 * Body Map frame, regions and label placement (issue #9, ADR-0061). Synthetic content only.
 *
 *  1. A marker placed outside the figure (e.g. below the feet) GROWS the canvas — the caption and
 *     disclaimer move below it — instead of being drawn over the footer; a marker past the frame's
 *     side is clamped in. The figure's coordinate frame is a documented, exported contract
 *     (`BODY_FIGURE`), and `stereotype=<region>` places a sensation on a named anchor
 *     (`BODY_REGION_ANCHORS`, keyed exhaustively by the model's `BODY_REGIONS`).
 *  2. A marker label prefers the side whose label box crosses no limb stroke; every label carries
 *     the white halo so an unavoidable crossing (a torso label) never strikes through the glyphs.
 *  3. `stereotype=whole-body` draws a non-localized sensation in a "Whole body" row beside (below)
 *     the figure, never pinned to a point on the torso.
 *
 * Traceability: REQ-NOTATION (§D), REQ-ACCESSIBILITY, REQ-LAYOUT-QUALITY.
 */
import { describe, expect, it } from 'vitest';
import { BODY_REGIONS, parseModel, type PsyumlModel } from '@psyuml/model';
import { boxesFromSvg, idOf, kindOf, textBoxesFromSvg, viewBoxOf } from './introspect';
import { overlaps, segIntersectsBox } from './layout';
import { BODY_FIGURE, BODY_REGION_ANCHORS, renderBodyMap } from './index';

interface N {
  id: string;
  st?: string;
  pos?: [number, number];
  i?: number;
  label?: string;
}
const model = (nodes: N[], title = 'Body map (synthetic)'): PsyumlModel =>
  parseModel({
    version: '0.1.0',
    diagram: 'body-map',
    meta: {
      title,
      disclaimer: 'Synthetic example. Supports, does not replace, professional care.',
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: 'state',
      ...(n.st ? { stereotype: n.st } : {}),
      ...(n.pos ? { position: { x: n.pos[0], y: n.pos[1] } } : {}),
      label: { clinician: { en: n.label ?? `Sensation ${n.id}` } },
      properties: { intensity: n.i ?? 0.5 },
    })),
  });

const circleOf = (svg: string, id: string): { cx: number; cy: number; r: number } => {
  const m = svg.match(
    new RegExp(`<circle data-el="node:${id}" cx="([\\d.-]+)" cy="([\\d.-]+)" r="([\\d.]+)"`),
  );
  if (!m) throw new Error(`no marker ${id}`);
  return { cx: Number(m[1]), cy: Number(m[2]), r: Number(m[3]) };
};
const captionTop = (svg: string): number => {
  const cap = textBoxesFromSvg(svg).find((t) => t.content.startsWith('Marker size'));
  if (!cap) throw new Error('no caption');
  return cap.y;
};

describe('body-map coordinate frame + named regions (issue #9.1)', () => {
  it('exports one anchor per model region, all inside the figure frame', () => {
    expect(Object.keys(BODY_REGION_ANCHORS).sort()).toEqual([...BODY_REGIONS].sort());
    for (const [k, p] of Object.entries(BODY_REGION_ANCHORS)) {
      expect(p.x, k).toBeGreaterThanOrEqual(BODY_FIGURE.bounds.x);
      expect(p.x, k).toBeLessThanOrEqual(BODY_FIGURE.bounds.x + BODY_FIGURE.bounds.w);
      expect(p.y, k).toBeGreaterThanOrEqual(BODY_FIGURE.bounds.y);
      expect(p.y, k).toBeLessThanOrEqual(BODY_FIGURE.bounds.y + BODY_FIGURE.bounds.h);
    }
  });

  it('places a sensation on its named region when it has no pos; an explicit pos wins', () => {
    const svg = renderBodyMap(
      model([
        { id: 'a', st: 'chest' },
        { id: 'b', st: 'foot-left' },
        { id: 'c', st: 'chest', pos: [300, 100] },
      ]),
    ).svg;
    expect(circleOf(svg, 'a')).toMatchObject({
      cx: BODY_REGION_ANCHORS.chest.x,
      cy: BODY_REGION_ANCHORS.chest.y,
    });
    expect(circleOf(svg, 'b')).toMatchObject({
      cx: BODY_REGION_ANCHORS['foot-left'].x,
      cy: BODY_REGION_ANCHORS['foot-left'].y,
    });
    expect(circleOf(svg, 'c')).toMatchObject({ cx: 300, cy: 100 });
  });

  it('fans out several sensations on the same region so their markers never overlap', () => {
    const svg = renderBodyMap(
      model([
        { id: 'a', st: 'abdomen', i: 0.9 },
        { id: 'b', st: 'abdomen', i: 0.9 },
        { id: 'c', st: 'abdomen', i: 0.9 },
      ]),
    ).svg;
    const nodes = boxesFromSvg(svg).filter((b) => kindOf(b.el) === 'node');
    expect(nodes).toHaveLength(3);
    for (let i = 0; i < nodes.length; i += 1)
      for (let j = i + 1; j < nodes.length; j += 1)
        expect(overlaps(nodes[i], nodes[j], -1), `${nodes[i].el}/${nodes[j].el}`).toBe(false);
  });

  it('grows the canvas for a marker below the figure — the footer moves below it (the repro)', () => {
    const svg = renderBodyMap(model([{ id: 'feet', pos: [230, 470], i: 0.7 }])).svg;
    const vb = viewBoxOf(svg);
    const tagged = boxesFromSvg(svg);
    const lowest = Math.max(...tagged.map((b) => b.y + b.h));
    expect(captionTop(svg)).toBeGreaterThan(lowest);
    expect(vb.h).toBeGreaterThan(484);
    for (const b of tagged) expect(b.y + b.h, b.el).toBeLessThanOrEqual(vb.y + vb.h);
  });

  it('clamps a marker placed past the frame edge back inside the viewBox', () => {
    const svg = renderBodyMap(model([{ id: 'x', pos: [900, -40] }])).svg;
    const vb = viewBoxOf(svg);
    const c = circleOf(svg, 'x');
    expect(c.cx + c.r).toBeLessThanOrEqual(vb.w);
    expect(c.cy - c.r).toBeGreaterThanOrEqual(0);
  });
});

describe('body-map label placement vs limb strokes (issue #9.2)', () => {
  it('a shoulder label goes to the side that crosses no limb (the repro)', () => {
    const svg = renderBodyMap(
      model([{ id: 's', pos: [178, 150], label: 'Shoulder tension (long-ish label)' }]),
    ).svg;
    const lab = boxesFromSvg(svg).find((b) => b.el === 'nodelabel:s')!;
    for (const [p, q] of BODY_FIGURE.limbs) expect(segIntersectsBox(p, q, lab)).toBe(false);
  });

  it('every marker label carries the white legibility halo', () => {
    const svg = renderBodyMap(
      model([{ id: 'a', st: 'chest', label: 'A long torso label here' }]),
    ).svg;
    expect(svg).toMatch(/<text[^>]*stroke="#fff"[^>]*data-el="nodelabel:a"/);
  });
});

describe('body-map whole-body marker (issue #9.3)', () => {
  const svg = renderBodyMap(
    model([
      { id: 'tired', st: 'whole-body', pos: [210, 240], label: 'Fatigue', i: 0.4 },
      { id: 'chest', st: 'chest', label: 'Tight chest', i: 0.6 },
    ]),
  );

  it('draws a whole-body sensation outside the figure, under a "Whole body" heading', () => {
    const c = circleOf(svg.svg, 'tired');
    const f = BODY_FIGURE.bounds;
    const inside = c.cx >= f.x && c.cx <= f.x + f.w && c.cy >= f.y && c.cy <= f.y + f.h;
    expect(inside).toBe(false);
    expect(svg.svg).toContain('Whole body');
    expect(captionTop(svg.svg)).toBeGreaterThan(c.cy + c.r);
  });

  it('says so in the alt-text and in the ru chrome', () => {
    expect(svg.altText).toContain('Fatigue (whole body, intensity 0.4)');
    const ru = renderBodyMap(model([{ id: 't', st: 'whole-body' }]), { lang: 'ru' }).svg;
    expect(ru).toContain('Всё тело');
    expect(ru).not.toContain('Whole body');
  });

  it('keeps every element clear of the others', () => {
    const all = boxesFromSvg(svg.svg);
    const nodes = all.filter((b) => kindOf(b.el) === 'node');
    const labels = all.filter((b) => kindOf(b.el) === 'nodelabel');
    for (const l of labels)
      for (const n of nodes)
        if (idOf(l.el) !== idOf(n.el)) expect(overlaps(l, n, -1), `${l.el}/${n.el}`).toBe(false);
  });
});
