/**
 * Simulated visual-quality study cases (REQ-VISUAL-QUALITY-STUDY, ADR-0055).
 *
 * The curated `examples/` corpus is hand-tuned to look good; that is exactly why a renderer defect can
 * hide there (this session a body-map's markers sat off the body, and loop-map rings were shoved
 * off-centre by a long title — both invisible to the geometry invariants and only caught by eye). A
 * real comprehension/utility STUDY (the v1.0 gate, REQ-STUDY-PREREG) would have clinicians draw their
 * own messy, detail-dense formulations; we can't run that yet, but we CAN *simulate* its drawing half:
 * author deliberately complex diagrams — many nodes, long labels, every optional channel (epistemic
 * status, loop topology, contested provenance, as-if, confidence, intensities, custom anatomical
 * positions, exits, parallel edges) — and machine-check the RENDER for visual quality.
 *
 * `checkVisualQuality` aggregates the corpus invariants into one battery (node↔node / label↔node /
 * text↔text non-overlap, in-frame, interior-label containment, no-severe-squish, microtext floor) and
 * returns a list of violations. The companion test renders every case in BOTH audience layers and
 * asserts the battery is clean — so the renderers must survive adversarial, custom-detailed input, not
 * just the showcase set. Cases are NOT golden-pinned (they assert quality, not byte output), so they
 * can grow freely. Honest scope: this simulates the DRAWING + legibility half; it is not a substitute
 * for the human comprehension study, which stays the v1.0 gate.
 */
import { parseModel, type PsyumlModel } from '@psyuml/model';
import { boxesFromSvg, textBoxesFromSvg, idOf, kindOf, type ElBox } from './introspect';
import { overlaps, contains, textWidth, type Box } from './layout';

const SLOP = 1; // overlap tolerance for the shared ~0.58em/char text metric
const FRAME_SLOP = 4; // in-frame tolerance
const CONTAIN_SLOP = 3; // interior-label containment tolerance
const SQUISH_FLOOR = 0.8; // textLength below this (above the 8px font floor) is illegible
const LEG_FLOOR = 8; // px microtext floor

const viewBox = (svg: string): { x: number; y: number; w: number; h: number } => {
  const m = svg.match(/viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/);
  if (!m) throw new Error('no viewBox');
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
};

const inFrame = (
  b: Box,
  vb: { x: number; y: number; w: number; h: number },
  slop: number,
): boolean =>
  b.x >= vb.x - slop &&
  b.y >= vb.y - slop &&
  b.x + b.w <= vb.x + vb.w + slop &&
  b.y + b.h <= vb.y + vb.h + slop;

const centreInside = (outer: Box, inner: Box): boolean => {
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  return cx >= outer.x && cx <= outer.x + outer.w && cy >= outer.y && cy <= outer.y + outer.h;
};

const decode = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Every (font-size, textLength, content) triple — single `<text>` and stacked `<tspan>`s. */
function compressedSegments(svg: string): { size: number; tl: number; text: string }[] {
  const out: { size: number; tl: number; text: string }[] = [];
  for (const block of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const size = Number(block[1].match(/font-size="([\d.]+)"/)?.[1] ?? 11);
    const tspans = [...block[2].matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
    if (tspans.length) {
      for (const t of tspans) {
        const tl = t[1].match(/textLength="([\d.]+)"/);
        if (tl) out.push({ size, tl: Number(tl[1]), text: decode(t[2]) });
      }
    } else {
      const tl = block[1].match(/textLength="([\d.]+)"/);
      if (tl) out.push({ size, tl: Number(tl[1]), text: decode(block[2]) });
    }
  }
  return out;
}

const fontSizes = (svg: string): number[] =>
  [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));

/** Diagram types whose node labels are drawn INSIDE the node box (interior containment applies);
 * the rest draw the label beside/below the glyph by design, so containment is not asserted for them
 * (mirrors layout-quality.test.ts's LABEL_IN_BOX). */
const LABEL_IN_BOX = new Set([
  'state-map',
  'timeline',
  'intervention-sequence',
  'ritual',
  'two-triangles',
  'decision-nav',
  'process-loop',
  'ladder',
  'three-circles',
  'schema-grid',
]);

