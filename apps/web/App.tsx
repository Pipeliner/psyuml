/**
 * The PsyUML web editor (M0 shell). It boots to an empty canvas; the drag-and-drop
 * editor over the 8-symbol Tier-1 core lands in M2 (REQ-EDITOR-MVP).
 */
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 720 }}>
      <h1>PsyUML</h1>
      <p>
        Visual modeling language for psychotherapy. This is the M0 scaffold — an empty canvas. The
        drag-and-drop editor lands in M2.
      </p>
      <section
        aria-label="canvas"
        style={{ border: '2px dashed #999', borderRadius: 12, height: 320 }}
      />
    </main>
  );
}
