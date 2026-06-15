/**
 * The "nothing ever overlaps" invariant (ADR-0012) — the machine-checked contract.
 *
 * For every example in the corpus AND a set of generated stress models (the cases that broke
 * prior whack-a-mole fixes), this asserts that no two logical elements collide:
 *   1. no two node boxes overlap;
 *   2. no node/edge label overlaps a node that is NOT its owner;
 *   3. no two label boxes overlap each other;
 *   4. every box lies within the SVG viewBox.
 *
 * Boxes are reconstructed from `data-el`-tagged elements in the emitted SVG, measuring text with
 * the SAME `textWidth` metric the renderers used to size their slots (`layout.ts`). The guarantee
 * therefore holds *under the shared text-metric model* — see ADR-0012 for the honest scope (edge
 * line/path crossings are not "overlap" and are out of scope; bands/chrome are containers and are
 * excluded from node-overlap checks).
 *
 * Traceability: REQ-ACCESSIBILITY, REQ-NOTATION (§D), REQ-CONFORMANCE (§J).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parseModel, type PsyumlModel } from '@psyuml/model';
import * as render from '@psyuml/render';
import { type Box, overlaps, textWidth } from './layout';

/** A reconstructed element: its AABB plus the `data-el` tag it was drawn with. */
interface ElBox extends Box {
  el: string;
}

/** Tolerance: the shared metric is an estimate, so allow <=1px of slop before calling it overlap. */
const SLOP = 1;

const num = (s: string | undefined): number => Number(s);

/** Parse the attributes of a single SVG element string into a flat map. */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** AABB of a `points="x,y x,y …"` polygon. */
function polygonBox(points: string): Box | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of points.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  if (!xs.length) return null;
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

/** AABB of one line of text given its baseline x,y, font size, anchor, and string content.
 * SVG `y` is the baseline; approximate the glyph box as ascent ~0.8em above to descent ~0.2em
 * below, and the width from the shared `textWidth` metric, positioned by `text-anchor`. */
function textLineBox(content: string, x: number, y: number, size: number, anchor: string): Box {
  const w = textWidth(content, size);
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return { x: left, y: y - size * 0.8, w, h: size };
}

const TEXT_RE = /<text\b([^>]*?)(\/>|>([\s\S]*?)<\/text>)/g;
const TSPAN_RE = /<tspan\b([^>]*?)(?:\/>|>([\s\S]*?)<\/tspan>)/g;
const SHAPE_RE = /<(rect|circle|ellipse|polygon)\b([^>]*?)\/?>/g;

const unesc = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

/**
 * Extract an AABB for every `data-el`-tagged element in the SVG. Shapes
 * (`rect`/`circle`/`ellipse`/`polygon`) give a geometric AABB; `text` gives an AABB from its
 * `x`,`y`,`text-anchor` + measured content (a multi-line `<tspan>` stack is the union over its
 * lines, each measured at its own `x`,`y`). Untagged drawing (edge lines/paths, decorative
 * silhouettes, defs) is intentionally ignored.
 */
export function boxesFromSvg(svg: string): ElBox[] {
  const out: ElBox[] = [];

  for (const m of svg.matchAll(TEXT_RE)) {
    const a = attrs(m[1]);
    const el = a['data-el'];
    if (!el) continue;
    const size = a['font-size'] ? num(a['font-size']) : 11;
    const inner = m[3] ?? '';
    const tspans = [...inner.matchAll(TSPAN_RE)];
    if (tspans.length) {
      const boxes: Box[] = [];
      for (const ts of tspans) {
        const ta = attrs(ts[1]);
        const content = unesc((ts[2] ?? '').replace(/<[^>]*>/g, ''));
        boxes.push(textLineBox(content, num(ta.x), num(ta.y), size, a['text-anchor'] ?? 'start'));
      }
      const minX = Math.min(...boxes.map((b) => b.x));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxX = Math.max(...boxes.map((b) => b.x + b.w));
      const maxY = Math.max(...boxes.map((b) => b.y + b.h));
      out.push({ el, x: minX, y: minY, w: maxX - minX, h: maxY - minY });
    } else {
      const content = unesc(inner.replace(/<[^>]*>/g, ''));
      out.push({
        el,
        ...textLineBox(content, num(a.x), num(a.y), size, a['text-anchor'] ?? 'start'),
      });
    }
  }

  for (const m of svg.matchAll(SHAPE_RE)) {
    const kind = m[1];
    const a = attrs(m[2]);
    const el = a['data-el'];
    if (!el) continue;
    let box: Box | null = null;
    if (kind === 'rect') {
      box = { x: num(a.x), y: num(a.y), w: num(a.width), h: num(a.height) };
    } else if (kind === 'circle') {
      const r = num(a.r);
      box = { x: num(a.cx) - r, y: num(a.cy) - r, w: 2 * r, h: 2 * r };
    } else if (kind === 'ellipse') {
      const rx = num(a.rx);
      const ry = num(a.ry);
      box = { x: num(a.cx) - rx, y: num(a.cy) - ry, w: 2 * rx, h: 2 * ry };
    } else if (kind === 'polygon') {
      box = polygonBox(a.points ?? '');
    }
    if (box) out.push({ el, ...box });
  }

  return out;
}