/** Horizontal extent [minX,maxX] of all DRAWN content (defs stripped — markers/patterns aren't drawn
 * at their template coords; the background rect is excluded). Used only for the gross-lopsidedness
 * check, so an approximate per-element x is fine. */
function contentExtentX(svgRaw: string): { minX: number; maxX: number } | null {
  const svg = svgRaw.replace(/<defs>[\s\S]*?<\/defs>/g, '');
  const vb = viewBox(svg);
  let minX = Infinity;
  let maxX = -Infinity;
  const add = (a: number, b = a): void => {
    minX = Math.min(minX, a);
    maxX = Math.max(maxX, b);
  };
  for (const m of svg.matchAll(/<rect\b[^>]*\bx="([\d.-]+)"[^>]*\bwidth="([\d.-]+)"/g)) {
    const x = +m[1];
    const w = +m[2];
    if (Math.abs(x - vb.x) < 1.5 && Math.abs(w - vb.w) < 1.5) continue; // background
    add(x, x + w);
  }
  for (const m of svg.matchAll(/<circle\b[^>]*\bcx="([\d.-]+)"[^>]*\br="([\d.-]+)"/g))
    add(+m[1] - +m[2], +m[1] + +m[2]);
  for (const m of svg.matchAll(/<ellipse\b[^>]*\bcx="([\d.-]+)"[^>]*\brx="([\d.-]+)"/g))
    add(+m[1] - +m[2], +m[1] + +m[2]);
  for (const m of svg.matchAll(/<line\b[^>]*\bx1="([\d.-]+)"[^>]*\bx2="([\d.-]+)"/g)) {
    add(+m[1]);
    add(+m[2]);
  }
  for (const m of svg.matchAll(/<polygon\b[^>]*\bpoints="([^"]*)"/g))
    for (const p of m[1].trim().split(/\s+/)) {
      const x = +p.split(',')[0];
      if (!Number.isNaN(x)) add(x);
    }
  // text: approximate AABB from the shared metric
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = m[1];
    const xm = a.match(/\bx="([\d.-]+)"/);
    if (!xm) continue;
    const size = +(a.match(/font-size="([\d.]+)"/)?.[1] ?? 11);
    const anchor = a.match(/text-anchor="(\w+)"/)?.[1] ?? 'start';
    const content = m[2].replace(/<[^>]*>/g, '');
    const w = textWidth(content, size);
    const x = +xm[1];
    if (anchor === 'middle') add(x - w / 2, x + w / 2);
    else if (anchor === 'end') add(x - w, x);
    else add(x, x + w);
  }
  return Number.isFinite(minX) ? { minX, maxX } : null;
}

/**
 * Run the full visual-quality battery over a rendered SVG; returns one string per violation (empty =
 * clean). Mirrors the corpus invariants (ADR-0012/0021/0045/0046/0052/0053) so the study cases are
 * held to the same geometric contract as the showcase set.
 */
