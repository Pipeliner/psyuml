/**
 * @psyuml/render — model → SVG (M1: the State Map, spec §E.1).
 *
 * SVG-first and accessibility-first (spec §D): monochrome by default, every band
 * uses a pattern (not hue), and every render emits a plain-language text summary +
 * aria-label. Color, when enabled, is purely redundant.
 *
 * Traceability: REQ-NOTATION, REQ-ACCESSIBILITY, REQ-EPISTEMIC-STATUS.
 */
import { getText, parseModel, schoolClaims, type PsyumlModel } from '@psyuml/model';
import { diffModels, type Layer, type ModelDiff } from '@psyuml/diff';
import { CHAR_W, separate1D, textWidth } from './layout';

type MBand = PsyumlModel['bands'][number];
type MNode = PsyumlModel['nodes'][number];

export interface RenderOptions {
  layer?: 'clinician' | 'client';
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

const WIDTH = 680;
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
}

const elAttr = (dataEl?: string): string => (dataEl ? ` data-el="${esc(dataEl)}"` : '');

/**
 * Emit a `<text>` that *compresses* into `maxWidth` when the label would overflow
 * (`textLength` + `spacingAndGlyphs`), so a long label never spills out of its box or off
 * the frame — keeping every label legible and inside the diagram (§D). Short labels are
 * emitted unchanged (no `textLength`), so they render identically to before.
 */
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
  return `<text x="${r1(x)}" y="${r1(y)}" font-family="sans-serif" font-size="${size}"${a}${w}${f}${elAttr(o.dataEl)}${fit}>${esc(s)}</text>`;
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
  const size = o.size ?? 12;
  const maxLines = o.maxLines ?? 2;
  const lh = o.lineHeight ?? size + 3;
  const anchor = o.anchor ?? 'middle';
  const maxChars = Math.max(4, Math.floor((o.maxWidth ?? Infinity) / (size * CHAR_W)));
  const lines = o.maxWidth ? wrapLines(s, maxChars, maxLines) : [s];
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
  return `<text text-anchor="${anchor}" font-family="sans-serif" font-size="${size}"${w}${f}${elAttr(o.dataEl)}>${tspans}</text>`;
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
  const labelW = (e: MEdge): number => textWidth(edgeText(e), 11);
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
  const width = innerR + Math.max(40, rightGutter);
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
    parts.push(
      `<path d="M ${r1(sx)},${s.cy} H ${r1(lane)} V ${t.cy} H ${r1(ex)}" fill="none" stroke="#000" stroke-width="2"${dash} marker-end="url(#arrow)" />`,
    );
    const txt = edgeText(e);
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
      `<text data-el="edgelabel:${esc(el.id)}" x="${r1(el.x)}" y="${r1(el.y)}" font-family="sans-serif" font-size="11" text-anchor="${el.anchor}" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(el.text)}</text>`,
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
  const PARTS_W2 = Math.max(PARTS_W, 2 * (orbitR + margin), 2 * (exileRx + 24));
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
  const partsH = Math.max(PARTS_H + titleH, exileY + radialDown + 60);

  const parts: string[] = [];

  // Containment orbit around the exiles (a container; sized to hold the spread exiles).
  if (exiles.length) {
    parts.push(
      `<ellipse data-el="band:containment" cx="${r1(cx)}" cy="${exileY}" rx="${r1(exileRx)}" ry="48" fill="none" stroke="#000" stroke-width="2" />`,
    );
  }

  // Protect edges (containment): bowed dotted lines routed around the Self
  for (const e of model.edges) {
    if (e.kind !== 'containment') continue;
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) continue;
    const mx = r1((a.x + b.x) / 2 + (a.x < cx ? -70 : 70));
    const my = r1((a.y + b.y) / 2);
    parts.push(
      `<path d="M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="3 4" opacity="0.7" />`,
    );
    // Show the relationship word (e.g. "protects" / "soothes" / "numbs") on the curve, with a
    // white halo so it stays legible over the dotted line — distinct protections shouldn't all
    // look identical (eval finding). Placed near the curve's control point.
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${mx}" y="${r1((my + b.y) / 2)}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(lbl)}</text>`,
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
    parts.push(`<path d="${d}" fill="none" stroke="#000" stroke-width="1.5" />`);
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((a.x + b.x) / 2)}" y="${r1((a.y + b.y) / 2 - 4)}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(lbl)}</text>`,
      );
    }
  }

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

  // Nodes
  for (const n of model.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const name = getText(n.label, layer, lang);
    if (n.kind === 'self') {
      parts.push(
        `<circle data-el="node:${esc(n.id)}" cx="${p.x}" cy="${p.y}" r="30" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="23" fill="none" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#000" />`,
        `<text data-el="nodelabel:${esc(n.id)}" x="${p.x}" y="${p.y + 50}" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">${esc(name)}</text>`,
      );
      continue;
    }
    if (n.stereotype) {
      const roleTerm = options.roleLabels?.[n.stereotype] ?? n.stereotype;
      parts.push(
        `<text data-el="nodelabel:${esc(n.id)}" x="${p.x}" y="${p.y - nodeR - 5}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#333">${esc(roleTerm)}</text>`,
      );
    }
    parts.push(
      `<circle data-el="node:${esc(n.id)}" cx="${p.x}" cy="${p.y}" r="${nodeR}" fill="#fff" stroke="#000" stroke-width="2" />`,
      wrapLabel(name, p.x, p.y + 3, {
        size: 10,
        anchor: 'middle',
        maxWidth: 110,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
    const claims = schoolClaims(n.properties.provenance);
    if (claims.length > 1) {
      // Co-present opposed origin-claims (§G.2): mark the disagreement on the element itself
      // ("⚖ … vs …"), don't merge it into one bland slash-list. Matches the validator's
      // `provenance.node-mixed-school` and the alt-text below.
      parts.push(
        wrapLabel(`⚖ ${claims.join(' vs ')}`, p.x, p.y + nodeR + 13, {
          size: 8,
          anchor: 'middle',
          maxWidth: 124,
          maxLines: 2,
          fill: '#333',
          dataEl: `nodelabel:${n.id}`,
        }),
      );
    } else if (n.properties.provenance?.length) {
      parts.push(
        `<text data-el="nodelabel:${esc(n.id)}" x="${p.x}" y="${p.y + nodeR + 13}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555">${esc(n.properties.provenance.join(' / '))}</text>`,
      );
    }
  }

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
    (contested.length
      ? ` Origins disagree on: ${contested.join('; ')} — both claims are shown, not merged.`
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

/**
 * Break cycles by a DFS from the roots, then longest-path layer the FORWARD edges only.
 * A realistic crisis plan loops back ("still not safe → go back to the crisis step"); that
 * cycle leaves every node on it (and downstream of it) with in-degree>0 forever, so a plain
 * Kahn pass never dequeues them and they all collapse onto depth 0 (one overlapping row).
 * Classifying back-edges (those reaching a node currently on the DFS stack) and layering the
 * rest gives every node a sensible rank. Standard layered-graph cycle handling.
 *
 * Returns `{ depth, forward }`: each node's longest-path depth and the set of non-back edges.
 */
function layerWithCycleBreak(
  nodeIds: string[],
  edges: { source: string; target: string }[],
): { depth: Map<string, number>; forward: Set<{ source: string; target: string }> } {
  const adj = new Map<string, { source: string; target: string }[]>(nodeIds.map((id) => [id, []]));
  const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    adj.get(e.source)?.push(e);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  // DFS to find back-edges (target currently on the recursion stack).
  const back = new Set<{ source: string; target: string }>();
  const state = new Map<string, 0 | 1 | 2>(); // 0 unseen, 1 on-stack, 2 done
  const visit = (start: string): void => {
    // Iterative DFS (avoids deep recursion on long crisis chains).
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    state.set(start, 1);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const out = adj.get(frame.id) ?? [];
      if (frame.i < out.length) {
        const e = out[frame.i];
        frame.i += 1;
        const s = state.get(e.target) ?? 0;
        if (s === 1) {
          back.add(e); // reaches a node still on the stack → cycle edge
        } else if (s === 0) {
          state.set(e.target, 1);
          stack.push({ id: e.target, i: 0 });
        }
      } else {
        state.set(frame.id, 2);
        stack.pop();
      }
    }
  };
  // Start from in-degree-0 roots; if there are none (all in a cycle), start anywhere.
  const roots = nodeIds.filter((id) => (indeg.get(id) ?? 0) === 0);
  for (const id of roots.length ? roots : nodeIds.slice(0, 1)) {
    if ((state.get(id) ?? 0) === 0) visit(id);
  }
  // Any node not reached from a root (a separate component) still needs a depth.
  for (const id of nodeIds) if ((state.get(id) ?? 0) === 0) visit(id);

  // Longest-path layering on the forward edges only (now a DAG).
  const forward = new Set(
    edges.filter((e) => !back.has(e) && adj.has(e.source) && adj.has(e.target)),
  );
  const fAdj = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const fIndeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const e of forward) {
    fAdj.get(e.source)?.push(e.target);
    fIndeg.set(e.target, (fIndeg.get(e.target) ?? 0) + 1);
  }
  const depth = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const work = new Map(fIndeg);
  const queue = nodeIds.filter((id) => (fIndeg.get(id) ?? 0) === 0);
  while (queue.length) {
    const id = queue.shift() as string;
    for (const t of fAdj.get(id) ?? []) {
      depth.set(t, Math.max(depth.get(t) ?? 0, (depth.get(id) ?? 0) + 1));
      work.set(t, (work.get(t) ?? 0) - 1);
      if ((work.get(t) ?? 0) === 0) queue.push(t);
    }
  }
  return { depth, forward };
}

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

  // Cycle-aware longest-path layering (ADR-0010): break back-edges first so a plan that
  // loops back doesn't collapse the cycle (and everything below it) onto one overlapping row.
  const { depth } = layerWithCycleBreak(
    nodes.map((n) => n.id),
    edges,
  );
  const layers = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const arr = layers.get(d);
    if (arr) arr.push(n.id);
    else layers.set(d, [n.id]);
  }
  let maxDepth = 0;
  for (const d of layers.keys()) maxDepth = Math.max(maxDepth, d);

  // Per-node half-width on the x-axis. The box is DNODE_W wide; the crisis node also carries a
  // wrapped contact line (up to DEC_CRISIS_W) below it, so it claims that half-width too — this
  // is what `separate1D` uses to guarantee neither the boxes NOR the crisis text touch a sibling.
  const halfW = (id: string): number => {
    const n = nodes.find((x) => x.id === id);
    return Math.max(DNODE_W / 2, n?.stereotype === 'crisis' ? DEC_CRISIS_W / 2 : 0);
  };

  // Vertical room each depth needs BELOW its box centre. A crisis node also carries up to 3
  // wrapped contact lines, so its row must be taller — accumulate row Y's so the next row clears
  // the crisis text (cross-layer separation, ADR-0012), instead of a fixed DLAYER_GAP.
  const hasCrisis = (ids: string[]): boolean =>
    ids.some((id) => nodes.find((x) => x.id === id)?.stereotype === 'crisis');
  const rowY = new Map<number, number>();
  let yCursor = DEC_TOP;
  for (let d = 0; d <= maxDepth; d += 1) {
    rowY.set(d, yCursor);
    const below = hasCrisis(layers.get(d) ?? []) ? DNODE_H / 2 + 13 + 3 * 12 : DNODE_H / 2;
    yCursor += Math.max(DLAYER_GAP, below + DNODE_H / 2 + 24);
  }

  // Grow the drawing width to fit the widest layer, then spread each layer's siblings with
  // `separate1D` (VPSC 1-D core, ADR-0012) so sized slots never collide. The frame never shrinks
  // below DEC_W (small charts keep their familiar look). Content is laid out from x=0; the
  // viewBox is fit below. A single deterministic pass: place evenly, separate, measure the
  // widest separated extent, then re-centre every layer within that final width.
  let widest = DEC_W;
  for (const ids of layers.values()) {
    let span = DNODE_GAP;
    for (const id of ids) span += 2 * halfW(id) + DNODE_GAP;
    widest = Math.max(widest, span);
  }
  const pos = new Map<string, { x: number; y: number }>();
  let contentW = widest;
  for (const [d, ids] of layers) {
    const slot = widest / (ids.length + 1);
    const centers = separate1D(
      ids.map((id, i) => ({ center: slot * (i + 1), half: halfW(id) })),
      DNODE_GAP,
    );
    // separate1D centres the block on its mean; shift the whole row so its left edge clears the
    // margin, and track the true content width so nothing pokes past the frame.
    const leftEdge = Math.min(...ids.map((id, i) => centers[i] - halfW(id)));
    const shift = leftEdge < DEC_PAD ? DEC_PAD - leftEdge : 0;
    const y = rowY.get(d) ?? DEC_TOP + d * DLAYER_GAP;
    ids.forEach((id, i) => pos.set(id, { x: r1(centers[i] + shift), y }));
    const rightEdge = Math.max(...ids.map((id, i) => centers[i] + shift + halfW(id)));
    contentW = Math.max(contentW, rightEdge + DEC_PAD);
  }

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
  for (const e of edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const up = t.y <= s.y; // back-edge / same-row link
    const sy = up ? s.y - DNODE_H / 2 : s.y + DNODE_H / 2;
    const ty = up ? t.y + DNODE_H / 2 : t.y - DNODE_H / 2;
    parts.push(
      `<path d="M ${s.x},${sy} L ${t.x},${ty}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      branchLabels.push({
        id: e.id,
        text: lbl,
        x: s.x + (t.x - s.x) * 0.5,
        y: (sy + ty) / 2 + 4,
      });
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
      parts.push(
        wrapLabel(crisis, p.x, p.y + DNODE_H / 2 + 13, {
          size: 9,
          anchor: 'middle',
          maxWidth: DEC_CRISIS_W,
          maxLines: 3,
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
    parts.push(
      `<text x="${hx}" y="58" font-family="sans-serif" font-size="13" font-weight="700">${esc(getText(cat.label, layer, lang))}</text>`,
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
    parts.push(
      `<text x="16" y="${fy + 16}" font-family="sans-serif" font-size="10" fill="#333">${esc(model.meta.disclaimer)}</text>`,
    );
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

/** Render a Process / Loop map (spec §E.4): a maintaining cycle on a ring, with
 * reciprocal (double-headed) links, a reinforcing/balancing centre badge, and exits. */
export function renderLoopMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
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

  // Edges (chords, endpoints pulled to the node boundary)
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
    parts.push(
      `<path d="M ${x1},${y1} L ${x2},${y2}" fill="none" stroke="#000" stroke-width="2"${dash}${markerStart} marker-end="url(#arrow)" />`,
    );
    const lblSrc = e.trigger ?? e.label;
    let txt = lblSrc ? getText(lblSrc, layer, lang) : '';
    if (isExit) txt = txt ? `${txt} (EXIT)` : 'EXIT';
    if (txt) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((x1 + x2) / 2)}" y="${r1((y1 + y2) / 2) - 3}" font-family="sans-serif" font-size="10" text-anchor="middle">${esc(txt)}</text>`,
      );
    }
  }

  // Reinforcing / balancing loop badge in the centre
  const loop = model.edges.find((e) => e.loop);
  if (loop) {
    let sx = 0;
    let sy = 0;
    for (const p of pos.values()) {
      sx += p.x;
      sy += p.y;
    }
    const bx = r1(sx / pos.size);
    const by = r1(sy / pos.size);
    parts.push(
      `<circle cx="${bx}" cy="${by}" r="18" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${bx}" y="${by + 5}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700">${esc(loop.loop ?? '')}</text>`,
    );
  }

  // Nodes (resources = diamonds, CAT observing-eye = eye glyph, others = rounded rects)
  for (const node of nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    let labelDy = 4;
    if (node.kind === 'resource') {
      parts.push(
        `<polygon data-el="node:${esc(node.id)}" points="${p.x},${p.y - LNODE_H / 2} ${p.x + LNODE_W / 2},${p.y} ${p.x},${p.y + LNODE_H / 2} ${p.x - LNODE_W / 2},${p.y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      );
    } else if (node.stereotype === 'observing-eye') {
      // CAT observing eye/I — the self-reflective stance that watches the trap (spec §B).
      parts.push(
        `<ellipse data-el="node:${esc(node.id)}" cx="${p.x}" cy="${p.y}" rx="26" ry="15" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#000" />`,
      );
      labelDy = 30;
    } else {
      parts.push(
        `<rect data-el="node:${esc(node.id)}" x="${p.x - LNODE_W / 2}" y="${p.y - LNODE_H / 2}" width="${LNODE_W}" height="${LNODE_H}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="2" />`,
      );
    }
    parts.push(
      wrapLabel(getText(node.label, layer, lang), p.x, p.y + labelDy, {
        size: 11,
        anchor: 'middle',
        maxWidth: LNODE_W - 16,
        dataEl: `nodelabel:${node.id}`,
      }),
    );
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
  const altText =
    `Maintaining loop${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Links: ${links.join('; ') || 'none'}. Ways out: ${exits.join('; ') || 'none'}.`;

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
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = LOOP_W;
    maxY = 200;
  }
  const fx = r1(minX - pad);
  const fy = r1(minY - pad - titleH);
  const fw = r1(maxX + pad - fx);
  const fh = r1(maxY + pad - fy);

  const titleText = model.meta.title
    ? `<text x="${r1(fx + 8)}" y="${r1(fy + 20)}" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
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
      `<path d="M ${r1(s.x + boxW / 2)},${s.y} L ${r1(t.x - boxW / 2)},${t.y}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
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

  const TOP = 72;
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
      `<text x="${laneX(i)}" y="28" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700">${esc(getText(l.label, layer, lang))}</text>`,
    );
    if (i > 0) {
      parts.push(
        `<line x1="${r1(i * laneW)}" y1="38" x2="${r1(i * laneW)}" y2="${height - 10}" stroke="#ccc" stroke-width="1" stroke-dasharray="4 4" />`,
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
      `<path d="M ${s.x},${sy} L ${t.x},${ty}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        fitText(lbl, (s.x + t.x) / 2 + 4, (sy + ty) / 2, {
          size: 10,
          maxWidth: Math.max(40, laneW - 16),
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

  for (const e of model.edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    parts.push(
      `<path d="M ${s.x},${s.y} L ${t.x},${t.y}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
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
  const width = Math.max(560, maxX + 90);
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
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((s.x + t.x) / 2)}" y="${r1((s.y + t.y) / 2) - 4}" text-anchor="middle" font-family="sans-serif" font-size="9">${esc(lbl)}</text>`,
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
          dataEl: `nodelabel:${n.id}`,
        }) +
        `</g>`,
    );
  }

  const ly = height - 26;
  parts.push(
    `<text x="12" y="${ly}" font-family="sans-serif" font-size="10">□ male · ○ female · ◇ other · ▭ system · ═ fused · zigzag = conflict · dashed = distant · ‖ cutoff · ⋯○ = origin (nested)</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(
      `<text x="12" y="${ly + 14}" font-family="sans-serif" font-size="9" fill="#333">${esc(model.meta.disclaimer)}</text>`,
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
    ? `<text x="12" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
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
  const width = Math.max(560, maxX + 120);
  const height = Math.max(300, maxY + 80) + 40;

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
      `<path d="M ${x1},${y1} L ${x2},${y2}" fill="none" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((x1 + x2) / 2)}" y="${r1((y1 + y2) / 2) - 3}" text-anchor="middle" font-family="sans-serif" font-size="9">${esc(lbl)}</text>`,
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
        `<text x="${p.x}" y="${r1(p.y - r - 6)}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700">↑ grow</text>`,
      );
    }
    const st = n.stereotype ?? '';
    if (st.includes('child') || st.includes('vulnerable')) {
      const ty = p.y - r - 4;
      parts.push(
        `<polygon points="${p.x},${r1(ty - 9)} ${p.x + 8},${r1(ty + 3)} ${p.x - 8},${r1(ty + 3)}" fill="#fff" stroke="#000" stroke-width="1.5" />`,
      );
    }
    parts.push(
      wrapLabel(getText(n.label, layer, lang), p.x, p.y + 3, {
        size: 10,
        anchor: 'middle',
        maxWidth: 120,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
    const dom = n.properties.dominance;
    if (dom !== undefined) {
      parts.push(
        `<text data-el="nodelabel:${esc(n.id)}" x="${p.x}" y="${r1(p.y + r + 12)}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#555">dom ${dom.toFixed(2)}</text>`,
      );
    }
  }

  const ly = height - 24;
  parts.push(
    `<text x="12" y="${ly}" font-family="sans-serif" font-size="10">Circle size = mode dominance (number shown). Goal: grow the Healthy Adult, shrink maladaptive modes.</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(
      `<text x="12" y="${ly + 14}" font-family="sans-serif" font-size="9" fill="#333">${esc(model.meta.disclaimer)}</text>`,
    );
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
    // legible, no truncation, and the natural-width box clears the neighbour (ADR-0012). Floor the
    // size so rounding never nudges the natural width back over the cap.
    const fit =
      textWidth(text, 11) > cap
        ? Math.max(6, Math.floor((cap / (text.length * CHAR_W)) * 10) / 10)
        : 11;
    parts.push(
      `<circle data-el="node:${esc(n.id)}" cx="${p.x}" cy="${p.y}" r="${r1(r)}" fill="#000" fill-opacity="0.15" stroke="#000" stroke-width="1.5" />`,
      fitText(text, onLeft ? leftX : rightX, p.y + 4, {
        size: fit,
        anchor: onLeft ? 'end' : 'start',
        maxWidth: cap,
        dataEl: `nodelabel:${n.id}`,
      }),
    );
  });

  const fy = BODY_H - 30;
  parts.push(
    `<text x="12" y="${fy}" font-family="sans-serif" font-size="10">Marker size = intensity (number shown). Body sensations are meaningful but not self-explanatory — pace and titrate.</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(
      `<text x="12" y="${fy + 14}" font-family="sans-serif" font-size="9" fill="#333">${esc(model.meta.disclaimer)}</text>`,
    );
  }

  const altText =
    `Body map${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Sensations: ${model.nodes.map((n) => `${getText(n.label, layer, lang)} (intensity ${(n.properties.intensity ?? 0.5).toFixed(1)})`).join(', ') || 'none'}. ` +
    `Pace and titrate.`;

  const titleText = model.meta.title
    ? `<text x="12" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BODY_W} ${BODY_H}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Body map')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${BODY_W}" height="${BODY_H}" fill="#fff" />` +
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
  const width = Math.max(TT_W, maxX + TT_NODE_W / 2 + 20);
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
      `<line x1="${r1(s.x + ux * TT_SHORT)}" y1="${r1(s.y + uy * TT_SHORT)}" x2="${r1(t.x - ux * TT_SHORT)}" y2="${r1(t.y - uy * TT_SHORT)}" stroke="#000" stroke-width="1.5"${dotted} />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text data-el="edgelabel:${esc(e.id)}" x="${r1((s.x + t.x) / 2)}" y="${r1((s.y + t.y) / 2) - 3}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#333">${esc(lbl)}</text>`,
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
