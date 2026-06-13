import { useMemo, useRef, useState } from 'react';
import {
  getText,
  parseModel,
  serializeModel,
  type EpistemicStatus,
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
  addNode,
  removeNode,
  restoreVersion,
  setMeta,
  setNodeEpistemic,
  setNodeHidden,
  setNodeLabel,
  setSafetyFlag,
  snapshotModel,
  type Version,
} from './editor';

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
  const [layer, setLayer] = useState<'clinician' | 'client'>('clinician');
  const [monochrome, setMonochrome] = useState(true);
  const [school, setSchool] = useState('');
  const [compareWith, setCompareWith] = useState<PsyumlModel | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  const { svg, altText } = useMemo(() => {
    const roleLabels = school ? roleLabelsFor(school) : undefined;
    if (model.diagram === 'parts-map')
      return renderPartsMap(model, { layer, monochrome, roleLabels });
    if (model.diagram === 'decision-nav') return renderDecisionChart(model, { layer });
    if (model.diagram === 'resource-anchor') return renderResourceMap(model, { layer });
    if (model.diagram === 'process-loop') return renderLoopMap(model, { layer });
    if (model.diagram === 'timeline') return renderTimeline(model, { layer });
    if (model.diagram === 'intervention-sequence') return renderInterventionSeq(model, { layer });
    if (model.diagram === 'ritual') return renderRitual(model, { layer });
    if (model.diagram === 'relational-field') return renderRelationalField(model, { layer });
    if (model.diagram === 'mode-map') return renderModeMap(model, { layer });
    if (model.diagram === 'body-map') return renderBodyMap(model, { layer });
    if (model.diagram === 'two-triangles') return renderTwoTriangles(model, { layer });
    return renderStateMap(model, { layer, monochrome });
  }, [model, layer, monochrome, school]);

  const canAdd = model.diagram === 'state-map' || model.diagram === 'parts-map';
  const addLabel = model.diagram === 'parts-map' ? 'Add part' : 'Add state';

  const report = useMemo(() => validate(model, { layer }), [model, layer]);
  const exportBlocked = !report.ok;
  const escalate = requiresHumanEscalation(model);

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

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '1.5rem',
        maxWidth: 860,
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: 4 }}>PsyUML editor</h1>
      <p role="note" style={{ margin: '0 0 1rem', color: '#444', fontSize: 14 }}>
        <strong>Unvalidated v0.x — not a clinical instrument.</strong> Supports, and does not
        replace, professional care. It does not diagnose. Editing is local-first — nothing leaves
        your device.
      </p>

      <div
        role="toolbar"
        aria-label="Editor controls"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <label>
          Diagram{' '}
          <select
            value={example}
            onChange={(e) => {
              setExample(e.target.value);
              setModel(parseModel(EXAMPLES[e.target.value] ?? stateRaw));
              setCompareWith(null);
              setCompareError(null);
              setVersions([]);
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

        <label>
          Layer{' '}
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value as 'clinician' | 'client')}
          >
            <option value="clinician">Clinician</option>
            <option value="client">Client (plain language)</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={monochrome}
            onChange={(e) => setMonochrome(e.target.checked)}
          />{' '}
          Monochrome
        </label>

        <label>
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

        <label title="Clinician flag: acute risk to self or others — raises an escalation banner and requires crisis resources">
          <input
            type="checkbox"
            checked={model.meta.safety.acuteRiskFlag}
            onChange={(e) => setModel(setSafetyFlag(model, 'acuteRiskFlag', e.target.checked))}
          />{' '}
          Acute risk
        </label>

        <label title="Clinician flag: psychosis indicators — symbolic / reframing work needs specialist review">
          <input
            type="checkbox"
            checked={model.meta.safety.psychosisFlag}
            onChange={(e) => setModel(setSafetyFlag(model, 'psychosisFlag', e.target.checked))}
          />{' '}
          Psychosis
        </label>

        <button
          type="button"
          disabled={!canAdd}
          onClick={() =>
            setModel(addNode(model, addLabel === 'Add part' ? 'New part' : 'New state'))
          }
        >
          {addLabel}
        </button>
        <button
          type="button"
          disabled={exportBlocked}
          onClick={() =>
            downloadText(`${model.diagram}.psyuml`, serializeModel(model), 'application/json')
          }
        >
          Save .psyuml
        </button>
        <button
          type="button"
          disabled={exportBlocked}
          onClick={() => downloadText(`${model.diagram}.svg`, svg, 'image/svg+xml')}
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
        <label title="Load an earlier saved .psyuml version to see what changed">
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

      {compareError && (
        <p role="alert" style={{ color: '#d55e00', fontSize: 14 }}>
          {compareError}
        </p>
      )}

      {diff && (
        <section
          aria-label="Changes since the loaded version"
          style={{
            border: '1px solid #ddd',
            borderLeft: '4px solid #0072b2',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
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
            style={{ marginLeft: 8 }}
          >
            Export progress (SVG)
          </button>
          <button type="button" onClick={() => setCompareWith(null)} style={{ marginLeft: 8 }}>
            clear
          </button>
          {isEmptyDiff(diff) ? (
            <p style={{ margin: '6px 0 0' }}>No tracked changes.</p>
          ) : (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {diffLines.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {versions.length > 0 && (
        <section
          aria-label="Saved versions"
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          <strong>Saved versions (this session)</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {versions.map((v, i) => (
              <li
                key={`${v.id}-${i}`}
                style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  {v.label} · {new Date(v.at).toLocaleString()}
                </span>
                <button type="button" onClick={() => setCompareWith(restoreVersion(v))}>
                  Compare
                </button>
                <button type="button" onClick={() => setModel(restoreVersion(v))}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {escalate && (
        <section
          role="alert"
          aria-label="Clinical escalation"
          style={{
            border: '2px solid #d55e00',
            background: '#fff4ec',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          <strong>⚠ Human clinical review required.</strong> A risk flag is set. This tool documents
          a formulation — it does not provide crisis care, and any AI-assisted drafting is disabled
          while a flag is active.
        </section>
      )}

      <section
        aria-label="Formulation health"
        style={{
          border: '1px solid #ddd',
          borderLeft: `4px solid ${report.ok ? '#009e73' : '#d55e00'}`,
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 12,
          fontSize: 14,
        }}
      >
        <strong>Formulation health:</strong>{' '}
        {report.issues.length === 0 ? (
          <span>✓ no issues</span>
        ) : (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
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
          <p style={{ margin: '6px 0 0', color: '#555' }}>Fix the errors above to export.</p>
        )}
      </section>

      <section
        aria-label={`${model.diagram} diagram`}
        style={{ border: '1px solid #ddd', borderRadius: 12, padding: '1rem', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <details style={{ marginTop: 12 }}>
        <summary>Text description (screen-reader friendly)</summary>
        <p style={{ fontSize: 14 }}>{altText}</p>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Text (DSL) — read, copy, or edit as text</summary>
        <textarea
          key={dsl}
          ref={dslRef}
          defaultValue={dsl}
          rows={12}
          spellCheck={false}
          aria-label="PsyUML text DSL"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            marginTop: 6,
          }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <button
            type="button"
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
            <span role="alert" style={{ color: '#d55e00', fontSize: 13 }}>
              {dslError}
            </span>
          )}
        </div>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Diagram details — title, disclaimer, crisis line</summary>
        <div style={{ display: 'grid', gap: 8, marginTop: 8, maxWidth: 560 }}>
          <label style={{ display: 'grid', gap: 2, fontSize: 14 }}>
            Title
            <input
              aria-label="Diagram title"
              value={model.meta.title ?? ''}
              onChange={(e) => setModel(setMeta(model, { title: e.target.value }))}
            />
          </label>
          <label style={{ display: 'grid', gap: 2, fontSize: 14 }}>
            Disclaimer (required to share with a client)
            <textarea
              aria-label="Diagram disclaimer"
              rows={2}
              value={model.meta.disclaimer ?? ''}
              onChange={(e) => setModel(setMeta(model, { disclaimer: e.target.value }))}
            />
          </label>
          <label style={{ display: 'grid', gap: 2, fontSize: 14 }}>
            Crisis resources (required on a crisis chart)
            <input
              aria-label="Crisis resources"
              value={model.meta.crisisResources ?? ''}
              onChange={(e) => setModel(setMeta(model, { crisisResources: e.target.value }))}
            />
          </label>
        </div>
      </details>

      <section aria-label="Nodes" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 6 }}>
          Nodes — rename in your words, mark how sure you are, hide, or remove
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {model.nodes.map((n) => {
            const nodeIssues = report.issues.filter((iss) => iss.nodeId === n.id);
            return (
              <li key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {nodeIssues.length > 0 && (
                  <span
                    title={nodeIssues.map((iss) => iss.message).join('; ')}
                    aria-label={`${nodeIssues.length} issue(s) on ${n.id}`}
                    style={{ fontWeight: 700 }}
                  >
                    {nodeIssues.some((iss) => iss.severity === 'error') ? '✖' : '⚠'}
                  </span>
                )}
                <input
                  aria-label={`Label for node ${n.id}`}
                  value={getText(n.label, layer)}
                  onChange={(e) => setModel(setNodeLabel(model, n.id, e.target.value, layer))}
                  style={{ flex: 1, minWidth: 0, padding: '4px 8px' }}
                />
                <select
                  aria-label={`Certainty for node ${n.id}`}
                  value={n.properties.epistemicStatus ?? ''}
                  onChange={(e) =>
                    setModel(setNodeEpistemic(model, n.id, e.target.value as EpistemicStatus | ''))
                  }
                >
                  {EPISTEMIC_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label style={{ whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={!n.hidden}
                    onChange={(e) => setModel(setNodeHidden(model, n.id, !e.target.checked))}
                  />{' '}
                  show
                </label>
                <button
                  type="button"
                  aria-label={`Remove node ${n.id}`}
                  title="Remove this node"
                  onClick={() => setModel(removeNode(model, n.id))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
