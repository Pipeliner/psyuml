/**
 * SVG introspection for the layout invariants (ADR-0012 overlap + ADR-0021 layout-quality).
 *
 * Reconstructs the geometry the renderers emitted — node/label AABBs and edge polylines — from the
 * `data-el`-tagged elements of a rendered SVG string, measuring text with the SAME `textWidth`
 * metric the renderers used to size their slots (`layout.ts`). Both `overlap.test.ts` and
 * `layout-quality.test.ts` import from here, so they reason about identical geometry — a label is
 * never measured one way when drawn and another way when checked.
 */
import { type Box, type Pt, segSegCross, textWidth } from './layout';

/** A reconstructed element: its AABB plus the `data-el` tag it was drawn with. */
export interface ElBox extends Box {
  el: string;
}

const num = (s: string | undefined): number => Number(s);

/** Parse the attributes of a single SVG element string into a flat map. */
export function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** AABB of a `points="x,y x,y …"` polygon. */
export function polygonBox(points: string): Box | null {
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
 * below, positioned by `text-anchor`. The width is the shared `textWidth` estimate UNLESS the
 * element carries `textLength` — `fitText`/`wrapLabel` emit `textLength` + `lengthAdjust` to
 * compress a long label to exactly that width, so the rendered glyph run is `textLength` px wide,
 * not the natural estimate (honouring this is what makes the containment check truthful). */
export function textLineBox(
  content: string,
  x: number,
  y: number,
  size: number,
  anchor: string,
  textLengthAttr?: string,
): Box {
  const natural = textWidth(content, size);
  const w =
    textLengthAttr !== undefined && Number.isFinite(Number(textLengthAttr))
      ? Math.min(natural, Number(textLengthAttr))
      : natural;
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
 * Extract an AABB for every `data-el`-tagged shape/text element in the SVG. Shapes
 * (`rect`/`circle`/`ellipse`/`polygon`) give a geometric AABB; `text` gives an AABB from its
 * `x`,`y`,`text-anchor` + measured content (a multi-line `<tspan>` stack is the union over its
 * lines). Untagged drawing and tagged EDGES (which are lines/paths, not boxes) are ignored here —
 * edge geometry comes from `edgeSegments`.
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
        boxes.push(
          textLineBox(
            content,
            num(ta.x),
            num(ta.y),
            size,
            a['text-anchor'] ?? 'start',
            ta.textLength,
          ),
        );
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
        ...textLineBox(
          content,
          num(a.x),
          num(a.y),
          size,
          a['text-anchor'] ?? 'start',
          a.textLength,
        ),
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

/** A reconstructed `<text>` element: its AABB, the visible string, and its `data-el` tag if any. */
export interface TextBox extends Box {
  content: string;
  el?: string;
}

/**
 * Extract an AABB for EVERY `<text>` element in the SVG — tagged or not — so the text-legibility
 * invariant (ADR-0045) can reason about ALL rendered words, not just the `data-el` node/edge labels
 * that `boxesFromSvg` returns. Chrome text (the title, band/lane headers, per-region contents,
 * captions, footnotes, legends) carries no `data-el`, so it is invisible to `boxesFromSvg`; this is
 * how it becomes visible to a check. Multi-line `<tspan>` stacks union to one box; halos are a white
 * stroke on the same `<text>` (no duplicate element), so each label is counted once. Measurement uses
 * the SAME `textWidth` metric / `textLength` honouring as `boxesFromSvg`.
 */
export function textBoxesFromSvg(svg: string): TextBox[] {
  const out: TextBox[] = [];
  for (const m of svg.matchAll(TEXT_RE)) {
    const a = attrs(m[1]);
    const size = a['font-size'] ? num(a['font-size']) : 11;
    const anchor = a['text-anchor'] ?? 'start';
    const inner = m[3] ?? '';
    const tspans = [...inner.matchAll(TSPAN_RE)];
    if (tspans.length) {
      const boxes: Box[] = [];
      const parts: string[] = [];
      for (const ts of tspans) {
        const ta = attrs(ts[1]);
        const content = unesc((ts[2] ?? '').replace(/<[^>]*>/g, ''));
        parts.push(content);
        boxes.push(textLineBox(content, num(ta.x), num(ta.y), size, anchor, ta.textLength));
      }
      const minX = Math.min(...boxes.map((b) => b.x));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxX = Math.max(...boxes.map((b) => b.x + b.w));
      const maxY = Math.max(...boxes.map((b) => b.y + b.h));
      out.push({
        content: parts.join(' ').trim(),
        el: a['data-el'],
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      });
    } else {
      const content = unesc(inner.replace(/<[^>]*>/g, ''));
      out.push({
        content: content.trim(),
        el: a['data-el'],
        ...textLineBox(content, num(a.x), num(a.y), size, anchor, a.textLength),
      });
    }
  }
  return out;
}

export function viewBoxOf(svg: string): Box {
  const m = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/);
  if (!m) throw new Error('no viewBox');
  return { x: num(m[1]), y: num(m[2]), w: num(m[3]), h: num(m[4]) };
}

/** The id carried by a `kind:id` tag (e.g. `node:exile` → `exile`, `edge:c1` → `c1`). */
export const idOf = (el: string): string => el.slice(el.indexOf(':') + 1);
export const kindOf = (el: string): string => el.slice(0, el.indexOf(':'));

/** Flatten an SVG path `d` (absolute M/L/H/V/Q/C/Z, as our renderers emit) into line segments;
 * Bézier curves are sampled into short chords so curved edges can be intersection-tested too. */
export function pathToSegments(d: string): [Pt, Pt][] {
  const toks = d.match(/[MLHVQCZ]|-?[\d.]+/gi) ?? [];
  const segs: [Pt, Pt][] = [];
  let cur: Pt = { x: 0, y: 0 };
  let start: Pt = { x: 0, y: 0 };
  let i = 0;
  const n = (): number => Number(toks[i++]);
  const sampleQ = (c: Pt, p: Pt, steps = 12): void => {
    let prev = cur;
    for (let k = 1; k <= steps; k += 1) {
      const t = k / steps;
      const mt = 1 - t;
      const q = {
        x: mt * mt * cur.x + 2 * mt * t * c.x + t * t * p.x,
        y: mt * mt * cur.y + 2 * mt * t * c.y + t * t * p.y,
      };
      segs.push([prev, q]);
      prev = q;
    }
  };
  const sampleC = (c1: Pt, c2: Pt, p: Pt, steps = 16): void => {
    let prev = cur;
    for (let k = 1; k <= steps; k += 1) {
      const t = k / steps;
      const mt = 1 - t;
      const q = {
        x: mt ** 3 * cur.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * p.x,
        y: mt ** 3 * cur.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * p.y,
      };
      segs.push([prev, q]);
      prev = q;
    }
  };
  while (i < toks.length) {
    const cmd = toks[i++];
    if (cmd === 'M') {
      cur = { x: n(), y: n() };
      start = cur;
    } else if (cmd === 'L') {
      const p = { x: n(), y: n() };
      segs.push([cur, p]);
      cur = p;
    } else if (cmd === 'H') {
      const p = { x: n(), y: cur.y };
      segs.push([cur, p]);
      cur = p;
    } else if (cmd === 'V') {
      const p = { x: cur.x, y: n() };
      segs.push([cur, p]);
      cur = p;
    } else if (cmd === 'Q') {
      const c = { x: n(), y: n() };
      const p = { x: n(), y: n() };
      sampleQ(c, p);
      cur = p;
    } else if (cmd === 'C') {
      const c1 = { x: n(), y: n() };
      const c2 = { x: n(), y: n() };
      const p = { x: n(), y: n() };
      sampleC(c1, c2, p);
      cur = p;
    } else if (cmd === 'Z' || cmd === 'z') {
      segs.push([cur, start]);
      cur = start;
    }
  }
  return segs;
}

/** Every `data-el="edge:*"` element → its id and the polyline segments of its drawn geometry
 * (`<path d>` flattened, or a `<line>`'s single segment). The routing primitive the edge↔node
 * non-intersection invariant (ADR-0021) tests against node boxes. */
export function edgeSegments(svg: string): { id: string; segs: [Pt, Pt][] }[] {
  const out: { id: string; segs: [Pt, Pt][] }[] = [];
  for (const m of svg.matchAll(/<path\b([^>]*?)\/?>/g)) {
    const a = attrs(m[1]);
    if (!a['data-el'] || kindOf(a['data-el']) !== 'edge') continue;
    out.push({ id: idOf(a['data-el']), segs: pathToSegments(a.d ?? '') });
  }
  for (const m of svg.matchAll(/<line\b([^>]*?)\/?>/g)) {
    const a = attrs(m[1]);
    if (!a['data-el'] || kindOf(a['data-el']) !== 'edge') continue;
    out.push({
      id: idOf(a['data-el']),
      segs: [
        [
          { x: num(a.x1), y: num(a.y1) },
          { x: num(a.x2), y: num(a.y2) },
        ],
      ],
    });
  }
  return out;
}

/** A proper crossing between two distinct drawn edges: their ids + the intersection point. */
export interface EdgeCrossing {
  a: string;
  b: string;
  at: Pt;
}

/**
 * Every PROPER crossing between two DISTINCT `data-el="edge:*"` polylines in the SVG (the edge↔edge
 * invariant primitive, ADR-0025). Uses `edgeSegments` (so curved edges are flattened) + `segSegCross`
 * (interior crossings only — shared vertices don't count). The id pair is ordered as it appears in
 * the SVG (`a` drawn before `b`), so the bridge pass can tell which edge is on top. INCIDENCE is NOT
 * filtered here (this layer has no model) — callers drop pairs that share a node; for one crossing of
 * two edges, only the FIRST intersection point is reported (enough to place one bridge / count once).
 */
export function edgeCrossings(svg: string): EdgeCrossing[] {
  const edges = edgeSegments(svg);
  const out: EdgeCrossing[] = [];
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      let hit: Pt | null = null;
      for (const [p1, p2] of edges[i].segs) {
        for (const [p3, p4] of edges[j].segs) {
          hit = segSegCross(p1, p2, p3, p4);
          if (hit) break;
        }
        if (hit) break;
      }
      if (hit) out.push({ a: edges[i].id, b: edges[j].id, at: hit });
    }
  }
  return out;
}
