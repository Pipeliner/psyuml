# Impact — `packages/grammar/` (`@psyuml/grammar`)

**Purpose:** a human-writable **text DSL** for the model (M9) — `toDSL` / `fromDSL` with a
lossless round-trip against the canonical corpus. The authoring/diff-friendly surface that
complements the JSON `.psyuml` form; the base for a future `psyuml` CLI and a text view in
the editor.
**Status:** active (M9 — DSL ⇄ model round-trip; CLI binary still to come)
**Spec anchor / REQ:** REQ-TEXT-DSL (§B/§C notation tables are authoritative)

## Upstream (this depends on)
- `@psyuml/model` (`parseModel` for validation/defaults; `Label`/`PsyumlModel` types).
- `../../docs/specification/psyuml-v0.1.0.md` §B, §C (the notation it textualizes).

## Downstream (depends on this) — blast radius
> **Blast radius: low.** A pure leaf library. A future CLI + an editor text view read it.
> The round-trip invariant is pinned by the corpus test.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `package.json` | Workspace manifest (`@psyuml/grammar`) | — | workspace resolution | — | low |
| `index.ts` | `toDSL(model)` / `fromDSL(text)` — line-oriented surface; omit-defaults + `labeljson` escape keep it terse yet lossless | `@psyuml/model` | CLI, editor (future) | §B, §C / REQ-TEXT-DSL | low |
| `index.test.ts` | Corpus round-trip (`fromDSL(toDSL(m)) == m`) + quoting/multi-lang/position/loop/trigger cases | `index.ts`, `examples/*.psyuml` | CI `test` | REQ-TEXT-DSL | low |

## Change checklist
- [ ] A new model field ⇒ add it to `toDSL`/`fromDSL` (and prefer omit-on-default) or the round-trip breaks.
- [ ] Keep JSON (`@psyuml/model`) the canonical lossless format; the DSL targets the model's `lang`.
- [ ] Ran `node sdd/check.mjs` (green).
