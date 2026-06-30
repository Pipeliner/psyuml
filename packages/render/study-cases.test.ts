/**
 * Simulated visual-quality study (REQ-VISUAL-QUALITY-STUDY, ADR-0055).
 *
 * Renders every deliberately-complex study case (packages/render/study-cases.ts) in BOTH audience
 * layers and asserts `checkVisualQuality` finds zero violations — so the renderers must survive
 * adversarial, custom-detailed input (many nodes, long labels, every optional channel), not just the
 * hand-tuned showcase corpus. This is the machine-checkable DRAWING + legibility half of the
 * evaluation suite; the human comprehension study stays the v1.0 gate (REQ-STUDY-PREREG).
 */
import { describe, expect, it } from 'vitest';
import { render } from './index';
import { STUDY_CASES, checkVisualQuality, type StudyCase } from './study-cases';

describe('simulated visual-quality study (REQ-VISUAL-QUALITY-STUDY, ADR-0055)', () => {
  it('the study exercises a spread of genuinely complex, custom-detailed diagrams', () => {
    expect(STUDY_CASES.length, 'enough study cases').toBeGreaterThanOrEqual(6);
    // distinct diagram types, each dense
    const types = new Set(STUDY_CASES.map((c) => c.model.diagram));
    expect(types.size, 'cases span several diagram types').toBeGreaterThanOrEqual(6);
    for (const c of STUDY_CASES)
      expect(c.model.nodes.length, `${c.name} is dense`).toBeGreaterThanOrEqual(6);
  });

  describe.each(STUDY_CASES.map((c): [string, StudyCase] => [c.name, c]))('%s', (_name, c) => {
    for (const audience of ['clinician', 'client'] as const) {
      it(`renders with clean visual quality (${audience})`, () => {
        const svg = render(c.model, { audience }).svg;
        const violations = checkVisualQuality(svg, `${c.name}/${audience}`, c.model.diagram);
        expect(violations, `\nstresses: ${c.stresses}\n${violations.join('\n')}`).toEqual([]);
      });
    }
  });
});
