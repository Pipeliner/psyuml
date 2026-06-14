# PsyUML

**A unified, cross-school, dual-audience visual modeling language for psychotherapy —
and the tooling to draw it.** PsyUML is to psychotherapy case-formulation what
UML/SysML is to software: a small, hand-drawable core ontology (8 element types,
8 core symbols) that every diagram type instantiates, progressively enrichable
with clinician annotations and school-specific overlays.

It exists to fill a documented gap: in one audit of 150 psychiatric assessment
letters, **94% contained no case formulation at all** (Abbas et al., *Academic
Psychiatry* 2013). PsyUML aims to make a shareable, plain-language formulation
something you can sketch in two minutes.

> ⚠️ **Clinical status: unvalidated v0.x.** PsyUML is a design grounded in notation
> science and clinical source traditions, **not** a tested clinical instrument. The
> *software* is working, but leaving v0.x for a clinical 1.0 stays gated on real-world
> evidence (layperson comprehension, inter-rater reliability, multi-school endorsement).
> It **supports, never replaces, professional care**, and does not diagnose.
> See the [Ethical-Use Statement](docs/specification/psyuml-v0.1.0.md) (§L.2).

## What's in this repo

The **language spec**, an **SDD harness**, and **working tooling** — a TypeScript monorepo
implementing the editor, the libraries, a conformance suite, and a CLI (roadmap M1–M9).

```sh
pnpm install
pnpm run verify              # sdd:check + format:check + lint + typecheck + test + build
pnpm run dev                 # run the web editor (apps/web)

pnpm run build:cli           # bundle the CLI to dist/cli/psyuml.mjs
node dist/cli/psyuml.mjs help        # lint | render | convert | redact
node dist/cli/psyuml.mjs lint examples/*.psyuml
```

| Document | What it is |
|---|---|
| [`docs/specification/psyuml-v0.1.0.md`](docs/specification/psyuml-v0.1.0.md) | **The language spec** (v0.1.0) — core ontology, notation, the diagram types, ritual modality, cross-school compatibility, worked case, ethics. The source of truth. |
| [`docs/format-reference.md`](docs/format-reference.md) | **Authoring quickstart** — field-level `.psyuml` reference (every field, range, default), a per-diagram quick-guide, and the validation rules to satisfy. |
| [`docs/cheatsheets.md`](docs/cheatsheets.md) | **Quick references** — one page for clinicians (glyphs, connectors, which diagram, safety gates) and one plain-language page for clients. |
| [`docs/style-guide.md`](docs/style-guide.md) | **Visual notation style guide** — glyph forms, colour/line semantics (colour stays redundant), encoding conventions, ritual cultural-sensitivity. |
| [`docs/handbook.md`](docs/handbook.md) | **Practitioner handbook** — how to use PsyUML in practice: choosing a diagram, per-diagram how-tos, co-creating in session, safety/ethics, exercises, and the honest limits. |
| [`docs/extension-guide.md`](docs/extension-guide.md) | **Extending PsyUML (§K)** — add a school/symbol via a profile + stereotypes (the four rules, semver, deprecation); validate it with `psyuml lint-profile`. |
| [`docs/adoption/`](docs/adoption/) | **Adoption pack** — a runnable clinician **workshop + facilitator script**, the notation-extension **contributor guide** (clinicians proposing symbols), and **proposed, unvalidated** comprehension/reliability/consensus **instruments + pilot-study design** (extends the evaluation suite; not evidence). |
| [`docs/evaluation-suite.md`](docs/evaluation-suite.md) | **Evaluation suite** — what's automated-and-green vs. the human studies still owed before a clinical v1.0 (the Stage-4 gate). |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the tooling is built: the one-model/many-school-views design, metamodel, rendering pipeline, validation, tech stack, repo layout. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The milestone plan (M0–M10) and what's implemented vs. still planned. |
| [`sdd/README.md`](sdd/README.md) | The Spec-Driven Development harness: traceability registry + per-directory `IMPACT.md` impact analysis, enforced by `sdd/check.mjs` in CI. |
| [`docs/research/`](docs/research/) | Two companion research papers (saved verbatim) + [`idea-incorporation.md`](docs/research/idea-incorporation.md): which of their ideas were **adopted, adapted, or rejected** — and why. |

Code lives in `packages/` (`@psyuml/model · validate · render · profiles · diff · grammar ·
privacy · ai · cli`), `apps/web` (the editor), `conformance/` (the executable spec suite),
and `assets/` (color tokens + the 8 core glyphs). For the precise state of each requirement,
see `sdd/traceability.json` (statuses) and the per-directory `IMPACT.md` files.

## What it does

A **web-based, visual GUI editor** (TypeScript) where a clinician — and, in the
client layer, a client — can build, render, and version PsyUML formulations:

- Drag-and-drop the **8-symbol Tier-1 core**, then enrich with Tier-2/3 overlays.
- **Cross-school, honestly:** a Parts Map re-labels its **vocabulary** across IFS / schema /
  structural-dissociation / TA without changing structure; other traditions (polyvagal, CAT/SDR,
  genogram, Malan, Karpman, ritual) are their **own diagram types** — a CBT loop and a CAT
  reformulation are genuinely different formulations, not one relabelled. Provenance tags record
  each element's origin so a school's claims aren't silently merged.
- **Dual-audience:** toggle a clinician layer and a plain, non-pathologizing client layer.
- **Accessibility-first:** no meaning by color alone; monochrome-printable; hand-drawable.
- **Safe-by-construction:** client-facing diagrams require a disclaimer + crisis
  resources; a "path of hope" lint blocks hopeless-only diagrams in the client layer.
- **Longitudinal:** version formulations across sessions and render a progress **diff**.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the build sequence and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design.

## Design commitments (non-negotiable)

- **Formulation-level, not diagnosis.** PsyUML asserts nothing nosological (spec §A.3); the AI-assist is a bounded, human-in-the-loop *draft* aid — never an autonomous analyst or diagnoser. Its guardrails (consent → PII-minimization → safety-triage halt → low-confidence, never auto-applied) ship in `@psyuml/ai`; the narrative→suggestion model is a pluggable seam (default no-op, so no LLM runs unless one is plugged in).
- **Honest ritual framing.** Ritual is a first-class modality framed per the evidence: it reliably affects *subjective* anxiety, control, and meaning, and does **not** reliably change *objective* disease markers. Every ritual template ships a secular variant. (spec §F, §L.2-r3.)
- **Collaborative & consent-based.** Diagrams are co-drawn; the client retains authorship and the right to relabel.

## License

TBD with the repository owner.
