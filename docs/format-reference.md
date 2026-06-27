# PsyUML format & authoring reference

A practical, field-level reference for the `.psyuml` model — the companion to the prose
[specification](specification/psyuml-v0.1.0.md). The **authoritative** definition is the zod
schema in [`packages/model/index.ts`](../packages/model/index.ts); this doc mirrors it so you
don't have to read source to author a model. Fastest way to learn the shape: read a few files
in [`examples/`](../examples/) alongside this table.

A model is JSON (extension `.psyuml`) or the equivalent text DSL (see
[`packages/grammar`](../packages/grammar/IMPACT.md)). Validate or render it with the CLI:

```sh
node dist/cli/psyuml.mjs lint   examples/state-map.psyuml      # exits ≠0 on any error
node dist/cli/psyuml.mjs render examples/state-map.psyuml -o out.svg
node dist/cli/psyuml.mjs convert examples/state-map.psyuml     # JSON ⇄ text DSL
```

## Top-level

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `version` | string | yes | — | model version, currently `0.1.0` |
| `language` | string (BCP-47) | no | `en` | default language key for labels |
| `diagram` | enum | yes | — | one of the 20 diagram types below |
| `meta` | object | no | `{}` | see Meta |
| `bands` | Band[] | no | `[]` | ordered zones / swimlanes / phases |
| `nodes` | Node[] | no | `[]` | the elements |
| `edges` | Edge[] | no | `[]` | the typed connectors |

### Meta

| Field | Type | Notes |
|---|---|---|
| `title` | string? | diagram title |
| `disclaimer` | string? | **required (error) on client-facing diagrams** — see rules |
| `crisisResources` | string? | **required on `decision-nav`** — a localized crisis line/number |
| `ritual` | `{ framing?, secularVariant? }` | **both required on `ritual`** diagrams |
| `safety` | `{ psychosisFlag, acuteRiskFlag }` | both default `false`; setting either triggers escalation (see rules) |

## Node

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | string | yes | — | stable, whitespace-free; referenced by edges + across diagrams (§H.10) |
| `kind` | enum | yes | — | `state · agent · self · resource · intervention · context · temporal` (7 node-like kinds; Relation & Process/Transition are *edges*) |
| `label` | Label | yes | — | `{ clinician: { <lang>: text }, client?: { <lang>: text } }` |
| `stereotype` | string? | no | — | Tier-3 tag, e.g. `manager`, `firefighter`, `exile`, `category`, `observing-eye`, `role` |
| `tier` | 1 \| 2 \| 3 | no | `1` | notation tier |
| `bandId` | string? | no | — | must reference an existing band |
| `position` | `{ x, y }`? | no | — | manual layout (relational-field, mode-map, two-triangles) |
| `hidden` | boolean? | no | `false` | **progressive reveal** — hidden nodes + their edges aren't rendered |
| `properties` | Properties | no | `{}` | see below |

## Edge

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | unique |
| `kind` | enum | yes | `sequential · excitatory · inhibitory · reciprocal · exit · barrier · containment · invocation · transference · nestedWithin · close · conflict · fused · distant · cutoff` |
| `source` / `target` | string | yes | node ids; both must exist |
| `label` | Label? | no | edge label |
| `trigger` | Label? | no | ⚑ precipitant on a transition |
| `loop` | `R` \| `B` | no | Reinforcing / Balancing marker |
| `properties` | Properties | no | as below |

## Properties (the PT bag)

| Field | Type | Range / values |
|---|---|---|
| `dominance` | number? | 0–1 |
| `intensity` | number? | 0–1 |
| `valence` | number? | −1 to 1 |
| `consolidation` | enum? | `consolidated · forming · liminal` (dashed→solid over time) |
| `rigidity` | number? | 0–1 |
| `weight` | number? | 0–1 |
| `confidence` | enum? | `L · M · H` |
| `epistemicStatus` | enum? | `reported · observed · inferred · planned · symbolic · client-believed · tradition-claimed` |
| `provenance` | string[]? | e.g. `["school:cat"]` — preserves opposed origin-claims (§G.2) |
| `index` | boolean? | genogram index person (double border) |

> **Authoring an only-partially-understood situation?** Use `epistemicStatus: "inferred"` (a
> guess), `confidence: "L"`, and `hidden: true` to park a node you're unsure about — nothing is
> ever auto-finalized, and you can reveal/relabel it later. A client may relabel any node in
> their own words via the `client` layer.

## Diagram types — authoring quick-guide