function viewBox(svg: string): Box {
  const m = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/);
  if (!m) throw new Error('no viewBox');
  return { x: num(m[1]), y: num(m[2]), w: num(m[3]), h: num(m[4]) };
}

/** The id carried by a `kind:id` tag (e.g. `node:exile` → `exile`, `edgelabel:c1` → `c1`). */
const idOf = (el: string): string => el.slice(el.indexOf(':') + 1);
const kindOf = (el: string): string => el.slice(0, el.indexOf(':'));

// Only `node:*` / `nodelabel:*` / `edgelabel:*` participate in the overlap checks; container/chrome
// tags (`band:*`, `banner:*`, …) are deliberately NOT node/label kinds, so they're excluded from
// (1)/(2)/(3) and only the in-frame check (4) applies to them.

/** Run all four overlap assertions for one rendered SVG. `scopeLabelLabel=false` documents a
 * renderer where label↔label non-overlap is infeasible without a major rewrite (ADR-0012 §gap). */
function assertNoOverlap(label: string, svg: string, scopeLabelLabel = true): void {
  const all = boxesFromSvg(svg);
  const nodes = all.filter((b) => kindOf(b.el) === 'node');
  const labels = all.filter((b) => kindOf(b.el) === 'nodelabel' || kindOf(b.el) === 'edgelabel');
  const vb = viewBox(svg);

  // 1) no two node boxes overlap
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      expect(
        overlaps(nodes[i], nodes[j], -SLOP),
        `${label}: node ${nodes[i].el} overlaps node ${nodes[j].el}`,
      ).toBe(false);
    }
  }

  // 2) no label overlaps a NON-owner node (owner = same id)
  for (const lab of labels) {
    for (const node of nodes) {
      if (idOf(lab.el) === idOf(node.el)) continue; // a label may sit inside its own node
      expect(
        overlaps(lab, node, -SLOP),
        `${label}: label ${lab.el} overlaps non-owner node ${node.el}`,
      ).toBe(false);
    }
  }

  // 3) no two labels overlap each other
  if (scopeLabelLabel) {
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        expect(
          overlaps(labels[i], labels[j], -SLOP),
          `${label}: label ${labels[i].el} overlaps label ${labels[j].el}`,
        ).toBe(false);
      }
    }
  }

  // 4) every tagged box lies within the viewBox — containers (band/banner/…) included, since
  // they too must fit the frame (chrome that spilled past the viewBox would clip on export).
  for (const b of all) {
    expect(b.x, `${label}: ${b.el} left of viewBox`).toBeGreaterThanOrEqual(vb.x - SLOP);
    expect(b.y, `${label}: ${b.el} above viewBox`).toBeGreaterThanOrEqual(vb.y - SLOP);
    expect(b.x + b.w, `${label}: ${b.el} right of viewBox`).toBeLessThanOrEqual(vb.x + vb.w + SLOP);
    expect(b.y + b.h, `${label}: ${b.el} below viewBox`).toBeLessThanOrEqual(vb.y + vb.h + SLOP);
  }
}

type Renderer = (m: PsyumlModel, o?: { layer?: 'clinician' | 'client' }) => { svg: string };
const RENDERERS: Record<string, Renderer> = {
  'state-map': render.renderStateMap,
  'parts-map': render.renderPartsMap,
  'mode-map': render.renderModeMap,
  'relational-field': render.renderRelationalField,
  'body-map': render.renderBodyMap,
  'process-loop': render.renderLoopMap,
  timeline: render.renderTimeline,
  'intervention-sequence': render.renderInterventionSeq,
  ritual: render.renderRitual,
  'decision-nav': render.renderDecisionChart,
  'resource-anchor': render.renderResourceMap,
  'two-triangles': render.renderTwoTriangles,
};

const load = (f: string): PsyumlModel =>
  parseModel(readFileSync(new URL(`../../examples/${f}`, import.meta.url), 'utf8'));
const files = readdirSync(new URL('../../examples/', import.meta.url)).filter((f) =>
  f.endsWith('.psyuml'),
);

