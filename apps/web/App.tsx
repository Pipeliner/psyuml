import { useMemo, useRef, useState } from 'react';
import {
  createEmptyModel,
  getText,
  parseModel,
  serializeModel,
  type DiagramType,
  type EdgeKind,
  type EpistemicStatus,
  type NodeKind,
  type PsyumlModel,
} from '@psyuml/model';
import { fromDSL, toDSL } from '@psyuml/grammar';
import {
  renderBodyMap,
  renderDecisionChart,
  renderDiff,
  renderInterventionSeq,
  renderLoopMap,
  renderModeMap,
  renderPartsMap,
  renderRelationalField,
  renderResourceMap,
  renderRitual,
  renderStateMap,
  renderTimeline,
  renderTwoTriangles,
} from '@psyuml/render';
import { requiresHumanEscalation, validate } from '@psyuml/validate';
import { roleLabelsFor, TRANSLATABLE_SCHOOLS } from '@psyuml/profiles';
import { diffModels, isEmptyDiff, summarizeDiff } from '@psyuml/diff';
import stateRaw from '../../examples/state-map.psyuml?raw';
import partsRaw from '../../examples/parts-map.psyuml?raw';
import decisionRaw from '../../examples/decision-nav.psyuml?raw';
import resourceRaw from '../../examples/resource-anchor.psyuml?raw';
import loopRaw from '../../examples/process-loop.psyuml?raw';
import timelineRaw from '../../examples/timeline.psyuml?raw';
import seqRaw from '../../examples/intervention-sequence.psyuml?raw';
import ritualRaw from '../../examples/ritual.psyuml?raw';
import relRaw from '../../examples/relational-field.psyuml?raw';
import modeRaw from '../../examples/mode-map.psyuml?raw';
import bodyRaw from '../../examples/body-map.psyuml?raw';
import dramaRaw from '../../examples/drama-triangle.psyuml?raw';
import twoTriRaw from '../../examples/two-triangles.psyuml?raw';
import catSdrRaw from '../../examples/cat-sdr.psyuml?raw';
import {
  addEdge,
  addNode,
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
const EXAMPLES: Record<string, string> = {
  'state-map': stateRaw,
  'parts-map': partsRaw,
  'mode-map': modeRaw,
  'relational-field': relRaw,
  'drama-triangle': dramaRaw,
  'body-map': bodyRaw,
  'decision-nav': decisionRaw,
  'resource-anchor': resourceRaw,
  'process-loop': loopRaw,
  'cat-sdr': catSdrRaw,
  timeline: timelineRaw,
  'intervention-sequence': seqRaw,
  ritual: ritualRaw,
  'two-triangles': twoTriRaw,
};

function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * PsyUML editor (M2 slice). Live model → render with client/clinician and monochrome
 * layers, a palette that edits the model, a screen-reader text alternative, and
 * local-first save/export. Built against docs/ux (UX-M1/M2/M3/M4/M5/M8).
 */
export function App() {
  const [model, setModel] = useState<PsyumlModel>(() => parseModel(stateRaw));
  const [example, setExample] = useState('state-map');
  // Serialized model as last loaded (sample switch / New / Open / Restore), to detect unsaved
  // edits so switching away can confirm before discarding work (eval finding).
  const [loadedJson, setLoadedJson] = useState<string>(() => serializeModel(parseModel(stateRaw)));
  const [layer, setLayer] = useState<'clinician' | 'client'>('clinician');
  // Default to colour: diagrams render in the accessible (redundant) Okabe–Ito palette out of
  // the box; the Monochrome toggle below remains the print / extra-safe path (ADR-0013). This is
  // the editor's initial toggle only — @psyuml/render keeps its monochrome-by-default library default.
  const [monochrome, setMonochrome] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [school, setSchool] = useState('');
  const [compareWith, setCompareWith] = useState<PsyumlModel | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  const { svg, altText } = useMemo(() => {
    const roleLabels = school ? roleLabelsFor(school) : undefined;
    // monochrome applies to every renderer (color must stay redundant, §D) — not just the two
    // that used to receive it, which made the toggle look like a no-op for most diagram types.
    const o = { layer, monochrome };
    if (model.diagram === 'parts-map') return renderPartsMap(model, { ...o, roleLabels });
    if (model.diagram === 'decision-nav') return renderDecisionChart(model, o);
    if (model.diagram === 'resource-anchor') return renderResourceMap(model, o);
    if (model.diagram === 'process-loop') return renderLoopMap(model, o);
    if (model.diagram === 'timeline') return renderTimeline(model, o);
    if (model.diagram === 'intervention-sequence') return renderInterventionSeq(model, o);
    if (model.diagram === 'ritual') return renderRitual(model, o);
    if (model.diagram === 'relational-field') return renderRelationalField(model, o);
    if (model.diagram === 'mode-map') return renderModeMap(model, o);
    if (model.diagram === 'body-map') return renderBodyMap(model, o);
    if (model.diagram === 'two-triangles') return renderTwoTriangles(model, o);
    return renderStateMap(model, o);
  }, [model, layer, monochrome, school]);

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
        <h1 className="app__title">PsyUML editor</h1>
        <p role="note" className="note">
          Map a person's inner / relational world as a shareable, plain-language case formulation:
          pick a diagram type, build it with the panels below, then save or export.{' '}
          <strong>Unvalidated v0.x — not a clinical instrument.</strong> Supports, and does not
          replace, professional care; it does not diagnose. Editing is local-first — nothing leaves
          your device. <a href="../docs/handbook.md">Practitioner handbook</a>.
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
              if (!loadModel(parseModel(EXAMPLES[key] ?? stateRaw), key)) e.target.value = example;
            }}
          >
            <option value="state-map">State Map</option>
            <option value="parts-map">Parts / Agents Map</option>
            <option value="mode-map">Schema Mode Map</option>
            <option value="relational-field">Relational Field</option>
            <option value="drama-triangle">Drama triangle (TA)</option>
            <option value="body-map">Body Map</option>
            <option value="decision-nav">Crisis chart</option>
            <option value="resource-anchor">Resource / Anchor map</option>
            <option value="process-loop">Process / Loop</option>
            <option value="cat-sdr">CAT reformulation (SDR)</option>
            <option value="timeline">Timeline / Trajectory</option>
            <option value="intervention-sequence">Intervention Sequence</option>
            <option value="ritual">Ritual Structure</option>
            <option value="two-triangles">Two Triangles (Malan)</option>
          </select>
        </label>

        <label className="control">
          Layer{' '}
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value as 'clinician' | 'client')}
          >
            <option value="clinician">Clinician</option>
            <option value="client">Client (plain language)</option>
          </select>
        </label>

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
          <select value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="">native</option>
            {TRANSLATABLE_SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

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
      <section aria-label={`${model.diagram} diagram`} className="diagram">
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