export function checkVisualQuality(svg: string, label: string, diagram?: string): string[] {
  const v: string[] = [];
  const vb = viewBox(svg);
  const boxes: ElBox[] = boxesFromSvg(svg);
  const nodes = boxes.filter((b) => kindOf(b.el) === 'node');
  const nodeLabels = boxes.filter((b) => kindOf(b.el) === 'nodelabel');

  // 1. node ↔ node
  for (let i = 0; i < nodes.length; i += 1)
    for (let j = i + 1; j < nodes.length; j += 1)
      if (overlaps(nodes[i], nodes[j], -SLOP))
        v.push(`${label}: node ${nodes[i].el} overlaps node ${nodes[j].el}`);

  // 2. label ↔ non-owner node
  for (const lab of nodeLabels)
    for (const n of nodes)
      if (idOf(lab.el) !== idOf(n.el) && overlaps(lab, n, -SLOP))
        v.push(`${label}: label ${lab.el} overlaps non-owner node ${n.el}`);

  // 3. text ↔ text
  const texts = textBoxesFromSvg(svg).filter((t) => t.content.length > 0);
  for (let i = 0; i < texts.length; i += 1)
    for (let j = i + 1; j < texts.length; j += 1)
      if (overlaps(texts[i], texts[j], -SLOP))
        v.push(
          `${label}: text "${texts[i].content.slice(0, 24)}" overlaps "${texts[j].content.slice(0, 24)}"`,
        );

  // 4. in-frame (text + nodes)
  for (const t of texts)
    if (!inFrame(t, vb, FRAME_SLOP))
      v.push(`${label}: text "${t.content.slice(0, 24)}" spills outside the frame`);
  for (const n of nodes)
    if (!inFrame(n, vb, 2)) v.push(`${label}: node ${n.el} spills outside the frame`);

  // 5. interior-label containment — only for renderers whose labels sit INSIDE the node box; the
  //    rest (parts-map circles, body-map markers, relational-field glyphs, etc.) caption beside/below
  //    the glyph by design, so containment doesn't apply (the label↔non-owner-node check above + the
  //    text↔text + in-frame checks still hold them).
  if (!diagram || LABEL_IN_BOX.has(diagram)) {
    const nodeMap = new Map(nodes.map((n) => [idOf(n.el), n]));
    for (const lab of nodeLabels) {
      const owner = nodeMap.get(idOf(lab.el));
      if (owner && centreInside(owner, lab) && !contains(owner, lab, CONTAIN_SLOP))
        v.push(`${label}: interior label ${lab.el} escapes its node box`);
    }
  }

  // 6. no severe horizontal squish (shrink-the-font-first contract, ADR-0053)
  for (const seg of compressedSegments(svg)) {
    const natural = textWidth(seg.text, seg.size);
    if (natural > 0 && seg.tl / natural < SQUISH_FLOOR - 0.04 && seg.size > LEG_FLOOR + 0.04)
      v.push(
        `${label}: "${seg.text.slice(0, 24)}" squished to ${((seg.tl / natural) * 100).toFixed(0)}% at ${seg.size}px`,
      );
  }

  // 7. microtext floor
  for (const sz of fontSizes(svg))
    if (sz < LEG_FLOOR) v.push(`${label}: microtext ${sz}px below the ${LEG_FLOOR}px floor`);

  // 8. no GROSS one-sided empty margin — the body off-centre with a big blank gutter (the body-map
  //    and loop-map defects this session). Conservative: flags only when one side's gap dwarfs the
  //    other AND the imbalance is large in absolute px, so an intentionally one-sided layout (a side
  //    legend, an exit-label gutter) is not falsely caught.
  const ext = contentExtentX(svg);
  if (ext) {
    const leftGap = ext.minX - vb.x;
    const rightGap = vb.x + vb.w - ext.maxX;
    const diff = Math.abs(leftGap - rightGap);
    if (
      diff > Math.max(60, 0.18 * vb.w) &&
      Math.min(leftGap, rightGap) < 0.5 * Math.max(leftGap, rightGap)
    )
      v.push(
        `${label}: lopsided — content gutter ${leftGap.toFixed(0)}px left vs ${rightGap.toFixed(0)}px right`,
      );
  }

  // 9. ring-centring (process-loop only, mirrors layout-quality D) — a maintaining-cycle ring is
  //    centred by construction; a long title that grew/shifted the frame (masking the empty margin
  //    above with title text) would slide the ring off-centre. Scoped to the loop-map, whose ring is
  //    unambiguously centred (structured layouts are asymmetric by design).
  if (diagram === 'process-loop' && nodes.length) {
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x + n.w));
    const off = (minX + maxX) / 2 - (vb.x + vb.w / 2);
    if (Math.abs(off) > 24) v.push(`${label}: ring off-centre by ${off.toFixed(0)}px`);
  }

  return v;
}

export interface StudyCase {
  name: string;
  /** Why this case is adversarial — the custom details it stresses. */
  stresses: string;
  model: PsyumlModel;
}

const en = (clinician: string, client?: string) => ({
  clinician: { en: clinician },
  ...(client ? { client: { en: client } } : {}),
});

/** Author + validate a study-case model (parseModel throws on a malformed case → caught at import). */
const studyCase = (name: string, stresses: string, raw: unknown): StudyCase => ({
  name,
  stresses,
  model: parseModel(raw),
});

