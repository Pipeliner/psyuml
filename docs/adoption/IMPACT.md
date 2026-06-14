# Impact — `docs/adoption/`

**Purpose:** the **adoption pack** — materials to introduce PsyUML to clinicians for **supervised
pilot use** and to put it on the path to validation: an introductory workshop + facilitator script,
a notation-extension *contributor* guide (clinicians proposing symbols/stereotypes), and **proposed,
unvalidated** comprehension/reliability/consensus instruments + a pilot-study design.
**Status:** active (content authored; the instruments are **proposed, not validated** — they extend
the Tier-B plan and are explicitly **not evidence**).
**Spec anchor / REQ:** REQ-ADOPTION (spec §J self-eval rubric / Stage-4 recommendations; §K
extension mechanism; §L.2 Ethical-Use Statement). Extends REQ-EVAL-SUITE.

## Upstream (this depends on)
- `../specification/psyuml-v0.1.0.md` (§J, §K, §L.2, the Stage-1→4 Recommendations) — the normative
  anchors the pack teaches and tests against.
- `../handbook.md`, `../cheatsheets.md`, `../style-guide.md`, `../format-reference.md` — the workshop
  teaches *from* these; the pack references rather than duplicates them.
- `../extension-guide.md` — the §K mechanics (`ExtensionProfile`, `validateProfile`,
  `psyuml lint-profile`, the four rules, the worked `CFT_PROFILE`); the contributor guide wraps the
  *process* around it.
- `../evaluation-suite.md`, `../evaluation-suite-pilot.md` — the Tier-A/Tier-B evidence plan and the
  **simulated** dry-run; the comprehension instruments operationalize Tier B for real participants.
- `../../examples/*` — the shipped diagrams used as workshop stimuli and comprehension test material.

## Downstream (depends on this) — blast radius
> **Blast radius: low (content/process).** No code depends on this pack; it is documentation. Its
> obligations run the other way — it must stay honest about PsyUML's unvalidated v0.x status and
> consistent with §L.2 and the evaluation suite.
- `sdd/traceability.json` — REQ-ADOPTION cites these files as `impl`.
- Facilitators, notation contributors, and anyone designing a Tier-B study reference them.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `README.md` | Adoption-pack index: the three parts, how they map to the spec's Stage-1→4 and to REQ-EVAL-SUITE, and the honest-framing caveats | spec §J/§K/§L.2, handbook, evaluation-suite | facilitators, contributors, study designers | REQ-ADOPTION | low |
| `workshop.md` | Runnable ≈3 h introductory workshop + facilitator script: objectives, timed agenda, hands-on exercises (State Map / loop-with-exit / Resource map), talking points, a safety/ethics segment, deck outline, feedback form | spec §B/§E/§L.2, handbook, cheatsheets, `../../examples/*` | facilitators, clinicians | REQ-ADOPTION | low |
| `extension-contributor-guide.md` | The *process* for a clinician to propose a new symbol/stereotype/profile: satisfy the four §K rules, draft an `ExtensionProfile`, validate with `psyuml lint-profile`, attach rationale/evidence, submit, review, semver | spec §K/§L.2, `../extension-guide.md`, `packages/profiles` | notation contributors | REQ-ADOPTION (extends REQ-EXTENSION-MECH) | low |
| `comprehension-instruments.md` | **Proposed, unvalidated** Tier-B instruments — layperson comprehension test (sample items + scoring), inter-rater formulation-reliability task, multi-school Delphi sketch — + a pilot-study design with go/no-go thresholds tied to the Stage-4 gate; framed as **not evidence** | spec §J/§L.2, `../evaluation-suite.md`, `../evaluation-suite-pilot.md`, `../../examples/*` | study designers, maintainers | REQ-ADOPTION (extends REQ-EVAL-SUITE) | low |

## Change checklist
- [ ] Keep the unvalidated-v0.x / supports-not-replaces / does-not-diagnose framing on every file
      (§L.2); never present the instruments as validated or their results as evidence.
- [ ] Keep the workshop teaching *from* the handbook/cheatsheets and the contributor guide building
      *on* the extension guide — reference, don't duplicate.
- [ ] Keep the comprehension instruments aligned with `evaluation-suite.md`'s Tier-B dimensions and
      the Stage-4 go/no-go gate; honour the cross-school scope (parts-family swap only; CAT excluded).
- [ ] Ran `node sdd/check.mjs` (green).