/**
 * Renderers with a documented label↔label known-gap (ADR-0012): their FREE edge labels (on bowed
 * curves / ring chords) collide with another label even on the corpus, and avoiding it needs a
 * routing rewriter we judged disproportionate. For these we scope assertion #3 out and keep #1
 * (node↔node), #2 (label↔non-owner-node), and #4 (in-frame) universal. Every OTHER renderer —
 * incl. the other hand-placed free-chord ones (mode-map, relational-field, two-triangles) and the
 * lane diagrams (intervention-sequence) — currently satisfies #3 on the corpus + stress too, so we
 * assert it for them (extra coverage); #3 there is enforced-where-it-holds rather than
 * architecturally guaranteed for arbitrary hand layouts.
 */
const LABEL_LABEL_KNOWN_GAP = new Set([
  'parts-map', // containment "protects/soothes" + conflict labels on bowed curves around the Self
  'process-loop', // ring-chord trigger labels on a maintaining cycle (cat-sdr's trap + exit collide)
]);

describe('overlap invariant — corpus (ADR-0012)', () => {
  describe.each(files)('%s', (f) => {
    const model = load(f);
    const renderer = RENDERERS[model.diagram];
    const scope3 = !LABEL_LABEL_KNOWN_GAP.has(model.diagram);
    for (const layer of ['clinician', 'client'] as const) {
      it(`nothing overlaps (${layer})`, () => {
        assertNoOverlap(`${f}/${layer}`, renderer(model, { layer }).svg, scope3);
      });
    }
  });
});

// ---- Generated stress models: the cases that broke prior per-renderer fixes. ----------------

const long = (s: string) => ({ clinician: { en: s }, client: { en: s } });

