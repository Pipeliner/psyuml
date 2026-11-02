/**
 * Edge-label placement + edge routing around third nodes (ADR-0062, issues #6 and #8).
 *
 * The corpus-wide invariants (`overlap.test.ts`, `text-overlap.test.ts`, `layout-quality.test.ts`)
 * only see the shapes the committed examples happen to have. These are the issue repros — small,
 * synthetic models that broke them — pinned as regression tests:
 *
 *   #6.1 state-map: a routed exit edge between two node columns put its label BEHIND a state box;
 *   #6.2 state-map: two crossing diagonal triggers stacked their labels at the crossing point;
 *   #6.3 mode-map: with manual `pos`, two crossing edges' labels both sat at the shared midpoint,
 *        and an edge collinear with a third mode was drawn straight THROUGH that mode;
 *   #6.4 state-map: band titles were printed over the band hatch with no halo;
 *   #8.1 relational-field: an edge ran straight through a third person (changing the clinical
 *        reading), its label was hidden behind that person, and the zigzag overprinted a fused line;
 *   #8.2 relational-field: the canvas always started at y=0, leaving an empty band under the title.
 *
 * Every repro also runs the general battery: no node/label overlap, no text↔text overlap, every
 * box/text inside the viewBox, no edge through a non-incident node, every edge label haloed.
 *
 * Traceability: REQ-EDGE-ROUTER, REQ-LABEL-HALO, REQ-GENOGRAM, REQ-TEXT-LEGIBILITY (§D, §J).
 */
import { describe, expect, it } from 'vitest';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import * as render from '@psyuml/render';
import { type Box, type Pt, overlaps, segIntersectsBox } from './layout';
import {
  boxesFromSvg,
  edgeSegments,
  idOf,
  kindOf,
  textBoxesFromSvg,
  viewBoxOf,
  type ElBox,
} from './introspect';

const SLOP = 1;
const L = (s: string) => ({ clinician: { en: s }, client: { en: s } });

type RawEdge = { id: string; source: string; kind: string; target: string; text?: string };

function stateModel(nodes: [string, string, string][], edges: RawEdge[]): PsyumlModel {
  return parseModel({
    version: '0.1.0',
    diagram: 'state-map',
    meta: { title: 'Synthetic state map', disclaimer: 'Not a diagnosis.' },
    bands: [
      { id: 'ventral', order: 0, label: L('Ventral / safe-social') },
      { id: 'sympathetic', order: 1, pattern: 'diagonal', label: L('Sympathetic / mobilized') },
      { id: 'dorsal', order: 2, pattern: 'cross-hatch', label: L('Dorsal / shutdown') },
    ],
    nodes: nodes.map(([id, band, label]) => ({ id, kind: 'state', bandId: band, label: L(label) })),
    edges: edges.map((e) => ({
      id: e.id,
      kind: e.kind,
      source: e.source,
      target: e.target,
      ...(e.text ? (e.kind === 'exit' ? { label: L(e.text) } : { trigger: L(e.text) }) : {}),
    })),
  });
}

const SIX_STATES: [string, string, string][] = [
  ['calm', 'ventral', 'Calm / connected'],
  ['flowNode', 'ventral', 'Flow / engaged'],
  ['anxious', 'sympathetic', 'Anxious / fight-flight'],
  ['alert', 'sympathetic', 'Alert / watchful'],
  ['numb', 'dorsal', 'Numb / shutdown'],
  ['freezeNode', 'dorsal', 'Freeze / stuck'],
];

/** #6.1 — the example plus a second node per band and a cross-column exit. */
const stateExit = stateModel(SIX_STATES, [
  { id: 'e1', source: 'calm', kind: 'sequential', target: 'anxious', text: 'criticism' },
  { id: 'e2', source: 'anxious', kind: 'sequential', target: 'numb', text: 'overwhelm' },
  { id: 'x1', source: 'numb', kind: 'exit', target: 'anxious', text: 'movement / orienting' },
  { id: 'x2', source: 'anxious', kind: 'exit', target: 'calm', text: 'paced breathing' },
  {
    id: 'x',
    source: 'freezeNode',
    kind: 'exit',
    target: 'flowNode',
    text: 'movement, orienting, grounding',
  },
]);

/** #6.2 — two diagonal triggers between the middle and bottom bands that cross. */
const stateCross = stateModel(SIX_STATES, [
  { id: 'e1', source: 'calm', kind: 'sequential', target: 'anxious', text: 'criticism' },
  { id: 'd1', source: 'anxious', kind: 'sequential', target: 'freezeNode', text: 'sudden noise' },
  { id: 'd2', source: 'alert', kind: 'sequential', target: 'numb', text: 'too many demands' },
  { id: 'x1', source: 'numb', kind: 'exit', target: 'anxious', text: 'movement / orienting' },
]);

