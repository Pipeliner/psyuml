import { useEffect, useMemo, useRef, useState } from 'react';
import {
  availableLanguages,
  caseFileFrom,
  createEmptyModel,
  getText,
  isRtl,
  parseCaseFile,
  parseModel,
  serializeCaseFile,
  serializeModel,
  type DiagramType,
  type EdgeKind,
  type EpistemicStatus,
  type NodeKind,
  type PsyumlModel,
} from '@psyuml/model';
import { fromDSL, toDSL } from '@psyuml/grammar';
import { render, renderComposite, renderDiff } from '@psyuml/render';
import { requiresHumanEscalation, validate } from '@psyuml/validate';
import {
  AUDIENCE_PROFILES,
  audienceProfile,
  CFT_PROFILE,
  CULTURAL_PACK_EXAMPLE,
  listFamilies,
  pictographKeySvg,
  roleLabelsFor,
  roleLabelsFromProfile,
  TRANSLATABLE_SCHOOLS,
  validateProfile,
  withinSymbolBudget,
  type AudienceProfile,
  type DiagramFamily,
  type ExtensionProfile,
  type ProfileIssue,
} from '@psyuml/profiles';
import { diffModels, isEmptyDiff, summarizeDiff } from '@psyuml/diff';
// The catalog manifest (examples/catalog.json, ADR-0027/0028) is the SINGLE SOURCE for the
// non-showcase gallery items — school + honest note live there, not duplicated here.
import catalogManifest from '../../examples/catalog.json';
// Example sources are loaded in bulk by a Vite glob (see `EXAMPLES` below), so shipping a new
// examples/*.psyuml makes it available to the editor automatically — no per-file import to add.
import {
  addEdge,
  addNode,
  edgeAriaLabel,
  removeEdge,
  removeNode,
  restoreVersion,
  setMeta,
  setNodeEpistemic,
  setNodeHidden,
  setNodeLabel,
  setNodePosition,
  setNodeProvenance,
  setNodeStereotype,
  setSafetyFlag,
  snapshotModel,
  type Version,
} from './editor';

const NODE_KINDS: NodeKind[] = [
  'state',
  'agent',
  'self',
  'resource',
  'intervention',
  'context',
  'temporal',
];
const EDGE_KINDS: EdgeKind[] = [
  'sequential',
  'excitatory',
  'inhibitory',
  'reciprocal',
  'exit',
  'barrier',
  'containment',
  'invocation',
  'transference',
  'nestedWithin',
  'close',
  'conflict',
  'fused',
  'distant',
  'cutoff',
];

/** Plain-language names for the typed connectors, so the link dropdown doesn't speak raw jargon. */
const EDGE_LABELS: Record<EdgeKind, string> = {
  sequential: '→ leads to / transition',
  excitatory: '⊕ increases',
  inhibitory: '⊖ decreases',
  reciprocal: '⇄ mutual / reciprocal role',
  exit: '⇢ exit (a way out)',
  barrier: '║ dissociative barrier',
  containment: '◯ protects / contains',
  invocation: '⟿ invocation',
  transference: '↝ transference',
  nestedWithin: '⊂ nested within (origin)',
  close: '— close tie',
  conflict: '⚡ conflict tie',
  fused: '═ fused / enmeshed',
  distant: '┈ distant tie',
  cutoff: '⊘ cutoff / estrangement',
};

/** Common stereotypes per diagram, surfaced as a datalist so e.g. a decision diamond is discoverable. */
const STEREOTYPE_HINTS: Partial<Record<DiagramType, string[]>> = {
  'decision-nav': ['question', 'crisis', 'action', 'safe'],
  'parts-map': ['Self', 'manager', 'firefighter', 'exile'],
  'mode-map': ['healthy-adult', 'child', 'parent', 'coping'],
  'relational-field': ['male', 'female', 'nonbinary', 'unknown', 'system', 'index'],
  'two-triangles': ['defence', 'anxiety', 'hidden-feeling'],
  'process-loop': ['observing-eye'],
};

/** A filesystem-friendly slug from the diagram title (so downloads aren't all "<type>.psyuml"). */
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || ''
  );
}

/** Epistemic-status options for the per-node "how sure?" control (plain-language hints). */
const EPISTEMIC_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— certainty —' },
  { value: 'reported', label: 'reported (they said)' },
  { value: 'observed', label: 'observed (seen)' },
  { value: 'inferred', label: 'inferred (a guess)' },
  { value: 'planned', label: 'planned (intended)' },
  { value: 'symbolic', label: 'symbolic' },
  { value: 'client-believed', label: 'client believes' },
  { value: 'tradition-claimed', label: 'tradition says' },
];

