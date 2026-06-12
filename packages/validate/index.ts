/**
 * @psyuml/validate — well-formedness, accessibility, and clinical-safety lint (M0 skeleton).
 *
 * The four rule classes (well-formedness §A.2; accessibility §D + alt-text;
 * path-of-hope; clinical-hazard / safety-triage) land in M3.
 * Traceability: REQ-WELLFORMEDNESS, REQ-ACCESSIBILITY, REQ-PATH-OF-HOPE, REQ-SAFETY-TRIAGE.
 */

export type Severity = 'error' | 'warn' | 'info';

export interface ValidationIssue {
  rule: string;
  severity: Severity;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/** Placeholder validator — always passes until the rule classes arrive in M3. */
export function validate(): ValidationResult {
  return { ok: true, issues: [] };
}
