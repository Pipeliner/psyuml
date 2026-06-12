/**
 * @psyuml/render — model → SVG rendering (M0 skeleton).
 *
 * The real pipeline (profile transform → layout → scene graph → SVG, with
 * monochrome, legend, alt-text, and the 8 core glyphs in ../../assets/glyphs)
 * lands in M1. Traceability: REQ-NOTATION, REQ-ACCESSIBILITY.
 */

/** Placeholder render: an accessible, empty SVG with an aria-label. */
export function renderPlaceholder(label = 'PsyUML'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label} placeholder"></svg>`;
}
