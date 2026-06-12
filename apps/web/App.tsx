import partsMapSvg from '../../examples/parts-map.svg?raw';
import stateMapSvg from '../../examples/state-map.svg?raw';

/**
 * The PsyUML web editor shell. M1 shows the first real renders — a State Map
 * (spec §E.1) and a Parts / Agents Map (spec §E.2), drawn by @psyuml/render from
 * canonical models. The drag-and-drop editor lands in M2 (REQ-EDITOR-MVP).
 */
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 800 }}>
      <h1>PsyUML</h1>
      <p>
        A visual modeling language for psychotherapy. Below are the first rendered diagrams — a
        State Map (spec §E.1) and a Parts / Agents Map (spec §E.2), drawn from canonical models. The
        interactive editor lands in M2.
      </p>
      <section
        aria-label="State Map example render"
        style={{ border: '1px solid #ddd', borderRadius: 12, padding: '1rem' }}
        dangerouslySetInnerHTML={{ __html: stateMapSvg }}
      />
      <section
        aria-label="Parts Map example render"
        style={{ border: '1px solid #ddd', borderRadius: 12, padding: '1rem', marginTop: '1.5rem' }}
        dangerouslySetInnerHTML={{ __html: partsMapSvg }}
      />
    </main>
  );
}