// Keyed by example, not by diagram type, so school-specific profiles (e.g. the Karpman
// drama triangle, which is a Relational Field instance, spec §E.3) can sit alongside the
// base type without colliding on the type key.
// Every `examples/*.psyuml` source, loaded at build time (Vite glob), keyed by slug. A new example
// file is picked up automatically; the conformance suite (ADR-0027) keeps the corpus catalogued, and
// the gallery item with its honest note is added to EXAMPLE_CATALOG below.
const EXAMPLES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../examples/*.psyuml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([path, raw]) => [path.split('/').pop()!.replace('.psyuml', ''), raw]),
);

// The picker, grouped by the v0.2 family each example exemplifies (spec §2). Order within a
// family is preserved; `cat-sdr` sits under **Pattern** (its dedicated pattern-map type is
// future, §4) and `drama-triangle` under **Field** (it's a Relational Field instance).
// The help-site gallery: each example grouped by its v0.2 family, with the school it comes from and
// an HONEST one-line note (blurb + evidence/limit) drawn from docs/research/diagram-catalog.md. The
// note is shown beside the live editor so the library teaches the humility, not just the picture.
interface GalleryItem {
  key: string;
  label: string;
  family: DiagramFamily;
  school: string;
  note: string;
}
const SHOWCASE_ITEMS: GalleryItem[] = [
  {
    key: 'showcase-state-map',
    label: '★ State Map — full showcase',
    family: 'cycle',
    school: 'capability demo',
    note: 'Three banded states with parallel transitions, ⚑ triggers, three worded EXITS (path of hope), and the full certainty range (observed / reported / clinician-inferred + confidence). Edit it to see the audience layers.',
  },
  {
    key: 'showcase-process-loop',
    label: '★ Process / Loop — full showcase',
    family: 'cycle',
    school: 'capability demo',
    note: 'A maintaining cycle with a reinforcing-loop badge (R), a CAT loop-topology tag (trap), a ⚑ trigger and a worded way-out — plus client-believed vs clinician-inferred certainty.',
  },
  {
    key: 'showcase-parts-map',
    label: '★ Parts Map — full showcase',
    family: 'parts',
    school: 'capability demo',
    note: 'Self + managers / firefighters / an exile, every part flagged as-if (a metaphor, not a claim), a contested-origin part (⚖ IFS vs schema), containment, a polarization, and a dissociative barrier.',
  },
  {
    key: 'showcase-mode-map',
    label: '★ Mode Map — full showcase',
    family: 'parts',
    school: 'capability demo',
    note: 'Six schema modes laid out by hand with dominance weighting and the Healthy Adult negotiating — inferred vs observed vs jointly-agreed certainty.',
  },
  {
    key: 'showcase-relational-field',
    label: '★ Relational Field — full showcase',
    family: 'field',
    school: 'capability demo',
    note: 'Genogram + ecomap: the index person (double ring), all five tie kinds (close / distant / conflict / cutoff / fused), and the wider world (work, faith, services).',
  },
  {
    key: 'showcase-body-map',
    label: '★ Body Map — full showcase',
    family: 'field',
    school: 'capability demo',
    note: 'Hand-placed sensations down the body with a graded intensity scale and plain-language client labels. Go gently.',
  },
  {
    key: 'showcase-timeline',
    label: '★ Timeline — full showcase',
    family: 'journey',
    school: 'capability demo',
    note: 'A lifeline of events (reported) over the meanings made of them (client-believed / inferred / jointly-agreed → planned) across five time bands.',
  },
  {
    key: 'showcase-intervention-sequence',
    label: '★ Intervention Sequence — full showcase',
    family: 'change',
    school: 'capability demo',
    note: 'A phased, three-swimlane plan (client / therapist / support) with gate conditions on the arrows and a jointly-agreed step.',
  },
  {
    key: 'showcase-ritual',
    label: '★ Ritual — full showcase',
    family: 'ritual',
    school: 'capability demo',
    note: 'Separation → threshold → return, every act flagged symbolic, with the required non-medical framing, a secular variant, recorded consent, and a tradition-claimed element.',
  },
  {
    key: 'showcase-decision-nav',
    label: '★ Crisis chart — full showcase',
    family: 'change',
    school: 'capability demo',
    note: 'A branching safety plan with no dead ends, crisis resources on every screen, the acute-risk flag set, and a question / crisis / action / safe vocabulary. A plan, never a contract or a risk score.',
  },
  {
    key: 'showcase-resource-anchor',
    label: '★ Resource / Anchor — full showcase',
    family: 'field',
    school: 'capability demo',
    note: 'Five anchor categories (people / skills / values / soothers / places) each holding several strengths — the "path of hope", co-created and owned by the client.',
  },
  {
    key: 'showcase-two-triangles',
    label: '★ Two Triangles — full showcase',
    family: 'change',
    school: 'capability demo',
    note: 'Malan in full: the Triangle of Conflict (defence / anxiety / hidden feeling) and the Triangle of Person (current / therapist / past) linked by transference — with confidence and clinician-inferred depth flagged.',
  },
  {
    key: 'showcase-ladder',
    label: '★ Ladder — full showcase',
    family: 'change',
    school: 'capability demo',
    note: 'A 7-rung fear ladder ranked by SUDS (0–100), hardest-first, with the intensity arrow, an inferred rung (dashed), client labels and a pacing note.',
  },
  {
    key: 'showcase-three-circles',
    label: '★ Three Circles — full showcase',
    family: 'field',
    school: 'capability demo',
    note: 'The CFT threat / drive / soothing systems sized by balance (an over-active threat, a depleted soothing), each with its contents and client labels — grow the soothing system.',
  },
  {
    key: 'showcase-venn',
    label: '★ Venn — full showcase',
    family: 'parts',
    school: 'capability demo',
    note: 'DBT states of mind: two overlapping circles with the lens (Wise Mind = both) labelled, each region carrying its contents and client labels.',
  },
  {
    key: 'showcase-bullseye',
    label: "★ Bull's-eye — full showcase",
    family: 'change',
    school: 'capability demo',
    note: "The ACT values bull's-eye: six life domains plotted by how on-/off-target they're being lived (radius = the gap), with perimeter labels, leaders and client labels — closer to the centre is more value-consistent.",
  },
  {
    key: 'showcase-tree-of-life',
    label: '★ Tree of Life — full showcase',
    family: 'journey',
    school: 'capability demo',
    note: 'The narrative Tree of Life: six botanical zones (roots/ground/trunk/branches/leaves/fruits) holding a strengths-forward life portrait, with a canopy/trunk/roots silhouette and client labels — co-created, not an assessment.',
  },
  {
    key: 'showcase-schema-grid',
    label: '★ Schema grid — full showcase',
    family: 'parts',
    school: 'capability demo',
    note: "Young's full 18 Early Maladaptive Schemas sorted into the 5 schema domains, with a person's active schemas highlighted (bold outline + wedge) — a psychoeducation map, not a diagnosis.",
  },
  {
    key: 'showcase-decisional-balance',
    label: '★ Decisional balance — full showcase',
    family: 'change',
    school: 'capability demo',
    note: 'The MI 2×2: making the change vs staying the same, by benefits vs costs, on a labelled-axis grid — with the honest MI caveat that a neutral balance can deepen ambivalence, so it is a reflection, not a persuasion tool.',
  },
  {
    key: 'showcase-secure-base',
    label: '★ Secure base & safe haven — full showcase',
    family: 'field',
    school: 'capability demo',
    note: 'A generic attachment circle (Bowlby/Ainsworth): a trusted caregiver as a secure base to explore from and a safe haven to return to, with the supporting and comforting needs around the ring. Deliberately NOT the trademarked Circle of Security® programme.',
  },
];

// The gallery = the non-showcase examples DERIVED from the catalog manifest (label/family/school/note
// come from examples/catalog.json — the single source, ADR-0028) + the ★ showcase set. So a new
// example's gallery entry is its manifest row; the two cannot drift (conformance enforces the schema).
const EXAMPLE_CATALOG: GalleryItem[] = [
  ...catalogManifest.diagrams.map((d) => ({
    key: d.file.replace('.psyuml', ''),
    label: d.name,
    family: d.family.toLowerCase() as DiagramFamily,
    school: d.school,
    note: d.note,
  })),
  ...SHOWCASE_ITEMS,
];
const GALLERY_BY_KEY: Record<string, GalleryItem> = Object.fromEntries(
  EXAMPLE_CATALOG.map((x) => [x.key, x]),
);

function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Rasterize a (self-contained, deterministic) SVG string to a PNG and download it — for clinicians who
 * need a flat image to paste into notes (REQ-EXPORT-RASTER). Dependency-free: the SVG is drawn into an
 * `<Image>` and painted onto a `<canvas>` (at `scale`× for crisp output) over an opaque white ground
 * (so the transparent SVG doesn't go black in dark viewers), then exported via `canvas.toBlob`. The
 * SVG carries no external refs, so the canvas isn't tainted. PDF is via the browser's Print → Save as
 * PDF (the print stylesheet), not a bundled library.
 */
