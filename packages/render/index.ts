/**
 * @psyuml/render — model → SVG (M1: the State Map, spec §E.1).
 *
 * SVG-first and accessibility-first (spec §D): monochrome by default, every band
 * uses a pattern (not hue), and every render emits a plain-language text summary +
 * aria-label. Color, when enabled, is purely redundant.
 *
 * Traceability: REQ-NOTATION, REQ-ACCESSIBILITY, REQ-EPISTEMIC-STATUS.
 */
import { getText, isInterpretive, parseModel, schoolClaims, type PsyumlModel } from '@psyuml/model';
import { diffModels, type Layer, type ModelDiff } from '@psyuml/diff';
import {
  CHAR_W,
  clipToBox,
  deCollide,
  type Pt,
  segIntersectsBox,
  separate1D,
  type TaggedBox,
  textWidth,
} from './layout';
import { routeToPath, type RouterObstacle } from './router';
import { BespokeRouter } from './router-bespoke';
import { layeredLayout } from './layered';
import { attrs, boxesFromSvg, edgeCrossings, edgeSegments, textLineBox } from './introspect';

// Edge routing (REQ-EDGE-ROUTER, ADR-0023/0024): export the EdgeRouter interface + both backends.
export * from './router';
export { BespokeRouter } from './router-bespoke';
export { LibavoidRouter } from './router-libavoid';

/** Shared bespoke router for in-renderer obstacle avoidance — deterministic, sync, zero-dependency
 * (the libavoid backend stays available for callers but needs async `init`, so renderers use this).
 * Edges are routed ONLY when their straight path would cross a non-incident node (ADR-0024). */
const edgeRouter = new BespokeRouter();

/** Point at the half-length mark along a polyline — used to place an edge label on its (possibly
 * routed) path rather than the straight source→target midpoint, which may sit on a detoured node. */
function polyMid(pts: Pt[]): Pt {
  if (pts.length <= 1) return pts[0] ?? { x: 0, y: 0 };
  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1)
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    if (acc + seg >= total / 2) {
      const f = seg === 0 ? 0 : (total / 2 - acc) / seg;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
      };
    }
    acc += seg;
  }
  return pts[pts.length - 1];
}

/**
 * Bridge/casing legibility pass (ADR-0025, REQ-EDGE-CROSSING). Where two NON-incident edges PROPERLY
 * cross, draw a small **arc "line-hop"** on the OVER edge at the crossing — a white casing-arc that
 * breaks the under-edge, then the over-edge re-stroked as a gentle bump that visibly passes over it.
 * This is the metro-map / circuit convention, monochrome and accessibility-first; far more legible
 * than a flat break (a reader can't mistake the hop for a junction). The marks are PURELY decorative:
 * they carry no `data-el`, so the crossing invariant still COUNTS the (structural) crossing — this
 * only makes it legible, it does not claim the crossing away.
 *
 * Which line goes OVER (stays continuous, hops): the **focal** edge if the renderer named one
 * (`isFocal` — e.g. a loop's EXIT chord, a parts-map POLARIZATION tie), so the narratively-important
 * line is never the one broken (breaking the escape route would mis-read as "blocked"); otherwise the
 * SOLID edge (clean hop), tie-broken to the later-drawn one. No crossing → empty array, so a
 * crossing-free diagram stays byte-identical. `edgeStrings` are the `<path|line data-el="edge:*">` the
 * renderer already emitted, in draw order; `incident` reports edges that share a node (they meet at
 * it, not a crossing). Emit the returned marks ABOVE the edges and BELOW the nodes.
 */