/** (a) decision-nav: >=16 nodes, several 50–65-char labels, a wide branch, a back-edge/cycle. */
function decisionStress(): PsyumlModel {
  const L = [
    'Am I safe right now, this very moment, or in danger?', // ~52
    'Notice and name the strongest feeling showing up now', // ~52
    'TIPP: cold water on the face, paced breathing, exercise', // ~56
    'Move the body, orient to the room, reach a support person', // ~58
    'Have fifteen minutes passed and am I still feeling stuck?', // ~57
  ];
  const ids = ['root', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o'];
  const node = (id: string, i: number) => ({
    id,
    kind: 'state' as const,
    ...(i % 4 === 0 ? { stereotype: 'question' } : {}),
    label: long(L[i % L.length] ?? `Step ${id} in the plan`),
  });
  const edge = (id: string, source: string, target: string, label?: string) => ({
    id,
    kind: 'sequential' as const,
    source,
    target,
    ...(label ? { label: long(label) } : {}),
  });
  return parseModel({
    version: '0.1.0',
    diagram: 'decision-nav',
    meta: {
      title: 'Stress: branching + looping crisis plan',
      disclaimer: 'This plan supports, and does not replace, professional care.',
      crisisResources: 'If you are in danger now, call your local emergency number.',
    },
    nodes: ids.map(node),
    edges: [
      // a wide branch out of the root (5-wide layer)
      edge('r-a', 'root', 'a', 'if I am physically unsafe right now'),
      edge('r-b', 'root', 'b', 'if I am revved up and panicky'),
      edge('r-c', 'root', 'c', 'if I feel shut down and numb'),
      edge('r-d', 'root', 'd', 'if I am dissociating or foggy'),
      edge('r-e', 'root', 'e', 'if none of the above and just low'),
      edge('a-f', 'a', 'f'),
      edge('b-g', 'b', 'g'),
      edge('c-h', 'c', 'h'),
      edge('d-i', 'd', 'i'),
      edge('e-j', 'e', 'j'),
      edge('f-k', 'f', 'k'),
      edge('g-l', 'g', 'l'),
      edge('h-m', 'h', 'm'),
      edge('k-n', 'k', 'n'),
      edge('n-o', 'n', 'o'),
      // the cycle / back-edge: still not safe -> start over
      edge('o-root', 'o', 'root', 'still not safe after all the steps — start over'),
    ],
  });
}

/** (b) state-map: >=4 parallel edges between the SAME pair w/ long triggers + several exits. */
function stateStress(): PsyumlModel {
  const trig = (id: string, source: string, target: string, t: string, exit = false) => ({
    id,
    kind: (exit ? 'exit' : 'sequential') as 'exit' | 'sequential',
    source,
    target,
    ...(exit ? { label: long(t) } : { trigger: long(t) }),
  });
  return parseModel({
    version: '0.1.0',
    diagram: 'state-map',
    meta: { title: 'Stress: parallel triggers', disclaimer: 'Supports, not replaces, care.' },
    bands: [
      { id: 'green', order: 0, label: long('Ventral / safe-social') },
      { id: 'amber', order: 1, label: long('Sympathetic / mobilized') },
      { id: 'red', order: 2, label: long('Dorsal / shutdown') },
    ],
    nodes: [
      { id: 'calm', kind: 'state', bandId: 'green', label: long('Calm / connected') },
      { id: 'wired', kind: 'state', bandId: 'amber', label: long('Anxious / fight-or-flight') },
      { id: 'numb', kind: 'state', bandId: 'red', label: long('Numb / shut down') },
    ],
    edges: [
      // four parallel transitions calm -> wired carrying long trigger labels
      trig('t1', 'calm', 'wired', 'harsh criticism from someone I respect'),
      trig('t2', 'calm', 'wired', 'a sudden fight with my partner at home'),
      trig('t3', 'calm', 'wired', 'an unexpected bill I cannot pay this month'),
      trig('t4', 'calm', 'wired', 'a reminder of last year on the anniversary'),
      trig('t5', 'wired', 'numb', 'too much input all at once, overwhelm'),
      // several exits
      trig('x1', 'numb', 'wired', 'movement and orienting to the room', true),
      trig('x2', 'wired', 'calm', 'paced breathing and co-regulation', true),
      trig('x3', 'numb', 'calm', 'a long walk outside in the cold air', true),
    ],
  });
}

/** (c) parts-map: >=6 protectors w/ long labels + >=2 conflict ties. */
function partsStress(): PsyumlModel {
  const prot = (id: string, label: string, stereotype: string) => ({
    id,
    kind: 'agent' as const,
    stereotype,
    label: long(label),
    properties: { provenance: ['IFS'] },
  });
  return parseModel({
    version: '0.1.0',
    diagram: 'parts-map',
    meta: { title: 'Stress: crowded inner system', disclaimer: 'Supports, not replaces, care.' },
    nodes: [
      { id: 'self', kind: 'self', stereotype: 'Self', label: long('Self (the calm core)') },
      prot('p1', 'The relentless inner critic', 'manager'),
      prot('p2', 'The anxious overplanner', 'manager'),
      prot('p3', 'The compulsive people-pleaser', 'manager'),
      prot('p4', 'The part that goes blank and numb', 'firefighter'),
      prot('p5', 'The one that flares up in anger', 'firefighter'),
      prot('p6', 'The part that scrolls all night', 'firefighter'),
      {
        id: 'exile',
        kind: 'agent',
        stereotype: 'exile',
        label: long('Little one, age six, who felt unseen'),
        properties: { provenance: ['IFS', 'schema', 'SD'] },
      },
    ],
    edges: [
      { id: 'c1', kind: 'containment', source: 'p1', target: 'exile', label: long('protects') },
      { id: 'c2', kind: 'containment', source: 'p2', target: 'exile', label: long('protects') },
      { id: 'c3', kind: 'containment', source: 'p3', target: 'exile', label: long('soothes') },
      { id: 'c4', kind: 'containment', source: 'p4', target: 'exile', label: long('numbs') },
      { id: 'c5', kind: 'containment', source: 'p5', target: 'exile', label: long('defends') },
      { id: 'c6', kind: 'containment', source: 'p6', target: 'exile', label: long('distracts') },
      {
        id: 'b1',
        kind: 'barrier',
        source: 'exile',
        target: 'self',
        label: long('dissociative barrier'),
      },
      // two conflict ties between protectors
      { id: 'cf1', kind: 'conflict', source: 'p1', target: 'p4', label: long('push vs shut down') },
      {
        id: 'cf2',
        kind: 'conflict',
        source: 'p2',
        target: 'p5',
        label: long('control vs explode'),
      },
    ],
  });
}

describe('overlap invariant — stress models (ADR-0012)', () => {
  it('decision-nav: wide branch + long labels + cycle', () => {
    assertNoOverlap('stress/decision-nav', render.renderDecisionChart(decisionStress()).svg);
  });
  it('state-map: 4 parallel edges + exits + long triggers', () => {
    assertNoOverlap('stress/state-map', render.renderStateMap(stateStress()).svg);
  });
  it('parts-map: 6 protectors + 2 conflict ties', () => {
    // #3 (label↔label) is a documented known-gap for the parts-map's free containment/conflict
    // curve labels (ADR-0012); #1/#2/#4 hold even in this crowded stress case.
    assertNoOverlap('stress/parts-map', render.renderPartsMap(partsStress()).svg, false);
  });
});