| `diagram` | For | Typical nodes | Typical edges | Client-facing? | Notes / required meta |
|---|---|---|---|---|---|
| `state-map` | autonomic/mode states + transitions | `state` in `bands` | `sequential`, `exit` | yes | needs a way out (path-of-hope) |
| `parts-map` | IFS-style parts + Self | `agent`, `self` | `containment`, `barrier` | yes | barrier endpoints: parts/states only |
| `mode-map` | Schema modes sized by `dominance` | `agent`, `self` | `sequential` | yes | Healthy-Adult is the growth target |
| `relational-field` | genogram / social field / **drama triangle** | `agent`, `context` | `close`/`conflict`/`fused`/`distant`/`cutoff`, `nestedWithin` | yes | relations join people/parts/contexts |
| `body-map` | somatic sensations + arousal | `state` | — | yes | pace & titrate note |
| `process-loop` | maintaining cycle / **CAT SDR** | `state`, `resource`, `self`(observing-eye) | `sequential`, `reciprocal`, `exit` | **yes** | needs a hope marker; `loop: R/B` |
| `timeline` | trajectory over time | `state` | `sequential` | yes | preferred-future column is the hope |
| `intervention-sequence` | ordered intervention steps | `intervention` | `sequential` | yes | interventions must attach |
| `ritual` | van Gennep phase structure | `intervention` in phase `bands` | `sequential` | yes | **`meta.ritual.framing` + `secularVariant` required** |
| `decision-nav` | crisis/decision chart | `state`, `intervention`, `resource` | `sequential` | yes | **`meta.crisisResources` required; no dead-ends** |
| `resource-anchor` | categorized supports | `context`(category), `resource` | `containment` | yes | grow the soothing system |
| `two-triangles` | Malan psychodynamic formulation | `state` in two `bands` | `excitatory`/`inhibitory`, `transference` | no (clinician aid) | — |
| `ladder` | exposure/fear hierarchy, ranked goals | nodes ranked by `properties.intensity` (SUDS) | — | yes | hardest-first; bottom rung is where to start |
| `three-circles` | CFT threat / drive / soothing systems | `stereotype` system, sized by `properties.weight` | `containment` (contents) | yes | grow the soothing system |
| `venn` | DBT states of mind (overlapping circles) | region by `stereotype` (left/overlap/right) | `containment` (contents) | yes | the lens = both; the circles are decoration |
| `bullseye` | ACT values / circles of control | life domain plotted by `properties.intensity` | — (edge-free) | yes | closer to centre = on target |
| `tree-of-life` | narrative strengths-forward life portrait | item by `stereotype` (roots/ground/trunk/branches/leaves/fruits) | — (edge-free) | yes | co-created, not an assessment |
| `schema-grid` | Young's 18 EMS in the 5 schema domains | schema by `stereotype` (domain) | — (edge-free) | clinician (+psychoed) | active schemas highlighted via `properties.intensity` |
| `decisional-balance` | MI 2×2: change/stay × benefit/cost | item by `stereotype` (quadrant) | — (edge-free) | yes | a reflection, not a persuasion tool (MI caveat) |
| `secure-base` | attachment secure base & safe haven | by `stereotype` (explore/comfort/base) | — (edge-free) | yes (caregiver) | a generic graphic, **not** the trademarked Circle of Security® |

## Worked example — the text DSL

The DSL is **line-oriented**: one statement per line, `key=value` options (quote free text),
`#` for comments. It is *not* a brace/object syntax. A complete State Map:

```
diagram state-map
title "R. — nervous-system ladder"
disclaimer "This map supports, and does not replace, professional care."
crisis "If you are in danger now, call your local emergency number or a crisis line (e.g. 988 in the US)."

band ventral order=0 label="Ventral / safe-social" client="Green — safe & social"
band sympathetic order=1 pattern=diagonal label="Sympathetic / mobilized" client="Amber — revved up"
band dorsal order=2 pattern=cross-hatch label="Dorsal / shutdown" client="Red — shut down"

node calm state band=ventral epistemic=reported label="Calm / connected" client="Calm and connected"
node anxious state band=sympathetic epistemic=reported label="Anxious / fight-flight" client="Wired"
node numb state band=dorsal epistemic=reported label="Numb / shutdown" client="Foggy"

edge e1 calm sequential anxious trigger="criticism" triggerclient="being criticized"
edge e2 anxious sequential numb trigger="overwhelm"
edge x1 numb exit anxious label="movement / orienting" client="move / look around"
```

Statement shapes: `node <id> <kind> [stereotype=… tier=… band=… pos=x,y hidden=true <prop>=… ] label="…" [client="…"]`
and `edge <id> <source> <kind> <target> [loop=R|B <prop>=… trigger="…" ] [label="…" client="…"]`.
Round-trip any `.psyuml` with `psyuml convert <file>` to see its DSL.

## Validation rules you must satisfy (`@psyuml/validate`)

Errors block export; warnings are advisory (some warnings escalate to errors in the client layer).

- **Well-formedness (§A.2):** edge endpoints must resolve; band refs must resolve; relations
  (`close/conflict/fused/distant/cutoff`) join `agent/self/context`; a dissociative `barrier`
  joins `agent/self/state`; an `intervention` node must have ≥1 incident edge (no floating).
- **Path of hope:** a maintaining-cycle diagram (`state-map`, `parts-map`, `process-loop`,
  `mode-map`) with no exit / resource / self / intervention is **warn (clinician) → error (client)**.
- **Crisis chart:** `decision-nav` requires `meta.crisisResources` and no dead-ends.
- **Ethics:** client-facing diagrams require `meta.disclaimer`; `ritual` requires honest framing
  + a secular variant.
- **Safety triage:** `meta.safety.acuteRiskFlag` raises escalation + requires crisis resources;
  `psychosisFlag` escalates and is a hard contraindication on `ritual`.
- **Accessibility:** labels over ~40 chars get an info nudge; renders are monochrome-by-default
  (colour is redundant) and every view emits alt text.

## Rendering output

`render` (and the editor export) produce **SVG** — a vector image format that is monochrome by
default (`--color` adds redundant Okabe–Ito hues), carries `role="img"` + an `aria-label` + a
`<desc>` text alternative. There is no built-in raster (PNG) output; pipe the SVG through your
own rasterizer (e.g. `resvg`, `rsvg-convert`, Inkscape) if you need one.