function modeModel(
  nodes: [string, number, number][],
  edges: [string, string, string, string][],
): PsyumlModel {
  return parseModel({
    version: '0.1.0',
    diagram: 'mode-map',
    meta: { title: 'Synthetic mode map', disclaimer: 'Not a diagnosis.' },
    nodes: nodes.map(([id, x, y]) => ({
      id,
      kind: 'agent',
      stereotype: 'coping',
      position: { x, y },
      label: L(`Mode ${id.toUpperCase()}`),
      properties: { dominance: 0.5 },
    })),
    edges: edges.map(([id, source, target, label]) => ({
      id,
      kind: 'sequential',
      source,
      target,
      label: L(label),
    })),
  });
}

/** #6.3a — an X: a→d and b→c cross at the shared midpoint. */
const modeCross = modeModel(
  [
    ['a', 120, 90],
    ['b', 440, 90],
    ['c', 120, 330],
    ['d', 440, 330],
  ],
  [
    ['m1', 'a', 'd', 'attacks harshly'],
    ['m2', 'b', 'c', 'yields quietly'],
  ],
);

/** #6.3b — a→b is collinear with a third mode c sitting between them. */
const modeCollinear = modeModel(
  [
    ['a', 100, 180],
    ['c', 290, 180],
    ['b', 480, 180],
  ],
  [['m1', 'a', 'b', 'activates']],
);

/** #8 — the issue's synthetic genogram (every pos has y ≥ 90; the edge gm→me passes `mother`). */
function relModel(
  nodes: [string, string, number, number, string, boolean?][],
  edges: [string, string, string, string, string?][],
): PsyumlModel {
  return parseModel({
    version: '0.1.0',
    diagram: 'relational-field',
    meta: { title: 'repro', disclaimer: 'Not a diagnosis.' },
    nodes: nodes.map(([id, st, x, y, label, index]) => ({
      id,
      kind: 'agent',
      stereotype: st,
      position: { x, y },
      label: L(label),
      properties: index ? { index: true } : {},
    })),
    edges: edges.map(([id, source, kind, target, label]) => ({
      id,
      kind,
      source,
      target,
      ...(label ? { label: L(label) } : {}),
    })),
  });
}
const relRepro = relModel(
  [
    ['gm', 'female', 640, 90, 'Grandmother'],
    ['mother', 'female', 520, 240, 'Mother'],
    ['me', 'male', 360, 400, 'Index', true],
  ],
  [
    ['g1', 'gm', 'conflict', 'me', 'hostility'],
    ['g2', 'me', 'fused', 'mother'],
  ],
);
/** #8.2 — every pos has y ≥ 240. */
const relLow = relModel(
  [
    ['p1', 'female', 200, 260, 'Person one'],
    ['p2', 'male', 420, 300, 'Person two'],
    ['p3', 'female', 310, 420, 'Person three'],
  ],
  [
    ['r1', 'p1', 'close', 'p2', 'close'],
    ['r2', 'p2', 'distant', 'p3'],
  ],
);

// ---- the general battery ------------------------------------------------------------------------

