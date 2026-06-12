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

/** Render a State Map (spec §E.1) to SVG + alt text from the canonical model. */
export function renderStateMap(model: PsyumlModel, options: RenderOptions = {}): RenderResult {
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
