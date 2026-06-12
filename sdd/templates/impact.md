<!-- TEMPLATE: copy to <directory>/IMPACT.md and fill in. Delete this comment. -->
# Impact — `<relative/dir/path>/`

**Purpose:** one line — what this directory is responsible for.
**Status:** planned | active | stable | deprecated
**Spec anchor / REQ:** §… · REQ-…

## Upstream (this depends on)
> Changing these can break *this* directory.
- `<path or @psyuml/pkg>` — why this dependency exists.

## Downstream (depends on this) — blast radius
> Changing *this* directory can break these. **Blast radius: low | medium | high.**
- `<path or @psyuml/pkg>` — what would break / what to re-test.

## Files
| File | Purpose | Upstream | Downstream | Spec / REQ | Change risk |
|---|---|---|---|---|---|
| `<file>` | … | … | … | §… / REQ-… | low / med / high |

## Change checklist
- [ ] Updated every downstream dependent listed above.
- [ ] Updated `sdd/traceability.json` if impl/test paths or status changed.
- [ ] Updated the spec section first if behavior changed (§K versioning).
- [ ] Ran `node sdd/check.mjs` (green).
