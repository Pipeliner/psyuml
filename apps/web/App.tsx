import { useMemo, useState } from 'react';
import { getText, parseModel, serializeModel, type PsyumlModel } from '@psyuml/model';
import {
  renderDecisionChart,
  renderInterventionSeq,
  renderLoopMap,
  renderModeMap,
  renderPartsMap,
  renderRelationalField,
  renderResourceMap,
  renderRitual,
  renderStateMap,
  renderTimeline,
} from '@psyuml/render';
import { validate } from '@psyuml/validate';
import { roleLabelsFor, TRANSLATABLE_SCHOOLS } from '@psyuml/profiles';
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
import { addNode, setNodeHidden, setNodeLabel } from './editor';

const EXAMPLES: Record<string, string> = {
  'state-map': stateRaw,
  'parts-map': partsRaw,
  'mode-map': modeRaw,
  'relational-field': relRaw,
  'decision-nav': decisionRaw,
  'resource-anchor': resourceRaw,
  'process-loop': loopRaw,
  timeline: timelineRaw,
  'intervention-sequence': seqRaw,
  ritual: ritualRaw,
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
  const [layer, setLayer] = useState<'clinician' | 'client'>('clinician');
  const [monochrome, setMonochrome] = useState(true);
  const [school, setSchool] = useState('');

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
    return renderStateMap(model, { layer, monochrome });
  }, [model, layer, monochrome, school]);

  const canAdd = model.diagram === 'state-map' || model.diagram === 'parts-map';
  const addLabel = model.diagram === 'parts-map' ? 'Add part' : 'Add state';

  const report = useMemo(() => validate(model, { layer }), [model, layer]);
  const exportBlocked = !report.ok;

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
        Supports, and does not replace, professional care. It does not diagnose. Editing is
        local-first — nothing leaves your device.
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
            value={model.diagram}
            onChange={(e) => setModel(parseModel(EXAMPLES[e.target.value] ?? stateRaw))}
          >
            <option value="state-map">State Map</option>
            <option value="parts-map">Parts / Agents Map</option>
            <option value="mode-map">Schema Mode Map</option>
            <option value="relational-field">Relational Field</option>
            <option value="decision-nav">Crisis chart</option>
            <option value="resource-anchor">Resource / Anchor map</option>
            <option value="process-loop">Process / Loop</option>
            <option value="timeline">Timeline / Trajectory</option>
            <option value="intervention-sequence">Intervention Sequence</option>
            <option value="ritual">Ritual Structure</option>
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
      </div>

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

      <section aria-label="Nodes" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 6 }}>Nodes — rename in your words, or hide</h2>
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
                <label style={{ whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={!n.hidden}
                    onChange={(e) => setModel(setNodeHidden(model, n.id, !e.target.checked))}
                  />{' '}
                  show
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