function assertClean(label: string, model: PsyumlModel, svg: string): void {
  const all = boxesFromSvg(svg);
  const nodes = all.filter((b) => kindOf(b.el) === 'node');
  const labels = all.filter((b) => kindOf(b.el) === 'nodelabel' || kindOf(b.el) === 'edgelabel');
  for (const lab of labels)
    for (const n of nodes) {
      if (idOf(lab.el) === idOf(n.el)) continue;
      expect(overlaps(lab, n, -SLOP), `${label}: ${lab.el} overlaps node ${n.el}`).toBe(false);
    }
  for (let i = 0; i < labels.length; i += 1)
    for (let j = i + 1; j < labels.length; j += 1)
      expect(
        overlaps(labels[i], labels[j], -SLOP),
        `${label}: ${labels[i].el} overlaps ${labels[j].el}`,
      ).toBe(false);
  const texts = textBoxesFromSvg(svg).filter((t) => t.content.length > 0);
  for (let i = 0; i < texts.length; i += 1)
    for (let j = i + 1; j < texts.length; j += 1)
      expect(
        overlaps(texts[i], texts[j], -SLOP),
        `${label}: text "${texts[i].content}" overlaps text "${texts[j].content}"`,
      ).toBe(false);
  const vb = viewBoxOf(svg);
  for (const b of [...all, ...texts]) {
    const name = 'el' in b && b.el ? b.el : (b as { content?: string }).content;
    expect(b.x >= vb.x - 4 && b.y >= vb.y - 4, `${label}: ${name} above/left of frame`).toBe(true);
    expect(
      b.x + b.w <= vb.x + vb.w + 4 && b.y + b.h <= vb.y + vb.h + 4,
      `${label}: ${name} below/right of frame`,
    ).toBe(true);
  }
  const inc = new Map(model.edges.map((e) => [e.id, [e.source, e.target]] as const));
  for (const e of edgeSegments(svg)) {
    const ends: readonly string[] = inc.get(e.id) ?? [];
    for (const n of nodes) {
      if (ends.includes(idOf(n.el))) continue;
      for (const [p, q] of e.segs)
        expect(
          segIntersectsBox(p, q, n, -SLOP),
          `${label}: edge ${e.id} passes through node ${n.el}`,
        ).toBe(false);
    }
  }
  for (const m of svg.matchAll(/<text\b[^>]*data-el="edgelabel:[^"]*"[^>]*>/g))
    expect(m[0], `${label}: edge label without a halo`).toContain('paint-order="stroke"');
}

const byEl = (svg: string, el: string): ElBox => {
  const b = boxesFromSvg(svg).find((x) => x.el === el);
  if (!b) throw new Error(`no ${el}`);
  return b;
};
const segsOf = (svg: string, id: string): [Pt, Pt][] => {
  const e = edgeSegments(svg).find((x) => x.id === id);
  if (!e) throw new Error(`no edge:${id}`);
  return e.segs;
};
/** Does any segment of edge `id` pass through box `b`? (a label sitting ON another edge's line) */
const edgeHitsBox = (svg: string, id: string, b: Box): boolean =>
  segsOf(svg, id).some(([p, q]) => segIntersectsBox(p, q, b, -SLOP));

/** Minimum distance between two polylines, sampled every 2px along `a`. */
function minDist(a: [Pt, Pt][], b: [Pt, Pt][], skip: (p: Pt) => boolean): number {
  const dPS = (p: Pt, [s, t]: [Pt, Pt]): number => {
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const len2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / len2));
    return Math.hypot(p.x - s.x - u * dx, p.y - s.y - u * dy);
  };
  let best = Infinity;
  for (const [s, t] of a) {
    const n = Math.max(1, Math.ceil(Math.hypot(t.x - s.x, t.y - s.y) / 2));
    for (let i = 0; i <= n; i += 1) {
      const p = { x: s.x + ((t.x - s.x) * i) / n, y: s.y + ((t.y - s.y) * i) / n };
      if (skip(p)) continue;
      for (const seg of b) best = Math.min(best, dPS(p, seg));
    }
  }
  return best;
}

// ---- #6 state-map + mode-map --------------------------------------------------------------------

describe('issue #6 — state-map edge labels', () => {
  it('6.1 a routed exit label is not hidden behind (or over) any state box', () => {
    for (const layer of ['clinician', 'client'] as const) {
      const svg = render.renderStateMap(stateExit, { layer }).svg;
      assertClean(`state-exit/${layer}`, stateExit, svg);
      const lab = byEl(svg, 'edgelabel:x');
      for (const n of boxesFromSvg(svg).filter((b) => kindOf(b.el) === 'node'))
        expect(overlaps(lab, n, -SLOP), `exit label under ${n.el}`).toBe(false);
    }
  });

  it('6.2 crossing transition labels do not stack at the crossing point', () => {
    for (const layer of ['clinician', 'client'] as const) {
      const svg = render.renderStateMap(stateCross, { layer }).svg;
      assertClean(`state-cross/${layer}`, stateCross, svg);
      const a = byEl(svg, 'edgelabel:d1');
      const b = byEl(svg, 'edgelabel:d2');
      expect(overlaps(a, b, 2), 'the two crossing labels touch').toBe(false);
      // neither label sits on the OTHER edge's line (that is what "at the crossing" looks like)
      expect(edgeHitsBox(svg, 'd2', a), 'd1 label sits on edge d2').toBe(false);
      expect(edgeHitsBox(svg, 'd1', b), 'd2 label sits on edge d1').toBe(false);
    }
  });

  it('6.4 band titles carry a white halo over the band hatch', () => {
    const svg = render.renderStateMap(stateExit).svg;
    for (const name of ['Ventral / safe-social', 'Sympathetic / mobilized', 'Dorsal / shutdown']) {
      const tag = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].find((m) => m[1] === name);
      expect(tag, `band title ${name}`).toBeDefined();
      expect(tag![0], `band title ${name} halo`).toContain('paint-order="stroke"');
      expect(tag![0]).toContain('stroke="#fff"');
    }
  });

  it('the stress state-map and the corpus example stay clean', () => {
    const ex = stateModel(
      SIX_STATES.filter((_, i) => i % 2 === 0),
      [
        { id: 'e1', source: 'calm', kind: 'sequential', target: 'anxious', text: 'criticism' },
        { id: 'x1', source: 'numb', kind: 'exit', target: 'anxious', text: 'movement' },
      ],
    );
    assertClean('state-simple', ex, render.renderStateMap(ex).svg);
  });
});

