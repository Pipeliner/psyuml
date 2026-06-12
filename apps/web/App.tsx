import { useMemo, useState } from 'react';
import { parseModel, serializeModel, type PsyumlModel } from '@psyuml/model';
import { renderPartsMap, renderStateMap } from '@psyuml/render';
import stateRaw from '../../examples/state-map.psyuml?raw';
import partsRaw from '../../examples/parts-map.psyuml?raw';
import { addNode } from './editor';

const EXAMPLES: Record<string, string> = {
  'state-map': stateRaw,
  'parts-map': partsRaw,
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
 * PsyUML editor (M2, first slice). Live model → render with client/clinician and
 * monochrome layers, a palette that edits the model, a screen-reader text
 * alternative, and local-first save/export. Built against docs/ux (UX-M1/M2/M3/M5/M8).
 */
export function App() {
  const [model, setModel] = useState<PsyumlModel>(() => parseModel(stateRaw));
  const [layer, setLayer] = useState<'clinician' | 'client'>('clinician');
  const [monochrome, setMonochrome] = useState(true);

  const { svg, altText } = useMemo(
    () =>
      model.diagram === 'parts-map'
        ? renderPartsMap(model, { layer, monochrome })
        : renderStateMap(model, { layer, monochrome }),
    [model, layer, monochrome],
  );

  const isParts = model.diagram === 'parts-map';

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

        <button
          type="button"
          onClick={() => setModel(addNode(model, isParts ? 'New part' : 'New state'))}
        >
          {isParts ? 'Add part' : 'Add state'}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(`${model.diagram}.psyuml`, serializeModel(model), 'application/json')
          }
        >
          Save .psyuml
        </button>
        <button
          type="button"
          onClick={() => downloadText(`${model.diagram}.svg`, svg, 'image/svg+xml')}
        >
          Export SVG
        </button>
      </div>

      <section
        aria-label={`${model.diagram} diagram`}
        style={{ border: '1px solid #ddd', borderRadius: 12, padding: '1rem', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <details style={{ marginTop: 12 }}>
        <summary>Text description (screen-reader friendly)</summary>
        <p style={{ fontSize: 14 }}>{altText}</p>
      </details>
    </main>
  );
}