function addCrossingBridges(
  edgeStrings: string[],
  incident: (a: string, b: string) => boolean,
  isFocal: (id: string) => boolean = () => false,
): string[] {
  if (edgeStrings.length < 2) return [];
  const joined = edgeStrings.join('');
  const segsById = new Map(edgeSegments(joined).map((e) => [e.id, e.segs]));
  const meta = new Map<string, { order: number; solid: boolean; width: number; dash: string }>();
  edgeStrings.forEach((s, i) => {
    const a = attrs(s);
    const el = a['data-el'];
    if (!el || !el.startsWith('edge:')) return;
    meta.set(el.slice('edge:'.length), {
      order: i,
      solid: !a['stroke-dasharray'],
      width: a['stroke-width'] ? Number(a['stroke-width']) : 2,
      dash: a['stroke-dasharray'] ? ` stroke-dasharray="${a['stroke-dasharray']}"` : '',
    });
  });
  const marks: string[] = [];
  for (const { a, b, at } of edgeCrossings(joined)) {
    if (incident(a, b)) continue;
    const ma = meta.get(a);
    const mb = meta.get(b);
    if (!ma || !mb) continue;
    // The OVER (hopping) line: the focal edge if exactly one is focal; else the solid one; else
    // the later-drawn. Keeps the narratively-important edge continuous instead of broken.
    const fa = isFocal(a);
    const fb = isFocal(b);
    const overId =
      fa !== fb
        ? fa
          ? a
          : b
        : ma.solid !== mb.solid
          ? ma.solid
            ? a
            : b
          : ma.order > mb.order
            ? a
            : b;
    const over = meta.get(overId);
    const overW = over?.width ?? 2;
    // Direction of the over-edge's segment nearest the crossing (the hop lies ALONG that line).
    let dir = { x: 1, y: 0 };
    let best = Infinity;
    for (const [p, q] of segsById.get(overId) ?? []) {
      const d2 = ((p.x + q.x) / 2 - at.x) ** 2 + ((p.y + q.y) / 2 - at.y) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        dir = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
      }
    }
    // A gentle semicircular bump: endpoints ±h along the line, a quadratic control offset 2·s on the
    // perpendicular so the apex rises s above the crossing — the over-edge visibly arcs over.
    const h = 6;
    const s = 5;
    const px = -dir.y;
    const py = dir.x;
    const x1 = r1(at.x - dir.x * h);
    const y1 = r1(at.y - dir.y * h);
    const x2 = r1(at.x + dir.x * h);
    const y2 = r1(at.y + dir.y * h);
    const cx = r1(at.x + px * 2 * s);
    const cy = r1(at.y + py * 2 * s);
    const arc = `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
    marks.push(
      `<path d="${arc}" fill="none" stroke="#fff" stroke-width="${overW + 5}" stroke-linecap="round" />`,
      `<path d="${arc}" fill="none" stroke="#000" stroke-width="${overW}"${over?.dash ?? ''} stroke-linecap="round" />`,
    );
  }
  return marks;
}

/** Incidence predicate (two edges share a node → they meet, not cross) from a model's edges. */
function edgeIncidence(model: PsyumlModel): (a: string, b: string) => boolean {
  const inc = new Map(model.edges.map((e) => [e.id, [e.source, e.target]] as const));
  return (a, b) => {
    const A: readonly string[] = inc.get(a) ?? [];
    const B: readonly string[] = inc.get(b) ?? [];
    return A.some((x) => B.includes(x));
  };
}

/** Focal-edge predicate: the narratively-salient cross-cutting edges that should stay continuous and
 * hop OVER at a crossing (never the broken one) — a loop's EXIT chord, a parts-map POLARIZATION tie. */
function focalEdges(model: PsyumlModel, kinds: string[]): (id: string) => boolean {
  const set = new Set(model.edges.filter((e) => kinds.includes(e.kind)).map((e) => e.id));
  return (id) => set.has(id);
}

type MBand = PsyumlModel['bands'][number];
type MNode = PsyumlModel['nodes'][number];

export interface RenderOptions {
  layer?: 'clinician' | 'client';
  /**
   * v0.2 §2 audience profile. When set it derives the label `layer` (clinician → clinician
   * labels; client/picture → client labels) and `showInterpretive` (clinician only), so a
   * caller selects an audience *once* instead of wiring layer + analytic visibility apart.
   * Profiles change **rendering only**, never the model (§2). An explicit `layer` /
   * `showInterpretive` still wins — so `layer`-only callers (CLI, goldens) are unchanged.
   */
  audience?: 'clinician' | 'client' | 'picture';
  /**
   * v0.2 §3: draw the interpretive / clinician-analytic surface — provenance tags, confidence,
   * the contested ⚖ marker, the `as-if` qualifier. Defaults to `true` (the v0.1 behaviour);
   * the client / picture profiles set it `false` so that layer stays plain and actionable.
   * (The descriptive-vs-interpretive dashed border is always drawn — a §3 MUST.)
   */
  showInterpretive?: boolean;
  lang?: string;
  /** Pure black-on-white when true (default). When false, adds redundant band hues. */
  monochrome?: boolean;
  /** Optional stereotype → display term map (cross-school vocabulary, spec §G). */
  roleLabels?: Record<string, string>;
}

export interface RenderResult {
  svg: string;
  altText: string;
}

/**
 * Single entry point: dispatch a model to its renderer, resolving the v0.2 §2 **audience
 * profile** to the label layer + interpretive visibility. The editor (and any headless
 * caller) selects an audience once; the profile changes *rendering only*, never the model.
 * Explicit `layer` / `showInterpretive` win, so existing `layer`-only callers are unchanged.
 */
export function render(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  const layer: 'clinician' | 'client' =
    options.layer ??
    (options.audience && options.audience !== 'clinician' ? 'client' : 'clinician');
  const showInterpretive =
    options.showInterpretive ?? (options.audience ? options.audience === 'clinician' : true);
  const o: RenderOptions = { ...options, layer, showInterpretive };
  switch (model.diagram) {
    case 'parts-map':
      return renderPartsMap(model, o);
    case 'mode-map':
      return renderModeMap(model, o);
    case 'relational-field':
      return renderRelationalField(model, o);
    case 'process-loop':
      return renderLoopMap(model, o);
    case 'timeline':
      return renderTimeline(model, o);
    case 'intervention-sequence':
      return renderInterventionSeq(model, o);
    case 'ritual':
      return renderRitual(model, o);
    case 'decision-nav':
      return renderDecisionChart(model, o);
    case 'resource-anchor':
      return renderResourceMap(model, o);
    case 'body-map':
      return renderBodyMap(model, o);
    case 'two-triangles':
      return renderTwoTriangles(model, o);
    case 'ladder':
      return renderLadder(model, o);
    case 'three-circles':
      return renderThreeCircles(model, o);
    case 'venn':
      return renderVenn(model, o);
    case 'bullseye':
      return renderBullseye(model, o);
    case 'tree-of-life':
      return renderTreeOfLife(model, o);
    case 'schema-grid':
      return renderSchemaGrid(model, o);
    case 'decisional-balance':
      return renderDecisionalBalance(model, o);
    case 'secure-base':
      return renderSecureBase(model, o);
    case 'state-map':
    default:
      return renderStateMap(model, o);
  }
}

const WIDTH = 680;
const LADDER_W = 560;
const TC_W = 620;
const VENN_W = 600;
const BULLSEYE_W = 640;
const TREE_W = 760;
const SCHEMA_W = 880;
const MATRIX_W = 720;
const SECURE_W = 620;
const NODE_W = 220;
const NODE_H = 40;
const BAND_H = 96;
const BAND_GAP = 10;
const TITLE_H = 34;
const PAD_TOP = 10;
const LEGEND_H = 70;
/** Lane + label spread for parallel edges between the same state pair (ADR-0010 fan-out). */
const STATE_FAN = 28;
/** Okabe–Ito hues (redundant with pattern + label): safe, mobilized, shutdown. */
const BAND_HUE = ['#009E73', '#E69F00', '#D55E00'];

const esc = (s: string): string =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );

const r1 = (v: number): number => Math.round(v * 10) / 10;

interface TextOpts {
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  fill?: string;
  /** When set and the label is estimated wider than this, compress it to fit (never stretch). */
  maxWidth?: number;
  /** Verification tag (ADR-0012): emitted as `data-el="…"` on the `<text>` so the overlap
   * invariant can find this logical element and build its AABB. Purely a hook; no visual effect. */
  dataEl?: string;
  /** White legibility halo width (ADR-0047): when set, paint a white stroke UNDER the glyphs
   * (`paint-order="stroke"`) so any connector line or decoration the label sits over doesn't strike
   * through it. Invisible on the blank background; only shows where text crosses a line/shape. */
  halo?: number;
}

const elAttr = (dataEl?: string): string => (dataEl ? ` data-el="${esc(dataEl)}"` : '');

/** White under-glyph halo for legibility over lines/decoration (ADR-0047); no-op when unset. */
const haloAttr = (halo?: number): string =>
  halo ? ` stroke="#fff" stroke-width="${halo}" paint-order="stroke"` : '';

/**
 * Emit a `<text>` that *compresses* into `maxWidth` when the label would overflow
 * (`textLength` + `spacingAndGlyphs`), so a long label never spills out of its box or off
 * the frame — keeping every label legible and inside the diagram (§D). Short labels are
 * emitted unchanged (no `textLength`), so they render identically to before.
 */
/** The legibility floor (ADR-0045): no rendered text below this px size. */
const LEG_FLOOR = 8;
/**
 * Squish policy (ADR-0053, refined): a single line that overflows its box is compressed horizontally
 * (`textLength`) — uniform, and a single compressed line stays legible; shrinking it would just make
 * it look smaller than its peers (a header row, a ring of labels). But a MULTI-LINE wrapped label
 * whose widest line would squish below this ratio is shrunk + re-wrapped instead (in `wrapLabel`),
 * because a crammed wrapped line crushed to a sliver is genuinely illegible.
 */
const SQUISH_FLOOR = 0.8;

function fitText(s: string, x: number, y: number, o: TextOpts = {}): string {
  const size = o.size ?? 11;
  const a = o.anchor ? ` text-anchor="${o.anchor}"` : '';
  const w = o.weight ? ` font-weight="${o.weight}"` : '';
  const f = o.fill ? ` fill="${o.fill}"` : '';
  // The ONE text metric (layout.textWidth, ~0.58em/char); only compress when clearly over.
  const fit =
    o.maxWidth && textWidth(s, size) > o.maxWidth
      ? ` textLength="${r1(o.maxWidth)}" lengthAdjust="spacingAndGlyphs"`
      : '';
  return `<text x="${r1(x)}" y="${r1(y)}" font-family="sans-serif" font-size="${size}"${a}${w}${f}${haloAttr(o.halo)}${elAttr(o.dataEl)}${fit}>${esc(s)}</text>`;
}

/**
 * A bottom chrome line (caption / footer / disclaimer / legend) kept WITHIN the frame so it never
 * spills past the viewBox and clips on export or in an embed (ADR-0052). Compresses to `frameW − x −
 * rightPad` via `fitText` — short lines render unchanged. The companion to the box/shape labels'
 * `fitText`/`wrapLabel`, for the untagged chrome text the overlap in-frame check doesn't cover.
 */
function chromeLine(
  s: string,
  x: number,
  y: number,
  frameW: number,
  o: { size?: number; fill?: string } = {},
): string {
  return fitText(s, x, y, {
    size: o.size ?? 10,
    fill: o.fill,
    maxWidth: Math.max(40, frameW - x - 8),
  });
}

interface WrapOpts extends TextOpts {
  /** Max number of lines before the remainder is crammed onto the last line (then compressed). */
  maxLines?: number;
  /** Line height in px (defaults to size + 3). */
  lineHeight?: number;
}

/** Greedily pack words into ≤ maxLines lines of ≤ maxChars; the last line keeps any overflow. */
function wrapLines(s: string, maxChars: number, maxLines: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && t.length > maxChars && lines.length < maxLines - 1) {
      lines.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/**
 * A centered node label that *wraps* to multiple lines to fit `maxWidth` (true multi-line,
 * via `<tspan>`), centered vertically on `(cx, cy)`. A one-line label is emitted exactly as
 * `fitText` would (so short committed labels are byte-identical); a label longer than
 * `maxLines` still can't overflow — the last line compresses (`textLength`). The companion to
 * `fitText` for boxes/circles where vertical room exists (ADR-0006).
 */
function wrapLabel(s: string, cx: number, cy: number, o: WrapOpts = {}): string {
  let size = o.size ?? 12;
  const maxLines = o.maxLines ?? 2;
  const anchor = o.anchor ?? 'middle';
  const wrapAt = (sz: number): string[] =>
    o.maxWidth ? wrapLines(s, Math.max(4, Math.floor(o.maxWidth / (sz * CHAR_W))), maxLines) : [s];
  let lines = wrapAt(size);
  // Legibility (ADR-0053): shrink-to-fit applies ONLY to a genuinely MULTI-LINE wrap. If wrapping
  // severely squishes the widest line (< SQUISH_FLOOR), shrink the font toward the 8px floor and
  // re-wrap so the glyphs keep their proportions — a small legible label beats a half-width-crushed
  // last line. A SINGLE line is left to fitText's uniform horizontal compression below: shrinking one
  // line of a peer row (column headers, a ring of perimeter labels) would just make it look smaller
  // than its siblings, which the squish avoids (ADR-0053 follow-up, found in showcase visual audit).
  if (o.maxWidth && lines.length > 1) {
    while (
      size > LEG_FLOOR &&
      lines.length > 1 &&
      Math.max(...lines.map((l) => textWidth(l, size))) > o.maxWidth / SQUISH_FLOOR
    ) {
      size = Math.max(LEG_FLOOR, Math.round((size - 0.5) * 10) / 10);
      lines = wrapAt(size);
    }
  }
  const lh = o.lineHeight ?? size + 3;
  if (lines.length === 1) {
    return fitText(lines[0], cx, cy, { ...o, size, anchor });
  }
  const top = cy - ((lines.length - 1) * lh) / 2;
  const w = o.weight ? ` font-weight="${o.weight}"` : '';
  const f = o.fill ? ` fill="${o.fill}"` : '';
  const tspans = lines
    .map((ln, i) => {
      const over =
        o.maxWidth && textWidth(ln, size) > o.maxWidth
          ? ` textLength="${r1(o.maxWidth)}" lengthAdjust="spacingAndGlyphs"`
          : '';
      return `<tspan x="${r1(cx)}" y="${r1(top + i * lh)}"${over}>${esc(ln)}</tspan>`;
    })
    .join('');
  return `<text text-anchor="${anchor}" font-family="sans-serif" font-size="${size}"${w}${f}${haloAttr(o.halo)}${elAttr(o.dataEl)}>${tspans}</text>`;
}

const patternId = (p: MBand['pattern']): string | null => (p === 'none' ? null : `p-${p}`);

/** Progressive reveal (UX-M7): drop hidden nodes and any edge touching them. */
function withoutHidden(model: PsyumlModel): PsyumlModel {
  if (!model.nodes.some((n) => n.hidden)) return model;
  const hidden = new Set(model.nodes.filter((n) => n.hidden).map((n) => n.id));
  return {
    ...model,
    nodes: model.nodes.filter((n) => !hidden.has(n.id)),
    edges: model.edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target)),
  };
}

/** Render a State Map (spec §E.1) to SVG + alt text from the canonical model. */
export function renderStateMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  const monochrome = options.monochrome ?? true;

  const bands = [...model.bands].sort((a, b) => a.order - b.order);
  const bandH = bands.length * (BAND_H + BAND_GAP);

  const bandTop = new Map<string, number>();
  bands.forEach((b, i) => bandTop.set(b.id, TITLE_H + PAD_TOP + i * (BAND_H + BAND_GAP)));

  const nodesByBand = new Map<string, MNode[]>();
  for (const n of model.nodes) {
    const key = n.bandId ?? '_free';
    const arr = nodesByBand.get(key);
    if (arr) arr.push(n);
    else nodesByBand.set(key, [n]);
  }

  const nodeName = (id: string): string => {
    const n = model.nodes.find((x) => x.id === id);
    return n ? getText(n.label, layer, lang) : id;
  };

  type MEdge = (typeof model.edges)[number];
  const edgeText = (e: MEdge): string => {
    const src = e.trigger ?? e.label;
    let txt = src ? getText(src, layer, lang) : '';
    if (e.kind === 'exit') txt = txt ? `${txt} (EXIT)` : 'EXIT';
    return txt;
  };

  // Parallel-edge fan-out (ADR-0010/0012): edges sharing a state pair on the same side get
  // distinct lanes; group by side + unordered pair.
  const fanKey = (e: MEdge): string => {
    const side = e.kind === 'exit' ? 'L' : 'R';
    const [a, b] = [e.source, e.target].sort();
    return `${side}:${a}:${b}`;
  };
  const fanGroups = new Map<string, number>();
  const fanIndex = new Map<MEdge, number>();
  for (const e of model.edges) {
    const k = fanKey(e);
    const i = fanGroups.get(k) ?? 0;
    fanIndex.set(e, i);
    fanGroups.set(k, i + 1);
  }
  const maxFan = (side: 'L' | 'R'): number => {
    let m = 1;
    for (const [k, c] of fanGroups) if (k.startsWith(side)) m = Math.max(m, c);
    return m;
  };

  // The gutters (ADR-0012 scaling guarantee): transition labels live in a RIGHT gutter, exit
  // labels in a LEFT gutter, both OUTSIDE the node columns so a long trigger label can never
  // strike a node box. Each gutter is wide enough for its widest label + the lane fan-out. The
  // lanes sit at the inner edge of the gutter and labels extend outward into it.
  // Trigger / exit labels carry safety-relevant content ("what winds me up", the way out); pilot 3
  // flagged them as small once the wide State Map is scaled to fit. Size them a touch larger, and
  // keep the width measurement in lockstep so the gutters + overlap invariant stay consistent.
  const edgeLabelFs = 12;
  const labelW = (e: MEdge): number => textWidth(edgeText(e), edgeLabelFs);
  let maxTransW = 0;
  let maxExitW = 0;
  for (const e of model.edges) {
    if (e.kind === 'exit') maxExitW = Math.max(maxExitW, labelW(e));
    else maxTransW = Math.max(maxTransW, labelW(e));
  }
  const LANE_PAD = 16;
  const rightFan = (maxFan('R') - 1) * STATE_FAN;
  const leftFan = (maxFan('L') - 1) * STATE_FAN;
  const rightGutter = model.edges.some((e) => e.kind !== 'exit' && edgeText(e))
    ? rightFan + maxTransW + LANE_PAD + 18
    : 40;
  const leftGutter = model.edges.some((e) => e.kind === 'exit' && edgeText(e))
    ? leftFan + maxExitW + LANE_PAD + 18
    : 40;

  // Node columns: between the gutters, each band's nodes spread with `separate1D` so boxes never
  // collide; the column width grows to the widest separated band.
  const innerL = Math.max(40, leftGutter);
  let colW = WIDTH - innerL - Math.max(40, rightGutter);
  for (const b of bands) {
    const list = nodesByBand.get(b.id) ?? [];
    const need = list.length * (NODE_W + 30) + 30;
    colW = Math.max(colW, need);
  }
  const innerR = innerL + colW;
  const width = Math.max(
    innerR + Math.max(40, rightGutter),
    model.meta.title ? 28 + textWidth(model.meta.title, 16) : 0,
  );
  const height = TITLE_H + PAD_TOP + bandH + LEGEND_H;

  const center = new Map<string, { cx: number; cy: number }>();
  for (const b of bands) {
    const list = nodesByBand.get(b.id) ?? [];
    const top = bandTop.get(b.id) ?? 0;
    const slot = colW / (list.length + 1);
    const centers = separate1D(
      list.map((_, idx) => ({ center: innerL + slot * (idx + 1), half: NODE_W / 2 })),
      30,
    );
    list.forEach((n, idx) => center.set(n.id, { cx: r1(centers[idx]), cy: top + BAND_H / 2 }));
  }

  const parts: string[] = [];

  // Bands
  bands.forEach((b, i) => {
    const top = bandTop.get(b.id) ?? 0;
    const hue = !monochrome ? BAND_HUE[i % BAND_HUE.length] : '#ffffff';
    parts.push(
      `<rect data-el="band:${esc(b.id)}" x="20" y="${top}" width="${r1(width - 40)}" height="${BAND_H}" fill="${hue}" fill-opacity="${monochrome ? 1 : 0.14}" stroke="#000" stroke-width="2" />`,
    );
    const pid = patternId(b.pattern);
    if (pid) {
      parts.push(
        `<rect x="20" y="${top}" width="${r1(width - 40)}" height="${BAND_H}" fill="url(#${pid})" stroke="none" />`,
      );
    }
    parts.push(
      `<text x="28" y="${top + 18}" font-family="sans-serif" font-size="13" font-weight="700">${esc(getText(b.label, layer, lang))}</text>`,
    );
  });

  // Edges (orthogonal lanes: transitions route right into the right gutter, exits route left
  // into the left gutter + dashed). Collect each group's labels and stagger their baselines with
  // `separate1D` (perpendicular axis, ADR-0012) so parallel labels never collide — and place
  // them in the gutter so they never strike a node box.
  interface EdgeLabel {
    id: string;
    text: string;
    x: number;
    y: number;
    anchor: 'start' | 'end';
  }
  const edgeLabels: EdgeLabel[] = [];
  // Band states are obstacles: when a band holds several nodes in one row, a gutter-lane edge's
  // H-segment can cross a sibling (the state-map EDGE_NODE_KNOWN_GAP, ADR-0021). Such an edge is
  // re-routed around the siblings (ADR-0024) and its trigger/exit label rides the routed-path
  // midpoint; single-row layouts keep the gutter lane + label byte-identical.
  const sObstacles: RouterObstacle[] = model.nodes
    .filter((n) => center.has(n.id))
    .map((n) => {
      const c = center.get(n.id)!;
      return {
        id: n.id,
        box: { x: c.cx - NODE_W / 2, y: c.cy - NODE_H / 2, w: NODE_W, h: NODE_H },
      };
    });
  const routedLabels: { id: string; text: string; at: Pt }[] = [];
  for (const e of model.edges) {
    const s = center.get(e.source);
    const t = center.get(e.target);
    if (!s || !t) continue;
    const isExit = e.kind === 'exit';
    const count = fanGroups.get(fanKey(e)) ?? 1;
    const idx = fanIndex.get(e) ?? 0;
    const spread = (idx - (count - 1) / 2) * STATE_FAN;
    // Lanes sit just inside the gutter; siblings fan by STATE_FAN. Transitions on the right
    // (extend label rightward), exits on the left (extend label leftward).
    const lane = isExit ? innerL - LANE_PAD + spread : innerR + LANE_PAD + spread;
    const sx = isExit ? s.cx - NODE_W / 2 : s.cx + NODE_W / 2;
    const ex = isExit ? t.cx - NODE_W / 2 : t.cx + NODE_W / 2;
    const dash = isExit ? ' stroke-dasharray="6 5"' : '';
    const lanePts: Pt[] = [
      { x: sx, y: s.cy },
      { x: lane, y: s.cy },
      { x: lane, y: t.cy },
      { x: ex, y: t.cy },
    ];
    const crosses = sObstacles.some(
      (o) =>
        o.id !== e.source &&
        o.id !== e.target &&
        lanePts.some(
          (p, i) => i < lanePts.length - 1 && segIntersectsBox(p, lanePts[i + 1], o.box, -1),
        ),
    );
    const txt = edgeText(e);
    if (crosses) {
      const points = edgeRouter.route(sObstacles, [e], { obstacleMargin: 10 })[0].points;
      parts.push(
        `<path data-el="edge:${esc(e.id)}" d="${routeToPath(points)}" fill="none" stroke="#000" stroke-width="2"${dash} marker-end="url(#arrow)" />`,
      );
      if (txt) routedLabels.push({ id: e.id, text: txt, at: polyMid(points) });
    } else {
      parts.push(
        `<path data-el="edge:${esc(e.id)}" d="M ${r1(sx)},${s.cy} H ${r1(lane)} V ${t.cy} H ${r1(ex)}" fill="none" stroke="#000" stroke-width="2"${dash} marker-end="url(#arrow)" />`,
      );
      if (txt) {
        edgeLabels.push({
          id: e.id,
          text: txt,
          x: isExit ? lane - 8 : lane + 8,
          y: (s.cy + t.cy) / 2 - 4 + spread,
          anchor: isExit ? 'end' : 'start',
        });
      }
    }
  }
  // Group by side; within a side, separate all labels on y (their baselines), since they share
  // the narrow gutter column. 14px line slots keep size-11 text clear.
  for (const side of ['start', 'end'] as const) {
    const group = edgeLabels.filter((el) => el.anchor === side).sort((a, b) => a.y - b.y);
    if (group.length < 2) continue;
    const ys = separate1D(
      group.map((el) => ({ center: el.y, half: 7 })),
      4,
    );
    group.forEach((el, i) => {
      el.y = ys[i];
    });
  }
  for (const el of edgeLabels) {
    parts.push(
      `<text data-el="edgelabel:${esc(el.id)}" x="${r1(el.x)}" y="${r1(el.y)}" font-family="sans-serif" font-size="${edgeLabelFs}" text-anchor="${el.anchor}" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(el.text)}</text>`,
    );
  }
  // Routed edges (multi-node bands): label rides the routed path's midpoint, centred + haloed.
  // Two routed labels whose midpoints land in the same crowded area are spread on y (like the
  // gutter labels) so they don't overprint (ADR-0012 label↔label).
  routedLabels.sort((a, b) => a.at.y - b.at.y || a.id.localeCompare(b.id));
  if (routedLabels.length >= 2) {
    const ys = separate1D(
      routedLabels.map((rl) => ({ center: rl.at.y, half: edgeLabelFs / 2 + 1 })),
      6,
    );
    routedLabels.forEach((rl, i) => {
      rl.at = { x: rl.at.x, y: ys[i] };
    });
  }
  for (const rl of routedLabels) {
    parts.push(
      `<text data-el="edgelabel:${esc(rl.id)}" x="${r1(rl.at.x)}" y="${r1(rl.at.y)}" font-family="sans-serif" font-size="${edgeLabelFs}" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(rl.text)}</text>`,
    );
  }

  // Nodes (states = rounded rectangles)
  for (const n of model.nodes) {
    const c = center.get(n.id);
    if (!c) continue;
    parts.push(
      `<rect data-el="node:${esc(n.id)}" x="${r1(c.cx - NODE_W / 2)}" y="${c.cy - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="2" />`,
    );
    parts.push(
      wrapLabel(getText(n.label, layer, lang), c.cx, c.cy + 4, {
        size: 12,
        anchor: 'middle',
        maxWidth: NODE_W - 16,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
  }

  // Legend (chrome): two key rows on the left, the orientation note + disclaimer on the right.
  const ly = height - LEGEND_H + 20;
  const noteX = Math.min(320, innerL + 300);
  parts.push(
    `<line x1="28" y1="${ly}" x2="60" y2="${ly}" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    `<text x="68" y="${ly + 4}" font-family="sans-serif" font-size="11">transition (what leads here)</text>`,
    `<line x1="28" y1="${ly + 20}" x2="60" y2="${ly + 20}" stroke="#000" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#arrow)" />`,
    `<text x="68" y="${ly + 24}" font-family="sans-serif" font-size="11">exit — a way out</text>`,
    fitText(
      'Bands are ordered top → bottom; patterns (not colour) mark the zones.',
      noteX,
      ly + 4,
      {
        size: 11,
        maxWidth: width - noteX - 16,
      },
    ),
  );
  if (model.meta.disclaimer) {
    parts.push(
      fitText(model.meta.disclaimer, noteX, ly + 24, {
        size: 10,
        fill: '#333',
        maxWidth: width - noteX - 16,
      }),
    );
  }

  // Alt text
  const bandNames = bands.map((b) => getText(b.label, layer, lang));
  const transitions = model.edges
    .filter((e) => e.kind !== 'exit')
    .map(
      (e) =>
        `${nodeName(e.source)} to ${nodeName(e.target)}${e.trigger ? ` on ${getText(e.trigger, layer, lang)}` : ''}`,
    );
  const exits = model.edges
    .filter((e) => e.kind === 'exit')
    .map(
      (e) =>
        `${nodeName(e.source)} to ${nodeName(e.target)}${e.label ? ` via ${getText(e.label, layer, lang)}` : ''}`,
    );
  const title = model.meta.title ? `: ${model.meta.title}` : '';
  const altText =
    `State map${title}. Bands top to bottom: ${bandNames.join(', ')}. ` +
    `Transitions: ${transitions.join('; ') || 'none'}. ` +
    `Ways out: ${exits.join('; ') || 'none'}.`;

  const defs =
    '<defs>' +
    '<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker>' +
    '<pattern id="p-diagonal" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="1" /></pattern>' +
    '<pattern id="p-cross-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0 L8 8 M8 0 L0 8" stroke="#000" stroke-width="0.6" /></pattern>' +
    '<pattern id="p-dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#000" /></pattern>' +
    '</defs>';

  const titleText = model.meta.title
    ? `<text x="20" y="23" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(width)} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'State map')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${r1(width)}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const PARTS_W = 680;
const PARTS_H = 470;

/** Render a Parts / Agents Map (spec §E.2): Self centred, protectors orbiting,
 * exiles in a containment orbit behind a dissociative barrier. */
export function renderPartsMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  // v0.2 §2/§3: the client/picture profiles hide the clinician-analytic surface here — the
  // school-provenance tags and the cross-school contested-origin (⚖) marker. Default shown.
  const showInterpretive = options.showInterpretive ?? true;

  const titleH = model.meta.title ? 28 : 0;
  const nodeR = 34;

  const self = model.nodes.find((n) => n.kind === 'self');
  const exiles = model.nodes.filter((n) => n.stereotype === 'exile');
  const protectors = model.nodes.filter((n) => n.kind !== 'self' && n.stereotype !== 'exile');

  // GROW the orbit radius so protectors (circle + role tag above + wrapped label + provenance
  // below) never collide, then size the canvas to it (ADR-0012 scaling guarantee). Each protector
  // claims a footprint ~PROT_FW wide; on a ring the chord between adjacent angular slots is
  // 2R·sin(Δθ/2), so R must satisfy 2R·sin(Δθ/2) >= PROT_FW + gap. Protectors sit on an arc over
  // the TOP (avoiding the downward cone reserved for the barrier + exiles).
  const PROT_FW = 132; // footprint width: max(2·nodeR, label/prov maxWidth 124) + slack
  const PROT_GAP = 16;
  const arcStartDeg = 158; // lower-left, going up and over the top to…
  const arcEndDeg = 382; // …lower-right (=22°); a 224° arc clear of the bottom
  const n = protectors.length;
  const dTheta = n > 1 ? ((arcEndDeg - arcStartDeg) * Math.PI) / 180 / (n - 1) : 0;
  const minR = n > 1 ? (PROT_FW + PROT_GAP) / (2 * Math.sin(dTheta / 2)) : 0;
  const orbitR = Math.max(140, minR);

  // The footprint also extends radially (role tag above the circle, provenance below it). Build
  // the canvas around the ring + that radial reach so nothing clips.
  const radialUp = nodeR + 16; // role tag above
  const radialDown = nodeR + 13 + 2 * 11 + 4; // up to 2 wrapped provenance lines below
  const ringTop = orbitR + radialUp;

  // Exiles spread below the Self (centred about the column) — compute their half-span first so
  // the canvas is wide enough for BOTH the orbit and the exile row + containment orbit.
  const EXILE_HW = 60; // exile circle + label footprint half-width
  const exileOffsets = separate1D(
    exiles.map((_, i) => ({ center: (i - (exiles.length - 1) / 2) * 150, half: EXILE_HW })),
    20,
  );
  const exileHalfSpan = exiles.length
    ? Math.max(...exileOffsets.map((o) => Math.abs(o))) + EXILE_HW
    : 0;
  const exileRx = Math.max(130, exileHalfSpan + 16);
  const margin = PROT_FW / 2 + 24;
  const PARTS_W2 = Math.max(
    PARTS_W,
    2 * (orbitR + margin),
    2 * (exileRx + 24),
    model.meta.title ? 28 + textWidth(model.meta.title, 16) : 0,
  );
  const cx = PARTS_W2 / 2;
  const cy = titleH + ringTop + 24; // Self centre: leave room above for the top protector + title

  const pos = new Map<string, { x: number; y: number }>();
  if (self) pos.set(self.id, { x: cx, y: cy });
  protectors.forEach((p, i) => {
    const deg = n === 1 ? 270 : arcStartDeg + (i / (n - 1)) * (arcEndDeg - arcStartDeg);
    const angle = (deg * Math.PI) / 180;
    pos.set(p.id, { x: r1(cx + orbitR * Math.cos(angle)), y: r1(cy + orbitR * Math.sin(angle)) });
  });
  const exileY = cy + Math.max(170, orbitR + 30);
  exiles.forEach((e, i) => pos.set(e.id, { x: r1(cx + exileOffsets[i]), y: exileY }));
  // REQ-PROVENANCE-NARRATIVE: the SUBSTANCE of each contested node's cross-school disagreement — the
  // "how" behind the ⚖ marker (which only names WHICH schools). Drawn as a footnote + echoed in
  // alt-text; clinician/interpretive surface only, and never resolved into one view.
  const provNarr = showInterpretive
    ? model.nodes
        .filter(
          (n) =>
            schoolClaims(n.properties.provenance).length > 1 &&
            (n.properties.provenanceNote ?? '').trim().length > 0,
        )
        .map((n) => `⚖ ${getText(n.label, layer, lang)}: ${n.properties.provenanceNote!.trim()}`)
    : [];
  // +20 (not +8) leaves a real gap between the last footnote line and the legend below it so the two
  // never touch (ADR-0045) — the term cancels in the footnote's own y, so it only widens that gap.
  const narrH = provNarr.length ? provNarr.length * 13 + 20 : 0;
  const partsH = Math.max(PARTS_H + titleH, exileY + radialDown + 60) + narrH;

  const parts: string[] = [];

  // Render the nodes (Self ◎, parts ○, role tags, wrapped names, provenance) into their OWN
  // fragment first — `nodeParts` is emitted later (after the connectors, so parts draw on top), but
  // building it now lets the label↔label de-collision below measure the exact node + node-label
  // boxes the overlap invariant will check. Pure: depends only on `pos`/`model.nodes`/`options`.
  const renderNode = (node: (typeof model.nodes)[number]): string[] => {
    const np: string[] = [];
    const p = pos.get(node.id);
    if (!p) return np;
    const name = getText(node.label, layer, lang);
    if (node.kind === 'self') {
      np.push(
        `<circle data-el="node:${esc(node.id)}" cx="${p.x}" cy="${p.y}" r="30" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="23" fill="none" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#000" />`,
        `<text data-el="nodelabel:${esc(node.id)}" x="${p.x}" y="${p.y + 50}" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">${esc(name)}</text>`,
      );
      return np;
    }
    if (node.stereotype) {
      const roleTerm = options.roleLabels?.[node.stereotype] ?? node.stereotype;
      np.push(
        `<text data-el="nodelabel:${esc(node.id)}" x="${p.x}" y="${p.y - nodeR - 5}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#333">${esc(roleTerm)}</text>`,
      );
    }
    np.push(
      `<circle data-el="node:${esc(node.id)}" cx="${p.x}" cy="${p.y}" r="${nodeR}" fill="#fff" stroke="#000" stroke-width="2" />`,
      wrapLabel(name, p.x, p.y + 3, {
        size: 10,
        anchor: 'middle',
        maxWidth: 110,
        dataEl: `nodelabel:${node.id}`,
      }),
    );
    const claims = schoolClaims(node.properties.provenance);
    if (showInterpretive && claims.length > 1) {
      // Co-present opposed origin-claims (§G.2): mark the disagreement on the element itself
      // ("⚖ … vs …"), don't merge it into one bland slash-list. Matches the validator's
      // `provenance.node-mixed-school` and the alt-text below.
      np.push(
        wrapLabel(`⚖ ${claims.join(' vs ')}`, p.x, p.y + nodeR + 13, {
          size: 8,
          anchor: 'middle',
          maxWidth: 124,
          maxLines: 2,
          fill: '#333',
          dataEl: `nodelabel:${node.id}`,
        }),
      );
    } else if (showInterpretive && node.properties.provenance?.length) {
      np.push(
        `<text data-el="nodelabel:${esc(node.id)}" x="${p.x}" y="${p.y + nodeR + 13}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555">${esc(node.properties.provenance.join(' / '))}</text>`,
      );
    }
    return np;
  };
  const nodeParts = model.nodes.flatMap(renderNode);

  // Pre-pass (ADR-0024, the label↔label half of REQ-EDGE-ROUTER): the FREE containment ("protects"/
  // "soothes"/"numbs") and conflict ("polarized") edge labels sit on bowed curves around the Self and
  // can collide with node-NAME labels (and each other) — the documented parts-map gap. De-collide
  // them off the node shapes + node labels (measured from `nodeParts`, so the boxes are exactly what
  // the overlap invariant checks) and off each other; the offset map keyed by edge id is applied
  // where each label is emitted below. A non-colliding label gets a zero offset and stays byte-identical.
  const fixedBoxes = boxesFromSvg(nodeParts.join(''));
  const edgeLabelBoxes: TaggedBox[] = [];
  for (const e of model.edges) {
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) continue;
    let lx: number;
    let ly: number;
    if (e.kind === 'containment') {
      const mx = r1((a.x + b.x) / 2 + (a.x < cx ? -70 : 70));
      const my = r1((a.y + b.y) / 2);
      lx = mx;
      ly = r1((my + b.y) / 2);
    } else if (e.kind === 'conflict') {
      lx = r1((a.x + b.x) / 2);
      ly = r1((a.y + b.y) / 2 - 4);
    } else {
      continue;
    }
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (!lbl) continue;
    edgeLabelBoxes.push({ id: e.id, ...textLineBox(lbl, lx, ly, 8, 'middle') });
  }
  const edgeLblOff = deCollide(edgeLabelBoxes, fixedBoxes, 1);

  // Containment orbit around the exiles (a container; sized to hold the spread exiles).
  if (exiles.length) {
    parts.push(
      `<ellipse data-el="band:containment" cx="${r1(cx)}" cy="${exileY}" rx="${r1(exileRx)}" ry="48" fill="none" stroke="#000" stroke-width="2" />`,
    );
  }

  // Protect edges (containment): bowed dotted lines routed around the Self
  const partsEdgeStrings: string[] = [];
  for (const e of model.edges) {
    if (e.kind !== 'containment') continue;
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) continue;
    const mx = r1((a.x + b.x) / 2 + (a.x < cx ? -70 : 70));
    const my = r1((a.y + b.y) / 2);
    const ePath = `<path data-el="edge:${esc(e.id)}" d="M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="3 4" opacity="0.7" />`;
    parts.push(ePath);
    partsEdgeStrings.push(ePath);
    // Show the relationship word (e.g. "protects" / "soothes" / "numbs") on the curve, with a
    // white halo so it stays legible over the dotted line — distinct protections shouldn't all
    // look identical (eval finding). Placed near the curve's control point.
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      const off = edgeLblOff.get(e.id) ?? { dx: 0, dy: 0 };
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1(mx + off.dx)}" y="${r1((my + b.y) / 2 + off.dy)}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(lbl)}</text>`,
      );
    }
  }

  // Conflict ties (zigzag) between two parts — drawn (not silently dropped, eval finding), using
  // the genogram conflict convention so a manager↔firefighter clash is visible on the map.
  for (const e of model.edges) {
    if (e.kind !== 'conflict') continue;
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const segs = 6;
    let d = `M ${r1(a.x)},${r1(a.y)}`;
    for (let i = 1; i < segs; i += 1) {
      const f = i / segs;
      const sign = i % 2 ? 1 : -1;
      d += ` L ${r1(a.x + dx * f + px * 5 * sign)},${r1(a.y + dy * f + py * 5 * sign)}`;
    }
    d += ` L ${r1(b.x)},${r1(b.y)}`;
    const ePath = `<path data-el="edge:${esc(e.id)}" d="${d}" fill="none" stroke="#000" stroke-width="1.5" />`;
    parts.push(ePath);
    partsEdgeStrings.push(ePath);
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      const off = edgeLblOff.get(e.id) ?? { dx: 0, dy: 0 };
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((a.x + b.x) / 2 + off.dx)}" y="${r1((a.y + b.y) / 2 - 4 + off.dy)}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(lbl)}</text>`,
      );
    }
  }

  // Bridge/casing pass (ADR-0025): a cross-map POLARIZATION tie crossing the containment lines is
  // rendered with a legible hop — the tie stays continuous and hops OVER. Above edges, below nodes.
  parts.push(
    ...addCrossingBridges(partsEdgeStrings, edgeIncidence(model), focalEdges(model, ['conflict'])),
  );

  // Dissociative barrier (double bar) between Self and the exiles
  const barrier = model.edges.find((e) => e.kind === 'barrier');
  if (barrier && self && exiles.length) {
    const by = (cy + exileY) / 2;
    parts.push(
      `<line x1="${r1(cx - 75)}" y1="${by - 3}" x2="${r1(cx + 75)}" y2="${by - 3}" stroke="#000" stroke-width="2.5" />`,
      `<line x1="${r1(cx - 75)}" y1="${by + 3}" x2="${r1(cx + 75)}" y2="${by + 3}" stroke="#000" stroke-width="2.5" />`,
      `<text x="${r1(cx)}" y="${by - 8}" font-family="sans-serif" font-size="10" text-anchor="middle">dissociative barrier</text>`,
    );
  }

  // Nodes (◎ Self, ○ parts) — built early into `nodeParts` (above) for the de-collision pass, but
  // emitted HERE so they draw over the connectors. Z-order and bytes are identical to emitting inline.
  parts.push(...nodeParts);

  // Contested-origin narrative footnote (REQ-PROVENANCE-NARRATIVE): the substance of each ⚖
  // disagreement, drawn above the legend (plain text — not data-el, like the legend/disclaimer).
  provNarr.forEach((line, i) => {
    parts.push(
      fitText(line, 20, partsH - 16 - narrH + (i + 1) * 13, {
        size: 10,
        fill: '#555',
        maxWidth: PARTS_W2 - 40,
      }),
    );
  });

  // Legend (chrome).
  parts.push(
    fitText(
      '◎ Self · ○ part · ( ) containment orbit · ═ dissociative barrier · dotted = protects · zigzag = conflict',
      20,
      partsH - 16,
      { size: 11, maxWidth: PARTS_W2 - 40 },
    ),
  );
  if (model.meta.disclaimer) {
    parts.push(
      fitText(model.meta.disclaimer, 20, partsH - 2, {
        size: 10,
        fill: '#333',
        maxWidth: PARTS_W2 - 40,
      }),
    );
  }

  const protectorDesc = protectors.map(
    (p) => `${getText(p.label, layer, lang)}${p.stereotype ? ` (${p.stereotype})` : ''}`,
  );
  const exileDesc = exiles.map((e) => getText(e.label, layer, lang));
  const contested = model.nodes
    .map((n) => ({ n, claims: schoolClaims(n.properties.provenance) }))
    .filter((x) => x.claims.length > 1)
    .map((x) => `${getText(x.n.label, layer, lang)} (claimed by ${x.claims.join(' and ')})`);
  const altText =
    `Parts map${model.meta.title ? `: ${model.meta.title}` : ''}. Self at the centre. ` +
    `Protectors around it: ${protectorDesc.join(', ') || 'none'}. ` +
    `Exile(s): ${exileDesc.join(', ') || 'none'}${barrier ? ', behind a dissociative barrier from Self' : ''}. ` +
    `Protectors guard the exile.` +
    (showInterpretive && contested.length
      ? ` Origins disagree on: ${contested.join('; ')} — both claims are shown, not merged.`
      : '') +
    (provNarr.length
      ? ` How they differ — ${provNarr.map((s) => s.replace(/^⚖ /, '')).join('; ')}.`
      : '');

  const titleText = model.meta.title
    ? `<text x="20" y="23" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(PARTS_W2)} ${r1(partsH)}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Parts map')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${r1(PARTS_W2)}" height="${r1(partsH)}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const DEC_W = 720;
const DNODE_W = 210;
const DNODE_H = 50;
const DLAYER_GAP = 96;
const DEC_TOP = 64;
const DBANNER_H = 48;
/** Max width of the crisis node's wrapped contact line; it claims this on the x-axis so the
 * separation keeps it (not just the box) clear of siblings (ADR-0012). */
const DEC_CRISIS_W = 220;
/** Horizontal room between sibling nodes in a layer (so wide layers don't crowd). */
const DNODE_GAP = 36;
/** Side margin around the laid-out content (content-fit frame, ADR-0010). */
const DEC_PAD = 16;

/** Shape by decision-chart stereotype: question = diamond, crisis = thick box, else rounded box. */
function decShape(stereotype: string | undefined, cx: number, cy: number, dataEl: string): string {
  const hw = DNODE_W / 2;
  const hh = DNODE_H / 2;
  const tag = elAttr(dataEl);
  if (stereotype === 'question') {
    return `<polygon${tag} points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}" fill="#fff" stroke="#000" stroke-width="2" />`;
  }
  const sw = stereotype === 'crisis' ? 3.5 : 2;
  const rx = stereotype === 'crisis' ? 6 : 10;
  return `<rect${tag} x="${cx - hw}" y="${cy - hh}" width="${DNODE_W}" height="${DNODE_H}" rx="${rx}" ry="${rx}" fill="#fff" stroke="#000" stroke-width="${sw}" />`;
}

