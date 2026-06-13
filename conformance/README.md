# Conformance suite (spec §J)

Executable, spec-level invariants over the whole `examples/` corpus and every diagram
type — the runnable form of the spec's self-evaluation (§J). Runs under `pnpm test`
(and CI) via `vitest`.

For each example it asserts:

| Check | Spec basis |
|---|---|
| **Round-trip** model → JSON → model is lossless | §A; "the single most load-bearing architectural choice" (ARCH §2/§12) |
| **Validation** passes in both clinician and client layers | §A.2, §D, §L.2 (path-of-hope, crisis, disclaimer, ritual, a11y) |
| **Accessible SVG** — `role="img"` + `aria-label` + a non-empty text alternative, in both layers | §D, WCAG 2.2 1.1.1 |
| **Monochrome by default** — no Okabe–Ito hue appears in a default render | §D (colour is always redundant) |
| **Coverage** — every renderer-backed diagram type has an example | §E catalog |

Leaving **v0.x → v1.0** stays gated on the spec's **Stage-4 clinical evidence**
(layperson comprehension of the crisis chart, inter-rater reliability, multi-school
endorsement; see `docs/ROADMAP.md` M10 and `docs/ux/` open questions) — green code here
is necessary, not sufficient.
