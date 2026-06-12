import stateMapSvg from '../../examples/state-map.svg?raw';

/**
 * The PsyUML web editor shell. M1 shows the first real render — a State Map
 * (spec §E.1) drawn by @psyuml/render from the canonical model. The drag-and-drop
 * editor over the 8-symbol Tier-1 core lands in M2 (REQ-EDITOR-MVP).
 */
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 760 }}>
      <h1>PsyUML</h1>
      <p>
        A visual modeling language for psychotherapy. Below is the first rendered diagram — a State
        Map (spec §E.1), drawn from the canonical model. The interactive editor lands in M2.
      </p>
      <section
        aria-label="State Map example render"
        style={{ border: '1px solid #ddd', borderRadius: 12, padding: '1rem' }}
        dangerouslySetInnerHTML={{ __html: stateMapSvg }}
      />
    </main>
  );
}
