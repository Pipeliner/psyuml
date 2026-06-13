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
import { diffModels, type Layer, type ModelDiff } from '@psyuml/diff';

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
      const roleTerm = options.roleLabels?.[n.stereotype] ?? n.stereotype;
      parts.push(
        `<text x="${p.x}" y="${p.y - nodeR - 5}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#333">${esc(roleTerm)}</text>`,
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

  // Nodes (resources = diamonds, CAT observing-eye = eye glyph, others = rounded rects)
  for (const node of nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    let labelDy = 4;
    if (node.kind === 'resource') {
      parts.push(
        `<polygon points="${p.x},${p.y - LNODE_H / 2} ${p.x + LNODE_W / 2},${p.y} ${p.x},${p.y + LNODE_H / 2} ${p.x - LNODE_W / 2},${p.y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      );
    } else if (node.stereotype === 'observing-eye') {
      // CAT observing eye/I — the self-reflective stance that watches the trap (spec §B).
      parts.push(
        `<ellipse cx="${p.x}" cy="${p.y}" rx="26" ry="15" fill="#fff" stroke="#000" stroke-width="2" />`,
        `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#000" />`,
      );
      labelDy = 30;
    } else {
      parts.push(
        `<rect x="${p.x - LNODE_W / 2}" y="${p.y - LNODE_H / 2}" width="${LNODE_W}" height="${LNODE_H}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="2" />`,
      );
    }
    parts.push(
      `<text x="${p.x}" y="${p.y + labelDy}" text-anchor="middle" font-family="sans-serif" font-size="11">${esc(getText(node.label, layer, lang))}</text>`,
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

  // Phase columns (LIMINAL dashed)
  phases.forEach((p, ci) => {
    const isLiminal = getText(p.label, 'clinician', 'en').toLowerCase().includes('liminal');
    const dash = isLiminal ? ' stroke-dasharray="6 5"' : '';
    parts.push(
      `<rect x="${r1(ci * colW + 6)}" y="50" width="${r1(colW - 12)}" height="${r1(phasesBottom - 50)}" fill="#fff" stroke="#000" stroke-width="1.5"${dash} />`,
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
      `<polygon points="${x - nw / 2 + 12},${y - RNODE_H / 2} ${x + nw / 2 - 12},${y - RNODE_H / 2} ${x + nw / 2},${y} ${x + nw / 2 - 12},${y + RNODE_H / 2} ${x - nw / 2 + 12},${y + RNODE_H / 2} ${x - nw / 2},${y}" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="sans-serif" font-size="10">${esc(getText(node.label, layer, lang))}</text>`,
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
): string {
  const r = 22;
  let out: string;
  if (stereotype === 'male') {
    out = `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#fff" stroke="#000" stroke-width="2" />`;
    if (index)
      out += `<rect x="${cx - r - 4}" y="${cy - r - 4}" width="${2 * r + 8}" height="${2 * r + 8}" fill="none" stroke="#000" stroke-width="2" />`;
  } else if (stereotype === 'unknown' || stereotype === 'nonbinary') {
    out = `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="#fff" stroke="#000" stroke-width="2" />`;
    if (index)
      out += `<polygon points="${cx},${cy - r - 4} ${cx + r + 4},${cy} ${cx},${cy + r + 4} ${cx - r - 4},${cy}" fill="none" stroke="#000" stroke-width="2" />`;
  } else if (stereotype === 'system') {
    out = `<rect x="${cx - 50}" y="${cy - 18}" width="100" height="36" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2" stroke-dasharray="4 3" />`;
  } else {
    out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#000" stroke-width="2" />`;
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
        `<text x="${r1((s.x + t.x) / 2)}" y="${r1((s.y + t.y) / 2) - 4}" text-anchor="middle" font-family="sans-serif" font-size="9">${esc(lbl)}</text>`,
      );
    }
  }

  // People + systems
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    parts.push(personGlyph(n.stereotype, n.properties.index === true, p.x, p.y));
    const labelDy = n.stereotype === 'system' ? 4 : 36;
    parts.push(
      `<text x="${p.x}" y="${p.y + labelDy}" text-anchor="middle" font-family="sans-serif" font-size="10">${esc(getText(n.label, layer, lang))}</text>`,
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
        `<text x="${r1((x1 + x2) / 2)}" y="${r1((y1 + y2) / 2) - 3}" text-anchor="middle" font-family="sans-serif" font-size="9">${esc(lbl)}</text>`,
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
      `<circle cx="${p.x}" cy="${p.y}" r="${r1(r)}" fill="#fff" stroke="#000" stroke-width="2" />`,
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
      `<text x="${p.x}" y="${r1(p.y + 3)}" text-anchor="middle" font-family="sans-serif" font-size="10">${esc(getText(n.label, layer, lang))}</text>`,
    );
    const dom = n.properties.dominance;
    if (dom !== undefined) {
      parts.push(
        `<text x="${p.x}" y="${r1(p.y + r + 12)}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#555">dom ${dom.toFixed(2)}</text>`,
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

  model.nodes.forEach((n, i) => {
    const p = n.position ?? { x: 210, y: 140 + i * 30 };
    const intensity = n.properties.intensity ?? 0.5;
    const r = 6 + intensity * 10;
    parts.push(
      `<circle cx="${p.x}" cy="${p.y}" r="${r1(r)}" fill="#000" fill-opacity="0.15" stroke="#000" stroke-width="1.5" />`,
      `<text x="${r1(p.x + r + 8)}" y="${p.y + 4}" font-family="sans-serif" font-size="11">${esc(getText(n.label, layer, lang))} (${intensity.toFixed(1)})</text>`,
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
        `<text x="${r1((s.x + t.x) / 2)}" y="${r1((s.y + t.y) / 2) - 3}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#333">${esc(lbl)}</text>`,
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
      `<rect x="${r1(p.x - TT_NODE_W / 2)}" y="${r1(p.y - TT_NODE_H / 2)}" width="${TT_NODE_W}" height="${TT_NODE_H}" rx="8" ry="8" fill="#fff" stroke="#000" stroke-width="2" />`,
      `<text x="${r1(p.x)}" y="${r1(p.y + 4)}" text-anchor="middle" font-family="sans-serif" font-size="10">${esc(getText(n.label, layer, lang))}</text>`,
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
