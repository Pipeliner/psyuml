# ADR-0040: live extension-profile / cultural-pack loading in the editor

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-LIVE-PROFILES (→ **implemented**) / roadmap-to-v1 §3; v0.2 §K, §6; follows ADR-0009, ADR-0019

## Context
The §K extension mechanism is real — `ExtensionProfile`/`StereotypeDef` schemas, `validateProfile`
(the four §K rules + Tier-1 freeze + glyph-collision + the §6 **cultural-permission** rule),
`roleLabelsFromProfile`, and the worked `CFT_PROFILE` / `CULTURAL_PACK_EXAMPLE` (ADR-0009, ADR-0019).
But in the **editor** it was inert: only the *built-in* `school` table was applied
(`roleLabelsFor(school)`), and a contributor's own validated profile or cultural pack could not be
**loaded and applied at runtime**. REQ-LIVE-PROFILES asks for exactly that, with the §6 permission gate
enforced in the UI.

## Decision
Let the editor **load, validate, and apply** a profile live — reusing the existing machinery, adding no
new validation.

1. **Load + validate.** A **Profile (§K)** file input reads a JSON profile; `validateProfile(raw)` runs
   the full §K rule set (incl. §6 cultural-permission). Two **Try** buttons quick-load the worked
   `CFT_PROFILE` and `CULTURAL_PACK_EXAMPLE` for discoverability + testing.
2. **Apply only if valid.** `applyProfile` sets the active profile **only when `validateProfile` returns
   `ok`** — an invalid or **un-permitted** profile is *shown with its errors and never applied* (the §6
   gate: a `restricted` symbol with no `permission` errors in `validateProfile`, so it cannot be
   applied). The applied profile's vocabulary (`roleLabelsFromProfile`) is passed to `render` as
   `roleLabels` — **the exact surface the built-in school selector already uses**; the `school` selector
   is disabled while a profile is active (the profile wins, no ambiguity).
3. **Surface the §6 permission.** A profile panel shows the applied profile (title/version/school), a
   **Use built-in labels** revert, every validation issue (errors red, warns/infos muted), and — leading
   — each cultural stereotype's **tradition + RESTRICTED flag + permission + attribution**, so a closed
   symbol's authorization travels with it.
4. **Verify.** A Playwright e2e applies the cultural pack, asserts the panel shows the applied profile +
   the **RESTRICTED** permission, and that reverting restores the built-in path.

## Consequences
- **Positive:** a school/cultural-pack author can now *see their profile applied* in the editor without
  a code change; the §6 permission gate is enforced (by the already-tested `validateProfile`) **and**
  made visible. Zero new validation logic — the editor consumes the existing `validateProfile` +
  `roleLabelsFromProfile`, so the UI can't drift from the §K rules.
- **Cost / honest scope:** "apply" = the profile's **cross-school vocabulary** (`roleLabels`), the same
  thing the built-in schools apply — the renderer does **not** yet draw a profile's *custom glyphs /
  Tier-3 symbols* (it consumes labels, not per-stereotype glyphs); that is a separate renderer change,
  future. So a loaded profile relabels matching stereotypes; it doesn't introduce new drawn marks.
  Profiles are session-only (not persisted into the model/case file). No CLI surface (the CLI already
  has `lint-profile`).
- **Impact:** `apps/web/App.tsx` (the Profile control + Try buttons + the profile panel + `applyProfile`
  + the `roleLabels` resolution), `e2e/onboarding.spec.ts` (the apply + §6 test),
  `sdd/traceability.json` (REQ → implemented). No package code change — the profiles API was already
  complete.

## Alternatives considered
- **Apply a profile's custom glyphs in the renderer too.** Deferred — the renderer is glyph-by-type, not
  by-profile-stereotype; wiring profile glyphs through every renderer (with the overlap/legibility
  invariants) is a large change out of proportion to "load + apply the vocabulary". The label surface is
  what the built-in schools use, so matching it is the honest, consistent step.
- **Skip `validateProfile` and just apply the JSON.** Rejected outright — that would bypass the §6
  cultural-permission gate (a restricted symbol could be applied without authorization) and the §K
  rules; validation-before-apply is the whole point.
- **Persist the active profile into the model / case file.** Rejected for now — a profile is a *view*
  vocabulary, not case data; coupling it to the model risks shipping someone's restricted cultural pack
  inside an exported formulation. Session-only keeps the permission boundary clean.