export const STUDY_CASES: StudyCase[] = [
  studyCase(
    'loop-cat-sdr-dense',
    'process-loop: 7 nodes incl. observing-eye + resource diamond with a LONG clinician label, trap topology, reciprocal + exit edges, contested/as-if/interpretive/confidence, a very long title (wrap + ring-centring)',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'process-loop',
      meta: {
        title:
          'CAT reformulation — the criticise / placate / resent / collapse trap, and the way out of it',
        disclaimer:
          'A shared map drawn together, with the exit named early. Supports, does not replace, care.',
      },
      nodes: [
        {
          id: 'criticised',
          kind: 'state',
          label: en('Me: criticised and got-at', 'Feeling got-at'),
          properties: { epistemicStatus: 'reported', provenance: ['school:cat'] },
        },
        {
          id: 'placate',
          kind: 'state',
          label: en('Placate, comply, over-apologise', 'People-please'),
          properties: { epistemicStatus: 'observed', confidence: 'H', provenance: ['school:cat'] },
        },
        {
          id: 'resent',
          kind: 'state',
          label: en('Resentment and exhaustion build', 'Worn out, fed up'),
          properties: { epistemicStatus: 'observed', confidence: 'M', provenance: ['school:cat'] },
        },
        {
          id: 'withdraw',
          kind: 'state',
          label: en('Withdraw, go quiet, collapse', 'Shut down'),
          properties: { epistemicStatus: 'observed', provenance: ['school:cat'] },
        },
        {
          id: 'critic',
          kind: 'agent',
          stereotype: 'reciprocal-role',
          label: en('Inner critic: relentlessly criticising'),
          properties: {
            epistemicStatus: 'contested',
            confidence: 'L',
            asIf: true,
            provenance: ['school:cat'],
          },
        },
        {
          id: 'eye',
          kind: 'self',
          stereotype: 'observing-eye',
          label: en('Observing-I: catch the trap forming'),
          properties: { epistemicStatus: 'observed', provenance: ['school:cat'] },
        },
        {
          id: 'assert',
          kind: 'resource',
          label: en('Name the need out loud; stay, do not collapse or comply', 'Say what I need'),
          properties: { epistemicStatus: 'planned', provenance: ['school:cat'] },
        },
      ],
      edges: [
        {
          id: 'rr',
          kind: 'reciprocal',
          source: 'critic',
          target: 'criticised',
          label: en('criticising ⇄ criticised'),
        },
        {
          id: 'e1',
          kind: 'sequential',
          source: 'criticised',
          target: 'placate',
          trigger: en('to avoid conflict'),
        },
        { id: 'e2', kind: 'sequential', source: 'placate', target: 'resent' },
        { id: 'e3', kind: 'sequential', source: 'resent', target: 'withdraw' },
        {
          id: 'e4',
          kind: 'sequential',
          source: 'withdraw',
          target: 'criticised',
          loop: 'R',
          loopTopology: 'trap',
        },
        {
          id: 'x1',
          kind: 'exit',
          source: 'placate',
          target: 'assert',
          label: en('drop the placation'),
        },
      ],
    },
  ),

  studyCase(
    'parts-ifs-dense',
    'parts-map: Self + 6 parts (managers/firefighter/exile), containment items, polarisation edge, contested provenance + narrative, dashed interpretive, long part names',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'parts-map',
      meta: {
        title: 'Inner system — protectors around a young exile, and the Self that can lead',
        disclaimer:
          '"Parts" is a working metaphor, not a claim about how the mind is built; schools disagree.',
      },
      nodes: [
        {
          id: 'self',
          kind: 'self',
          label: en('Self (calm, curious core)'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'manager1',
          kind: 'agent',
          stereotype: 'manager',
          label: en('Perfectionist'),
          properties: { epistemicStatus: 'inferred', confidence: 'M', provenance: ['school:ifs'] },
        },
        {
          id: 'manager2',
          kind: 'agent',
          stereotype: 'manager',
          label: en('Inner critic'),
          properties: {
            epistemicStatus: 'contested',
            confidence: 'L',
            provenance: ['school:ifs', 'school:schema'],
            provenanceNote:
              'IFS reads it as a protector with positive intent; schema therapy as a punitive-parent mode to limit.',
          },
        },
        {
          id: 'firefighter',
          kind: 'agent',
          stereotype: 'firefighter',
          label: en('Numb-out part'),
          properties: { epistemicStatus: 'observed', provenance: ['school:ifs'] },
        },
        {
          id: 'pleaser',
          kind: 'agent',
          stereotype: 'manager',
          label: en('People-pleaser'),
          properties: { epistemicStatus: 'inferred', asIf: true, provenance: ['school:ifs'] },
        },
        {
          id: 'exile',
          kind: 'agent',
          stereotype: 'exile',
          label: en('Young exile (age 7)'),
          properties: { epistemicStatus: 'inferred', confidence: 'M', provenance: ['school:ifs'] },
        },
        {
          id: 'longing',
          kind: 'context',
          label: en('Longing to be accepted'),
          properties: { epistemicStatus: 'reported' },
        },
      ],
      edges: [
        {
          id: 'c1',
          kind: 'containment',
          source: 'manager1',
          target: 'exile',
          label: en('protects'),
        },
        {
          id: 'c2',
          kind: 'containment',
          source: 'firefighter',
          target: 'exile',
          label: en('protects'),
        },
        {
          id: 'c3',
          kind: 'containment',
          source: 'pleaser',
          target: 'exile',
          label: en('protects'),
        },
        { id: 'c4', kind: 'containment', source: 'exile', target: 'longing', label: en('carries') },
        {
          id: 'p1',
          kind: 'conflict',
          source: 'manager1',
          target: 'firefighter',
          label: en('polarised'),
        },
      ],
    },
  ),

  studyCase(
    'body-map-dense',
    'body-map: 9 sensations at custom anatomical positions across head/torso/limbs, full intensity range (0.2–0.9), some long labels, a long title (wrap, centring)',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'body-map',
      meta: {
        title: 'Felt sense in a panic surge — where it lands and how strong',
        disclaimer:
          'Go slowly; you can stop any time. Body work can stir things up. Supports, does not replace care.',
      },
      nodes: [
        {
          id: 'jaw',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 210, y: 106 },
          label: en('Jaw clenched tight', 'Tight jaw'),
          properties: { intensity: 0.6, epistemicStatus: 'observed' },
        },
        {
          id: 'throat',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 210, y: 136 },
          label: en('Throat tight, hard to swallow', 'Throat tight'),
          properties: { intensity: 0.55, epistemicStatus: 'observed' },
        },
        {
          id: 'chest',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 210, y: 188 },
          label: en('Chest heavy, heart pounding', 'Chest heavy'),
          properties: { intensity: 0.9, epistemicStatus: 'reported' },
        },
        {
          id: 'belly',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 210, y: 250 },
          label: en('Stomach knotted', 'Stomach knot'),
          properties: { intensity: 0.7, epistemicStatus: 'observed' },
        },
        {
          id: 'lhand',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 120, y: 256 },
          label: en('Hands cold and tingling', 'Cold hands'),
          properties: { intensity: 0.4, epistemicStatus: 'reported' },
        },
        {
          id: 'rshoulder',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 300, y: 165 },
          label: en('Shoulders up by my ears', 'Shoulders tense'),
          properties: { intensity: 0.5, epistemicStatus: 'observed' },
        },
        {
          id: 'head',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 210, y: 70 },
          label: en('Head light, far away', 'Dizzy'),
          properties: { intensity: 0.45, epistemicStatus: 'reported' },
        },
        {
          id: 'legs',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 210, y: 400 },
          label: en('Legs restless, want to run', 'Restless legs'),
          properties: { intensity: 0.5, epistemicStatus: 'observed' },
        },
        {
          id: 'lfoot',
          kind: 'state',
          stereotype: 'sensation',
          position: { x: 188, y: 430 },
          label: en('Feet rooted, heavy', 'Heavy feet'),
          properties: { intensity: 0.2, epistemicStatus: 'reported' },
        },
      ],
      edges: [],
    },
  ),

  studyCase(
    'state-map-dense',
    'state-map: 6 states across 3 polyvagal bands, parallel + reciprocal transitions with long trigger labels, two exits with long way-out labels',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'state-map',
      meta: {
        title: 'Window of tolerance — the nervous-system map and the ways back in',
        disclaimer:
          'A shared picture, not a diagnosis. Co-created; it shows a pattern, not a fixed state.',
      },
      bands: [
        { id: 'ventral', order: 0, label: en('Ventral / safe-social'), pattern: 'none' },
        { id: 'sympathetic', order: 1, label: en('Sympathetic / mobilised'), pattern: 'diagonal' },
        { id: 'dorsal', order: 2, label: en('Dorsal / shutdown'), pattern: 'cross-hatch' },
      ],
      nodes: [
        {
          id: 'connected',
          kind: 'state',
          bandId: 'ventral',
          label: en('Connected and playful'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'settled',
          kind: 'state',
          bandId: 'ventral',
          label: en('Settled, at ease'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'anxious',
          kind: 'state',
          bandId: 'sympathetic',
          label: en('Anxious, fight-or-flight'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'panic',
          kind: 'state',
          bandId: 'sympathetic',
          label: en('Panic surge'),
          properties: { epistemicStatus: 'reported', confidence: 'H' },
        },
        {
          id: 'numb',
          kind: 'state',
          bandId: 'dorsal',
          label: en('Numb, shut down'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'collapse',
          kind: 'state',
          bandId: 'dorsal',
          label: en('Collapse, dissociation'),
          properties: { epistemicStatus: 'inferred', confidence: 'L' },
        },
      ],
      edges: [
        {
          id: 't1',
          kind: 'sequential',
          source: 'connected',
          target: 'anxious',
          trigger: en('a sharp criticism'),
        },
        {
          id: 't2',
          kind: 'sequential',
          source: 'settled',
          target: 'anxious',
          trigger: en('a looming deadline'),
        },
        { id: 't3', kind: 'sequential', source: 'anxious', target: 'panic' },
        {
          id: 't4',
          kind: 'sequential',
          source: 'anxious',
          target: 'numb',
          trigger: en('it is all too much'),
        },
        { id: 't5', kind: 'sequential', source: 'numb', target: 'collapse' },
        {
          id: 'x1',
          kind: 'exit',
          source: 'anxious',
          target: 'connected',
          label: en('paced breathing, then call a safe person'),
        },
        {
          id: 'x2',
          kind: 'exit',
          source: 'numb',
          target: 'anxious',
          label: en('orient: name five things you can see'),
        },
      ],
    },
  ),

  studyCase(
    'crisis-nav-dense',
    'decision-nav: branching crisis chart with a thick crisis node carrying a long resources caption, multiple question diamonds, deep convergence, long branch labels',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'decision-nav',
      meta: {
        title: 'My safety plan — what to do when I am not OK, step by step',
        disclaimer:
          'A collaborative coping plan, not a contract. It does not diagnose. Supports, does not replace, care.',
        crisisResources:
          'If you are in danger now, call your local emergency number or a crisis line (use your local number).',
      },
      nodes: [
        { id: 'safe', kind: 'state', stereotype: 'question', label: en('Am I safe right now?') },
        { id: 'crisis', kind: 'state', stereotype: 'crisis', label: en('Call a crisis line now') },
        { id: 'feel', kind: 'state', stereotype: 'question', label: en('What am I feeling?') },
        { id: 'revved', kind: 'intervention', label: en('TIPP / walk / paced breathing') },
        { id: 'shutdown', kind: 'intervention', label: en('Move, orient, reach out to someone') },
        {
          id: 'stuck',
          kind: 'state',
          stereotype: 'question',
          label: en('Still stuck after fifteen minutes?'),
        },
        { id: 'support', kind: 'intervention', label: en('Call my named support person') },
        { id: 'ok', kind: 'intervention', label: en('Back in my window — OK for now') },
      ],
      edges: [
        {
          id: 'd1',
          kind: 'sequential',
          source: 'safe',
          target: 'crisis',
          label: en('No / unsafe'),
        },
        { id: 'd2', kind: 'sequential', source: 'safe', target: 'feel', label: en('Yes') },
        { id: 'd3', kind: 'sequential', source: 'feel', target: 'revved', label: en('Revved up') },
        {
          id: 'd4',
          kind: 'sequential',
          source: 'feel',
          target: 'shutdown',
          label: en('Shut down'),
        },
        { id: 'd5', kind: 'sequential', source: 'revved', target: 'stuck' },
        { id: 'd6', kind: 'sequential', source: 'shutdown', target: 'stuck' },
        { id: 'd7', kind: 'sequential', source: 'stuck', target: 'support', label: en('Yes') },
        { id: 'd8', kind: 'sequential', source: 'stuck', target: 'ok', label: en('No') },
      ],
    },
  ),

  studyCase(
    'genogram-eco-dense',
    'relational-field: a 3-generation genogram + ecomap — 9 people/systems with every tie kind (fused, conflict, cutoff, distant) and the index person highlighted',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'relational-field',
      meta: {
        title:
          'Family genogram and the wider world — three generations and the systems around them',
        disclaimer:
          'A relationship map drawn with the client; it can name people who are not in the room. Share with care.',
      },
      nodes: [
        {
          id: 'self',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 300, y: 250 },
          label: en('R. (the index person), 34'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'mother',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 200, y: 110 },
          label: en('Mother, 62'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'father',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 400, y: 110 },
          label: en('Father (estranged), 65'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'gran',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 110, y: 110 },
          label: en('Grandmother (remembered)'),
          properties: { epistemicStatus: 'reported' },
        },
        {
          id: 'partner',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 480, y: 250 },
          label: en('Partner, 36'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'sister',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 120, y: 250 },
          label: en('Sister, 31'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'child',
          kind: 'agent',
          stereotype: 'person',
          position: { x: 300, y: 410 },
          label: en('Daughter, 6'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'work',
          kind: 'context',
          stereotype: 'system',
          position: { x: 500, y: 410 },
          label: en('Work (high stress)'),
          properties: { epistemicStatus: 'observed' },
        },
        {
          id: 'faith',
          kind: 'context',
          stereotype: 'system',
          position: { x: 110, y: 410 },
          label: en('Faith community (supportive)'),
          properties: { epistemicStatus: 'observed' },
        },
      ],
      edges: [
        { id: 'r1', kind: 'conflict', source: 'mother', target: 'father' },
        { id: 'r2', kind: 'fused', source: 'self', target: 'mother' },
        { id: 'r3', kind: 'cutoff', source: 'self', target: 'father' },
        { id: 'r4', kind: 'close', source: 'self', target: 'partner' },
        { id: 'r5', kind: 'close', source: 'self', target: 'sister' },
        { id: 'r6', kind: 'close', source: 'self', target: 'child' },
        { id: 'r7', kind: 'distant', source: 'self', target: 'work' },
        { id: 'r8', kind: 'close', source: 'self', target: 'faith' },
        { id: 'r9', kind: 'nestedWithin', source: 'mother', target: 'gran' },
      ],
    },
  ),

  studyCase(
    'mode-map-dense',
    'mode-map: 6 schema modes at custom positions with the full dominance range (0.3–0.9) sizing the circles, the Healthy Adult growth target, long mode names, attack/yield transitions',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'mode-map',
      meta: {
        title: 'Schema modes — the inner cast around a vulnerable child, and the Healthy Adult',
        disclaimer:
          'A shared map of recurring "modes", not a diagnosis. Supports, does not replace, care.',
      },
      nodes: [
        {
          id: 'punitive',
          kind: 'agent',
          stereotype: 'critic',
          position: { x: 160, y: 110 },
          label: en('Punitive Parent mode', 'the harsh voice'),
          properties: { dominance: 0.6, epistemicStatus: 'inferred', confidence: 'M' },
        },
        {
          id: 'angry',
          kind: 'agent',
          stereotype: 'child',
          position: { x: 380, y: 110 },
          label: en('Angry / Impulsive Child', 'furious part'),
          properties: { dominance: 0.5, epistemicStatus: 'observed' },
        },
        {
          id: 'compliant',
          kind: 'agent',
          stereotype: 'coping',
          position: { x: 600, y: 110 },
          label: en('Compliant Surrenderer'),
          properties: { dominance: 0.4, epistemicStatus: 'observed' },
        },
        {
          id: 'vchild',
          kind: 'agent',
          stereotype: 'child',
          position: { x: 160, y: 420 },
          label: en('Vulnerable Child: alone, unseen', 'little me'),
          properties: { dominance: 0.9, epistemicStatus: 'inferred', confidence: 'H' },
        },
        {
          id: 'detached',
          kind: 'agent',
          stereotype: 'coping',
          position: { x: 380, y: 420 },
          label: en('Detached Protector: numb out', 'the wall'),
          properties: { dominance: 0.7, epistemicStatus: 'observed' },
        },
        {
          id: 'healthy',
          kind: 'self',
          stereotype: 'healthy-adult',
          position: { x: 600, y: 420 },
          label: en('Healthy Adult (grow this)', 'wise me'),
          properties: { dominance: 0.3, epistemicStatus: 'planned' },
        },
      ],
      edges: [
        {
          id: 'm1',
          kind: 'sequential',
          source: 'punitive',
          target: 'vchild',
          label: en('attacks'),
        },
        {
          id: 'm2',
          kind: 'sequential',
          source: 'vchild',
          target: 'detached',
          label: en('then numbs out'),
        },
        {
          id: 'm3',
          kind: 'sequential',
          source: 'compliant',
          target: 'healthy',
          label: en('yields to'),
        },
        {
          id: 'm4',
          kind: 'sequential',
          source: 'detached',
          target: 'healthy',
          label: en('negotiates with'),
        },
        {
          id: 'm5',
          kind: 'sequential',
          source: 'angry',
          target: 'detached',
          label: en('flips to'),
        },
      ],
    },
  ),

  studyCase(
    'intervention-seq-dense',
    'intervention-sequence: 3 swimlanes (client/therapist/support) with 7 alternating steps, long phase labels, guard labels on the lane-crossing transitions',
    {
      version: '0.1.0',
      language: 'en',
      diagram: 'intervention-sequence',
      meta: {
        title: 'Phased trauma therapy — who does what, in what order, across the team',
        disclaimer:
          'A shared plan, sequenced and paced. Supports, does not replace, professional care.',
      },
      bands: [
        { id: 'client', order: 0, label: en('Client') },
        { id: 'therapist', order: 1, label: en('Therapist') },
        { id: 'support', order: 2, label: en('Support') },
      ],
      nodes: [
        {
          id: 't1',
          kind: 'intervention',
          bandId: 'therapist',
          label: en('Phase 1: Safety & stabilisation', 'Get steady & safe'),
          properties: { epistemicStatus: 'planned' },
        },
        {
          id: 'c1',
          kind: 'intervention',
          bandId: 'client',
          label: en('Grounding + sleep routine'),
          properties: { epistemicStatus: 'planned' },
        },
        {
          id: 's1',
          kind: 'intervention',
          bandId: 'support',
          label: en('Safe person on call'),
          properties: { epistemicStatus: 'planned' },
        },
        {
          id: 't2',
          kind: 'intervention',
          bandId: 'therapist',
          label: en('Phase 2: Process the memory (EMDR / TF-CBT)'),
          properties: { epistemicStatus: 'planned' },
        },
        {
          id: 'c2',
          kind: 'intervention',
          bandId: 'client',
          label: en('Window-of-tolerance skills'),
          properties: { epistemicStatus: 'planned' },
        },
        {
          id: 't3',
          kind: 'intervention',
          bandId: 'therapist',
          label: en('Phase 3: Reconnect & make meaning'),
          properties: { epistemicStatus: 'planned' },
        },
        {
          id: 's2',
          kind: 'intervention',
          bandId: 'support',
          label: en('Peer / community group'),
          properties: { epistemicStatus: 'planned' },
        },
      ],
      edges: [
        { id: 'e1', kind: 'sequential', source: 't1', target: 'c1' },
        { id: 'e2', kind: 'sequential', source: 'c1', target: 's1' },
        {
          id: 'e3',
          kind: 'sequential',
          source: 's1',
          target: 't2',
          label: en('stable & resourced'),
        },
        { id: 'e4', kind: 'sequential', source: 't2', target: 'c2' },
        {
          id: 'e5',
          kind: 'sequential',
          source: 'c2',
          target: 't3',
          label: en('distress tolerable'),
        },
        { id: 'e6', kind: 'sequential', source: 't3', target: 's2' },
      ],
    },
  ),
];
