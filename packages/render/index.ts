/**
 * @psyuml/render — model → SVG (M1: the State Map, spec §E.1).
 *
 * SVG-first and accessibility-first (spec §D): monochrome by default, every band
 * uses a pattern (not hue), and every render emits a plain-language text summary +
 * aria-label. Color, when enabled, is purely redundant.
 *
 * Traceability: REQ-NOTATION, REQ-ACCESSIBILITY, REQ-EPISTEMIC-STATUS.
 */
import { getText, type PsyumlModel } from '@psyuml/model';

type MBand = PsyumlModel['bands'][number];
type MNode = PsyumlModel['nodes'][number];

export interface RenderOptions {
  layer?: 'clinician' | 'client';
  lang?: string;
  /** Pure black-on-white when true (default). When false, adds redundant band hues. */
  monochrome?: boolean;
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
const RIGHT_LANE = WIDTH - 40;
const LEFT_LANE = 40;
/** Okabe–Ito hues (redundant with pattern + label): safe, mobilized, shutdown. */
const BAND_HUE = ['#009E73', '#E69F00', '#D55E00'];

const esc = (s: string): string =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );

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
  const height = TITLE_H + PAD_TOP + bands.length * (BAND_H + BAND_GAP) + LEGEND_H;

  const bandTop = new Map<string, number>();
  bands.forEach((b, i) => bandTop.set(b.id, TITLE_H + PAD_TOP + i * (BAND_H + BAND_GAP)));

  const nodesByBand = new Map<string, MNode[]>();
  for (const n of model.nodes) {
    const key = n.bandId ?? '_free';
    const arr = nodesByBand.get(key);
    if (arr) arr.push(n);
    else nodesByBand.set(key, [n]);
  }

  const center = new Map<string, { cx: number; cy: number }>();
  for (const b of bands) {
    const list = nodesByBand.get(b.id) ?? [];
    const top = bandTop.get(b.id) ?? 0;
    list.forEach((n, idx) => {
      center.set(n.id, {
        cx: 20 + ((idx + 1) / (list.length + 1)) * (WIDTH - 40),
        cy: top + BAND_H / 2,
      });
    });
  }

  const nodeName = (id: string): string => {
    const n = model.nodes.find((x) => x.id === id);
    return n ? getText(n.label, layer, lang) : id;
  };

  const parts: string[] = [];

  // Bands
  bands.forEach((b, i) => {
    const top = bandTop.get(b.id) ?? 0;
    const hue = !monochrome ? BAND_HUE[i % BAND_HUE.length] : '#ffffff';
    parts.push(
      `<rect x="20" y="${top}" width="${WIDTH - 40}" height="${BAND_H}" fill="${hue}" fill-opacity="${monochrome ? 1 : 0.14}" stroke="#000" stroke-width="2" />`,
    );
    const pid = patternId(b.pattern);
    if (pid) {
      parts.push(
        `<rect x="20" y="${top}" width="${WIDTH - 40}" height="${BAND_H}" fill="url(#${pid})" stroke="none" />`,
      );
    }
    parts.push(
      `<text x="28" y="${top + 18}" font-family="sans-serif" font-size="13" font-weight="700">${esc(getText(b.label, layer, lang))}</text>`,
    );
  });

  // Edges (orthogonal lanes: transitions route right, exits route left + dashed)
  for (const e of model.edges) {
    const s = center.get(e.source);
    const t = center.get(e.target);
    if (!s || !t) continue;
    const isExit = e.kind === 'exit';
    const lane = isExit ? LEFT_LANE : RIGHT_LANE;
    const sx = isExit ? s.cx - NODE_W / 2 : s.cx + NODE_W / 2;
    const ex = isExit ? t.cx - NODE_W / 2 : t.cx + NODE_W / 2;
    const dash = isExit ? ' stroke-dasharray="6 5"' : '';
    parts.push(
      `<path d="M ${sx},${s.cy} H ${lane} V ${t.cy} H ${ex}" fill="none" stroke="#000" stroke-width="2"${dash} marker-end="url(#arrow)" />`,
    );
    const labelSource = e.trigger ?? e.label;
    let txt = labelSource ? getText(labelSource, layer, lang) : '';
    if (isExit) txt = txt ? `${txt} (EXIT)` : 'EXIT';
    if (txt) {
      const midY = (s.cy + t.cy) / 2;
      const lx = isExit ? LEFT_LANE + 8 : RIGHT_LANE - 8;
      const anchor = isExit ? 'start' : 'end';
      parts.push(
        `<text x="${lx}" y="${midY - 4}" font-family="sans-serif" font-size="11" text-anchor="${anchor}">${esc(txt)}</text>`,
      );
    }
  }

  // Nodes (states = rounded rectangles)
  for (const n of model.nodes) {
    const c = center.get(n.id);
    if (!c) continue;
    parts.push(
      `<rect x="${c.cx - NODE_W / 2}" y="${c.cy - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="2" />`,
    );
    parts.push(
      `<text x="${c.cx}" y="${c.cy + 4}" font-family="sans-serif" font-size="12" text-anchor="middle">${esc(getText(n.label, layer, lang))}</text>`,
    );
  }

  // Legend
  const ly = height - LEGEND_H + 20;
  parts.push(
    `<line x1="28" y1="${ly}" x2="60" y2="${ly}" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    `<text x="68" y="${ly + 4}" font-family="sans-serif" font-size="11">transition (what leads here)</text>`,
    `<line x1="28" y1="${ly + 20}" x2="60" y2="${ly + 20}" stroke="#000" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#arrow)" />`,
    `<text x="68" y="${ly + 24}" font-family="sans-serif" font-size="11">exit — a way out</text>`,
    `<text x="320" y="${ly + 4}" font-family="sans-serif" font-size="11">Bands are ordered top → bottom; patterns (not colour) mark the zones.</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(
      `<text x="320" y="${ly + 24}" font-family="sans-serif" font-size="10" fill="#333">${esc(model.meta.disclaimer)}</text>`,
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
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'State map')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${WIDTH}" height="${height}" fill="#fff" />` +
    titleText +
    parts.join('') +
    '</svg>';

  return { svg, altText };
}