describe('issue #6 — mode-map edge labels + routing', () => {
  it('6.3a two crossing edges get separate labels, off each other and off the other line', () => {
    const svg = render.renderModeMap(modeCross).svg;
    assertClean('mode-cross', modeCross, svg);
    const a = byEl(svg, 'edgelabel:m1');
    const b = byEl(svg, 'edgelabel:m2');
    expect(overlaps(a, b, 2), 'crossing labels overprint').toBe(false);
    expect(edgeHitsBox(svg, 'm2', a), 'm1 label sits on edge m2').toBe(false);
    expect(edgeHitsBox(svg, 'm1', b), 'm2 label sits on edge m1').toBe(false);
  });

  it('6.3b an edge collinear with a third mode is routed around it, label clear of it', () => {
    const svg = render.renderModeMap(modeCollinear).svg;
    assertClean('mode-collinear', modeCollinear, svg);
    const c = byEl(svg, 'node:c');
    expect(edgeHitsBox(svg, 'm1', c), 'edge a→b drawn through mode c').toBe(false);
    expect(overlaps(byEl(svg, 'edgelabel:m1'), c, -SLOP)).toBe(false);
  });

  it('a clear straight edge stays a straight segment (no gratuitous detour)', () => {
    const svg = render.renderModeMap(modeCross).svg;
    expect(segsOf(svg, 'm1')).toHaveLength(1);
  });
});

// ---- #8 relational-field ------------------------------------------------------------------------

describe('issue #8 — relational-field routing + framing', () => {
  it('8.1 a tie is routed around a third person and its label stays visible', () => {
    for (const layer of ['clinician', 'client'] as const) {
      const svg = render.renderRelationalField(relRepro, { layer }).svg;
      assertClean(`rel-repro/${layer}`, relRepro, svg);
      const mother = byEl(svg, 'node:mother');
      expect(edgeHitsBox(svg, 'g1', mother), 'gm→me conflict drawn through Mother').toBe(false);
      expect(overlaps(byEl(svg, 'edgelabel:g1'), mother, -SLOP)).toBe(false);
    }
  });

  it('8.1 the routed conflict zigzag keeps clear of the fused triple line', () => {
    const svg = render.renderRelationalField(relRepro).svg;
    const me = { x: 360, y: 400 };
    // near the shared endpoint the two ties necessarily converge; elsewhere they must not touch
    const nearMe = (p: Pt): boolean => Math.hypot(p.x - me.x, p.y - me.y) < 60;
    expect(minDist(segsOf(svg, 'g1'), segsOf(svg, 'g2'), nearMe)).toBeGreaterThan(10);
  });

  it('8.2 the viewBox is fitted to the content (no empty band under the title)', () => {
    for (const m of [relLow, relRepro]) {
      const svg = render.renderRelationalField(m).svg;
      assertClean('rel-fit', m, svg);
      const vb = viewBoxOf(svg);
      const content = boxesFromSvg(svg).filter((b) => kindOf(b.el) === 'node');
      const top = Math.min(...content.map((b) => b.y));
      const bottom = Math.max(...content.map((b) => b.y + b.h));
      // title row (~34px) + padding above the first glyph; never a 200px blank band
      expect(top - vb.y, 'empty band above the content').toBeLessThanOrEqual(80);
      // legend/disclaimer + the bottom caption below the last glyph; no large blank band either
      expect(vb.y + vb.h - bottom, 'empty band below the content').toBeLessThanOrEqual(110);
    }
  });

  it('every relation is a tagged edge the invariants can read', () => {
    const svg = render.renderRelationalField(relRepro).svg;
    expect(
      edgeSegments(svg)
        .map((e) => e.id)
        .sort(),
    ).toEqual(['g1', 'g2']);
  });
});