function downloadPng(filename: string, svgString: string, scale = 2): void {
  const vb = svgString.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = vb ? parseFloat(vb[1]) : 800;
  const h = vb ? parseFloat(vb[2]) : 600;
  // Some browsers need explicit width/height to decode an SVG <img> at the right size.
  const sized = svgString.replace('<svg ', `<svg width="${w}" height="${h}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

/**
 * PsyUML editor (M2 slice). Live model → render with client/clinician and monochrome
 * layers, a palette that edits the model, a screen-reader text alternative, and
 * local-first save/export. Built against docs/ux (UX-M1/M2/M3/M4/M5/M8).
 */
export function App() {
  const [model, setModel] = useState<PsyumlModel>(() => parseModel(EXAMPLES['state-map']!));
  const [example, setExample] = useState('state-map');
  // Serialized model as last loaded (sample switch / New / Open / Restore), to detect unsaved
  // edits so switching away can confirm before discarding work (eval finding).
  const [loadedJson, setLoadedJson] = useState<string>(() =>
    serializeModel(parseModel(EXAMPLES['state-map']!)),
  );
  // v0.2 §2 audience profile drives both the label layer and the interpretive surface; `layer`
  // is derived from it for validate/diff (clinician → clinician labels; client/picture → client).
  const [audience, setAudience] = useState<AudienceProfile>('clinician');
  const layer: 'clinician' | 'client' = audience === 'clinician' ? 'clinician' : 'client';
  // Default to colour: diagrams render in the accessible (redundant) Okabe–Ito palette out of
  // the box; the Monochrome toggle below remains the print / extra-safe path (ADR-0013). This is
  // the editor's initial toggle only — @psyuml/render keeps its monochrome-by-default library default.
  const [monochrome, setMonochrome] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [school, setSchool] = useState('');
  // v0.2 §K live profiles (REQ-LIVE-PROFILES/ADR-0040): a validated ExtensionProfile / cultural pack
  // loaded at runtime; its vocabulary (roleLabelsFromProfile) is applied to the render, exactly the
  // surface the built-in `school` selector uses. An invalid / un-permitted profile is NEVER applied.
  const [profile, setProfile] = useState<ExtensionProfile | null>(null);
  const [profileIssues, setProfileIssues] = useState<ProfileIssue[]>([]);
  const [compareWith, setCompareWith] = useState<PsyumlModel | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  // v0.2 §2 Composite board: an in-memory set of views of one case (a persisted multi-document
  // case file, REQ-CASE-FILE/ADR-0039). renderComposite cross-links them by shared node id.
  const [board, setBoard] = useState<PsyumlModel[]>([]);
  const [showBoard, setShowBoard] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  // REQ-I18N-LOCALIZATION (ADR-0042): view the model in any language its labels carry; an RTL locale
  // flips the diagram's writing direction. The architecture (concept ids vs localized labels) exists;
  // this makes it usable. Clamped to a language the current model actually has (no fabricated fallback).
  const langs = useMemo(() => availableLanguages(model), [model]);
  const [lang, setLang] = useState('en');
  const activeLang = langs.includes(lang) ? lang : langs[0];

  const single = useMemo(() => {
    // A loaded §K profile's vocabulary wins over the built-in school table (same `roleLabels` surface).
    const roleLabels = profile
      ? roleLabelsFromProfile(profile)
      : school
        ? roleLabelsFor(school)
        : undefined;
    // One dispatcher resolves the audience profile → layer + interpretive visibility (§2);
    // monochrome applies to every renderer (colour must stay redundant, §D); `lang` localizes labels.
    return render(model, { audience, monochrome, roleLabels, lang: activeLang });
  }, [model, audience, monochrome, school, profile, activeLang]);
  const composite = useMemo(
    () =>
      board.length ? renderComposite(board, { audience, monochrome, lang: activeLang }) : null,
    [board, audience, monochrome, activeLang],
  );
  // What's on screen / exported: the composite board when toggled on, else the single view.
  const { svg, altText } = showBoard && composite ? composite : single;

  // §K live profiles: validate a loaded profile against the §K rules (incl. the §6 cultural-permission
  // gate) and apply it ONLY if it passes — an invalid / un-permitted profile is shown but never used.
  const applyProfile = (raw: unknown): void => {
    const v = validateProfile(raw);
    setProfileIssues(v.issues);
    setProfile(v.ok && v.profile ? v.profile : null);
  };
  // Cultural-permission disclosures to surface in the UI (§6): the restricted ones lead.
  const culturalNotes = (profile?.stereotypes ?? [])
    .filter((s) => s.cultural)
    .map((s) => ({ id: s.id, ...s.cultural! }));

  // v0.2 §2: the client/picture profiles cap distinct symbol kinds for cognitive load. Surface a
  // gentle over-budget nudge (never a block; the full pictographic reduction is M14).
  const symbolKinds = useMemo(
    () =>
      new Set<string>([...model.nodes.map((n) => n.kind), ...model.edges.map((e) => e.kind)]).size,
    [model],
  );
  const symbolCap = audienceProfile(audience).maxSymbolKinds;
  const overBudget = !withinSymbolBudget(symbolKinds, audience);

  const report = useMemo(() => validate(model, { layer }), [model, layer]);
  const exportBlocked = !report.ok;
  const escalate = requiresHumanEscalation(model);
  // Explain a disabled Save/Export AT the button (eval finding: the reason was only in the
  // health panel, so a blocked export looked like a broken app).
  const firstError = report.issues.find((i) => i.severity === 'error');
  const blockReason = firstError
    ? `Can't export yet — ${firstError.message} (see Formulation health below)`
    : undefined;
  const fileBase = slugify(model.meta.title ?? '') || model.diagram;
  const dirty = useMemo(() => serializeModel(model) !== loadedJson, [model, loadedJson]);
  /** Replace the working model (sample switch / Open / New / Restore), confirming if there are
   *  unsaved edits, and reset the loaded baseline + the diagram selector. Returns whether it ran. */
  const loadModel = (next: PsyumlModel, exampleKey: string): boolean => {
    if (dirty && !window.confirm('Discard unsaved changes and load a different diagram?'))
      return false;
    setModel(next);
    setLoadedJson(serializeModel(next));
    setExample(exampleKey);
    setCompareWith(null);
    setCompareError(null);
    setVersions([]);
    return true;
  };

  // Longitudinal diff (M6): compare the loaded earlier version (before) to now (after).
  const diff = useMemo(
    () => (compareWith ? diffModels(compareWith, model, { layer }) : null),
    [compareWith, model, layer],
  );
  const diffLines = useMemo(() => (diff ? summarizeDiff(diff, layer) : []), [diff, layer]);

  // Text DSL surface (M9): show the model as editable text; apply parses it back.
  const dsl = useMemo(() => toDSL(model), [model]);
  const dslRef = useRef<HTMLTextAreaElement>(null);
  const [dslError, setDslError] = useState<string | null>(null);

  // Drag-to-reposition (hand-laid-out diagrams). A node only carries a `data-node-id` hook on
  // renderers that honor `position` (genogram / relational field), so dragging is naturally gated
  // to those — elsewhere the pointer hit-test finds nothing and it's a no-op. Coordinates map
  // client→SVG user space via getScreenCTM, so zoom/scroll/viewBox are handled.
  const diagramRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<string | null>(null);
  const draggable = svg.includes('data-node-id');
  const onDiagramPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const hit = (e.target as Element).closest('[data-node-id]');
    const id = hit?.getAttribute('data-node-id');
    if (!id) return;
    draggingId.current = id;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onDiagramPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!draggingId.current) return;
    const el = diagramRef.current?.querySelector('svg') as SVGSVGElement | null;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const u = pt.matrixTransform(ctm.inverse());
    const id = draggingId.current;
    setModel((m) => setNodePosition(m, id, u.x, u.y));
  };
  const onDiagramPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!draggingId.current) return;
    draggingId.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
  };

  // Edge legibility (ADR-0025): hovering/focusing an edge thickens it + dims the others (styles.css)
  // so you can trace ONE relationship line through a crossing. The SVG is injected as innerHTML, so
  // after each render we make its edges keyboard-focusable + screen-reader-labelled — the same
  // highlight then works from the keyboard (`:focus-visible`), not the mouse alone. Re-runs per render.
  useEffect(() => {
    const root = diagramRef.current;
    if (!root) return;
    root.querySelectorAll('[data-el^="edge:"]').forEach((el) => {
      const id = el.getAttribute('data-el')?.slice('edge:'.length);
      if (!id) return;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', edgeAriaLabel(model, id, layer));
    });
  }, [svg, model, layer]);

  // Structured authoring (add node of any kind; connect/remove links).
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeClient, setNewNodeClient] = useState('');
  const [newNodeKind, setNewNodeKind] = useState<NodeKind>('state');
  const [newNodeStereo, setNewNodeStereo] = useState('');
  const [newNodeProvenance, setNewNodeProvenance] = useState('');
  const [linkFrom, setLinkFrom] = useState('');
  const [linkTo, setLinkTo] = useState('');
  const [linkKind, setLinkKind] = useState<EdgeKind>('sequential');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkIsTrigger, setLinkIsTrigger] = useState(false);
  const stereotypeHints = STEREOTYPE_HINTS[model.diagram] ?? [];
  const nodeName = (id: string): string => {
    const n = model.nodes.find((x) => x.id === id);
    return n ? getText(n.label, layer) : id;
  };

  return (
    <main className="app">
      <header className="app__header">
        <div className="wordmark">
          <span className="wordmark__mark" aria-hidden="true">
            ◎
          </span>
          <span className="wordmark__lockup">
            <span className="wordmark__eyebrow">Case formulation, mapped.</span>
            <h1 className="app__title">
              PsyUML <span className="app__title-ed">editor</span>
            </h1>
          </span>
        </div>
        <p role="note" className="note">
          Map a person's inner / relational world as a shareable, plain-language case formulation:
          pick a diagram type, build it with the panels below, then save or export.{' '}
          <strong>Unvalidated v0.x — not a clinical instrument.</strong> Supports, and does not
          replace, professional care; it does not diagnose. Editing is local-first — nothing leaves
          your device.{' '}
          <a
            href={`${import.meta.env.BASE_URL}handbook.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Practitioner handbook
          </a>{' '}
          ·{' '}
          <a
            href={`${import.meta.env.BASE_URL}diagram-catalog.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Diagram catalogue (40+)
          </a>
          .
        </p>

        <label className="field field--title">
          Title
          <input
            aria-label="Diagram title"
            placeholder="Name this formulation…"
            value={model.meta.title ?? ''}
            onChange={(e) => setModel(setMeta(model, { title: e.target.value }))}
          />
        </label>
      </header>

      <div role="toolbar" aria-label="Editor controls" className="toolbar">
        <label className="control">
          Diagram{' '}
          <select
            value={example}
            onChange={(e) => {
              const key = e.target.value;
              // Confirm before discarding unsaved edits; revert the <select> if the user cancels.
              if (!loadModel(parseModel(EXAMPLES[key] ?? EXAMPLES['state-map']!), key))
                e.target.value = example;
            }}
          >
            {/* Grouped by v0.2 family (the question each answers, §2). */}
            {listFamilies().map((fam) => {
              const items = EXAMPLE_CATALOG.filter((x) => x.family === fam.id);
              return items.length ? (
                <optgroup key={fam.id} label={fam.title}>
                  {items.map((x) => (
                    <option key={x.key} value={x.key}>
                      {x.label}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </label>

        <label className="control">
          Audience{' '}
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as AudienceProfile)}
            title="Audience profile (v0.2 §2): same model, different visual compression. Client/picture use plain language and hide the clinician-analytic surface."
          >
            {AUDIENCE_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        {overBudget && (
          <span className="muted" role="note" aria-live="polite">
            ⚠ {symbolKinds} symbol kinds — over the {audienceProfile(audience).title} budget of{' '}
            {symbolCap}; consider simplifying for this audience.
          </span>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={monochrome}
            onChange={(e) => setMonochrome(e.target.checked)}
          />{' '}
          Monochrome
        </label>

        <label className="control">
          School{' '}
          <select value={school} onChange={(e) => setSchool(e.target.value)} disabled={!!profile}>
            <option value="">native</option>
            {TRANSLATABLE_SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label
          className="control"
          title="View the model in any language its labels carry (an RTL locale flips the diagram)"
        >
          Language{' '}
          <select
            value={activeLang}
            onChange={(e) => setLang(e.target.value)}
            disabled={langs.length < 2}
          >
            {langs.map((l) => (
              <option key={l} value={l}>
                {l}
                {isRtl(l) ? ' (rtl)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label
          className="control"
          title="Load a validated §K extension profile or cultural pack (JSON) to render in its vocabulary"
        >
          Profile (§K)
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              f.text()
                .then((txt) => applyProfile(JSON.parse(txt)))
                .catch(() =>
                  setProfileIssues([
                    {
                      rule: 'profile.parse',
                      severity: 'error',
                      message: 'Could not read that file as a JSON profile.',
                    },
                  ]),
                );
              e.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          className="link-like"
          title="Apply the worked Compassion-Focused Therapy profile"
          onClick={() => applyProfile(CFT_PROFILE)}
        >
          Try CFT
        </button>
        <button
          type="button"
          className="link-like"
          title="Apply the worked cultural-rite pack (shows the §6 permission gate)"
          onClick={() => applyProfile(CULTURAL_PACK_EXAMPLE)}
        >
          Try cultural pack
        </button>

        <label
          className="check"
          title="Clinician flag: acute risk to self or others — raises an escalation banner and requires crisis resources"
        >
          <input
            type="checkbox"
            checked={model.meta.safety.acuteRiskFlag}
            onChange={(e) => setModel(setSafetyFlag(model, 'acuteRiskFlag', e.target.checked))}
          />{' '}
          Acute risk
        </label>

        <label
          className="check"
          title="Clinician flag: psychosis indicators — symbolic / reframing work needs specialist review"
        >
          <input
            type="checkbox"
            checked={model.meta.safety.psychosisFlag}
            onChange={(e) => setModel(setSafetyFlag(model, 'psychosisFlag', e.target.checked))}
          />{' '}
          Psychosis
        </label>

        <span className="toolbar__sep" aria-hidden="true" />

        <div className="toolbar__group">
          <button
            type="button"
            title="Start a new blank diagram of the current type (your current work isn't saved unless you Save it first)"
            onClick={() => loadModel(createEmptyModel(model.diagram), example)}
          >
            New (blank)
          </button>
          <label className="control" title="Open a saved .psyuml file to keep editing it">
            Open…{' '}
            <input
              type="file"
              accept=".psyuml,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                file
                  .text()
                  .then((text) => {
                    const opened = parseModel(text);
                    // Sync the diagram selector to what was opened so the dropdown isn't out of step.
                    loadModel(opened, EXAMPLES[opened.diagram] ? opened.diagram : example);
                  })
                  .catch(() => setCompareError('Could not open that file as a .psyuml model.'));
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={exportBlocked}
            title={blockReason}
            onClick={() =>
              downloadText(`${fileBase}.psyuml`, serializeModel(model), 'application/json')
            }
          >
            Save .psyuml
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={exportBlocked}
            title={blockReason}
            onClick={() => downloadText(`${fileBase}.svg`, svg, 'image/svg+xml')}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={exportBlocked}
            title={blockReason || 'Download a PNG image (for pasting into notes)'}
            onClick={() => downloadPng(`${fileBase}.png`, svg)}
          >
            Export PNG
          </button>
          <button
            type="button"
            title="Print the diagram (use your browser's Save as PDF for a paper copy)"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            title="Save an immutable in-session snapshot you can compare or restore"
            onClick={() =>
              setVersions((vs) => [
                ...vs,
                snapshotModel(model, `Snapshot ${vs.length + 1}`, new Date().toISOString()),
              ])
            }
          >
            Snapshot
          </button>
          {versions.length > 0 && (
            <span aria-live="polite" className="badge-ok">
              ✓ {versions.length} snapshot{versions.length > 1 ? 's' : ''} saved
            </span>
          )}
          <label
            className="control"
            title="Load an earlier saved .psyuml version to see what changed"
          >
            Compare with…{' '}
            <input
              type="file"
              accept=".psyuml,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                file
                  .text()
                  .then((text) => {
                    setCompareWith(parseModel(text));
                    setCompareError(null);
                  })
                  .catch(() => {
                    setCompareWith(null);
                    setCompareError('Could not read that file as a .psyuml model.');
                  });
              }}
            />
          </label>
        </div>
      </div>

      {/* The live formulation IS the product — promoted directly under the controls so it is the
          first thing you see and work with, not buried below the panels (ADR-0026: hero = the map). */}
      <div role="group" aria-label="View controls" className="viewbar">
        <span className="muted">View:</span>
        <button
          type="button"
          className="btn-icon"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
        >
          −
        </button>
        <span aria-live="polite" className="viewbar__zoom">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="btn-icon"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
        >
          +
        </button>
        <button type="button" onClick={() => setZoom(1)} title="Reset zoom to 100% (full size)">
          Reset
        </button>
        <span className="viewbar__hint">
          {draggable
            ? 'drag a node to reposition it'
            : zoom > 1
              ? 'scroll the panel to pan'
              : 'zoom in to enlarge a dense diagram'}
        </span>
      </div>
      {!showBoard && GALLERY_BY_KEY[example] && (
        <section aria-label="About this example" className="panel panel--caption">
          <strong>{GALLERY_BY_KEY[example].label}</strong>{' '}
          <span className="muted">
            · {GALLERY_BY_KEY[example].school} ·{' '}
            {listFamilies().find((f) => f.id === GALLERY_BY_KEY[example].family)?.title} family
          </span>
          <p style={{ margin: '0.4rem 0 0' }}>{GALLERY_BY_KEY[example].note}</p>
        </section>
      )}
      <section
        aria-label={`${model.diagram} diagram`}
        className="diagram"
        lang={activeLang}
        dir={isRtl(activeLang) ? 'rtl' : 'ltr'}
      >
        <div
          ref={diagramRef}
          className="diagram__canvas"
          onPointerDown={onDiagramPointerDown}
          onPointerMove={onDiagramPointerMove}
          onPointerUp={onDiagramPointerUp}
          style={{
            width: `${zoom * 100}%`,
            touchAction: draggable ? 'none' : undefined,
            cursor: draggable ? 'grab' : undefined,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </section>

      {audience === 'picture' && (
        <section aria-label="Picture symbols in development" className="panel panel--caption">
          <strong>Picture symbols — in development</strong>{' '}
          <span className="muted">· candidates, not yet comprehension-tested</span>
          <p style={{ margin: '0.4rem 0' }}>
            The diagram above still uses words: no picture symbol has passed the comprehension gate
            (ISO 9186) yet, so none ships. These are the candidate pictographs a future study will
            test — a symbol that fails is redrawn, never shipped.
          </p>
          <div dangerouslySetInnerHTML={{ __html: pictographKeySvg() }} />
        </section>
      )}

      {compareError && (
        <p role="alert" className="alert-text">
          {compareError}
        </p>
      )}

      {diff && (
        <section aria-label="Changes since the loaded version" className="panel panel--info">
          <div className="panel__head">
            <strong>Changes since the loaded version</strong>
            <button
              type="button"
              disabled={isEmptyDiff(diff)}
              onClick={() =>
                downloadText(
                  `${model.diagram}-progress.svg`,
                  renderDiff(compareWith ?? model, model, { layer }).svg,
                  'image/svg+xml',
                )
              }
            >
              Export progress (SVG)
            </button>
            <button type="button" onClick={() => setCompareWith(null)}>
              clear
            </button>
          </div>
          {isEmptyDiff(diff) ? (
            <p style={{ margin: '6px 0 0' }}>No tracked changes.</p>
          ) : (
            <ul className="list">
              {diffLines.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {versions.length > 0 && (
        <section aria-label="Saved versions" className="panel">
          <strong>Saved versions (this session)</strong>
          <ul className="list--reset" style={{ marginTop: '0.5rem' }}>
            {versions.map((v, i) => (
              <li key={`${v.id}-${i}`} className="row">
                <span className="row__grow">
                  {v.label} · {new Date(v.at).toLocaleString()}
                </span>
                <button type="button" onClick={() => setCompareWith(restoreVersion(v))}>
                  Compare
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const restored = restoreVersion(v);
                    setModel(restored);
                    setLoadedJson(serializeModel(restored));
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(profile || profileIssues.length > 0) && (
        <section aria-label="Extension profile" className="panel panel--info">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>
              {profile ? (
                <>
                  ✓ Applied profile: {profile.title} v{profile.version}
                  {profile.school ? ` · ${profile.school}` : ''}
                </>
              ) : (
                'Profile not applied'
              )}
            </strong>
            {profile && (
              <button
                type="button"
                className="link-like"
                onClick={() => {
                  setProfile(null);
                  setProfileIssues([]);
                }}
              >
                Use built-in labels
              </button>
            )}
          </div>

          {culturalNotes.length > 0 && (
            <ul aria-label="Cultural permission" style={{ marginTop: '0.4rem' }}>
              {culturalNotes.map((c) => (
                <li key={c.id}>
                  <strong>{c.restricted ? '⚠ RESTRICTED' : 'Cultural'}</strong> — {c.tradition}.
                  {c.permission ? ` Permission: ${c.permission}` : ''}
                  {c.attribution ? ` ${c.attribution}` : ''}
                </li>
              ))}
            </ul>
          )}

          {profileIssues.length > 0 && (
            <ul aria-label="Profile validation issues" style={{ marginTop: '0.4rem' }}>
              {profileIssues.map((iss, i) => (
                <li key={i} className={iss.severity === 'error' ? 'alert-text' : 'muted'}>
                  {iss.severity === 'error' ? '✗' : iss.severity === 'warn' ? '!' : 'ℹ'} [{iss.rule}
                  ] {iss.message}
                </li>
              ))}
            </ul>
          )}
          {!profile && profileIssues.some((i) => i.severity === 'error') && (
            <p className="muted" style={{ margin: '0.3rem 0 0' }}>
              This profile was rejected by the §K rules (incl. the §6 cultural-permission gate) and
              is not applied — fix the errors above and reload.
            </p>
          )}
        </section>
      )}

      <section aria-label="Composite board" className="panel">
        <strong>Composite board (v0.2)</strong>{' '}
        <span className="muted">
          — several views of one case, cross-linked by shared node ids; save them as a case file.
        </span>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setBoard((b) => [...b, parseModel(serializeModel(model))])}
          >
            Add current view ({board.length} on board)
          </button>
          <button type="button" disabled={!board.length} onClick={() => setShowBoard((s) => !s)}>
            {showBoard ? 'Show single view' : 'Show composite board'}
          </button>
          <button
            type="button"
            disabled={!board.length}
            onClick={() => {
              setBoard([]);
              setShowBoard(false);
            }}
          >
            Clear board
          </button>
        </div>
        {board.length > 0 && (
          <ul aria-label="Views on the board">
            {board.map((doc, i) => (
              <li key={i}>
                {i + 1}. {doc.meta.title?.trim() || doc.diagram}{' '}
                <button
                  type="button"
                  className="link-like"
                  aria-label={`Remove view ${i + 1} from the board`}
                  onClick={() => setBoard((b) => b.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <label className="control" title="A name for the saved case file">
            Case title
            <input
              type="text"
              value={caseTitle}
              placeholder="e.g. R. — formulation"
              onChange={(e) => setCaseTitle(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!board.length}
            title={board.length ? undefined : 'Add at least one view to the board first'}
            onClick={() =>
              downloadText(
                `${slugify(caseTitle) || 'case'}.psyuml-case`,
                serializeCaseFile(caseFileFrom(board, { title: caseTitle || undefined })),
                'application/json',
              )
            }
          >
            Save case file
          </button>
          <label className="control" title="Open a saved .psyuml-case file of several views">
            Open case file
            <input
              type="file"
              accept=".psyuml-case,.json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                f.text()
                  .then((txt) => {
                    const cf = parseCaseFile(txt);
                    setBoard(cf.documents);
                    setCaseTitle(cf.meta.title ?? '');
                    setShowBoard(cf.documents.length > 0);
                    setCompareError(null);
                  })
                  .catch(() =>
                    setCompareError('Could not open that file as a .psyuml-case case file.'),
                  );
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </section>

      {escalate && (
        <section role="alert" aria-label="Clinical escalation" className="panel--escalate">
          <strong>⚠ Human clinical review required.</strong> A risk flag is set. This tool documents
          a formulation — it does not provide crisis care, and any AI-assisted drafting is disabled
          while a flag is active.
        </section>
      )}

      <section
        aria-label="Formulation health"
        className={`panel ${report.ok ? 'panel--ok' : 'panel--error'}`}
      >
        <strong>Formulation health:</strong>{' '}
        {report.issues.length === 0 ? (
          <span>✓ no issues</span>
        ) : (
          <ul className="list">
            {report.issues.map((iss, i) => (
              <li key={`${iss.rule}-${i}`}>
                <strong>
                  {iss.severity === 'error'
                    ? '✖ ERROR'
                    : iss.severity === 'warn'
                      ? '⚠ WARNING'
                      : 'ℹ INFO'}
                </strong>{' '}
                {iss.message}
              </li>
            ))}
          </ul>
        )}
        {exportBlocked && (
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Fix the errors above to export.
          </p>
        )}
      </section>

      <details className="panel">
        <summary>
          <strong>About these diagrams — please read</strong>
        </summary>
        <p className="note" role="note">
          PsyUML is an <strong>unvalidated v0.x</strong> communication aid. It{' '}
          <strong>supports, never replaces, professional care</strong>, and{' '}
          <strong>does not diagnose</strong>. These are teaching examples — pick one from{' '}
          <em>Diagram</em>, edit it live, switch the <em>Audience</em> (clinician / client /
          picture), and export.
        </p>
        <p>
          <strong>Honest by design.</strong> A therapy being evidenced does not mean its{' '}
          <em>diagram</em> is — the alliance, not the picture, carries most of the change, and a
          formulation is a shared hypothesis, not a truth. Sharing one can distress a meaningful
          minority, so co-create it, pace it, and keep it the client&rsquo;s. Many popular
          &ldquo;tools&rdquo; (thought records, PHQ-9, the 5&nbsp;Ps grid) are worksheets, not
          diagrams, and aren&rsquo;t included here.
        </p>
        <p className="muted">
          Browse by <strong>family</strong> in the Diagram menu — Cycle (maintaining loops), Pattern
          (CAT procedures), Parts (inner multiplicity), Field (the person&rsquo;s world), Journey
          (over time), Change (treatment direction), Ritual, Composite (several views of one case).
          Read the full{' '}
          <a
            href={`${import.meta.env.BASE_URL}diagram-catalog.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            40+ diagram catalogue
          </a>{' '}
          — every diagram with its school, what it shows, and honest evidence notes.
        </p>
      </details>

      <details className="disclose">
        <summary>Text description (screen-reader friendly)</summary>
        <p className="disclose__alt">{altText}</p>
      </details>

      <details className="disclose">
        <summary>Edit as text (DSL) — type, then click “Apply text” to update</summary>
        <p className="section-hint">
          Typing here does <strong>not</strong> change the diagram until you click{' '}
          <strong>Apply text</strong> below.
        </p>
        <textarea
          key={dsl}
          ref={dslRef}
          defaultValue={dsl}
          rows={12}
          spellCheck={false}
          aria-label="PsyUML text DSL"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            aria-label="Apply text — parse the DSL and update the diagram"
            onClick={() => {
              try {
                setModel(fromDSL(dslRef.current?.value ?? ''));
                setDslError(null);
              } catch (err) {
                setDslError(err instanceof Error ? err.message : 'Could not parse the text.');
              }
            }}
          >
            Apply text
          </button>
          {dslError && (
            <span role="alert" className="alert-text">
              {dslError}
            </span>
          )}
        </div>
      </details>

      <details className="disclose">
        <summary>Diagram details — disclaimer, crisis line</summary>
        <div className="stack stack--bordered">
          <label className="field">
            Disclaimer (required to share with a client)
            <textarea
              aria-label="Diagram disclaimer"
              rows={2}
              value={model.meta.disclaimer ?? ''}
              onChange={(e) => setModel(setMeta(model, { disclaimer: e.target.value }))}
            />
          </label>
          <label className="field">
            Crisis resources (required on a crisis chart)
            <input
              aria-label="Crisis resources"
              value={model.meta.crisisResources ?? ''}
              onChange={(e) => setModel(setMeta(model, { crisisResources: e.target.value }))}
            />
          </label>
        </div>
      </details>

      <section aria-label="Nodes" className="card editor-section">
        <h2 className="section-title">
          Nodes — add, rename in your words, mark how sure you are, hide, or remove
        </h2>
        <div role="group" aria-label="Add node" className="form-row">
          <input
            className="input--grow"
            aria-label="New node label"
            placeholder="label (clinician)…"
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
          />
          <input
            className="input--grow"
            aria-label="New node client-language label (optional)"
            placeholder="plain words (client, optional)…"
            value={newNodeClient}
            onChange={(e) => setNewNodeClient(e.target.value)}
          />
          <select
            aria-label="New node kind"
            value={newNodeKind}
            onChange={(e) => setNewNodeKind(e.target.value as NodeKind)}
          >
            {NODE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            className="input--sm"
            aria-label="New node stereotype (optional)"
            placeholder={
              stereotypeHints.length ? `e.g. ${stereotypeHints[0]}` : 'stereotype (optional)'
            }
            list="stereotype-hints"
            value={newNodeStereo}
            onChange={(e) => setNewNodeStereo(e.target.value)}
          />
          <datalist id="stereotype-hints">
            {stereotypeHints.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            className="input--sm"
            aria-label="New node provenance (optional, comma-separated schools)"
            placeholder="origin/school (optional)"
            value={newNodeProvenance}
            onChange={(e) => setNewNodeProvenance(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              setModel(
                addNode(model, newNodeLabel.trim() || 'New node', {
                  kind: newNodeKind,
                  stereotype: newNodeStereo.trim() || undefined,
                  client: newNodeClient.trim() || undefined,
                  provenance: newNodeProvenance
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }),
              );
              setNewNodeLabel('');
              setNewNodeClient('');
              setNewNodeStereo('');
              setNewNodeProvenance('');
            }}
          >
            Add node
          </button>
        </div>
        {model.diagram === 'state-map' && (
          <p className="section-hint" style={{ marginTop: 0 }}>
            Tip: the State Map draws <strong>states placed in a band</strong>. To show “what helps”,
            add it as an <strong>{EDGE_LABELS.exit}</strong> between states (below), not as a loose
            node.
          </p>
        )}
        <ul className="node-list">
          {model.nodes.map((n) => {
            const nodeIssues = report.issues.filter((iss) => iss.nodeId === n.id);
            return (
              <li key={n.id} className="node-item">
                <div className="node-item__main">
                  {nodeIssues.length > 0 && (
                    <span
                      className="node-issue"
                      title={nodeIssues.map((iss) => iss.message).join('; ')}
                      aria-label={`${nodeIssues.length} issue(s) on ${n.id}`}
                    >
                      {nodeIssues.some((iss) => iss.severity === 'error') ? '✖' : '⚠'}
                    </span>
                  )}
                  <input
                    className="node-item__label"
                    aria-label={`Label for node ${n.id}`}
                    value={getText(n.label, layer)}
                    onChange={(e) => setModel(setNodeLabel(model, n.id, e.target.value, layer))}
                  />
                  <select
                    aria-label={`Certainty for node ${n.id}`}
                    value={n.properties.epistemicStatus ?? ''}
                    onChange={(e) =>
                      setModel(
                        setNodeEpistemic(model, n.id, e.target.value as EpistemicStatus | ''),
                      )
                    }
                  >
                    {EPISTEMIC_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!n.hidden}
                      onChange={(e) => setModel(setNodeHidden(model, n.id, !e.target.checked))}
                    />{' '}
                    show
                  </label>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Remove node ${n.id}`}
                    title="Remove this node"
                    onClick={() => setModel(removeNode(model, n.id))}
                  >
                    ✕
                  </button>
                </div>
                <details className="disclose-inline">
                  <summary>more — plain words, shape, origin</summary>
                  <div className="form-grid" style={{ maxWidth: 480 }}>
                    <label className="field">
                      Plain-language (client) label
                      <input
                        aria-label={`Client label for node ${n.id}`}
                        value={n.label.client?.en ?? ''}
                        placeholder="how the client would say it"
                        onChange={(e) =>
                          setModel(setNodeLabel(model, n.id, e.target.value, 'client'))
                        }
                      />
                    </label>
                    <label className="field">
                      Stereotype (shape/role — e.g. {stereotypeHints[0] ?? 'manager'})
                      <input
                        aria-label={`Stereotype for node ${n.id}`}
                        list="stereotype-hints"
                        value={n.stereotype ?? ''}
                        onChange={(e) => setModel(setNodeStereotype(model, n.id, e.target.value))}
                      />
                    </label>
                    <label className="field">
                      Origin / school (comma-separated; co-present claims are shown, not merged)
                      <input
                        aria-label={`Provenance for node ${n.id}`}
                        value={(n.properties.provenance ?? []).join(', ')}
                        placeholder="e.g. IFS, schema"
                        onChange={(e) => setModel(setNodeProvenance(model, n.id, e.target.value))}
                      />
                    </label>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Links" className="card editor-section">
        <h2 className="section-title">Links — connect two nodes</h2>
        <ul className="link-list">
          {model.edges.map((e) => (
            <li key={e.id} className="link-item">
              <span className="row__grow">
                {nodeName(e.source)} —{e.kind}→ {nodeName(e.target)}
                {e.label ? ` (${getText(e.label, layer)})` : ''}
                {e.trigger ? ` ⚑${getText(e.trigger, layer)}` : ''}
              </span>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remove link ${e.id}`}
                title="Remove this link"
                onClick={() => setModel(removeEdge(model, e.id))}
              >
                ✕
              </button>
            </li>
          ))}
          {model.edges.length === 0 && <li className="empty-hint">No links yet.</li>}
        </ul>
        <div role="group" aria-label="Add link" className="form-row">
          <select
            aria-label="Link from"
            value={linkFrom}
            onChange={(e) => setLinkFrom(e.target.value)}
          >
            <option value="">from…</option>
            {model.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {getText(n.label, layer)}
              </option>
            ))}
          </select>
          <select
            aria-label="Link type"
            value={linkKind}
            onChange={(e) => setLinkKind(e.target.value as EdgeKind)}
          >
            {EDGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {EDGE_LABELS[k]}
              </option>
            ))}
          </select>
          <select aria-label="Link to" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
            <option value="">to…</option>
            {model.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {getText(n.label, layer)}
              </option>
            ))}
          </select>
          <input
            className="input--sm"
            aria-label="Link label (optional)"
            placeholder={linkIsTrigger ? 'trigger word…' : 'label (optional)'}
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
          />
          <label
            className="check"
            title="Mark this label as a ⚑ trigger / precipitant (drawn on the arrow)"
          >
            <input
              type="checkbox"
              checked={linkIsTrigger}
              onChange={(e) => setLinkIsTrigger(e.target.checked)}
            />{' '}
            label is a ⚑ trigger
          </label>
          <button
            type="button"
            disabled={!linkFrom || !linkTo || linkFrom === linkTo}
            onClick={() => {
              const text = linkLabel.trim() || undefined;
              setModel(
                addEdge(model, {
                  source: linkFrom,
                  target: linkTo,
                  kind: linkKind,
                  label: linkIsTrigger ? undefined : text,
                  trigger: linkIsTrigger ? text : undefined,
                }),
              );
              setLinkLabel('');
            }}
          >
            Add link
          </button>
        </div>
      </section>
    </main>
  );
}
