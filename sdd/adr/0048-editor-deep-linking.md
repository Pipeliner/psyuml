# ADR-0048: editor deep-linking — `?example=<key>` opens a specific diagram (browse → edit)

- **Status:** accepted
- **Date:** 2026-06-28
- **Deciders:** project owner + maintainer
- **Spec / REQ touched:** REQ-DEEP-LINK (→ **implemented**) / §D (editor UX); serves REQ-EXAMPLE-LIBRARY, REQ-SHOWCASE-PAGE

## Context

The showcase page (ADR-0044) lets a newcomer browse a worked example of every diagram type, but its
only path into the editor was the root link — landing on the default `state-map`, not the diagram the
reader was just looking at. The browse → edit flow was broken: "I like this parts-map, let me edit
it" meant browsing the gallery again to re-find it. The editor had no way to open a named example
from a URL (no query-param handling at all), so neither the showcase nor a shared/bookmarked link
could target a specific diagram.

## Decision

1. **Read a deep-link on load.** A pure, node-testable helper `exampleKeyFromQuery(search, available,
   fallback)` (in `apps/web/editor.ts`) returns the `?example=<key>` value IF it names a shipped
   example, else the fallback. The editor resolves it once at mount (from `window.location.search`)
   and uses it for the initial model/example/baseline — so `…/?example=showcase-parts-map` opens that
   diagram live. An unknown/garbage key (including path-injection-looking input) falls back safely;
   only exact known keys load.

2. **Keep the URL in sync.** `loadModel` mirrors the current example into the URL via
   `history.replaceState` (a non-example load — New / Open file — clears the param), so the open
   diagram is shareable, bookmarkable, and survives a refresh.

3. **Wire the showcase.** Every showcase card gets an **"Open this diagram in the editor →"** link to
   `./?example=showcase-<type>` (base-aware: from `/psyuml/showcase.html` it resolves to
   `/psyuml/?example=…`, the editor). `conformance/showcase.test.ts` asserts the link is generated for
   every diagram; the key always names a shipped `showcase-<type>` example, so the link is always live.

## Consequences

- **Positive:** browse → edit now works — a reader opens the exact diagram they were reading, live and
  editable. Any diagram is shareable by URL. No new dependency, no schema change; the core logic is a
  pure function (unit-tested in node, including the safe-fallback / injection cases), the component
  just feeds it `window.location.search`.
- **Cost / honest scope (recorded):**
  - **Deep-links target the EXAMPLE corpus, not arbitrary content.** Only keys in the shipped
    `EXAMPLES` glob load; there is no remote/file fetch, so a crafted `?example=` can't load anything
    off-corpus (the fallback covers unknown keys). This is deliberate.
  - **`replaceState`, not `pushState`.** Switching examples doesn't stack browser history entries
    (the editor isn't a document-per-URL app); the URL just reflects the current diagram for sharing.
  - **No hash-routing / full router.** A single query param is enough for "open this diagram"; a
    router would be over-engineering for a one-screen editor.
- **Impact:** `apps/web/editor.ts` (`exampleKeyFromQuery`), `apps/web/editor.test.ts` (unit tests),
  `apps/web/App.tsx` (initial state from the param + URL sync), `scripts/build-showcase.mjs` (the
  per-card link + style), `conformance/showcase.test.ts` (the link guard), `sdd/traceability.json`
  (REQ-DEEP-LINK → implemented; M25).

## Alternatives considered

- **Hash routing (`#parts-map`).** Rejected — a query param is the conventional "load this resource"
  signal, plays well with `URLSearchParams`, and doesn't conflict with in-page anchors.
- **A full client router.** Rejected — disproportionate for a single-screen editor; one param does it.
- **Embed the model in the URL.** Rejected — long, brittle, and a privacy footgun (a formulation in a
  shareable URL); naming a shipped example keeps links short and content-free.
- **Leave the showcase linking only to the editor root.** Rejected — that is the broken browse → edit
  flow this fixes.