const PARTS_W = 680;
const PARTS_H = 470;
const r1 = (v: number): number => Math.round(v * 10) / 10;

/** Render a Parts / Agents Map (spec §E.2): Self centred, protectors orbiting,
 * exiles in a containment orbit behind a dissociative barrier. */
export function renderPartsMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';

  const cx = PARTS_W / 2;
  const cy = 175;
  const orbitR = 140;
  const nodeR = 34;

  const self = model.nodes.find((n) => n.kind === 'self');
  const exiles = model.nodes.filter((n) => n.stereotype === 'exile');
  const protectors = model.nodes.filter((n) => n.kind !== 'self' && n.stereotype !== 'exile');

  const pos = new Map<string, { x: number; y: number }>();
  if (self) pos.set(self.id, { x: cx, y: cy });
  protectors.forEach((p, i) => {
    const t = protectors.length === 1 ? 0.5 : i / (protectors.length - 1);
    const angle = ((200 + t * 140) * Math.PI) / 180;
    pos.set(p.id, { x: r1(cx + orbitR * Math.cos(angle)), y: r1(cy + orbitR * Math.sin(angle)) });
  });
  const exileY = cy + 170;
  exiles.forEach((e, i) => {
    const span = exiles.length === 1 ? 0 : (i / (exiles.length - 1) - 0.5) * 200;
    pos.set(e.id, { x: r1(cx + span), y: exileY });
  });

  const parts: string[] = [];

  // Containment orbit around the exiles
  if (exiles.length) {
    parts.push(
      `<ellipse cx="${cx}" cy="${exileY}" rx="130" ry="48" fill="none" stroke="#000" stroke-width="2" />`,
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
  }

  // Dissociative barrier (double bar) between Self and the exiles
  const barrier = model.edges.find((e) => e.kind === 'barrier');
  if (barrier && self && exiles.length) {
    const by = (cy + exileY) / 2;
    parts.push(
      `<line x1="${cx - 75}" y1="${by - 3}" x2="${cx + 75}" y2="${by - 3}" stroke="#000" stroke-width="2.5" />`,
      `<line x1="${cx - 75}" y1="${by + 3}" x2="${cx + 75}" y2="${by + 3}" stroke="#000" stroke-width="2.5" />`,
      `<text x="${cx}" y="${by - 8}" font-family="sans-serif" font-size="10" text-anchor="middle">dissociative barrier</text>`,
    );
  }

  // Nodes
  for (const n of model.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const name = getText(n.label, layer, lang);
    if (n.kind === 'self') {
      parts.push(
        `<circle cx="${p.x}" cy="${p.y}" r="30" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="23" fill="none" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#000" />`,
        `<text x="${p.x}" y="${p.y + 50}" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">${esc(name)}</text>`,
      );
      continue;
    }
    if (n.stereotype) {
      parts.push(
        `<text x="${p.x}" y="${p.y - nodeR - 5}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#333">${esc(n.stereotype)}</text>`,
      );
    }
    parts.push(
      `<circle cx="${p.x}" cy="${p.y}" r="${nodeR}" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${p.x}" y="${p.y + 3}" font-family="sans-serif" font-size="10" text-anchor="middle">${esc(name)}</text>`,
    );
    const prov = n.properties.provenance;
    if (prov && prov.length) {
      parts.push(
        `<text x="${p.x}" y="${p.y + nodeR + 13}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#555">${esc(prov.join(' / '))}</text>`,
      );
    }
  }

  // Legend
  parts.push(
    `<text x="20" y="${PARTS_H - 16}" font-family="sans-serif" font-size="11">◎ Self · ○ part · ( ) containment orbit · ═ dissociative barrier · dotted = protects</text>`,
  );
  if (model.meta.disclaimer) {
    parts.push(
      `<text x="20" y="${PARTS_H - 2}" font-family="sans-serif" font-size="10" fill="#333">${esc(model.meta.disclaimer)}</text>`,
    );
  }

  const protectorDesc = protectors.map(
    (p) => `${getText(p.label, layer, lang)}${p.stereotype ? ` (${p.stereotype})` : ''}`,
  );
  const exileDesc = exiles.map((e) => getText(e.label, layer, lang));
  const altText =
    `Parts map${model.meta.title ? `: ${model.meta.title}` : ''}. Self at the centre. ` +
    `Protectors around it: ${protectorDesc.join(', ') || 'none'}. ` +
    `Exile(s): ${exileDesc.join(', ') || 'none'}${barrier ? ', behind a dissociative barrier from Self' : ''}. ` +
    `Protectors guard the exile.`;

  const titleText = model.meta.title
    ? `<text x="20" y="23" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PARTS_W} ${PARTS_H}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Parts map')}</title><desc>${esc(altText)}</desc>` +
    `<rect x="0" y="0" width="${PARTS_W}" height="${PARTS_H}" fill="#fff" />` +
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

/** Shape by decision-chart stereotype: question = diamond, crisis = thick box, else rounded box. */
function decShape(stereotype: string | undefined, cx: number, cy: number): string {
  const hw = DNODE_W / 2;
  const hh = DNODE_H / 2;
  if (stereotype === 'question') {
    return `<polygon points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}" fill="#fff" stroke="#000" stroke-width="2" />`;
  }
  const sw = stereotype === 'crisis' ? 3.5 : 2;
  const rx = stereotype === 'crisis' ? 6 : 10;
  return `<rect x="${cx - hw}" y="${cy - hh}" width="${DNODE_W}" height="${DNODE_H}" rx="${rx}" ry="${rx}" fill="#fff" stroke="#000" stroke-width="${sw}" />`;
}

/** Render a Decision / Navigation (crisis) chart (spec §E.8): one decision per step,
 * top-down layered, with an ALWAYS-VISIBLE crisis-resources banner (UX-M4). */
export function renderDecisionChart(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
  model = withoutHidden(model);
  const layer = options.layer ?? 'clinician';
  const lang = options.lang ?? model.language ?? 'en';
  const nodes = model.nodes;
  const edges = model.edges;

  // Longest-path layering (Sugiyama-lite) via a Kahn topological pass.
  const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
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
  const layers = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const arr = layers.get(d);
    if (arr) arr.push(n.id);
    else layers.set(d, [n.id]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  let maxDepth = 0;
  for (const [d, ids] of layers) {
    maxDepth = Math.max(maxDepth, d);
    ids.forEach((id, i) =>
      pos.set(id, { x: r1((DEC_W * (i + 1)) / (ids.length + 1)), y: DEC_TOP + d * DLAYER_GAP }),
    );
  }
  const height = DEC_TOP + maxDepth * DLAYER_GAP + DNODE_H + DBANNER_H + 24;

  const nodeName = (id: string): string => {
    const n = nodes.find((x) => x.id === id);
    return n ? getText(n.label, layer, lang) : id;
  };

  const parts: string[] = [];

  // Edges (downward, with branch labels)
  for (const e of edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const sy = s.y + DNODE_H / 2;
    const ty = t.y - DNODE_H / 2;
    parts.push(
      `<path d="M ${s.x},${sy} L ${t.x},${ty}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#arrow)" />`,
    );
    const lbl = e.label ? getText(e.label, layer, lang) : '';
    if (lbl) {
      parts.push(
        `<text x="${r1((s.x + t.x) / 2 + 5)}" y="${r1((sy + ty) / 2)}" font-family="sans-serif" font-size="11" font-weight="700">${esc(lbl)}</text>`,
      );
    }
  }

  // Nodes
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const isCrisis = n.stereotype === 'crisis';
    const name = (isCrisis ? '! ' : '') + getText(n.label, layer, lang);
    parts.push(decShape(n.stereotype, p.x, p.y));
    parts.push(
      `<text x="${p.x}" y="${p.y + 4}" font-family="sans-serif" font-size="11" text-anchor="middle"${isCrisis ? ' font-weight="700"' : ''}>${esc(name)}</text>`,
    );
  }

  // Crisis-resources banner — ALWAYS visible (UX-M4)
  const crisis =
    model.meta.crisisResources ??
    'If you are in danger now, call your local emergency number or a crisis line.';
  const by = height - DBANNER_H;
  parts.push(
    `<rect x="0" y="${by}" width="${DEC_W}" height="${DBANNER_H}" fill="#fff" stroke="#000" stroke-width="2" />`,
    `<text x="14" y="${by + 19}" font-family="sans-serif" font-size="12" font-weight="700">Crisis resources (always available):</text>`,
    `<text x="14" y="${by + 37}" font-family="sans-serif" font-size="11">${esc(crisis)}</text>`,
  );

  const start = nodes.find((n) => (indeg.get(n.id) ?? 0) === 0);
  const steps = edges.map(
    (e) =>
      `from "${nodeName(e.source)}", ${e.label ? `if ${getText(e.label, layer, lang)} ` : ''}go to "${nodeName(e.target)}"`,
  );
  const altText =
    `Crisis navigation chart${model.meta.title ? `: ${model.meta.title}` : ''}. ` +
    `Start: "${start ? nodeName(start.id) : ''}". Steps: ${steps.join('; ')}. ` +
    `Crisis resources are always shown: ${crisis}`;

  const titleText = model.meta.title
    ? `<text x="20" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DEC_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Crisis chart')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${DEC_W}" height="${height}" fill="#fff" />` +
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
        `<polygon points="${dx},${y - 6} ${dx + 7},${y} ${dx},${y + 6} ${dx - 7},${y}" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<text x="${dx + 14}" y="${y + 4}" font-family="sans-serif" font-size="12">${esc(getText(it.label, layer, lang))}</text>`,
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

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, i) => {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    pos.set(node.id, { x: r1(cx + radius * Math.cos(a)), y: r1(cy + radius * Math.sin(a)) });
  });
  const height = cy + radius + LNODE_H + 56;

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
    const x1 = r1(s.x + ux * SHORT);
    const y1 = r1(s.y + uy * SHORT);
    const x2 = r1(t.x - ux * SHORT);
    const y2 = r1(t.y - uy * SHORT);
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
        `<text x="${r1((x1 + x2) / 2)}" y="${r1((y1 + y2) / 2) - 3}" font-family="sans-serif" font-size="10" text-anchor="middle">${esc(txt)}</text>`,
      );
    }
  }

  // Reinforcing / balancing loop badge in the centre
  const loop = model.edges.find((e) => e.loop);
  if (loop) {
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="18" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700">${esc(loop.loop ?? '')}</text>`,
    );
  }

  // Nodes (resources = diamonds, others = rounded rects)
  for (const node of nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    if (node.kind === 'resource') {
      parts.push(
        `<polygon points="${p.x},${p.y - LNODE_H / 2} ${p.x + LNODE_W / 2},${p.y} ${p.x},${p.y + LNODE_H / 2} ${p.x - LNODE_W / 2},${p.y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      );
    } else {
      parts.push(
        `<rect x="${p.x - LNODE_W / 2}" y="${p.y - LNODE_H / 2}" width="${LNODE_W}" height="${LNODE_H}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="2" />`,
      );
    }
    parts.push(
      `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-family="sans-serif" font-size="11">${esc(getText(node.label, layer, lang))}</text>`,
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

  const titleText = model.meta.title
    ? `<text x="16" y="22" font-family="sans-serif" font-size="16" font-weight="700">${esc(model.meta.title)}</text>`
    : '';
  const defs =
    '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#000" /></marker></defs>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOOP_W} ${height}" role="img" aria-label="${esc(altText)}">` +
    `<title>${esc(model.meta.title ?? 'Loop map')}</title><desc>${esc(altText)}</desc>` +
    defs +
    `<rect x="0" y="0" width="${LOOP_W}" height="${height}" fill="#fff" />` +
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

  // Cells
  for (const node of model.nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    parts.push(
      `<rect x="${r1(p.x - boxW / 2)}" y="${p.y - boxH / 2}" width="${r1(boxW)}" height="${boxH}" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-family="sans-serif" font-size="10">${esc(getText(node.label, layer, lang))}</text>`,
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
        `<text x="${r1((s.x + t.x) / 2 + 4)}" y="${r1((sy + ty) / 2)}" font-family="sans-serif" font-size="10">${esc(lbl)}</text>`,
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
      `<polygon points="${x - w / 2 + 12},${y - h / 2} ${x + w / 2 - 12},${y - h / 2} ${x + w / 2},${y} ${x + w / 2 - 12},${y + h / 2} ${x - w / 2 + 12},${y + h / 2} ${x - w / 2},${y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="sans-serif" font-size="10">${esc(getText(n.label, layer, lang))}</text>`,
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