/** Render a Decision / Navigation (crisis) chart (spec §E.8): one decision per step,
 * top-down layered, with an ALWAYS-VISIBLE crisis-resources banner (UX-M4). */
export function renderDecisionChart(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  const nodes = model.nodes;
  const edges = model.edges;

  // Per-node half-width on the x-axis. The box is DNODE_W wide; the crisis node also carries a
  // wrapped contact line (up to DEC_CRISIS_W) below it, so it claims that half-width too — what the
  // layered layout's VPSC separation uses to guarantee neither boxes NOR crisis text touch a sibling.
  const halfW = (id: string): number => {
    const n = nodes.find((x) => x.id === id);
    return Math.max(DNODE_W / 2, n?.stereotype === 'crisis' ? DEC_CRISIS_W / 2 : 0);
  };

  // SOTA layered layout (ADR-0049): the full Sugiyama pipeline in `layeredLayout` — cycle-break +
  // longest-path ranking (a plan that loops back doesn't collapse the cycle onto one row),
  // **crossing-minimised within-layer ordering** (median heuristic + transpose, which the old
  // model-order layout skipped) and **median-aligned x** (straightening parent→child edges) with
  // the VPSC `separate1D` enforcing separation. Deterministic, so the goldens stay stable.
  const laid = layeredLayout(
    nodes.map((n) => n.id),
    edges,
    { half: halfW, gap: DNODE_GAP },
  );
  const depth = laid.depth;
  const maxDepth = Math.max(0, laid.layers.length - 1);

  // Vertical room each depth needs BELOW its box centre — a crisis node carries up to 3 wrapped
  // contact lines, so its row must be taller (cross-layer separation, ADR-0012); a fixed gap else.
  const hasCrisis = (ids: string[]): boolean =>
    ids.some((id) => nodes.find((x) => x.id === id)?.stereotype === 'crisis');
  const rowY = new Map<number, number>();
  let yCursor = DEC_TOP;
  for (let d = 0; d <= maxDepth; d += 1) {
    rowY.set(d, yCursor);
    const below = hasCrisis(laid.layers[d] ?? []) ? DNODE_H / 2 + 13 + 3 * 12 : DNODE_H / 2;
    yCursor += Math.max(DLAYER_GAP, below + DNODE_H / 2 + 24);
  }

  // Place each node at its assigned x (the layout left-aligns x to 0), centred in a frame at least
  // DEC_W wide; y comes from the crisis-aware row cursor. The content-fit frame below refines bounds.
  let contentRight = 0;
  for (const n of nodes)
    contentRight = Math.max(contentRight, (laid.x.get(n.id) ?? 0) + halfW(n.id));
  const drawInner = Math.max(
    DEC_W - 2 * DEC_PAD,
    contentRight,
    model.meta.title ? textWidth(model.meta.title, 16) + 12 : 0,
  );
  const xShift = DEC_PAD + (drawInner - contentRight) / 2;
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    pos.set(n.id, {
      x: r1((laid.x.get(n.id) ?? 0) + xShift),
      y: rowY.get(depth.get(n.id) ?? 0) ?? DEC_TOP,
    });
  }
  const contentW = drawInner + 2 * DEC_PAD;

  const nodeName = (id: string): string => {
    const n = nodes.find((x) => x.id === id);
    return n ? getText(n.label, layer, lang) : id;
  };

  const parts: string[] = [];

  // Content bounds (ADR-0010/0012): grow with the actual drawn extent — nodes, the crisis
  // node's wrapped contact line, AND spread branch labels — so nothing clips. Seeded with the
  // node layout width; widened as we lay out below.
  let minX = 0;
  let maxX = contentW;

  // The crisis line, shown BOTH under the crisis node (at the point of need) and in the
  // always-visible banner — a layperson on the "unsafe" branch shouldn't have to hunt for it.
  const crisis =
    model.meta.crisisResources ??
    'If you are in danger now, call your local emergency number or a crisis line.';

  // Edges. A back-edge (loop-back) points UP (route from the source's top to the target's
  // bottom); forward edges go top→bottom. Branch labels sit in the inter-row GAP (clear of both
  // boxes). Labels that share a gap are spread on x with `separate1D` so the siblings of a wide
  // split never collide (ADR-0012); the canvas already grew to the widest layer, so there is
  // room. We collect them first, separate per gap-row, then emit.
  const ELBL_W = Math.max(56, DNODE_W - 40);
  interface BranchLabel {
    id: string;
    text: string;
    x: number;
    y: number;
  }
  const branchLabels: BranchLabel[] = [];
  // All nodes are obstacles (box = the rect the edge↔node invariant reconstructs). An edge whose
  // straight segment would cross a NON-incident node is re-routed around it (ADR-0024); its branch
  // label then rides the routed path's midpoint, not the straight one (which sat on the node).
  const dObstacles: RouterObstacle[] = nodes
    .filter((n) => pos.has(n.id))
    .map((n) => {
      const p = pos.get(n.id)!;
      return {
        id: n.id,
        box: { x: p.x - DNODE_W / 2, y: p.y - DNODE_H / 2, w: DNODE_W, h: DNODE_H },
      };
    });
  for (const e of edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const up = t.y <= s.y; // back-edge / same-row link
    const sy = up ? s.y - DNODE_H / 2 : s.y + DNODE_H / 2;
    const ty = up ? t.y + DNODE_H / 2 : t.y - DNODE_H / 2;
    const straight: Pt[] = [
      { x: s.x, y: sy },
      { x: t.x, y: ty },
    ];
    const crosses = dObstacles.some(
      (o) =>
        o.id !== e.source &&
        o.id !== e.target &&
        segIntersectsBox(straight[0], straight[1], o.box, -1),
    );
    const points = crosses
      ? edgeRouter.route(dObstacles, [e], { obstacleMargin: 10 })[0].points
      : straight;
    const d = crosses ? routeToPath(points) : `M ${s.x},${sy} L ${t.x},${ty}`;
    parts.push(
      `<path data-el="edge:${esc(e.id)}" d="${d}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      const mid = crosses ? polyMid(points) : { x: s.x + (t.x - s.x) * 0.5, y: (sy + ty) / 2 };
      branchLabels.push({ id: e.id, text: lbl, x: mid.x, y: mid.y + 4 });
    }
  }
  // Spread labels that share a gap-row (same rounded y) along x so they don't overprint.
  const byRow = new Map<number, BranchLabel[]>();
  for (const bl of branchLabels) {
    const key = Math.round(bl.y);
    const arr = byRow.get(key);
    if (arr) arr.push(bl);
    else byRow.set(key, [bl]);
  }
  for (const row of byRow.values()) {
    row.sort((a, b) => a.x - b.x);
    const centers = separate1D(
      row.map((bl) => ({ center: bl.x, half: ELBL_W / 2 })),
      14,
    );
    row.forEach((bl, i) => {
      bl.x = centers[i];
    });
    minX = Math.min(minX, ...row.map((bl) => bl.x - ELBL_W / 2));
    maxX = Math.max(maxX, ...row.map((bl) => bl.x + ELBL_W / 2));
  }
  for (const bl of branchLabels) {
    parts.push(
      wrapLabel(bl.text, r1(bl.x), r1(bl.y), {
        size: 11,
        weight: 700,
        anchor: 'middle',
        maxWidth: ELBL_W,
        maxLines: 2,
        halo: 3.5,
        dataEl: `edgelabel:${bl.id}`,
      }),
    );
  }

  // Nodes
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const isCrisis = n.stereotype === 'crisis';
    const isQuestion = n.stereotype === 'question';
    const name = (isCrisis ? '! ' : '') + getText(n.label, layer, lang);
    parts.push(decShape(n.stereotype, p.x, p.y, `node:${n.id}`));
    // Wrap the label INSIDE the shape so a long clinical step doesn't overflow its box and
    // collide with a sibling (eval finding). A diamond tapers, so it gets a narrower width.
    parts.push(
      wrapLabel(name, p.x, p.y + 4, {
        size: 11,
        anchor: 'middle',
        maxWidth: isQuestion ? 132 : DNODE_W - 24,
        maxLines: isQuestion ? 2 : 3,
        dataEl: `nodelabel:${n.id}`,
        ...(isCrisis ? { weight: 700 } : {}),
      }),
    );
    // Put the actual crisis contact right on the crisis node, not only in the bottom banner.
    if (isCrisis) {
      // The crisis-resources reminder is a caption BELOW the node (ADR-0010). `wrapLabel` CENTRES
      // its block on the given cy, so a fixed `+13` offset rode the TOP line up under the thick
      // crisis border when the caption wrapped to 3 lines (the old caption-bisection graze, ADR-0046
      // CAPTION_BISECT_KNOWN_GAP). Shift the block down by half its height so the FIRST line always
      // clears the border by the same gap, whatever the line count — the caption is now wholly below
      // the box (ADR-0050 follow-up). It keeps the crisis `nodelabel:` id (so the overlap invariant
      // lets it sit against its OWN node yet still checks it vs others); with the centre now clearly
      // outside the box, the containment + caption-not-bisected invariants pass it cleanly.
      const capLh = 12;
      const capLines = wrapLines(crisis, Math.max(4, Math.floor(DEC_CRISIS_W / (9 * CHAR_W))), 3);
      const capCy = p.y + DNODE_H / 2 + 13 + ((capLines.length - 1) * capLh) / 2;
      parts.push(
        wrapLabel(crisis, p.x, capCy, {
          size: 9,
          anchor: 'middle',
          maxWidth: DEC_CRISIS_W,
          maxLines: 3,
          lineHeight: capLh,
          fill: '#333',
          dataEl: `nodelabel:${n.id}`,
        }),
      );
    }
  }

  // Content-fit frame (ADR-0010): measure the actual laid-out content so a wide layer or a
  // crisis node's wrapped contact line never clips, then size the banner/disclaimer/viewBox to
  // it (mirrors renderLoopMap). The drawing starts at x=0, so minX is 0 unless a leftmost box
  // pokes negative; we measure both bounds to be safe.
  let maxNodeBottom = DEC_TOP + DNODE_H / 2;
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    minX = Math.min(minX, p.x - halfW(n.id));
    maxX = Math.max(maxX, p.x + halfW(n.id));
    // The crisis node carries up to 3 wrapped contact lines below it (size 9, lh 12).
    const below = n.stereotype === 'crisis' ? DNODE_H / 2 + 13 + 3 * 12 : DNODE_H / 2;
    maxNodeBottom = Math.max(maxNodeBottom, p.y + below);
  }
  const drawW = maxX - minX;

  // Crisis-resources banner — ALWAYS visible (UX-M4) — spans the (content-fit) frame width.
  const by = maxNodeBottom + 16;
  parts.push(
    `<rect data-el="banner:crisis" x="${r1(minX)}" y="${r1(by)}" width="${r1(drawW)}" height="${DBANNER_H}" fill="#fff" stroke="#000" stroke-width="2" />`,
    `<text x="${r1(minX + 14)}" y="${r1(by + 19)}" font-family="sans-serif" font-size="12" font-weight="700">Crisis resources (always available):</text>`,
    fitText(crisis, minX + 14, by + 37, { size: 11, maxWidth: drawW - 28 }),
  );

  // Disclaimer (ADR-0010): the JSON/on-screen disclaimer was omitted from the exported SVG;
  // show it under the banner like renderStateMap/renderPartsMap so the export is self-complete.
  let footerBottom = by + DBANNER_H;
  if (model.meta.disclaimer) {
    const dy = footerBottom + 14;
    parts.push(
      fitText(model.meta.disclaimer, minX + 14, dy, {
        size: 10,
        fill: '#333',
        maxWidth: drawW - 28,
      }),
    );
    footerBottom = dy;
  }

  const height = footerBottom + DEC_PAD;

  const start = nodes.find((n) => !edges.some((e) => e.target === n.id));
  const steps = edges.map(
    (e) =>
      `from "${nodeName(e.source)}", ${e.label ? `if ${getText(e.label, layer, lang)} ` : ''}go to "${nodeName(e.target)}"`,
  );
  const altText =
    `Crisis navigation chart${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Start: "${start ? nodeName(start.id) : ''}". Steps: ${steps.join('; ')}. ` +
    `Crisis resources are always shown: ${crisis}`;

  const titleText = model.meta.title
    ? `<text x="${r1(minX + 20)}" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  // Content-fit viewBox (ADR-0010): width grows with the widest layer, height with depth.
  const fx = r1(minX - DEC_PAD);
  const fw = r1(drawW + DEC_PAD * 2);
  const fh = r1(height);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fx} 0 ${fw} ${fh}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Crisis chart')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="${fx}" y="0" width="${fw}" height="${fh}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const RES_W = 720;

/** Render a Resource / Anchor map (spec §E.9): a categorized inventory of strengths,
 * supports, skills, values, and soothing-system boosters (◇ anchors under categories). */
export function renderResourceMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const categories = model.nodes.filter((n) => n.stereotype === 'category');
  const itemsOf = (catId: string) => {
    const ids = new Set(
      model.edges
        .filter((e) => e.kind === 'containment' && e.source === catId)
        .map((e) => e.target),
    );
    return model.nodes.filter((n) => ids.has(n.id));
  };
  const cols = Math.max(1, categories.length);
  const colW = RES_W / cols;

  const parts: string[] = [];
  const altCats: string[] = [];
  let maxItems = 0;
  categories.forEach((cat, c) => {
    const items = itemsOf(cat.id);
    maxItems = Math.max(maxItems, items.length);
    const hx = c * colW + 16;
    // Cap the header to its column so a wide one can't run into the next column's header (ADR-0045);
    // compressed via textLength only when it would otherwise overflow (the item labels already fit).
    const hLabel = getText(cat.label, layer, lang);
    const hCap = colW - 22;
    const hTl =
      textWidth(hLabel, 13) > hCap
        ? ` textLength="${r1(hCap)}" lengthAdjust="spacingAndGlyphs"`
        : '';
    parts.push(
      `<text x="${hx}" y="58" font-family="sans-serif" font-size="13" font-weight="700"${hTl}>${esc(hLabel)}</text>`,
    );
    items.forEach((it, i) => {
      const y = 86 + i * 28;
      const dx = c * colW + 24;
      parts.push(
        `<polygon data-el="node:${esc(it.id)}" points="${dx},${y - 6} ${dx + 7},${y} ${dx},${y + 6} ${dx - 7},${y}" fill="#fff" stroke="#000" stroke-width="2" />`,
        fitText(getText(it.label, layer, lang), dx + 14, y + 4, {
          size: 12,
          maxWidth: colW - 50,
          dataEl: `nodelabel:${it.id}`,
        }),
      );
    });
    altCats.push(
      `${getText(cat.label, layer, lang)} (${items.map((it) => getText(it.label, layer, lang)).join(', ') || 'none'})`,
    );
  });

  const height = 86 + maxItems * 28 + 50;
  const fy = height - 26;
  parts.push(
    `<text x="16" y="${fy}" font-family="sans-serif" font-size="11">CFT systems: Threat · Drive · Soothing — grow the soothing system.</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(chromeLine(model.meta.disclaimer, 16, fy + 16, RES_W, { size: 10, fill: '#333' }));
  }

  const altText =
    `Resource and anchor map${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Categories — ${altCats.join('; ') || 'none'}. Grow the soothing system.`;

  const titleText = model.meta.title
    ? `<text x="16" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${RES_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Resource map')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${RES_W}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const LOOP_W = 560;
const LNODE_W = 140;
const LNODE_H = 44;

/** Order nodes by following the directed (non-exit) edge chain, so a cycle's steps land
 * adjacent on the ring. Falls back to model order for anything not on the chain. */
function cycleOrder(
  nodes: PsyumlModel['nodes'],
  edges: PsyumlModel['edges'],
): PsyumlModel['nodes'] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const next = new Map<string, string>();
  for (const e of edges) {
    if (e.kind === 'exit') continue;
    if (!next.has(e.source) && byId.has(e.target)) next.set(e.source, e.target);
  }
  const targets = new Set(next.values());
  const start = nodes.find((node) => !targets.has(node.id)) ?? nodes[0];
  const ordered: PsyumlModel['nodes'] = [];
  const seen = new Set<string>();
  let cur: string | undefined = start?.id;
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    ordered.push(byId.get(cur)!);
    cur = next.get(cur);
  }
  for (const node of nodes) if (!seen.has(node.id)) ordered.push(node);
  return ordered;
}

/**
 * A distinct, monochrome glyph for each CAT-derived loop topology (v0.2 §4), centred at
 * (cx, cy). Always paired with the redundant uppercase word below it, so meaning never
 * rests on the glyph — or on colour — alone (spec §D, v0.2 §5 Tier-A redundancy).
 */
function loopTopologyGlyph(topo: 'trap' | 'dilemma' | 'snag', cx: number, cy: number): string {
  const s = 'fill="none" stroke="#000" stroke-width="2"';
  if (topo === 'trap') {
    // self-confirming loop: a near-closed circular arrow returning on itself.
    return (
      `<path d="M ${cx + 9},${cy - 2} A 9 9 0 1 1 ${cx + 1},${cy - 9}" ${s} />` +
      `<path d="M ${cx - 3},${cy - 11} L ${cx + 3},${cy - 9} L ${cx},${cy - 3} z" fill="#000" stroke="none" />`
    );
  }
  if (topo === 'dilemma') {
    // false-binary fork: one stem splitting into two arms (either / or).
    return `<path d="M ${cx},${cy + 9} L ${cx},${cy - 1} M ${cx},${cy - 1} L ${cx - 8},${cy - 10} M ${cx},${cy - 1} L ${cx + 8},${cy - 10}" ${s} />`;
  }
  // snag: legitimate rise truncated — an up-arrow stopped by a bar.
  return (
    `<path d="M ${cx},${cy + 9} L ${cx},${cy - 5}" ${s} />` +
    `<path d="M ${cx - 4},${cy - 2} L ${cx},${cy - 8} L ${cx + 4},${cy - 2} z" fill="#000" stroke="none" />` +
    `<path d="M ${cx - 9},${cy - 9} L ${cx + 9},${cy - 9}" ${s} />`
  );
}

/** Render a Process / Loop map (spec §E.4): a maintaining cycle on a ring, with
 * reciprocal (double-headed) links, a reinforcing/balancing centre badge, and exits.
 * v0.2 §4 adds CAT loop-topology markers (trap/dilemma/snag); v0.2 §3 surfaces
 * interpretive standing (dashed), `contested`, confidence, and `as-if` framing. */
export function renderLoopMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  // v0.2 §2/§3: the client/picture profiles hide the clinician-analytic surface (contested ⚖,
  // as-if, provenance/confidence text) while keeping the structural loop + topology + the
  // honest dashed border. Defaults to shown (the v0.1 + clinician behaviour).
  const showInterpretive = options.showInterpretive ?? true;
  const nodes = model.nodes;
  const n = Math.max(1, nodes.length);
  const cx = LOOP_W / 2;
  const cy = 250;
  const radius = Math.max(120, n * 26);

  // Honor manual positions when present; otherwise lay the cycle out on a ring.
  const usePos = nodes.some((node) => node.position);
  // Lay ring nodes out in CYCLE order (follow the sequential chain) so consecutive steps are
  // adjacent and edges don't cross the middle — only the closing edge spans (pilot legibility).
  const ringOrder = usePos ? nodes : cycleOrder(nodes, model.edges);
  const pos = new Map<string, { x: number; y: number }>();
  ringOrder.forEach((node, i) => {
    if (usePos && node.position) {
      pos.set(node.id, { x: node.position.x, y: node.position.y });
    } else {
      const a = ((-90 + (i * 360) / ringOrder.length) * Math.PI) / 180;
      pos.set(node.id, { x: r1(cx + radius * Math.cos(a)), y: r1(cy + radius * Math.sin(a)) });
    }
  });

  const nodeName = (id: string): string => {
    const node = nodes.find((x) => x.id === id);
    return node ? getText(node.label, layer, lang) : id;
  };

  const parts: string[] = [];
  const SHORT = 64;

  // Pre-pass (ADR-0024 label↔label): chord-midpoint edge labels on a ring can collide (the
  // documented process-loop gap). De-collide them off each other + the node boxes; the chord
  // midpoint is exactly (s+t)/2 (the symmetric pull-back cancels), so the offset map keyed by edge
  // id is applied where each label is emitted below — non-colliding labels get a zero offset and
  // stay byte-identical.
  const loopNodeBoxes = [...pos.values()].map((p) => ({
    x: p.x - LNODE_W / 2,
    y: p.y - LNODE_H / 2,
    w: LNODE_W,
    h: LNODE_H,
  }));
  // Centre badge (R/B disc + CAT loop-topology marker) reserved up front so the chord-midpoint edge
  // labels de-collide OFF it too (ADR-0045), not only off the node boxes — previously the badge was
  // emitted AFTER the labels, so a central label could land on the R/B / TRAP marker. The badge is
  // drawn below at this same centre.
  const loopEdge = model.edges.find((e) => e.loop);
  const topoMark = model.edges.find((e) => e.loopTopology)?.loopTopology;
  let badgeCx = 0;
  let badgeCy = 0;
  const badgeObstacles: { x: number; y: number; w: number; h: number }[] = [];
  if (loopEdge || topoMark) {
    let sx = 0;
    let sy = 0;
    for (const p of pos.values()) {
      sx += p.x;
      sy += p.y;
    }
    badgeCx = r1(sx / pos.size);
    badgeCy = r1(sy / pos.size);
    if (loopEdge) badgeObstacles.push({ x: badgeCx - 20, y: badgeCy - 20, w: 40, h: 40 });
    if (topoMark) {
      const ty = badgeCy + (loopEdge ? 36 : 0);
      const ww = Math.max(40, textWidth(topoMark.toUpperCase(), 11) + 8);
      badgeObstacles.push({ x: badgeCx - ww / 2, y: ty - 16, w: ww, h: 48 });
    }
  }
  const loopLabels: TaggedBox[] = [];
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const src = e.trigger ?? e.label;
    let txt = src ? getText(src, layer, lang) : '';
    if (e.kind === 'exit') txt = txt ? `${txt} (EXIT)` : 'EXIT';
    if (!txt) continue;
    const w = textWidth(txt, 10);
    loopLabels.push({ id: e.id, x: (s.x + t.x) / 2 - w / 2, y: (s.y + t.y) / 2 - 3 - 8, w, h: 10 });
  }
  const loopLblOff = deCollide(loopLabels, [...loopNodeBoxes, ...badgeObstacles], 1);

  // Edges (chords, endpoints pulled to the node boundary)
  const loopEdgeStrings: string[] = [];
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const len = Math.hypot(t.x - s.x, t.y - s.y) || 1;
    const ux = (t.x - s.x) / len;
    const uy = (t.y - s.y) / len;
    // Clamp the pull-back so short chords don't overshoot into a detached arrowhead.
    const short = Math.max(0, Math.min(SHORT, len / 2 - 10));
    const x1 = r1(s.x + ux * short);
    const y1 = r1(s.y + uy * short);
    const x2 = r1(t.x - ux * short);
    const y2 = r1(t.y - uy * short);
    const isExit = e.kind === 'exit';
    const dash = isExit ? ' stroke-dasharray="6 5"' : '';
    const markerStart = e.kind === 'reciprocal' ? ' marker-start="url(#arrow)"' : '';
    const ePath = `<path data-el="edge:${esc(e.id)}" d="M ${x1},${y1} L ${x2},${y2}" fill="none" stroke="#000" stroke-width="2"${dash}${markerStart} marker-end="url(#arrow)" />`;
    parts.push(ePath);
    loopEdgeStrings.push(ePath);
    const lblSrc = e.trigger ?? e.label;
    let txt = lblSrc ? getText(lblSrc, layer, lang) : '';
    if (isExit) txt = txt ? `${txt} (EXIT)` : 'EXIT';
    if (txt) {
      const off = loopLblOff.get(e.id) ?? { dx: 0, dy: 0 };
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((x1 + x2) / 2 + off.dx)}" y="${r1((y1 + y2) / 2 - 3 + off.dy)}" font-family="sans-serif" font-size="10" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(txt)}</text>`,
      );
    }
  }

  // Bridge/casing pass (ADR-0025): a cross-ring EXIT chord crossing a cycle chord is rendered with a
  // legible hop so the two lines are traceable — the EXIT stays continuous and hops OVER. Above the
  // edges, below the centre badge + nodes.
  parts.push(
    ...addCrossingBridges(loopEdgeStrings, edgeIncidence(model), focalEdges(model, ['exit'])),
  );

  // Reinforcing / balancing loop badge + CAT loop-topology marker in the centre (spec §C, v0.2 §4);
  // drawn here above the edges, at the centre reserved as a label obstacle above (ADR-0045).
  if (loopEdge || topoMark) {
    const bx = badgeCx;
    const by = badgeCy;
    if (loopEdge) {
      parts.push(
        `<circle cx="${bx}" cy="${by}" r="18" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<text x="${bx}" y="${by + 5}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700">${esc(loopEdge.loop ?? '')}</text>`,
      );
    }
    if (topoMark) {
      const ty = by + (loopEdge ? 36 : 0);
      parts.push(
        loopTopologyGlyph(topoMark, bx, ty),
        `<text x="${bx}" y="${ty + 28}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" letter-spacing="0.5">${esc(topoMark.toUpperCase())}</text>`,
      );
    }
  }

  // Ring vertical centroid — a resource diamond sits on the ring hull, so the side of it FACING
  // AWAY from this centroid is always open exterior, and the side facing the centroid is where its
  // incoming exit chord (and that chord's midpoint label) lives. A long resource label is placed on
  // the outward vertical side so it never lands on the exit-edge label (ADR-0050).
  let ringCy = 0;
  for (const q of pos.values()) ringCy += q.y;
  ringCy /= pos.size || 1;

  // Nodes (resources = diamonds, CAT observing-eye = eye glyph, others = rounded rects).
  // A flat 140×44 rhombus has almost no usable width off its centre line, so a multi-line label
  // placed INSIDE it always pokes the slanted edges (the diamond can't grow without breaking the
  // ring spacing → overlap). The resource label is therefore placed OUTSIDE the glyph (above it
  // when the diamond is in the upper half of the ring, below it otherwise) — full node width,
  // white-haloed so it stays legible over any chord it crosses — and the frame is grown to keep it
  // in view (ADR-0049 follow-up; the same outside-the-glyph remedy used for mode-map names).
  let resLabelMinY = Infinity;
  let resLabelMaxY = -Infinity;
  for (const node of nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    // v0.2 §3: interpretive content (inferred / clinician-inferred / contested / symbolic)
    // is drawn dashed; descriptive content stays solid.
    const dash = isInterpretive(node.properties.epistemicStatus) ? ' stroke-dasharray="5 4"' : '';
    const isDiamond = node.kind === 'resource';
    const isEye = !isDiamond && node.stereotype === 'observing-eye';
    if (isDiamond) {
      parts.push(
        `<polygon data-el="node:${esc(node.id)}" points="${p.x},${p.y - LNODE_H / 2} ${p.x + LNODE_W / 2},${p.y} ${p.x},${p.y + LNODE_H / 2} ${p.x - LNODE_W / 2},${p.y}" fill="#fff" stroke="#000" stroke-width="2"${dash} />`,
      );
    } else if (isEye) {
      // CAT observing eye/I — the self-reflective stance that watches the trap (spec §B).
      parts.push(
        `<ellipse data-el="node:${esc(node.id)}" cx="${p.x}" cy="${p.y}" rx="26" ry="15" fill="#fff" stroke="#000" stroke-width="2"${dash} />`,
        `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#000" />`,
      );
    } else {
      parts.push(
        `<rect data-el="node:${esc(node.id)}" x="${p.x - LNODE_W / 2}" y="${p.y - LNODE_H / 2}" width="${LNODE_W}" height="${LNODE_H}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="2"${dash} />`,
      );
    }
    // v0.2 §3/§4: a contested marker (⚖) and an as-if qualifier ride on the node's own
    // label (owner content — they don't enlarge the node, so the overlap invariant holds)
    // and are echoed in alt-text below.
    let labelText = getText(node.label, layer, lang);
    if (showInterpretive && node.properties.epistemicStatus === 'contested')
      labelText = `⚖ ${labelText}`;
    if (showInterpretive && node.properties.asIf) labelText += ' (as-if)';
    if (isDiamond) {
      // A short label fits ON one line within the rhombus' widest band (≈100px at the cap-height
      // offset from centre), so it sits INSIDE the diamond — filling the glyph as a normal node.
      // A longer label can't (a flat 140×44 rhombus has almost no width off its centre line, so a
      // multi-line label inside would poke the slanted edges, and the diamond can't grow without
      // breaking the ring spacing → overlap). It is therefore placed OUTSIDE, on the outward
      // (away-from-centroid) vertical side — full node width, white-haloed so it stays legible over
      // any chord it crosses, frame grown past it (ADR-0049 follow-up; the same outside-the-glyph
      // remedy used for mode-map names).
      const INSIDE_W = 100;
      if (textWidth(labelText, 11) <= INSIDE_W) {
        parts.push(
          wrapLabel(labelText, p.x, p.y + 4, {
            size: 11,
            anchor: 'middle',
            maxWidth: 116,
            maxLines: 1,
            dataEl: `nodelabel:${node.id}`,
          }),
        );
      } else {
        const lh = 14;
        const maxW = LNODE_W - 4;
        const maxChars = Math.max(4, Math.floor(maxW / (11 * CHAR_W)));
        const lines = wrapLines(labelText, maxChars, 3);
        const span = (lines.length - 1) * lh;
        const above = p.y <= ringCy;
        const labelCy = above
          ? p.y - LNODE_H / 2 - 6 - span / 2 // bottom line just above the top vertex
          : p.y + LNODE_H / 2 + 12 + span / 2; // top line just below the bottom vertex
        parts.push(
          wrapLabel(labelText, p.x, labelCy, {
            size: 11,
            anchor: 'middle',
            maxWidth: maxW,
            maxLines: 3,
            lineHeight: lh,
            halo: 3,
            dataEl: `nodelabel:${node.id}`,
          }),
        );
        resLabelMinY = Math.min(resLabelMinY, labelCy - span / 2 - 9);
        resLabelMaxY = Math.max(resLabelMaxY, labelCy + span / 2 + 4);
      }
    } else {
      parts.push(
        wrapLabel(labelText, p.x, p.y + (isEye ? 30 : 4), {
          size: 11,
          anchor: 'middle',
          maxWidth: LNODE_W - 16,
          maxLines: 2,
          dataEl: `nodelabel:${node.id}`,
        }),
      );
    }
  }

  const links = model.edges
    .filter((e) => e.kind !== 'exit')
    .map(
      (e) =>
        `${nodeName(e.source)} ${e.kind === 'reciprocal' ? '<->' : '->'} ${nodeName(e.target)}${e.loop ? ' (reinforcing)' : ''}`,
    );
  const exits = model.edges
    .filter((e) => e.kind === 'exit')
    .map((e) => `${nodeName(e.source)} to ${nodeName(e.target)}`);

  // v0.2 §3/§4: carry the loop topology, interpretive/contested standing, confidence, and
  // as-if framing in the text channel — never on a glyph, border, or colour alone. Each
  // sentence is appended only when its data is present, so a plain v0.1 loop is unchanged.
  const TOPO_MEANING = {
    trap: 'a trap — a self-confirming loop, where actions meant to escape confirm the belief',
    dilemma: 'a dilemma — a false-binary, polarized either/or fork',
    snag: 'a snag — a self-truncating loop that sabotages legitimate success',
  } as const;
  const extra: string[] = [];
  if (topoMark) extra.push(`This maintaining pattern is ${TOPO_MEANING[topoMark]}.`);
  // The standing / confidence lines are the clinician-analytic surface — hidden for the
  // client / picture profiles (§2); the structural topology line above always shows.
  if (showInterpretive) {
    const contestedNames = nodes
      .filter((nd) => nd.properties.epistemicStatus === 'contested')
      .map((nd) => nodeName(nd.id));
    if (contestedNames.length)
      extra.push(
        `Contested standing (held as disputed, not settled): ${contestedNames.join('; ')}.`,
      );
    const interpNames = nodes
      .filter(
        (nd) =>
          isInterpretive(nd.properties.epistemicStatus) &&
          nd.properties.epistemicStatus !== 'contested',
      )
      .map((nd) => nodeName(nd.id));
    if (interpNames.length)
      extra.push(
        `Interpretive, shown dashed (a hypothesis, less certain): ${interpNames.join('; ')}.`,
      );
    const asIfNames = nodes.filter((nd) => nd.properties.asIf).map((nd) => nodeName(nd.id));
    if (asIfNames.length)
      extra.push(`Named as-if — a metaphor, not a literal claim: ${asIfNames.join('; ')}.`);
    const confBuckets: Record<'H' | 'M' | 'L', string[]> = { H: [], M: [], L: [] };
    for (const nd of nodes) {
      const c = nd.properties.confidence;
      if (c) confBuckets[c].push(nodeName(nd.id));
    }
    const confParts: string[] = [];
    if (confBuckets.H.length) confParts.push(`high: ${confBuckets.H.join(', ')}`);
    if (confBuckets.M.length) confParts.push(`medium: ${confBuckets.M.join(', ')}`);
    if (confBuckets.L.length) confParts.push(`low: ${confBuckets.L.join(', ')}`);
    if (confParts.length) extra.push(`Confidence — ${confParts.join('; ')}.`);
  }

  const altText =
    `Maintaining loop${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Links: ${links.join('; ') || 'none'}. Ways out: ${exits.join('; ') || 'none'}.` +
    (extra.length ? ' ' + extra.join(' ') : '');

  // Fit the frame to the actual content (incl. negative coords) so nothing clips on screen or in export.
  const pad = 18;
  const titleH = model.meta.title ? 28 : 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x - LNODE_W / 2);
    maxX = Math.max(maxX, p.x + LNODE_W / 2);
    minY = Math.min(minY, p.y - LNODE_H / 2);
    maxY = Math.max(maxY, p.y + LNODE_H / 2);
  }
  // Resource labels sit outside their diamond (above) — grow the frame so they never clip.
  if (Number.isFinite(resLabelMinY)) minY = Math.min(minY, resLabelMinY);
  if (Number.isFinite(resLabelMaxY)) maxY = Math.max(maxY, resLabelMaxY);
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = LOOP_W;
    maxY = 200;
  }
  const fx = r1(minX - pad);
  const fy = r1(minY - pad - titleH);
  let fw = r1(maxX + pad - fx);
  const fh = r1(maxY + pad - fy);
  // The ring content-fit ignores the title row, so a long title would spill past the right edge —
  // grow the frame to contain it (ADR-0052; titles get room, not compression).
  if (model.meta.title) fw = Math.max(fw, r1(8 + textWidth(model.meta.title, 16) + pad));

  const titleText = model.meta.title
    ? fitText(model.meta.title, r1(fx + 8), r1(fy + 20), {
        size: 16,
        weight: 700,
        maxWidth: fw - 16,
      })
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fx} ${fy} ${fw} ${fh}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Loop map')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const TL_W = 760;
const TL_GUTTER = 92;
const TL_ROW = { action: 112, identity: 198 } as const;

/** Render a Timeline / Trajectory (spec §E.5): a narrative grid — bands are time
 * columns, stereotype "action"/"identity" are the two landscapes, with a
 * problem-saturated → preferred-future baseline. */
export function renderTimeline(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const bands = [...model.bands].sort((a, b) => a.order - b.order);
  const cols = Math.max(1, bands.length);
  const colW = (TL_W - TL_GUTTER) / cols;
  const colX = (i: number): number => r1(TL_GUTTER + i * colW + colW / 2);
  const bandIndex = new Map(bands.map((b, i) => [b.id, i]));
  const boxW = Math.min(colW - 14, 150);
  const boxH = 52;

  const rowOf = (s: string | undefined): 'action' | 'identity' =>
    s === 'identity' ? 'identity' : 'action';

  const pos = new Map<string, { x: number; y: number }>();
  for (const node of model.nodes) {
    const ci = node.bandId ? bandIndex.get(node.bandId) : undefined;
    if (ci === undefined) continue;
    pos.set(node.id, { x: colX(ci), y: TL_ROW[rowOf(node.stereotype)] });
  }

  const parts: string[] = [];

  // Time-axis header + landscape row labels
  bands.forEach((b, i) => {
    parts.push(
      `<text x="${colX(i)}" y="56" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700">${esc(getText(b.label, layer, lang))}</text>`,
    );
  });
  parts.push(
    `<text x="12" y="${TL_ROW.action + 4}" font-family="sans-serif" font-size="11" font-weight="700">ACTION</text>`,
    `<text x="12" y="${TL_ROW.identity + 4}" font-family="sans-serif" font-size="11" font-weight="700">IDENTITY</text>`,
  );

  // Trajectory edges (left → right within a row)
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    parts.push(
      `<path data-el="edge:${esc(e.id)}" d="M ${r1(s.x + boxW / 2)},${s.y} L ${r1(t.x - boxW / 2)},${t.y}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
  }

  // Cells. Wrap the label INSIDE the cell so a long entry can't overflow into the next column.
  for (const node of model.nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    parts.push(
      `<rect data-el="node:${esc(node.id)}" x="${r1(p.x - boxW / 2)}" y="${p.y - boxH / 2}" width="${r1(boxW)}" height="${boxH}" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2" />`,
      wrapLabel(getText(node.label, layer, lang), p.x, p.y + 4, {
        size: 10,
        anchor: 'middle',
        maxWidth: boxW - 12,
        maxLines: 3,
        dataEl: `nodelabel:${node.id}`,
      }),
    );
  }

  // Problem-saturated → preferred-future baseline
  const fy = TL_ROW.identity + 56;
  parts.push(
    `<line x1="${TL_GUTTER}" y1="${fy}" x2="${TL_W - 16}" y2="${fy}" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    `<text x="${TL_GUTTER}" y="${fy - 6}" font-family="sans-serif" font-size="11">problem-saturated past</text>`,
    `<text x="${TL_W - 16}" y="${fy - 6}" text-anchor="end" font-family="sans-serif" font-size="11">preferred future →</text>`,
  );
  const height = fy + 28;

  const rowText = (row: 'action' | 'identity'): string =>
    model.nodes
      .filter((nd) => nd.bandId && rowOf(nd.stereotype) === row)
      .sort((a, b) => (bandIndex.get(a.bandId ?? '') ?? 0) - (bandIndex.get(b.bandId ?? '') ?? 0))
      .map((nd) => getText(nd.label, layer, lang))
      .join(' → ');
  const altText =
    `Timeline${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Time: ${bands.map((b) => getText(b.label, layer, lang)).join(' → ')}. ` +
    `Action: ${rowText('action') || 'none'}. Identity: ${rowText('identity') || 'none'}.`;

  const titleText = model.meta.title
    ? `<text x="12" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TL_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Timeline')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${TL_W}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const SEQ_W = 720;
const HEX_W = 156;
const HEX_H = 46;

/** Render an Intervention Sequence (spec §E.6): actor swimlanes (bands) as columns,
 * interventions as hexagons placed by longest-path phase order, guards as edge labels. */
export function renderInterventionSeq(
  model: PsyumlModel,
  options: RenderOptions = {},
): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const lanes = [...model.bands].sort((a, b) => a.order - b.order);
  const laneN = Math.max(1, lanes.length);
  const laneW = SEQ_W / laneN;
  const laneX = (i: number): number => r1(i * laneW + laneW / 2);
  const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));

  const nodes = model.nodes;
  const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of model.edges) {
    if (!indeg.has(e.target) || !adj.has(e.source)) continue;
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const work = new Map(indeg);
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  while (queue.length) {
    const id = queue.shift() as string;
    for (const t of adj.get(id) ?? []) {
      depth.set(t, Math.max(depth.get(t) ?? 0, (depth.get(id) ?? 0) + 1));
      work.set(t, (work.get(t) ?? 0) - 1);
      if ((work.get(t) ?? 0) === 0) queue.push(t);
    }
  }

  // Reserve a title band so the title never overlaps the lane headers (ADR-0045): with a title, the
  // headers, dividers and the whole node stack shift down clear of it.
  const titlePad = model.meta.title ? 24 : 0;
  const headerY = 28 + titlePad;
  const TOP = 72 + titlePad;
  const GAP = 80;
  const pos = new Map<string, { x: number; y: number }>();
  let maxDepth = 0;
  for (const n of nodes) {
    const li = n.bandId ? laneIndex.get(n.bandId) : undefined;
    if (li === undefined) continue;
    const d = depth.get(n.id) ?? 0;
    maxDepth = Math.max(maxDepth, d);
    pos.set(n.id, { x: laneX(li), y: TOP + d * GAP });
  }
  const height = TOP + maxDepth * GAP + HEX_H + 28;

  const parts: string[] = [];

  // Lane headers + dividers
  lanes.forEach((l, i) => {
    parts.push(
      `<text x="${laneX(i)}" y="${headerY}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700">${esc(getText(l.label, layer, lang))}</text>`,
    );
    if (i > 0) {
      parts.push(
        `<line x1="${r1(i * laneW)}" y1="${headerY + 10}" x2="${r1(i * laneW)}" y2="${height - 10}" stroke="#ccc" stroke-width="1" stroke-dasharray="4 4" />`,
      );
    }
  });

  // Edges (with guard labels)
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const sy = s.y + HEX_H / 2;
    const ty = t.y - HEX_H / 2;
    parts.push(
      `<path data-el="edge:${esc(e.id)}" d="M ${s.x},${sy} L ${t.x},${ty}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        fitText(lbl, (s.x + t.x) / 2 + 4, (sy + ty) / 2, {
          size: 10,
          maxWidth: Math.max(40, laneW - 16),
          halo: 3,
          dataEl: `edgelabel:${e.id}`,
        }),
      );
    }
  }

  // Intervention hexagons
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const { x, y } = p;
    const w = HEX_W;
    const h = HEX_H;
    parts.push(
      `<polygon data-el="node:${esc(n.id)}" points="${r1(x - w / 2 + 12)},${y - h / 2} ${r1(x + w / 2 - 12)},${y - h / 2} ${r1(x + w / 2)},${y} ${r1(x + w / 2 - 12)},${y + h / 2} ${r1(x - w / 2 + 12)},${y + h / 2} ${r1(x - w / 2)},${y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      wrapLabel(getText(n.label, layer, lang), x, y + 4, {
        size: 10,
        anchor: 'middle',
        maxWidth: HEX_W - 28,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
  }

  const laneName = (n: (typeof nodes)[number]): string => {
    const l = n.bandId ? lanes.find((x) => x.id === n.bandId) : undefined;
    return l ? getText(l.label, layer, lang) : '';
  };
  const ordered = [...nodes].sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0));
  const altText =
    `Intervention sequence${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Lanes: ${lanes.map((l) => getText(l.label, layer, lang)).join(', ')}. ` +
    `Steps in order: ${ordered.map((n) => `${getText(n.label, layer, lang)} (${laneName(n)})`).join(' → ') || 'none'}.`;

  const titleText = model.meta.title
    ? `<text x="12" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SEQ_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Intervention sequence')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${SEQ_W}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const RIT_W = 760;
const RNODE_H = 46;

/** Render a Ritual Structure (spec §F): van Gennep phase columns (the LIMINAL phase
 * drawn dashed — "betwixt and between"), ritual-act hexagons, and a MANDATORY footer
 * carrying the honest non-medical framing + a secular variant. */
export function renderRitual(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const phases = [...model.bands].sort((a, b) => a.order - b.order);
  const cols = Math.max(1, phases.length);
  const colW = RIT_W / cols;
  const phaseIndex = new Map(phases.map((p, i) => [p.id, i]));
  const nw = Math.min(colW - 26, 200);
  const vgap = 16;
  const top = 72;

  const byPhase = new Map<number, MNode[]>();
  for (const node of model.nodes) {
    const ci = node.bandId ? phaseIndex.get(node.bandId) : undefined;
    if (ci === undefined) continue;
    const arr = byPhase.get(ci);
    if (arr) arr.push(node);
    else byPhase.set(ci, [node]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  let maxRows = 0;
  for (let ci = 0; ci < phases.length; ci += 1) {
    const list = byPhase.get(ci) ?? [];
    maxRows = Math.max(maxRows, list.length);
    list.forEach((node, r) => {
      pos.set(node.id, {
        x: r1(ci * colW + colW / 2),
        y: top + r * (RNODE_H + vgap) + RNODE_H / 2,
      });
    });
  }
  const phasesBottom = top + Math.max(1, maxRows) * (RNODE_H + vgap);
  const footerY = phasesBottom + 18;
  const height = footerY + 44;

  const parts: string[] = [];

  // Phase columns (LIMINAL dashed) — containers.
  phases.forEach((p, ci) => {
    const isLiminal = getText(p.label, 'clinician', 'en').toLowerCase().includes('liminal');
    const dash = isLiminal ? ' stroke-dasharray="6 5"' : '';
    parts.push(
      `<rect data-el="band:${esc(p.id)}" x="${r1(ci * colW + 6)}" y="50" width="${r1(colW - 12)}" height="${r1(phasesBottom - 50)}" fill="#fff" stroke="#000" stroke-width="1.5"${dash} />`,
      `<text x="${r1(ci * colW + colW / 2)}" y="42" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700">${esc(getText(p.label, layer, lang))}</text>`,
    );
  });

  // All phase nodes are obstacles for edge routing (box = the hexagon's AABB, what the
  // edge↔node invariant also reconstructs). An edge whose clipped straight segment would cross a
  // NON-incident node is re-routed around it via the bespoke router (ADR-0024); others stay straight.
  const obstacles: RouterObstacle[] = model.nodes
    .filter((n) => pos.has(n.id))
    .map((n) => {
      const p = pos.get(n.id)!;
      return { id: n.id, box: { x: p.x - nw / 2, y: p.y - RNODE_H / 2, w: nw, h: RNODE_H } };
    });
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    // Clip both ends to the node boxes (ADR-0021) so the line starts on the source border and the
    // arrowhead lands on the target border, instead of running centre-to-centre under both glyphs.
    const sBox = { x: s.x - nw / 2, y: s.y - RNODE_H / 2, w: nw, h: RNODE_H };
    const tBox = { x: t.x - nw / 2, y: t.y - RNODE_H / 2, w: nw, h: RNODE_H };
    const a = clipToBox(t, s, sBox);
    const b = clipToBox(s, t, tBox);
    const crosses = obstacles.some(
      (o) => o.id !== e.source && o.id !== e.target && segIntersectsBox(a, b, o.box, -1),
    );
    const d = crosses
      ? routeToPath(edgeRouter.route(obstacles, [e], { obstacleMargin: 8 })[0].points)
      : `M ${r1(a.x)},${r1(a.y)} L ${r1(b.x)},${r1(b.y)}`;
    parts.push(
      `<path data-el="edge:${esc(e.id)}" d="${d}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
  }

  for (const node of model.nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    const { x, y } = p;
    parts.push(
      `<polygon data-el="node:${esc(node.id)}" points="${r1(x - nw / 2 + 12)},${y - RNODE_H / 2} ${r1(x + nw / 2 - 12)},${y - RNODE_H / 2} ${r1(x + nw / 2)},${y} ${r1(x + nw / 2 - 12)},${y + RNODE_H / 2} ${r1(x - nw / 2 + 12)},${y + RNODE_H / 2} ${r1(x - nw / 2)},${y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      wrapLabel(getText(node.label, layer, lang), x, y + 4, {
        size: 10,
        anchor: 'middle',
        maxWidth: nw - 28,
        maxLines: 2,
        dataEl: `nodelabel:${node.id}`,
      }),
    );
  }

  // Mandatory honest-framing + secular-variant footer
  const framing = model.meta.ritual?.framing ?? '';
  const secular = model.meta.ritual?.secularVariant ?? '';
  parts.push(
    `<text x="12" y="${footerY + 6}" font-family="sans-serif" font-size="11" font-weight="700">Honest framing:</text>`,
    `<text x="120" y="${footerY + 6}" font-family="sans-serif" font-size="10">${esc(framing)}</text>`,
    `<text x="12" y="${footerY + 24}" font-family="sans-serif" font-size="11" font-weight="700">Secular variant:</text>`,
    `<text x="120" y="${footerY + 24}" font-family="sans-serif" font-size="10">${esc(secular)}</text>`,
  );

  const altText =
    `Ritual structure${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Phases: ${phases.map((p) => getText(p.label, layer, lang)).join(' → ')}. ` +
    `Honest framing: ${framing} Secular variant: ${secular}`;

  const titleText = model.meta.title
    ? `<text x="12" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${RIT_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Ritual structure')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${RIT_W}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/** McGoldrick relation line styles (spec §C): close=solid, distant=dashed,
 * conflict=zigzag, fused=triple, cutoff=solid with two slash marks. */
function relLine(kind: string, x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  if (kind === 'conflict') {
    const segs = Math.max(4, Math.round(len / 14));
    let d = `M ${r1(x1)},${r1(y1)}`;
    for (let i = 1; i < segs; i += 1) {
      const t = i / segs;
      const off = i % 2 === 0 ? 5 : -5;
      d += ` L ${r1(x1 + dx * t + px * off)},${r1(y1 + dy * t + py * off)}`;
    }
    return `<path d="${d} L ${r1(x2)},${r1(y2)}" fill="none" stroke="#000" stroke-width="1.5" />`;
  }
  if (kind === 'fused') {
    const ln = (k: number): string =>
      `<line x1="${r1(x1 + px * k)}" y1="${r1(y1 + py * k)}" x2="${r1(x2 + px * k)}" y2="${r1(y2 + py * k)}" stroke="#000" stroke-width="1.5" />`;
    return ln(-3) + ln(0) + ln(3);
  }
  if (kind === 'nestedWithin') {
    // Origin / nested-within: a fine-dotted thread (distinct from 'distant' dashes) with a
    // small ring at the historical end to read as "derives from this earlier pattern".
    return (
      `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="#000" stroke-width="1" stroke-dasharray="1 4" />` +
      `<circle cx="${r1(x2)}" cy="${r1(y2)}" r="4" fill="none" stroke="#000" stroke-width="1" />`
    );
  }
  const dash = kind === 'distant' ? ' stroke-dasharray="6 5"' : '';
  let out = `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="#000" stroke-width="2"${dash} />`;
  if (kind === 'cutoff') {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const tick = (c: number): string =>
      `<line x1="${r1(mx + ux * c - px * 7)}" y1="${r1(my + uy * c - py * 7)}" x2="${r1(mx + ux * c + px * 7)}" y2="${r1(my + uy * c + py * 7)}" stroke="#000" stroke-width="2" />`;
    out += tick(-4) + tick(4);
  }
  return out;
}

/** Genogram person/system glyph (spec §C): male=square, female=circle, other=diamond,
 * system=dashed rounded rect; index person gets a double border. */
function personGlyph(
  stereotype: string | undefined,
  index: boolean,
  cx: number,
  cy: number,
  dataEl: string,
): string {
  const r = 22;
  const tag = elAttr(dataEl);
  let out: string;
  if (stereotype === 'male') {
    out = `<rect${tag} x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#fff" stroke="#000" stroke-width="2" />`;
    if (index)
      out += `<rect x="${cx - r - 4}" y="${cy - r - 4}" width="${2 * r + 8}" height="${2 * r + 8}" fill="none" stroke="#000" stroke-width="2" />`;
  } else if (stereotype === 'unknown' || stereotype === 'nonbinary') {
    out = `<polygon${tag} points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="#fff" stroke="#000" stroke-width="2" />`;
    if (index)
      out += `<polygon points="${cx},${cy - r - 4} ${cx + r + 4},${cy} ${cx},${cy + r + 4} ${cx - r - 4},${cy}" fill="none" stroke="#000" stroke-width="2" />`;
  } else if (stereotype === 'system') {
    out = `<rect${tag} x="${cx - 50}" y="${cy - 18}" width="100" height="36" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2" stroke-dasharray="4 3" />`;
  } else {
    out = `<circle${tag} cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#000" stroke-width="2" />`;
    if (index)
      out += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="#000" stroke-width="2" />`;
  }
  return out;
}

const REL_SHORT = 30;

/** Render a Relational Field / genogram (spec §E.3) from manually-placed people +
 * external systems, with the McGoldrick relation set and an ecomap overlay. */
export function renderRelationalField(
  model: PsyumlModel,
  options: RenderOptions = {},
): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  const nodes = model.nodes;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    pos.set(n.id, n.position ? { x: n.position.x, y: n.position.y } : { x: 80 + i * 130, y: 130 });
  });
  let maxX = 0;
  let maxY = 0;
  for (const p of pos.values()) {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  // The legend is a fixed reference strip wider than the node spread; grow the frame to fit it (and
  // the title) at full size rather than squeezing a glyph legend (ADR-0052).
  const RF_LEGEND =
    '□ male · ○ female · ◇ other · ▭ system · ═ fused · zigzag = conflict · dashed = distant · ‖ cutoff · ⋯○ = origin (nested)';
  const width = Math.max(
    560,
    maxX + 90,
    24 + textWidth(RF_LEGEND, 10),
    model.meta.title ? 24 + textWidth(model.meta.title, 16) : 0,
  );
  const height = Math.max(300, maxY + 70) + 44;

  const parts: string[] = [];

  // Relations (under the nodes)
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const len = Math.hypot(t.x - s.x, t.y - s.y) || 1;
    const ux = (t.x - s.x) / len;
    const uy = (t.y - s.y) / len;
    parts.push(
      relLine(
        e.kind,
        s.x + ux * REL_SHORT,
        s.y + uy * REL_SHORT,
        t.x - ux * REL_SHORT,
        t.y - uy * REL_SHORT,
      ),
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((s.x + t.x) / 2)}" y="${r1((s.y + t.y) / 2) - 4}" text-anchor="middle" font-family="sans-serif" font-size="9" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(lbl)}</text>`,
      );
    }
  }

  // People + systems. Each is wrapped in a group tagged with its node id so the editor can
  // hit-test it for drag-to-reposition (this renderer honors n.position; persisted via pos=).
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const labelDy = n.stereotype === 'system' ? 4 : 36;
    parts.push(
      `<g data-node-id="${esc(n.id)}">` +
        personGlyph(n.stereotype, n.properties.index === true, p.x, p.y, `node:${n.id}`) +
        wrapLabel(getText(n.label, layer, lang), p.x, p.y + labelDy, {
          size: 10,
          anchor: 'middle',
          maxWidth: 120,
          halo: 3,
          dataEl: `nodelabel:${n.id}`,
        }) +
        `</g>`,
    );
  }

  const ly = height - 26;
  parts.push(fitText(RF_LEGEND, 12, ly, { size: 10, maxWidth: width - 24 }));
  if (model.meta.disclaimer) {
    parts.push(
      fitText(model.meta.disclaimer, 12, ly + 14, { size: 9, fill: '#333', maxWidth: width - 24 }),
    );
  }

  const nm = (id: string): string => {
    const node = nodes.find((x) => x.id === id);
    return node ? getText(node.label, layer, lang) : id;
  };
  const rels = model.edges.map((e) => `${nm(e.source)} (${e.kind}) ${nm(e.target)}`);
  const altText =
    `Relational field${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `People & systems: ${nodes.map((n) => getText(n.label, layer, lang)).join(', ')}. ` +
    `Relationships: ${rels.join('; ') || 'none'}.`;

  const titleText = model.meta.title
    ? fitText(model.meta.title, 12, 22, { size: 16, weight: 700, maxWidth: width - 24 })
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Relational field')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const MODE_MIN_R = 18;
const MODE_MAX_EXTRA = 28;

/** Render a Schema Mode Map (§K): discrete mode circles sized by `dominance` (with a
 * redundant printed value, §D); the Healthy Adult is the growth target (double ring + ↑). */
export function renderModeMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  const nodes = model.nodes;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    pos.set(n.id, n.position ? { x: n.position.x, y: n.position.y } : { x: 120 + i * 150, y: 160 });
  });
  let maxX = 0;
  let maxY = 0;
  for (const p of pos.values()) {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = Math.max(
    560,
    maxX + 120,
    model.meta.title ? 20 + textWidth(model.meta.title, 16) : 0,
  );
  // Names + dominance numerals now sit BELOW the circles (ADR-0046), so reserve more vertical room.
  const height = Math.max(360, maxY + 160);

  const radius = (n: MNode): number =>
    MODE_MIN_R + (n.properties.dominance ?? 0.4) * MODE_MAX_EXTRA;
  const nodeName = (id: string): string => {
    const n = nodes.find((x) => x.id === id);
    return n ? getText(n.label, layer, lang) : id;
  };

  const parts: string[] = [];

  // Mode-trigger edges (under the nodes)
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const sNode = nodes.find((x) => x.id === e.source);
    const tNode = nodes.find((x) => x.id === e.target);
    const rs = sNode ? radius(sNode) : 20;
    const rt = tNode ? radius(tNode) : 20;
    const len = Math.hypot(t.x - s.x, t.y - s.y) || 1;
    const ux = (t.x - s.x) / len;
    const uy = (t.y - s.y) / len;
    const x1 = r1(s.x + ux * rs);
    const y1 = r1(s.y + uy * rs);
    const x2 = r1(t.x - ux * rt);
    const y2 = r1(t.y - uy * rt);
    parts.push(
      `<path data-el="edge:${esc(e.id)}" d="M ${x1},${y1} L ${x2},${y2}" fill="none" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((x1 + x2) / 2)}" y="${r1((y1 + y2) / 2) - 3}" text-anchor="middle" font-family="sans-serif" font-size="9" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(lbl)}</text>`,
      );
    }
  }

  // Mode circles (size = dominance, with a redundant numeral)
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const r = radius(n);
    const isHealthy = n.kind === 'self' || n.stereotype === 'healthy-adult';
    parts.push(
      `<circle data-el="node:${esc(n.id)}" cx="${p.x}" cy="${p.y}" r="${r1(r)}" fill="#fff" stroke="#000" stroke-width="2" />`,
    );
    if (isHealthy) {
      parts.push(
        `<circle cx="${p.x}" cy="${p.y}" r="${r1(r - 4)}" fill="none" stroke="#000" stroke-width="2" />`,
        `<text x="${p.x}" y="${r1(p.y - r - 6)}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">↑ grow</text>`,
      );
    }
    const st = n.stereotype ?? '';
    if (st.includes('child') || st.includes('vulnerable')) {
      const ty = p.y - r - 4;
      parts.push(
        `<polygon points="${p.x},${r1(ty - 9)} ${p.x + 8},${r1(ty + 3)} ${p.x - 8},${r1(ty + 3)}" fill="#fff" stroke="#000" stroke-width="1.5" />`,
      );
    }
    // Name + dominance numeral sit BELOW the circle as a caption (ADR-0046): the circle is then a
    // PURE dominance glyph that can never clip its label, and the name (wrapped narrow) stays clear of
    // its neighbours. `wrapLabel` centres a multi-line block on `cy`, so offset `cy` down by the
    // block's half-height to put the FIRST line clear below the circle.
    const name = getText(n.label, layer, lang);
    const nameLines = wrapLines(name, Math.max(6, Math.floor(108 / (10 * CHAR_W))), 2);
    const nameCy = p.y + r + 14 + ((nameLines.length - 1) * 13) / 2;
    parts.push(
      wrapLabel(name, p.x, nameCy, {
        size: 10,
        anchor: 'middle',
        maxWidth: 108,
        maxLines: 2,
        halo: 3,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
    const dom = n.properties.dominance;
    if (dom !== undefined) {
      parts.push(
        `<text data-el="nodelabel:${esc(n.id)}" x="${p.x}" y="${r1(nameCy + ((nameLines.length - 1) * 13) / 2 + 14)}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#555" stroke="#fff" stroke-width="2.5" paint-order="stroke">dom ${dom.toFixed(2)}</text>`,
      );
    }
  }

  const ly = height - 24;
  parts.push(
    chromeLine(
      'Circle size = mode dominance (number shown). Goal: grow the Healthy Adult, shrink maladaptive modes.',
      12,
      ly,
      width,
      { size: 10 },
    ),
  );
  if (model.meta.disclaimer) {
    parts.push(chromeLine(model.meta.disclaimer, 12, ly + 14, width, { size: 9, fill: '#333' }));
  }

  const altText =
    `Schema mode map${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Modes by dominance: ${nodes.map((n) => `${getText(n.label, layer, lang)} ${(n.properties.dominance ?? 0).toFixed(2)}`).join(', ')}. ` +
    `Triggers: ${model.edges.map((e) => `${nodeName(e.source)}${e.label ? ` (${getText(e.label, layer, lang)})` : ''} -> ${nodeName(e.target)}`).join('; ') || 'none'}. ` +
    `Goal: grow the Healthy Adult.`;

  const titleText = model.meta.title
    ? `<text x="12" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Schema mode map')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const BODY_W = 460;
const BODY_H = 484;

/** Render a Body Map (spec §E.5 / Source 3): a body outline with sensations placed by
 * location, each sized by `intensity` (redundant numeral, §D), with a pacing-safety note. */
export function renderBodyMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const parts: string[] = [
    // Silhouette
    '<circle cx="210" cy="86" r="32" fill="#fff" stroke="#000" stroke-width="2" />',
    '<rect x="172" y="120" width="76" height="172" rx="26" ry="26" fill="#fff" stroke="#000" stroke-width="2" />',
    '<line x1="176" y1="150" x2="120" y2="258" stroke="#000" stroke-width="2" />',
    '<line x1="244" y1="150" x2="300" y2="258" stroke="#000" stroke-width="2" />',
    '<line x1="192" y1="290" x2="178" y2="436" stroke="#000" stroke-width="2" />',
    '<line x1="228" y1="290" x2="242" y2="436" stroke="#000" stroke-width="2" />',
  ];

  // Precompute each sensation's marker so a label can be capped to stop BEFORE any neighbour to
  // its right (labels sit beside the dots — ADR-0006 — so a long label must not reach another
  // dot; ADR-0012 keeps label↔non-owner-node clear by shrinking the label, never overlapping).
  const marks = model.nodes.map((n, i) => {
    const p = n.position ?? { x: 210, y: 140 + i * 30 };
    const intensity = n.properties.intensity ?? 0.5;
    return { n, p, intensity, r: 6 + intensity * 10 };
  });
  // Room on a given side before hitting a neighbouring marker (or the frame) within the label's
  // ~13px-tall band — the label sits beside the dot, so it must clear other dots (ADR-0006).
  const roomToRight = (id: string, fromX: number, y: number): number => {
    let cap = BODY_W - fromX - 8;
    for (const m of marks) {
      if (m.n.id === id || m.p.x <= fromX || Math.abs(m.p.y - y) > m.r + 9) continue;
      cap = Math.min(cap, m.p.x - m.r - fromX - 4);
    }
    return cap;
  };
  const roomToLeft = (id: string, fromX: number, y: number): number => {
    let cap = fromX - 8;
    for (const m of marks) {
      if (m.n.id === id || m.p.x >= fromX || Math.abs(m.p.y - y) > m.r + 9) continue;
      cap = Math.min(cap, fromX - (m.p.x + m.r) - 4);
    }
    return cap;
  };
  marks.forEach(({ n, p, intensity, r }) => {
    const text = `${getText(n.label, layer, lang)} (${intensity.toFixed(1)})`;
    const rightX = r1(p.x + r + 8);
    const leftX = r1(p.x - r - 8);
    const capR = roomToRight(n.id, rightX, p.y);
    const capL = roomToLeft(n.id, leftX, p.y);
    // Prefer the right (the familiar side); flip to the left when it has clearly more room — so a
    // dot crowded on the right (e.g. a neighbour just beside it) still gets a legible label.
    const onLeft = capL > capR + 8;
    const cap = Math.max(16, onLeft ? capL : capR);
    // Shrink the font (not fake-compress) so the label fits its cap at full glyph width — fully
    // legible, no truncation, and the natural-width box clears the neighbour (ADR-0012). Floor at the
    // shared 8px legibility floor (ADR-0045/0053) so the renderer can never emit sub-floor microtext;
    // a label too long for its cap even at the floor is caught loudly by the overlap invariant rather
    // than silently shrunk to illegibility.
    const fit =
      textWidth(text, 11) > cap
        ? Math.max(LEG_FLOOR, Math.floor((cap / (text.length * CHAR_W)) * 10) / 10)
        : 11;
    parts.push(
      `<circle data-el="node:${esc(n.id)}" cx="${p.x}" cy="${p.y}" r="${r1(r)}" fill="#000" fill-opacity="0.15" stroke="#000" stroke-width="1.5" />`,
      fitText(text, onLeft ? leftX : rightX, p.y + 4, {
        size: fit,
        anchor: onLeft ? 'end' : 'start',
        maxWidth: cap,
        halo: 3,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
  });

  // Bottom chrome — a fixed guidance caption + the model disclaimer. They are long sentences while
  // the body art is only BODY_W wide, so each is WRAPPED to the frame width (never spilling past the
  // viewBox) and the frame HEIGHT grows to fit the wrapped lines (ADR-0006 content-fit; the title is
  // compressed by `fitText` below for the same reason).
  const CHROME_W = BODY_W - 24;
  const capChars = Math.max(8, Math.floor(CHROME_W / (10 * CHAR_W)));
  const capLines = wrapLines(
    'Marker size = intensity (number shown). Body sensations are meaningful but not self-explanatory — pace and titrate.',
    capChars,
    3,
  );
  const discChars = Math.max(8, Math.floor(CHROME_W / (9 * CHAR_W)));
  const discLines = model.meta.disclaimer ? wrapLines(model.meta.disclaimer, discChars, 2) : [];
  const fy = BODY_H - 30;
  capLines.forEach((ln, i) => {
    parts.push(
      `<text x="12" y="${r1(fy + i * 12)}" font-family="sans-serif" font-size="10">${esc(ln)}</text>`,
    );
  });
  const discTop = fy + capLines.length * 12 + 2;
  discLines.forEach((ln, i) => {
    parts.push(
      `<text x="12" y="${r1(discTop + i * 11)}" font-family="sans-serif" font-size="9" fill="#333">${esc(ln)}</text>`,
    );
  });
  const chromeBottom = discLines.length
    ? discTop + (discLines.length - 1) * 11
    : fy + (capLines.length - 1) * 12;
  const bodyH = Math.max(BODY_H, Math.ceil(chromeBottom + 12));

  const altText =
    `Body map${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Sensations: ${model.nodes.map((n) => `${getText(n.label, layer, lang)} (intensity ${(n.properties.intensity ?? 0.5).toFixed(1)})`).join(', ') || 'none'}. ` +
    `Pace and titrate.`;

  // Grow the frame width to fit the title at FULL size rather than compressing it (a heading
  // shouldn't be squished — ADR-0052/0053); the body art + labels already fit within BODY_W, so the
  // extra width is just title headroom on the right.
  const bodyW = model.meta.title
    ? Math.max(BODY_W, Math.ceil(24 + textWidth(model.meta.title, 16)))
    : BODY_W;
  const titleText = model.meta.title
    ? fitText(model.meta.title, 12, 22, { size: 16, weight: 700, maxWidth: bodyW - 24 })
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bodyW} ${bodyH}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Body map')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${bodyW}" height="${bodyH}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const DIFF_W = 600;
const DIFF_ROW_H = 24;

interface DiffRow {
  glyph: string;
  text: string;
  strike?: boolean;
  /** Draw the spec's signature dashed→solid swatch (forming/liminal → consolidated). */
  solidified?: boolean;
}

/**
 * Render a longitudinal diff (M6) as an accessible "progress card": a monochrome,
 * print-safe list of what changed between two versions — dominance ↑/↓, the
 * dashed→solid (forming/liminal → consolidated) marker drawn as a swatch, rename, and
 * add/remove. Meaning never rides on colour (§D): a leading glyph (＋ added, − removed,
 * ↑/↓ dominance/valence, ✎ rename, ◧ consolidation) + a dashed/solid swatch + the full
 * text carry it. Exportable alongside the diagram it summarizes.
 *
 * Traceability: REQ-VERSIONING-DIFF (§E.5, §H.10), REQ-ACCESSIBILITY (§D).
 */
export function renderDiff(
  before: PsyumlModel,
  after: PsyumlModel,
  options: { layer?: Layer } = {},
): RenderResult {
  const layer = options.layer ?? 'clinician';
  const diff: ModelDiff = diffModels(before, after, { layer });

  const rows: DiffRow[] = [];
  for (const n of diff.nodes.added)
    rows.push({ glyph: '＋', text: `${n.kind} “${getText(n.label, layer)}”` });
  for (const c of diff.nodes.changed) {
    for (const d of c.deltas) {
      if (d.field === 'dominance' || d.field === 'valence') {
        rows.push({
          glyph: d.direction === 'down' ? '↓' : '↑',
          text: `${c.label}: ${d.field} ${d.before} → ${d.after}`,
        });
      } else if (d.field === 'consolidation') {
        rows.push({
          glyph: '◧',
          text: `${c.label}: ${d.before} → ${d.after}`,
          solidified: d.after === 'consolidated',
        });
      } else if (d.field === 'label') {
        rows.push({ glyph: '✎', text: `Renamed “${d.before}” → “${d.after}”` });
      } else {
        rows.push({ glyph: 'Δ', text: `${c.label}: ${d.field} ${d.before} → ${d.after}` });
      }
    }
  }
  for (const c of diff.edges.changed)
    for (const d of c.deltas)
      rows.push({ glyph: 'Δ', text: `link ${c.id}: ${d.field} ${d.before} → ${d.after}` });
  for (const e of diff.edges.added) rows.push({ glyph: '＋', text: `${e.kind} link` });
  for (const n of diff.nodes.removed)
    rows.push({ glyph: '−', text: `${n.kind} “${getText(n.label, layer)}”`, strike: true });
  for (const e of diff.edges.removed)
    rows.push({ glyph: '−', text: `${e.kind} link`, strike: true });

  const titleText = `Progress${after.meta.title ? `: ${after.meta.title}` : ''}`;
  const altText =
    `${titleText}. ` +
    (rows.length === 0 ? 'No tracked changes.' : `${rows.map((r) => r.text).join('; ')}.`);

  const parts: string[] = [
    `<text x="16" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(titleText)}</text>`,
  ];
  let y = 52;
  if (rows.length === 0) {
    parts.push(
      `<text x="16" y="${y}" font-family="sans-serif" font-size="13">No tracked changes.</text>`,
    );
    y += DIFF_ROW_H;
  } else {
    for (const r of rows) {
      parts.push(
        `<text x="16" y="${y}" font-family="sans-serif" font-size="14" font-weight="700">${esc(r.glyph)}</text>`,
      );
      let tx = 40;
      if (r.solidified) {
        parts.push(
          `<rect x="${tx}" y="${y - 11}" width="13" height="13" fill="#fff" stroke="#000" stroke-width="1.5" stroke-dasharray="3 2" />`,
          `<text x="${tx + 16}" y="${y}" font-family="sans-serif" font-size="12">→</text>`,
          `<rect x="${tx + 28}" y="${y - 11}" width="13" height="13" fill="#fff" stroke="#000" stroke-width="2.5" />`,
        );
        tx += 48;
      }
      const deco = r.strike ? ' text-decoration="line-through"' : '';
      const fill = r.strike ? ' fill="#555"' : '';
      parts.push(
        `<text x="${tx}" y="${y}" font-family="sans-serif" font-size="13"${deco}${fill}>${esc(r.text)}</text>`,
      );
      y += DIFF_ROW_H;
    }
  }
  if (after.meta.disclaimer) {
    parts.push(
      `<text x="16" y="${y + 4}" font-family="sans-serif" font-size="10" fill="#333">${esc(after.meta.disclaimer)}</text>`,
    );
    y += 18;
  }
  const height = y + 12;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DIFF_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(titleText)}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${DIFF_W}" height="${height}" fill="#fff" />` +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const TT_W = 760;
const TT_NODE_W = 158;
const TT_NODE_H = 38;
const TT_SHORT = 6;

/**
 * Render Malan's Two Triangles (§K research profile, Source 2): the Triangle of Conflict
 * (Defence / Anxiety / Hidden feeling) and the Triangle of Person (Current / Transference /
 * Past), each a band-grouped triad whose three sides are its edges, linked by the
 * `transference` connector (dotted) that shows the same conflict recurring across
 * relationships. A clinician-facing psychodynamic formulation aid; meaning rides on the
 * dotted/solid line + labels + group headers, never colour (§D).
 *
 * Traceability: REQ-RESEARCH-PROFILES (§K), REQ-NOTATION, REQ-ACCESSIBILITY.
 */
export function renderTwoTriangles(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const pos = new Map<string, { x: number; y: number }>();
  model.nodes.forEach((n, i) => {
    pos.set(n.id, n.position ? { x: n.position.x, y: n.position.y } : { x: 130 + i * 130, y: 160 });
  });
  let maxX = 0;
  let maxY = 0;
  for (const p of pos.values()) {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = Math.max(
    TT_W,
    maxX + TT_NODE_W / 2 + 20,
    model.meta.title ? 20 + textWidth(model.meta.title, 16) : 0,
  );
  const height = Math.max(320, maxY + 80) + 24;

  const bands = [...model.bands].sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  // Edges first (the triangle sides), so the node boxes sit on top of the line ends.
  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const len = Math.hypot(t.x - s.x, t.y - s.y) || 1;
    const ux = (t.x - s.x) / len;
    const uy = (t.y - s.y) / len;
    const dotted = e.kind === 'transference' ? ' stroke-dasharray="2 4"' : '';
    parts.push(
      `<line data-el="edge:${esc(e.id)}" x1="${r1(s.x + ux * TT_SHORT)}" y1="${r1(s.y + uy * TT_SHORT)}" x2="${r1(t.x - ux * TT_SHORT)}" y2="${r1(t.y - uy * TT_SHORT)}" stroke="#000" stroke-width="1.5"${dotted} />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((s.x + t.x) / 2)}" y="${r1((s.y + t.y) / 2) - 3}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#333" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(lbl)}</text>`,
      );
    }
  }

  // Group headers (one per band/triangle), above the group's topmost node.
  for (const b of bands) {
    const pts = model.nodes
      .filter((n) => n.bandId === b.id)
      .map((n) => pos.get(n.id))
      .filter((p): p is { x: number; y: number } => Boolean(p));
    if (pts.length === 0) continue;
    const hx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const topY = Math.min(...pts.map((p) => p.y));
    parts.push(
      `<text x="${r1(hx)}" y="${r1(topY) - 28}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700">${esc(getText(b.label, layer, lang))}</text>`,
    );
  }

  // Concept nodes as rounded rects.
  for (const n of model.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    parts.push(
      `<rect data-el="node:${esc(n.id)}" x="${r1(p.x - TT_NODE_W / 2)}" y="${r1(p.y - TT_NODE_H / 2)}" width="${TT_NODE_W}" height="${TT_NODE_H}" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2" />`,
      wrapLabel(getText(n.label, layer, lang), p.x, p.y + 4, {
        size: 10,
        anchor: 'middle',
        maxWidth: TT_NODE_W - 16,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
  }

  const ly = height - 12;
  parts.push(
    `<text x="12" y="${ly}" font-family="sans-serif" font-size="10">solid = within-triangle link · dotted = transference (same conflict, new relationship)</text>`,
  );

  const groupAlt = bands.map((b) => {
    const ns = model.nodes
      .filter((n) => n.bandId === b.id)
      .map((n) => getText(n.label, layer, lang));
    return `${getText(b.label, layer, lang)} — ${ns.join(', ') || 'none'}`;
  });
  const altText =
    `Two triangles${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `${groupAlt.join('. ')}. Transference links the same conflict across relationships.`;

  const titleText = model.meta.title
    ? `<text x="12" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Two triangles')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/** Per-kind fill-in prompt for blank printable templates. */
const KIND_PROMPT: Record<string, string> = {
  state: '(state…)',
  agent: '(part…)',
  self: '(Self / centre)',
  resource: '(resource…)',
  intervention: '(step…)',
  context: '(context…)',
  temporal: '(when…)',
};

/**
 * Turn a model into a **blank printable template**: keep the structure (bands, positions,
 * node kinds, edges) but replace every node label with a fill-in prompt and clear edge
 * labels/triggers, so a clinician can print the scaffold and write it in by hand in session
 * (REQ-TEMPLATES). The model's disclaimer / crisis line are kept (they belong on the print);
 * the title becomes a generic "… (blank template)". Render it with the normal `render*` for
 * the diagram type. Pure; never mutates the input.
 */
export function blankTemplate(model: PsyumlModel): PsyumlModel {
  return parseModel({
    ...model,
    meta: { ...model.meta, title: `${model.diagram} (blank template)` },
    nodes: model.nodes.map((n) => ({
      ...n,
      label: { clinician: { en: KIND_PROMPT[n.kind] ?? '(…)' } },
    })),
    edges: model.edges.map((e) => {
      // keep the structure (id/kind/source/target/loop/properties); drop label + trigger
      const clean: Record<string, unknown> = {
        id: e.id,
        kind: e.kind,
        source: e.source,
        target: e.target,
        properties: e.properties,
      };
      if (e.loop) clean.loop = e.loop;
      return clean;
    }),
  });
}

// ---------------------------------------------------------------------------
// Composite board (v0.2 §2 — the "one case across several views" family)
// ---------------------------------------------------------------------------

/** A node id that appears in ≥2 member views — a cross-diagram thread (spec §H.10). */
export interface SharedThread {
  id: string;
  label: string;
  views: string[];
}

const compositeLayer = (o: RenderOptions): 'clinician' | 'client' =>
  o.layer ?? (o.audience && o.audience !== 'clinician' ? 'client' : 'clinician');
const viewName = (m: PsyumlModel, i: number): string => m.meta.title ?? `${m.diagram} #${i + 1}`;

/**
 * The node ids shared across two or more of the given models — the threads a Composite board uses
 * to cross-navigate one case across several views (spec §H.10). Shared IDs are how v0.1 already
 * links diagrams; this just surfaces them.
 */
export function sharedNodeIds(models: PsyumlModel[], options: RenderOptions = {}): SharedThread[] {
  const layer = compositeLayer(options);
  const lang = options.lang ?? 'en';
  const byId = new Map<string, { label: string; idx: Set<number> }>();
  models.forEach((m, i) => {
    for (const n of m.nodes) {
      const e = byId.get(n.id) ?? {
        label: getText(n.label, layer, lang) || n.id,
        idx: new Set<number>(),
      };
      e.idx.add(i);
      byId.set(n.id, e);
    }
  });
  return [...byId.entries()]
    .filter(([, e]) => e.idx.size >= 2)
    .map(([id, e]) => ({
      id,
      label: e.label,
      views: [...e.idx].map((i) => viewName(models[i], i)),
    }));
}

const COMPOSITE_W = 720;

/**
 * Render a **Composite board** (v0.2 §2): several family views of one case, arranged as titled
 * panels over a shared-threads index. Each member is rendered through the `render()` dispatcher
 * (so the audience profile applies) and nested as a scaled sub-`<svg>`; shared node ids (those in
 * ≥2 views) are listed at the top and tagged for cross-navigation. The model is never mutated.
 */
export function renderComposite(models: PsyumlModel[], options: RenderOptions = {}): RenderResult {
  const pad = 16;
  const gap = 16;
  const titleH = 24;
  const panelW = COMPOSITE_W - 2 * pad;
  const parts: string[] = [];
  let y = pad;

  const frame = (h: number): string =>
    `<rect x="${pad}" y="${r1(y)}" width="${panelW}" height="${r1(h)}" fill="#fff" stroke="#000" stroke-width="1.5" rx="8" ry="8" />`;

  // Shared-threads index (the cross-navigation key).
  const threads = sharedNodeIds(models, options);
  const idxLines = threads.length
    ? threads.map((t) => `• ${t.label} (${t.id}) — in ${t.views.join(', ')}`)
    : ['(no shared threads across these views)'];
  const idxH = titleH + 6 + idxLines.length * 14 + 8;
  parts.push(frame(idxH));
  parts.push(
    `<text x="${pad + 8}" y="${r1(y + 16)}" font-family="sans-serif" font-size="13" font-weight="700">Shared threads (cross-navigation)</text>`,
  );
  idxLines.forEach((ln, i) =>
    parts.push(
      `<text data-shared-id="${esc(threads[i]?.id ?? '')}" x="${pad + 10}" y="${r1(y + titleH + 6 + i * 14)}" font-family="sans-serif" font-size="11">${esc(ln)}</text>`,
    ),
  );
  y += idxH + gap;

  // Member panels: each rendered view nested as a scaled sub-svg.
  const memberAlts: string[] = [];
  models.forEach((m, i) => {
    const { svg, altText } = render(m, options);
    memberAlts.push(`(${i + 1}) ${viewName(m, i)}: ${altText}`);
    const vbStr = svg.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${panelW} 300`;
    const nums = vbStr.split(/\s+/).map(Number);
    const w = nums[2] || panelW;
    const h = nums[3] || 300;
    const ph = Math.min(560, r1(panelW * (h / w)));
    // Namespace every `id`/`url(#…)` per panel so nested member SVGs don't collide on shared
    // def ids (`arrow`, the `p-*` band patterns, node ids). The `\s` before `id` avoids touching
    // `data-…-id` attributes; both rewrites use the same suffix so intra-panel refs stay valid.
    const pfx = `__p${i}`;
    const inner = svg
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/(\s)id="([^"]+)"/g, `$1id="$2${pfx}"`)
      .replace(/url\(#([^)]+)\)/g, `url(#$1${pfx})`);
    parts.push(frame(titleH + ph));
    parts.push(
      `<text x="${pad + 8}" y="${r1(y + 16)}" font-family="sans-serif" font-size="13" font-weight="700">${i + 1}. ${esc(viewName(m, i))}</text>`,
    );
    parts.push(
      `<svg data-composite-panel="${i}" x="${pad}" y="${r1(y + titleH)}" width="${panelW}" height="${ph}" viewBox="${esc(vbStr)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`,
    );
    y += titleH + ph + gap;
  });

  const totalH = r1(y - gap + pad);
  const names = models.map((m, i) => viewName(m, i)).join('; ');
  const altText =
    `Composite board of ${models.length} view${models.length === 1 ? '' : 's'}: ${names || 'none'}. ` +
    (threads.length
      ? `Shared threads: ${threads.map((t) => `${t.label} in ${t.views.join(' & ')}`).join('; ')}. `
      : 'No shared threads across these views. ') +
    memberAlts.join(' ');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COMPOSITE_W} ${totalH}" role="img" aria-label="${esc(altText)}">` +
    `<title>Composite board</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${COMPOSITE_W}" height="${totalH}" fill="#fff" />` +
    parts.join('') +
    '</svg>';
  return { svg, altText };
}

/**
 * Ranked ladder (REQ-NEW-DIAGRAM-TYPES, ADR-0029) — an exposure / fear hierarchy or a ranked goal
 * ladder. Every node is a RUNG, ordered top→bottom by `properties.intensity` (the SUDS / distress or
 * value rating, 0–1). Rendered as a stack of labelled step-boxes with a left intensity arrow
 * (harder ↑ / easier ↓) and the rating per rung — monochrome; the order is spatial AND echoed in the
 * alt-text. The "path of hope" is the bottom rung: start small, master a rung before climbing.
 */
export function renderLadder(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  // Rungs hardest-first (top). A missing rating sinks to the bottom but keeps input order among ties.
  const rungs = model.nodes
    .map((n, i) => ({ n, i, v: n.properties.intensity ?? -1 }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((x) => x.n);

  const titleH = model.meta.title ? 34 : 12;
  const ROW_H = 46;
  const GAP = 14;
  const axisX = 34;
  const boxX = 70;
  const boxW = LADDER_W - boxX - 24;
  const ratingW = 52;
  const top = titleH + 14;

  const parts: string[] = [];
  const altRows: string[] = [];

  rungs.forEach((n, r) => {
    const y = top + r * (ROW_H + GAP);
    const name = getText(n.label, layer, lang);
    const dashed = isInterpretive(n.properties.epistemicStatus) ? ' stroke-dasharray="5 4"' : '';
    parts.push(
      `<rect data-el="node:${esc(n.id)}" x="${boxX}" y="${y}" width="${boxW}" height="${ROW_H}" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2"${dashed} />`,
      fitText(name, boxX + 14, y + ROW_H / 2 + 4, {
        size: 12,
        maxWidth: boxW - 28 - ratingW,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
    const rating = n.properties.intensity;
    if (rating !== undefined) {
      const rx = boxX + boxW - ratingW / 2 - 8;
      parts.push(
        `<circle cx="${rx}" cy="${y + ROW_H / 2}" r="15" fill="none" stroke="#000" stroke-width="1.5" />`,
        `<text x="${rx}" y="${y + ROW_H / 2 + 4}" font-family="sans-serif" font-size="11" font-weight="700" text-anchor="middle">${Math.round(rating * 100)}</text>`,
      );
    }
    altRows.push(`${name}${rating !== undefined ? ` (${Math.round(rating * 100)})` : ''}`);
  });

  const bottom = top + Math.max(1, rungs.length) * (ROW_H + GAP);
  parts.push(
    `<line x1="${axisX}" y1="${bottom - 6}" x2="${axisX}" y2="${top + 12}" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    `<text x="${axisX}" y="${top + 6}" font-family="sans-serif" font-size="9" text-anchor="middle">harder</text>`,
    `<text x="${axisX}" y="${bottom + 4}" font-family="sans-serif" font-size="9" text-anchor="middle">easier</text>`,
  );

  const footY = bottom + 22;
  parts.push(
    chromeLine(
      'Climb at your own pace — master a rung before moving up; the bottom rung is where to start.',
      boxX,
      footY,
      LADDER_W,
      { size: 11 },
    ),
  );
  let h = footY + 10;
  if (model.meta.disclaimer) {
    parts.push(
      chromeLine(model.meta.disclaimer, boxX, h + 6, LADDER_W, { size: 10, fill: '#333' }),
    );
    h += 16;
  }

  const altText =
    `Ranked ladder${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Rungs, hardest first: ${altRows.join('; ') || 'none'}. Start at the bottom; master a rung before climbing.`;

  const title = model.meta.title
    ? `<text x="${boxX}" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADDER_W} ${h}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Ranked ladder')}</title><desc>${esc(altText)}</desc>` +
    `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>` +
    `<rect x="0" y="0" width="${LADDER_W}" height="${h}" fill="#fff" />` +
    title +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Three circles (REQ-NEW-DIAGRAM-TYPES, ADR-0030) — the CFT (Gilbert) emotion-regulation model:
 * three systems, Threat (protect) · Drive (pursue) · Soothing (rest), drawn as labelled circles in
 * the canonical triangle (soothe at the bottom — the one to grow). Each system is a node identified by
 * `stereotype` (threat|drive|soothing); its `properties.weight` (0–1) sizes the circle, so an
 * over-developed threat system and a depleted soothing system are visible at a glance — the clinical
 * point. A one-line summary of each system's contents (its `containment` items) sits below its circle.
 * Monochrome; the alt-text reads the three systems, their relative balance, and contents.
 */
export function renderThreeCircles(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const POS: Record<string, { x: number; y: number }> = {
    threat: { x: 165, y: 170 },
    drive: { x: 455, y: 170 },
    soothing: { x: 310, y: 385 },
  };
  const SUB: Record<string, string> = {
    threat: 'protect',
    drive: 'pursue',
    soothing: 'rest & connect',
  };
  const order = ['threat', 'drive', 'soothing'];
  const systems = order
    .map((s) => model.nodes.find((n) => n.stereotype === s))
    .filter((n): n is (typeof model.nodes)[number] => Boolean(n));

  const itemsOf = (id: string): string[] =>
    model.nodes
      .filter((n) =>
        model.edges.some((e) => e.kind === 'containment' && e.source === id && e.target === n.id),
      )
      .map((n) => getText(n.label, layer, lang));

  const parts: string[] = [];
  const altSys: string[] = [];

  for (const sys of systems) {
    const key = sys.stereotype as string;
    const p = POS[key] ?? { x: 310, y: 175 };
    const w = sys.properties.weight ?? 0.5;
    const r = Math.round(46 + w * 38);
    const name = getText(sys.label, layer, lang);
    parts.push(
      `<circle data-el="node:${esc(sys.id)}" cx="${p.x}" cy="${p.y}" r="${r}" fill="#fff" stroke="#000" stroke-width="2" />`,
      fitText(name, p.x, p.y - 2, {
        size: 13,
        maxWidth: 2 * r - 18,
        anchor: 'middle',
        dataEl: `nodelabel:${sys.id}`,
      }),
      `<text x="${p.x}" y="${p.y + 14}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#333">(${esc(SUB[key] ?? '')})</text>`,
    );
    const items = itemsOf(sys.id);
    if (items.length) {
      parts.push(
        fitText(items.join(' · '), p.x, p.y + r + 16, {
          size: 10,
          maxWidth: 220,
          anchor: 'middle',
          fill: '#333',
        }),
      );
    }
    altSys.push(
      `${name} (${SUB[key] ?? ''}; ${w >= 0.66 ? 'over-developed' : w <= 0.34 ? 'depleted' : 'moderate'})${items.length ? `: ${items.join(', ')}` : ''}`,
    );
  }

  const height = 560;
  parts.push(
    chromeLine(
      'Three systems (Gilbert): grow the soothing system — it balances threat and drive.',
      20,
      height - 26,
      TC_W,
      { size: 11 },
    ),
  );
  if (model.meta.disclaimer) {
    parts.push(
      chromeLine(model.meta.disclaimer, 20, height - 10, TC_W, { size: 10, fill: '#333' }),
    );
  }

  const altText =
    `CFT three circles${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Systems — ${altSys.join('; ') || 'none'}. Grow the soothing system to balance threat and drive.`;

  const title = model.meta.title
    ? `<text x="20" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TC_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Three circles (CFT)')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${TC_W}" height="${height}" fill="#fff" />` +
    title +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Venn / overlapping circles (REQ-NEW-DIAGRAM-TYPES, ADR-0031) — two regions whose OVERLAP carries
 * the meaning, e.g. DBT's states of mind: Reasonable ∩ Emotion = Wise Mind. The three model nodes are
 * identified by `stereotype` (left | overlap | right; or reasonable | wise | emotion); the renderer
 * draws two overlapping circles as DECORATION (not `data-el` nodes — they must overlap, which the
 * node↔node invariant forbids) and places each region's label (the actual `data-el` content) in its
 * zone: left-only, the lens, right-only. Each carries a haloed one-line descriptor. Monochrome;
 * alt-text states the two circles, their overlap, and what each region holds.
 */
export function renderVenn(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  // Identify the three regions; fall back to document order if the canonical stereotypes are absent.
  const pick = (...keys: string[]): (typeof model.nodes)[number] | undefined =>
    model.nodes.find((n) => keys.includes(n.stereotype ?? ''));
  const left = pick('left', 'reasonable') ?? model.nodes[0];
  const right = pick('right', 'emotion') ?? model.nodes[1];
  const overlap = pick('overlap', 'wise', 'both') ?? model.nodes[2];

  const cy = 245;
  const r = 140;
  const lcx = 230;
  const rcx = 370;
  const ZONES: { node?: (typeof model.nodes)[number]; x: number }[] = [
    { node: left, x: 160 },
    { node: overlap, x: 300 },
    { node: right, x: 440 },
  ];

  const parts: string[] = [
    `<circle cx="${lcx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="2" />`,
    `<circle cx="${rcx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="2" />`,
  ];
  const altZones: string[] = [];

  for (const z of ZONES) {
    if (!z.node) continue;
    const name = getText(z.node.label, layer, lang);
    parts.push(
      `<text data-el="nodelabel:${esc(z.node.id)}" x="${z.x}" y="${cy - 4}" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(name)}</text>`,
    );
    // Descriptor = the region's contents (containment items), e.g. Reasonable Mind: "facts · logic".
    const items = model.nodes
      .filter((n) =>
        model.edges.some(
          (e) => e.kind === 'containment' && e.source === z.node!.id && e.target === n.id,
        ),
      )
      .map((n) => getText(n.label, layer, lang));
    if (items.length) {
      // Cap each descriptor to its zone's share of the 140px centre-spacing so adjacent contents
      // can't collide (ADR-0045) — compressed via textLength only when it would otherwise overflow.
      const descr = items.join(' · ');
      const CAP = 128;
      const tl =
        textWidth(descr, 10) > CAP ? ` textLength="${CAP}" lengthAdjust="spacingAndGlyphs"` : '';
      parts.push(
        `<text x="${z.x}" y="${cy + 15}" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#333" stroke="#fff" stroke-width="2.5" paint-order="stroke"${tl}>${esc(descr)}</text>`,
      );
    }
    altZones.push(items.length ? `${name} (${items.join(', ')})` : name);
  }

  const height = 470;
  parts.push(
    chromeLine(
      'Two circles, one overlap: the middle region is what both share.',
      20,
      height - 26,
      VENN_W,
      { size: 11 },
    ),
  );
  if (model.meta.disclaimer) {
    parts.push(
      chromeLine(model.meta.disclaimer, 20, height - 10, VENN_W, { size: 10, fill: '#333' }),
    );
  }

  const altText =
    `Two overlapping circles${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Left — ${altZones[0] ?? '—'}; overlap (what both share) — ${altZones[1] ?? '—'}; right — ${altZones[2] ?? '—'}.`;

  const title = model.meta.title
    ? `<text x="20" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VENN_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Overlapping circles')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${VENN_W}" height="${height}" fill="#fff" />` +
    title +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Values bull's-eye (REQ-NEW-DIAGRAM-TYPES, ADR-0032) — the ACT (Lundgren) values-clarification
 * target, and the wider family of concentric "circles of control / influence / concern". Each node
 * is a life DOMAIN plotted as a dot whose RADIUS is set by `properties.intensity` (0–1 = how closely
 * the person is currently living by that value; 1 = dead-centre / on target, 0 = the rim / off
 * target) — so the SPREAD of darts is the picture (a tight cluster near the centre vs darts scattered
 * to the edge). Domains sit at evenly-spaced angles and the label rides the perimeter (always well
 * separated) with a thin leader to its dot. The radial distance is the load-bearing channel — no
 * schema growth (reuses `intensity`, like the ladder's SUDS). Monochrome; the alt-text reads each
 * domain's on-/off-target standing and its rating.
 */
export function renderBullseye(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const W = BULLSEYE_W;
  const cx = 325;
  const cy = 252;
  const R = 148;
  const innerPad = 26;
  const labelGap = 16;
  const labelMax = 150;

  const domains = model.nodes;
  const N = Math.max(1, domains.length);

  const parts: string[] = [];
  // Concentric rings + bull's-eye centre — DECORATION (no data-el; the plotted dots are the nodes).
  for (const f of [1, 0.72, 0.46, 0.22]) {
    const op = f === 1 ? '' : ' stroke-opacity="0.4"';
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r1(R * f)}" fill="none" stroke="#000" stroke-width="${f === 1 ? 2 : 1}"${op} />`,
    );
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="#000" />`);

  const bucket = (i: number): string =>
    i >= 0.66 ? 'on target' : i <= 0.33 ? 'off target' : 'drifting';

  const altRows: string[] = [];
  domains.forEach((n, k) => {
    const ang = -Math.PI / 2 + (k * 2 * Math.PI) / N;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const i = Math.max(0, Math.min(1, n.properties.intensity ?? 0.5));
    const dotR = innerPad + (R - innerPad) * (1 - i);
    const dotX = cx + dotR * dx;
    const dotY = cy + dotR * dy;
    const name = getText(n.label, layer, lang);

    // Leader from the dot out to the ring edge (decoration); the label then rides the perimeter.
    const edgeX = cx + (R + 2) * dx;
    const edgeY = cy + (R + 2) * dy;
    const lx = cx + (R + labelGap) * dx;
    const ly = cy + (R + labelGap) * dy + 4;
    const anchor = dx > 0.25 ? 'start' : dx < -0.25 ? 'end' : 'middle';

    parts.push(
      `<line x1="${r1(dotX)}" y1="${r1(dotY)}" x2="${r1(edgeX)}" y2="${r1(edgeY)}" stroke="#000" stroke-width="1" stroke-opacity="0.35" />`,
      `<circle data-el="node:${esc(n.id)}" cx="${r1(dotX)}" cy="${r1(dotY)}" r="5" fill="#000" />`,
      fitText(name, lx, ly, {
        size: 12,
        maxWidth: labelMax,
        anchor,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
    altRows.push(`${name} — ${bucket(i)} (${Math.round(i * 100)})`);
  });

  const height = cy + R + labelGap + 60;
  parts.push(
    `<text x="20" y="${height - 28}" font-family="sans-serif" font-size="11">Each dot is a life area; closer to the centre = living more like that value matters to you.</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(
      `<text x="20" y="${height - 12}" font-family="sans-serif" font-size="10" fill="#333">${esc(model.meta.disclaimer)}</text>`,
    );
  }

  const altText =
    `Values bull's-eye${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Centre = on target, rim = off target. Domains: ${altRows.join('; ') || 'none'}.`;

  const title = model.meta.title
    ? `<text x="20" y="24" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? "Values bull's-eye")}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${W}" height="${height}" fill="#fff" />` +
    title +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Tree of Life (REQ-NEW-DIAGRAM-TYPES, ADR-0033) — the narrative-therapy practice (Ncube; Dulwich
 * Centre). A strengths-forward life portrait whose meaning is the botanical METAPHOR: each item is
 * placed in a zone by `stereotype` — `roots` (where I come from), `ground` (my present, day to day),
 * `trunk` (my skills & values), `branches` (my hopes, dreams & wishes), `leaves` (the important
 * people), `fruits` (gifts I've been given). The renderer buckets the nodes by zone and lays each
 * zone as a labelled band of separated item-labels (`separate1D`), with a canopy / trunk / roots
 * silhouette drawn behind (decoration, no `data-el`). Edge-free + no schema growth (reuses
 * `stereotype`); monochrome; the alt-text reads each zone and its contents. The metaphor is
 * intentionally strengths-based — it is a co-created reflection, not an assessment.
 */
export function renderTreeOfLife(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const W = TREE_W;
  const cx = Math.round(W / 2);

  const ZONES: { key: string; header: string; canopy: boolean }[] = [
    { key: 'branches', header: 'Branches — my hopes, dreams & wishes', canopy: true },
    { key: 'leaves', header: 'Leaves — the important people in my life', canopy: true },
    { key: 'fruits', header: "Fruits — gifts I've been given", canopy: true },
    { key: 'trunk', header: 'Trunk — my skills & values', canopy: false },
    { key: 'ground', header: 'Ground — my present, day to day', canopy: false },
    { key: 'roots', header: 'Roots — where I come from', canopy: false },
  ];

  const inZone = (key: string): typeof model.nodes =>
    model.nodes.filter((n) => (n.stereotype ?? '') === key);

  const titleH = model.meta.title ? 36 : 14;
  let y = titleH + 8;

  const body: string[] = [];
  const altZones: string[] = [];
  const bands: { key: string; top: number; itemsY: number; bottom: number; canopy: boolean }[] = [];

  for (const z of ZONES) {
    const items = inZone(z.key);
    if (!items.length) continue;
    const headerY = y + 13;
    const itemsY = y + 38;
    body.push(
      `<text x="22" y="${headerY}" font-family="sans-serif" font-size="11" font-weight="700" fill="#444">${esc(z.header)}</text>`,
    );

    const size = 12;
    const leftPad = 44;
    const rightPad = 26;
    const avail = W - leftPad - rightPad;
    const spans = items.map((n, i) => {
      const label = getText(n.label, layer, lang);
      return {
        center: leftPad + (avail * (i + 0.5)) / items.length,
        half: textWidth(label, size) / 2 + 8,
        label,
        id: n.id,
      };
    });
    const centers = separate1D(spans, 16);
    spans.forEach((s, i) => {
      body.push(
        `<text data-el="nodelabel:${esc(s.id)}" x="${r1(centers[i])}" y="${itemsY}" font-family="sans-serif" font-size="${size}" text-anchor="middle" stroke="#fff" stroke-width="3.5" paint-order="stroke">${esc(s.label)}</text>`,
      );
    });

    bands.push({ key: z.key, top: y, itemsY, bottom: itemsY + 10, canopy: z.canopy });
    altZones.push(
      `${z.header.split(' — ')[0]} (${z.header.split(' — ')[1] ?? ''}): ${items.map((n) => getText(n.label, layer, lang)).join(', ')}`,
    );
    y = itemsY + 22;
  }

  // Tree silhouette (decoration; drawn BEFORE the labels so the haloed text sits on top).
  const deco: string[] = [];
  if (bands.length) {
    const topY = bands[0].top;
    const canopyBands = bands.filter((b) => b.canopy);
    const rootsBand = bands.find((b) => b.key === 'roots');
    const groundBand = bands.find((b) => b.key === 'ground');
    const soilY = rootsBand ? rootsBand.top - 8 : bands[bands.length - 1].bottom;
    const canopyBot = canopyBands.length ? canopyBands[canopyBands.length - 1].bottom : topY;

    // Canopy: a soft ellipse behind the hopes/people/gifts bands.
    if (canopyBands.length) {
      const cyc = (topY + canopyBot) / 2;
      deco.push(
        `<ellipse cx="${cx}" cy="${r1(cyc)}" rx="${Math.round(W * 0.44)}" ry="${r1((canopyBot - topY) / 2 + 18)}" fill="#eef3ec" stroke="#cfd8cb" stroke-width="1.5" />`,
      );
    }
    // Trunk: from the canopy base down to the soil.
    const trunkTop = canopyBands.length ? canopyBot - 6 : topY;
    deco.push(
      `<rect x="${cx - 60}" y="${r1(trunkTop)}" width="120" height="${r1(Math.max(0, soilY - trunkTop))}" fill="#efe7da" stroke="#d8cdb8" stroke-width="1.5" />`,
    );
    // Soil line.
    deco.push(
      `<line x1="30" y1="${r1(soilY)}" x2="${W - 26}" y2="${r1(soilY)}" stroke="#b9a988" stroke-width="2" />`,
    );
    // Roots: a fan from the trunk base down into the roots band.
    if (rootsBand) {
      const ry = rootsBand.itemsY - 6;
      for (const fx of [0.18, 0.4, 0.6, 0.82]) {
        deco.push(
          `<line x1="${cx}" y1="${r1(soilY)}" x2="${r1(30 + (W - 56) * fx)}" y2="${r1(ry)}" stroke="#b9a988" stroke-width="1.5" stroke-opacity="0.7" />`,
        );
      }
    }
    void groundBand;
  }

  let h = (bands.length ? bands[bands.length - 1].bottom : y) + 14;
  body.push(
    `<text x="22" y="${h}" font-family="sans-serif" font-size="11">A strengths-based life portrait, co-created — what's here is what you chose to put here.</text>`,
  );
  h += 16;
  if (model.meta.disclaimer) {
    body.push(
      `<text x="22" y="${h}" font-family="sans-serif" font-size="10" fill="#333">${esc(model.meta.disclaimer)}</text>`,
    );
    h += 14;
  }
  const height = h + 6;

  const altText =
    `Tree of Life${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `A narrative life portrait by zone — ${altZones.join('; ') || 'no zones yet'}.`;

  const title = model.meta.title
    ? `<text x="22" y="26" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Tree of Life')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${W}" height="${height}" fill="#fff" />` +
    title +
    deco.join('') +
    body.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Schema-domains grid / sorter (REQ-NEW-DIAGRAM-TYPES, ADR-0034) — Young's schema-therapy framework:
 * the 18 Early Maladaptive Schemas grouped into the **5 canonical schema domains**. The load-bearing
 * structure is the GROUPING — which domain a schema belongs to — so the renderer is a five-column
 * sorter: a fixed domain header per column (renderer copy, like the Tree-of-Life zones), with each
 * schema a cell beneath its domain. A schema is placed by `stereotype` (the domain key); a schema the
 * person endorses is flagged via `properties.intensity` ≥ 0.5 and drawn ACTIVE — a bold outline + a
 * corner wedge + bold label + an alt-text note (redundant, never colour alone). Edge-free + no schema
 * growth. Honest scope: this is a grouped grid (the weakest topology of the ◇ set), but the 5-domain
 * clustering is the schema model's own structure and the active-schema highlight carries the signal.
 */
export function renderSchemaGrid(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const W = SCHEMA_W;
  const DOMAINS: { key: string; name: string }[] = [
    { key: 'disconnection', name: 'Disconnection & Rejection' },
    { key: 'autonomy', name: 'Impaired Autonomy & Performance' },
    { key: 'limits', name: 'Impaired Limits' },
    { key: 'other-directed', name: 'Other-Directedness' },
    { key: 'overvigilance', name: 'Overvigilance & Inhibition' },
  ];

  const leftPad = 16;
  const rightPad = 16;
  const colGap = 12;
  const colW = Math.round(
    (W - leftPad - rightPad - colGap * (DOMAINS.length - 1)) / DOMAINS.length,
  );
  const titleH = model.meta.title ? 34 : 12;
  const headerY = titleH + 8;
  const headerH = 48;
  const boxTop = headerY + headerH + 10;
  const rowH = 56;
  const vGap = 8;

  const parts: string[] = [];
  const altDomains: string[] = [];
  let maxBottom = boxTop;

  DOMAINS.forEach((d, ci) => {
    const x = leftPad + ci * (colW + colGap);
    parts.push(
      `<rect x="${x}" y="${headerY}" width="${colW}" height="${headerH}" rx="6" ry="6" fill="#eceff3" stroke="#8a93a3" stroke-width="1.2" />`,
      wrapLabel(d.name, x + colW / 2, headerY + headerH / 2, {
        size: 11,
        weight: 700,
        maxWidth: colW - 12,
        maxLines: 2,
        fill: '#2a2f3a',
      }),
    );

    const items = model.nodes.filter((n) => (n.stereotype ?? '') === d.key);
    const names: string[] = [];
    items.forEach((n, ri) => {
      const y = boxTop + ri * (rowH + vGap);
      const name = getText(n.label, layer, lang);
      const active = (n.properties.intensity ?? 0) >= 0.5;
      parts.push(
        `<rect data-el="node:${esc(n.id)}" x="${x}" y="${y}" width="${colW}" height="${rowH}" rx="6" ry="6" fill="#fff" stroke="#000" stroke-width="${active ? 2.6 : 1.3}" />`,
      );
      if (active) {
        parts.push(`<path d="M${x} ${y + 14} L${x} ${y} L${x + 14} ${y} Z" fill="#000" />`);
      }
      parts.push(
        wrapLabel(name, x + colW / 2, y + rowH / 2, {
          size: 11,
          maxWidth: colW - 16,
          maxLines: 3,
          weight: active ? 700 : 400,
          dataEl: `nodelabel:${n.id}`,
        }),
      );
      names.push(active ? `${name} (active)` : name);
      maxBottom = Math.max(maxBottom, y + rowH);
    });
    altDomains.push(`${d.name} — ${names.join(', ') || 'none listed'}`);
  });

  let h = maxBottom + 18;
  parts.push(
    chromeLine(
      "Columns are Young's 5 schema domains; a bold-outlined cell (▟) is a schema active for this person.",
      leftPad,
      h,
      W,
      { size: 11 },
    ),
  );
  h += 16;
  if (model.meta.disclaimer) {
    parts.push(chromeLine(model.meta.disclaimer, leftPad, h, W, { size: 10, fill: '#333' }));
    h += 14;
  }
  const height = h + 6;

  const altText =
    `Schema-domains grid${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Young's 18 schemas in 5 domains; bold cells are active for this person. ${altDomains.join('; ')}.`;

  const title = model.meta.title
    ? `<text x="${leftPad}" y="26" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Schema-domains grid')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${W}" height="${height}" fill="#fff" />` +
    title +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Decisional balance 2×2 (REQ-NEW-DIAGRAM-TYPES, ADR-0035) — the MI (Miller–Rollnick) pros/cons grid,
 * rendered as a true LABELLED-AXIS quadrant grid so the crossed dimensions are the structure: the
 * columns are the two options (making the change | staying the same), the rows are benefits | costs.
 * Each item is placed in a quadrant by `stereotype` (`change-benefit` | `stay-benefit` |
 * `change-cost` | `stay-cost`); items are free haloed labels stacked per quadrant. Edge-free + no
 * schema growth. Honest scope: the most table-like ◇ type (the cells don't link) — what carries
 * meaning is the 2-D axis structure; and a NEUTRAL decisional balance can DEEPEN ambivalence when the
 * goal is change (MI-3), so the footer says: use when genuinely weighing, not to persuade.
 */
export function renderDecisionalBalance(
  model: PsyumlModel,
  options: RenderOptions = {},
): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const W = MATRIX_W;
  const QUAD: { key: string; col: 0 | 1; row: 0 | 1 }[] = [
    { key: 'change-benefit', col: 0, row: 0 },
    { key: 'stay-benefit', col: 1, row: 0 },
    { key: 'change-cost', col: 0, row: 1 },
    { key: 'stay-cost', col: 1, row: 1 },
  ];
  const colHeaders = ['Making the change', 'Staying the same'];
  const rowHeaders = ['Benefits / hopes', 'Costs / worries'];

  const leftHdr = 92;
  const titleH = model.meta.title ? 34 : 12;
  const colHdrY = titleH + 16;
  const gridTop = colHdrY + 12;
  const gridLeft = leftHdr;
  const colW = Math.round((W - gridLeft - 16) / 2);
  const itemH = 24;
  const itemTopPad = 26;

  const itemsIn = (key: string): typeof model.nodes =>
    model.nodes.filter((n) => (n.stereotype ?? '') === key);
  const rowCount = (row: 0 | 1): number =>
    Math.max(...QUAD.filter((q) => q.row === row).map((q) => itemsIn(q.key).length), 1);
  const rowHt = (row: 0 | 1): number => rowCount(row) * itemH + itemTopPad + 12;
  const row0H = rowHt(0);
  const row1H = rowHt(1);
  const gridH = row0H + row1H;
  const gridRight = gridLeft + 2 * colW;
  const gridBottom = gridTop + gridH;

  const parts: string[] = [];
  // Quadrant tints (faint, redundant with position/headers — not meaning-by-colour).
  parts.push(
    `<rect x="${gridLeft}" y="${gridTop}" width="${2 * colW}" height="${row0H}" fill="#f3f7f3" />`,
    `<rect x="${gridLeft}" y="${gridTop + row0H}" width="${2 * colW}" height="${row1H}" fill="#faf4f2" />`,
  );
  // Grid border + dividing cross.
  parts.push(
    `<rect x="${gridLeft}" y="${gridTop}" width="${2 * colW}" height="${gridH}" fill="none" stroke="#000" stroke-width="2" />`,
    `<line x1="${gridLeft + colW}" y1="${gridTop}" x2="${gridLeft + colW}" y2="${gridBottom}" stroke="#000" stroke-width="1.5" />`,
    `<line x1="${gridLeft}" y1="${gridTop + row0H}" x2="${gridRight}" y2="${gridTop + row0H}" stroke="#000" stroke-width="1.5" />`,
  );
  // Column headers.
  colHeaders.forEach((h, c) => {
    parts.push(
      `<text x="${gridLeft + c * colW + colW / 2}" y="${colHdrY + 2}" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle">${esc(h)}</text>`,
    );
  });
  // Row headers (left margin, wrapped).
  rowHeaders.forEach((h, r) => {
    const cy = gridTop + (r === 0 ? 0 : row0H) + (r === 0 ? row0H : row1H) / 2;
    parts.push(
      wrapLabel(h, gridLeft / 2 + 2, cy, {
        size: 12,
        weight: 700,
        maxWidth: leftHdr - 12,
        maxLines: 2,
      }),
    );
  });

  // Items per quadrant — free haloed labels, stacked.
  const altQ: string[] = [];
  for (const q of QUAD) {
    const items = itemsIn(q.key);
    const cellX = gridLeft + q.col * colW;
    const cellY = gridTop + (q.row === 0 ? 0 : row0H);
    items.forEach((n, i) => {
      const y = cellY + itemTopPad + i * itemH;
      const name = getText(n.label, layer, lang);
      parts.push(
        `<text data-el="nodelabel:${esc(n.id)}" x="${cellX + colW / 2}" y="${y}" font-family="sans-serif" font-size="11" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke"${textWidth(name, 11) > colW - 18 ? ` textLength="${colW - 18}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(name)}</text>`,
      );
    });
    const colWord = q.col === 0 ? 'changing' : 'staying';
    const rowWord = q.row === 0 ? 'benefits' : 'costs';
    altQ.push(
      `${rowWord} of ${colWord}: ${items.map((n) => getText(n.label, layer, lang)).join(', ') || 'none'}`,
    );
  }

  let h = gridBottom + 20;
  parts.push(
    chromeLine(
      'Use when genuinely weighing both sides — dwelling on reasons to stay can deepen ambivalence (MI-3), so it is not a persuasion tool.',
      gridLeft,
      h,
      W,
      { size: 10, fill: '#333' },
    ),
  );
  h += 15;
  if (model.meta.disclaimer) {
    parts.push(chromeLine(model.meta.disclaimer, gridLeft, h, W, { size: 10, fill: '#333' }));
    h += 14;
  }
  const height = h + 6;

  const altText =
    `Decisional balance 2×2${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Columns: making the change vs staying the same; rows: benefits vs costs. ${altQ.join('; ')}.`;

  const title = model.meta.title
    ? `<text x="${gridLeft}" y="26" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Decisional balance')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${W}" height="${height}" fill="#fff" />` +
    title +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

/**
 * Secure base & safe haven (REQ-NEW-DIAGRAM-TYPES, ADR-0036) — a GENERIC attachment teaching graphic
 * (Bowlby's secure base; Ainsworth's safe haven): a trusted caregiver is both somewhere safe to go
 * out FROM (supporting exploration) and somewhere safe to come BACK to (offering comfort). This is
 * deliberately NOT a reproduction of the trademarked Circle of Security® programme — generic
 * attachment-care language, an abstract cradle (not the CoS hands graphic), and an explicit
 * "graphic ≠ programme" disclaimer. Each node is placed by `stereotype`: `explore` (secure-base
 * supports, top), `comfort` (safe-haven offers, bottom), `base` (the caregiver, at the foot). Items
 * are free haloed labels in rows (`separate1D`); the ring + cycle arrows + cradle are decoration.
 * Edge-free + no schema growth; monochrome; alt-text reads both halves and the caregiver.
 */
export function renderSecureBase(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const W = SECURE_W;
  const cx = Math.round(W / 2);
  const titleH = model.meta.title ? 34 : 12;
  const R = 175;
  const cy = titleH + 18 + R;

  const inZone = (k: string): typeof model.nodes =>
    model.nodes.filter((n) => (n.stereotype ?? '') === k);
  const exploreNeeds = inZone('explore');
  const comfortNeeds = inZone('comfort');
  const base = inZone('base');

  const deco: string[] = [];
  const body: string[] = [];

  deco.push(
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fbfcfb" stroke="#666" stroke-width="2" />`,
    `<circle cx="${cx}" cy="${cy - R}" r="6" fill="#000" />`,
    // Cycle: up the right (out to explore), down the left (back for comfort).
    `<path d="M ${r1(cx + 0.55 * R)},${r1(cy + 0.62 * R)} Q ${cx + R + 8},${cy} ${r1(cx + 0.55 * R)},${r1(cy - 0.62 * R)}" fill="none" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)" />`,
    `<path d="M ${r1(cx - 0.55 * R)},${r1(cy - 0.62 * R)} Q ${cx - R - 8},${cy} ${r1(cx - 0.55 * R)},${r1(cy + 0.62 * R)}" fill="none" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)" />`,
    fitText('SECURE BASE — support me going out to explore', cx, cy - R + 34, {
      size: 12,
      weight: 700,
      anchor: 'middle',
      maxWidth: 2 * R - 24,
      halo: 4,
    }),
    fitText('SAFE HAVEN — welcome me back for comfort', cx, cy + R - 20, {
      size: 12,
      weight: 700,
      anchor: 'middle',
      maxWidth: 2 * R - 24,
      halo: 4,
    }),
  );

  const layRow = (items: typeof model.nodes, y: number): void => {
    if (!items.length) return;
    const size = 11;
    const left = 72;
    const avail = W - 2 * left;
    const spans = items.map((n, i) => ({
      center: left + (avail * (i + 0.5)) / items.length,
      half: textWidth(getText(n.label, layer, lang), size) / 2 + 8,
    }));
    const centers = separate1D(spans, 14);
    items.forEach((n, i) => {
      body.push(
        `<text data-el="nodelabel:${esc(n.id)}" x="${r1(centers[i])}" y="${y}" font-family="sans-serif" font-size="${size}" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(getText(n.label, layer, lang))}</text>`,
      );
    });
  };
  layRow(exploreNeeds, cy - R + 72);
  layRow(comfortNeeds, cy + R - 54);

  // Caregiver base + an abstract cradle (NOT the trademarked hands graphic).
  const baseY = cy + R + 34;
  deco.push(
    `<path d="M ${cx - 84},${baseY + 8} Q ${cx},${baseY + 42} ${cx + 84},${baseY + 8}" fill="none" stroke="#8a6d3b" stroke-width="2.5" />`,
  );
  base.forEach((n, i) => {
    body.push(
      `<text data-el="nodelabel:${esc(n.id)}" x="${cx}" y="${baseY + i * 22}" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle" stroke="#fff" stroke-width="3.5" paint-order="stroke">${esc(getText(n.label, layer, lang))}</text>`,
    );
  });

  let h = baseY + Math.max(1, base.length) * 22 + 30;
  body.push(
    chromeLine(
      'A trusted caregiver is both — somewhere safe to go FROM, and somewhere safe to come BACK to.',
      20,
      h,
      W,
      { size: 10, fill: '#333' },
    ),
  );
  h += 15;
  if (model.meta.disclaimer) {
    body.push(chromeLine(model.meta.disclaimer, 20, h, W, { size: 10, fill: '#333' }));
    h += 14;
  }
  const height = h + 6;

  const altText =
    `Secure base & safe haven${model.meta.title ? `: ${model.meta.title}` : ''} (a generic attachment graphic, not the trademarked Circle of Security programme). ` +
    `A trusted caregiver is a secure base to explore from and a safe haven to return to. ` +
    `Secure base supports: ${exploreNeeds.map((n) => getText(n.label, layer, lang)).join(', ') || '—'}. ` +
    `Safe haven offers: ${comfortNeeds.map((n) => getText(n.label, layer, lang)).join(', ') || '—'}. ` +
    `Caregiver: ${base.map((n) => getText(n.label, layer, lang)).join(', ') || '—'}.`;

  const title = model.meta.title
    ? `<text x="20" y="26" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Secure base & safe haven')}</title><desc>${esc(altText)}</desc>` +
    `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>` +
    `<rect x="0" y="0" width="${W}" height="${height}" fill="#fff" />` +
    title +
    deco.join('') +
    body.join('') +
    '</svg>';

  return { svg, altText };
}
