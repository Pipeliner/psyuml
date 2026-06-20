# PsyUML diagram catalog — the 40+ most useful formulation diagrams (for the help site)

> **Honesty clause (carry it everywhere).** PsyUML is an **unvalidated v0.x** communication aid, not a
> clinical instrument; it supports, never replaces, professional care, and does not diagnose (§L.2).
> Two distinctions run through this whole catalog: **(a) the *therapy*'s outcome evidence vs the
> *diagram*'s validity** — a diagram can be a useful shared heuristic while its underlying theory is
> weak/contested (polyvagal is the clearest case); and **(b) an evidenced *intervention* vs a popular
> *worksheet*** — most items below are practice/teaching tools, **not** validated measures. Evidence
> notes flag this per item. Sourcing: the evidence-sensitive items were checked against the literature
> in the v0.2 deep-research pass (see the per-family notes / `docs/research/`); the standard items draw
> on established clinical knowledge with the same humility applied.

This catalog drives the help-site **example library**. Each row maps a diagram to a PsyUML **family**
and a **renderer** (or flags a renderer PsyUML doesn't have yet). Build status:
- **✅ existing** — realizable now on a shipped renderer (becomes an example `.psyuml`).
- **◐ approx** — expressible on a shipped renderer with some loss (becomes an example, noted).
- **◇ new-type** — needs a renderer PsyUML doesn't have (e.g. 2×2 sorter, Venn/overlapping circles,
  tree/branching, ranked ladder, radial bullseye, hub/hexagon); catalogued, not yet an example.

Audience key: **C** = clinician-facing, **L** = client-facing, **B** = both (co-created) — these map to
PsyUML's three **audience profiles** (ADR-0016): **clinician** (the full analytic surface), **client**
(plain language, the analytic surface hidden), and **picture** (the simplest visual). Rule of thumb: a
**client-facing (L / B)** diagram has a sensible *picture* rendering; a **clinician-only (C)** one
usually does not — and every picture symbol stays comprehension-test-gated (M14, finding 8).

**Contents:** Notation & syntax · Cross-cutting evidence findings · the eight families (Cycle · Pattern ·
Parts · Field · Journey · Change · Ritual · Composite) · Build plan · Showcase examples · Additional
catalogued diagrams · [Safety & cultural caveats](#safety--cultural-caveats-consolidated) ·
Excluded-by-design · [References](#references). Cross-references ("see also") and the safety/cultural
caveats are consolidated near the end.

---

## PsyUML notation — symbols & syntax (the language the mapping column uses)

The mapping column names PsyUML **types** (`process-loop`), **edge kinds** (`reciprocal`),
**markers** (`loopTopology:trap`, `barrier`, ⚖) and **qualifiers** (`as-if`). This is what those
symbols mean and how a model is written — the reader's summary of spec §B (symbols) / §C
(connectors), which are authoritative. **Every symbol is comprehension-test-gated (M14): the table
below is the *set under test* (ISO 9186), not a claim it is already understood** — so each visual
channel is kept **redundant with a word** (an exit is always labelled "EXIT", a trap "TRAP").

### Node symbols (the core ontology categories, §B)

| Glyph | Means | DSL `kind` |
|---|---|---|
| ◎ | the steady, non-pathological centre (Self) | `self` |
| ○ | a part / sub-personality / actor | `agent` |
| rounded box | a state the person can be in | `state` |
| ◇ | a steadying support, strength or anchor | `resource` |
| ⬡ | a deliberate change act / skill / technique | `intervention` |
| ▭ | who/what owns an action (context / role) | `context` |
| ▮▮▮ | an ordered zone — an arousal band or phase | a `band` statement (`bandId` on nodes) |
| 👁 "observing-I" | a step-back, self-watching stance | `self` + `stereotype=observing-eye` |

### Connector symbols (§C)

| Glyph | Means | DSL `kind` |
|---|---|---|
| → | leads to / then | `sequential` |
| ↔ | feeds both ways (mutual) | `reciprocal` |
| dashed arrow **"EXIT"** | the way out of a loop — a way to get help *(safety-critical; always worded)* | `exit` |
| orbit ( ) | a protector holding / guarding | `containment` |
| ⤬ **"barrier"** | a dissociative barrier between parts | `barrier` |
| zig-zag | a conflict between two parts | `conflict` |
| solid / dashed / triple / slashed line | genogram ties: close / distant / fused / cut-off | `close` `distant` `fused` `cutoff` |
| (also) | influence +/−, transference, nested-within, invocation | `excitatory` `inhibitory` `transference` `nestedWithin` `invocation` |

### Markers & qualifiers (carried on a node/edge — they never replace the word)

| Mark | Means | Where |
|---|---|---|
| ⚑ | a trigger / precipitant on a transition | edge `trigger="…"` |
| ⚖ **"contested"** | origins disagree — both shown, not merged (§G.2) | a node claimed by ≥2 schools (`provenance`) |
| (as-if) | named *as if* a part/voice, without asserting that metaphysics (§4) | node `asIf=true` |
| **solid vs dashed border** | descriptive (reported / observed / jointly-agreed / planned) vs **interpretive** (inferred / clinician-inferred / contested / symbolic) | node/edge `epistemicStatus` |
| R / B badge | a reinforcing / balancing loop | edge `loop=R\|B` |
| TRAP / DILEMMA / SNAG (centre glyph + word) | CAT loop shapes: self-confirming / false-binary / self-sabotage | edge `topology=trap\|dilemma\|snag` |
| L / M / H | confidence in the element | `confidence` |

### Syntax — the text DSL (round-trips losslessly with the JSON `.psyuml` model)

One statement per line; `#` starts a comment; blank lines are ignored; free text is double-quoted.

```
diagram <type>            lang <code>            version <semver>
title "…"   disclaimer "…"   crisis "…"   flag acute|psychosis
ritual framing="…" secular="…"
band <id> order=<n> [pattern=dots|diagonal|cross-hatch] label="…"
node <id> <kind> [stereotype=… tier=… band=… pos=x,y <prop>=…] label="…" [client="…"]
edge <id> <src> <kind> <tgt> [loop=R|B topology=trap|dilemma|snag trigger="…"] [label="…" client="…"]
```

A worked maintaining-loop with an exit (the "path of hope"):

```
diagram process-loop
title "Health-anxiety loop"
node sensation state label="Notices a body sensation" client="A funny feeling"
node appraise  state label="\"Something is wrong\""   client="\"Something's wrong\""
node check     state label="Check, Google, reassure"
node out       resource label="Sit with the uncertainty"
edge e1 sensation sequential appraise trigger="a twinge"
edge e2 appraise  reciprocal check
edge e3 check     sequential sensation loop=R topology=trap
edge x1 check     exit       out label="drop the safety behaviour"
```

The `examples/*.psyuml` files are the JSON surface of the same model; the editor exposes this DSL
under **Edit as text**, and the `psyuml` CLI reads/writes it.

---

## Cross-cutting findings from the deep research (what the evidence actually says)

A five-angle, ~25-agent cited deep-research pass (CBT-family · CAT/psychodynamic/TA · third-wave/somatic ·
systemic/narrative/longitudinal · frameworks/evidence/caveats) produced these load-bearing conclusions — the
help site must teach them, not just the pictures:

1. **Therapy-evidence ≠ diagram-evidence.** Where a *therapy* is evidenced (DBT, schema, ACT, CFT, STPP/ISTDP,
   CAT), that does **not** validate its *diagram* as the active ingredient. The one CAT study that tried found
   reformulation tools "did not consistently result in significant changes" and change came "within the context
   of a good therapeutic relationship" (Tyrer & Masterson 2019). Treat every diagram as a heuristic.
2. **The alliance dominates; technique is a minority share.** Alliance–outcome r ≈ .28 across 295 studies
   (Flückiger 2018); specific factors ≈ 5–15% of outcome variance. A diagram is at most a slice of that minority.
3. **Formulation reliability is modest and worst for the inferential core** (Flinn 2015; Bieling & Kuyken 2003;
   single-clinician κ ≈ .37). Clinicians agree on problem lists, diverge on *why* — exactly what a diagram depicts.
   A diagram's neatness overstates the certainty of its content.
4. **Sharing a formulation can harm a meaningful minority** (Chadwick 2003 — "six clients found CF a negative
   experience"; Redhead 2015; Halpin 2016; Thrower 2024), with a **clinician–client asymmetry** (clinicians rate
   the alliance as improved even when clients don't, or are distressed). The artifact is not the safeguard — the
   collaborative, paced relationship is.
5. **Contested theories to flag, not echo:** polyvagal (38-author critique), stages-of-change/TTM (West 2005),
   PTMF (live controversy), IFS (popularity ≫ ~2 RCTs; "SAMHSA evidence-based" rests on a discontinued registry),
   genogram (SAGE-PAGE null), Circle of Security *program* (2025 COSI RCT null vs 2016 meta-analysis positive).
6. **Attribution is messier than the textbooks say:** the "5 Ps" was **not** coined by Macneil 2012 (roots in
   Weerasekera 1993 + the older "4 Ps"); "hot cross bun" is a UK nickname for **Padesky & Mooney 1990**; the
   "vicious flower" has layered attribution (Salkovskis 1998 model / Oxford-OCTC + Veale–Willson visual / Moorey
   2010 for depression); the "two triangles" trace to **Menninger/Ezriel**, popularised by Malan.
7. **Safety-planning specifics:** the Stanley–Brown plan's headline evidence is **SPI+ (plan + follow-up calls),
   a cohort comparison, not a standalone RCT**, and a 2025 paediatric meta-analysis was null; the **Crisis
   Response Plan (Bryan–Rudd) is the RCT-supported one**; **no-suicide contracts are not recommended**. A safety
   plan is a *collaborative intervention*, never a contract or a risk-prediction tool.
8. **Accessibility honesty:** "Easy Read"/simplified material does **not** reliably improve comprehension
   (Chinn & Homeyard 2016) — which is why PsyUML's symbols stay **comprehension-test-gated** (M14) rather than
   assumed-clear.

---

## CYCLE — "what maintaining loop keeps this going?" (→ `process-loop`, `state-map`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 1 | **CBT 5-part / "hot cross bun"** | CBT (Padesky–Greenberger) | situation ↔ thoughts ↔ emotions ↔ body ↔ behaviour, all interacting | The *model* underpins evidenced CBT; the worksheet is a heuristic, not an instrument | ✅ process-loop | B |
| 2 | **Vicious flower** (maintenance cycles) | CBT (Moscovitch; six-cycles) | a central belief/fear with several looping "petals", each a maintaining cycle | Mechanism-supported (safety-behaviour experiments); a formulation, not an outcome measure | ✅ process-loop (hub) | B |
| 3 | **Panic vicious cycle** | CBT (Clark 1986) | trigger → catastrophic misinterpretation of body sensations → arousal → symptoms → loop | Well-evidenced cognitive model of panic | ✅ process-loop | B |
| 4 | **Social-anxiety cycle** | CBT (Clark–Wells 1995) | self-focused attention + safety behaviours + pre/post-event processing | Well-evidenced model; the cycle is the formulation | ✅ process-loop | B |
| 5 | **Safety-behaviour maintenance cycle** | CBT (Salkovskis 1991) | threat belief → anxiety → safety behaviour → disconfirmation blocked → belief maintained | Mechanism shown experimentally; **safety-behaviour vs adaptive-coping line is contested** (Telch) | ✅ process-loop | B |
| 6 | **OCD maintenance cycle** | CBT | intrusion → appraisal → neutralising/compulsion → relief → strengthened intrusion | Underpins evidenced CBT/ERP for OCD | ✅ process-loop | B |
| 7 | **Nervous-system state ladder** | trauma/polyvagal-informed | calm ↔ activated ↔ shutdown states with what shifts between them | Useful state map; over-physiologised versions inherit the polyvagal caveat (#27) | ✅ state-map | B |
| 8 | **Anger / conflict escalation loop** | CBT/integrative | trigger → appraisal → arousal → action → consequence → re-trigger | Heuristic formulation | ✅ process-loop | B |

## PATTERN — "what recurring procedure repeats, and where's the exit?" (→ `process-loop` / cat-sdr)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 9 | **CAT Sequential Diagrammatic Reformulation (SDR / "the map")** | CAT (Ryle) | reciprocal roles + procedures (the whole self-state map), exits named | CAT's signature artifact; CAT shows modest outcomes and works **through the alliance**, not as the diagram-as-active-ingredient (Tyrer & Masterson) | ✅ process-loop (cat-sdr) | B |
| 10 | **Trap** (self-confirming loop) | CAT | actions meant to escape confirm the belief | School-agnostic loop shape; co-created | ✅ process-loop · `loopTopology:trap` | B |
| 11 | **Dilemma** (false-binary fork) | CAT | polarised either/or ("either I comply or I'm rejected") | As above | ◐ process-loop · `loopTopology:dilemma` | B |
| 12 | **Snag** (self-sabotaged success) | CAT | legitimate goals abandoned/undone | As above | ◐ process-loop · `loopTopology:snag` | B |
| 13 | **Reciprocal-roles diagram** | CAT | e.g. criticising ⇄ criticised; caring ⇄ cared-for | Core CAT construct | ✅ process-loop (reciprocal edges) | B |

## PARTS — "what internal multiplicity is in play?" (→ `parts-map`, `mode-map`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 14 | **IFS parts map** | IFS (Schwartz) | Self (8 Cs) + managers / firefighters / exiles | **Popularity ≫ evidence** — a 2025 scoping review found ~2 RCTs; the "SAMHSA evidence-based" badge rests on a **discontinued (2017–18) registry**. Reifying parts can destabilise dissociative clients | ✅ parts-map | B |
| 15 | **Schema mode map** | Schema Therapy (Young) | child / coping / parent modes + Healthy Adult "in the driver's seat" | **Among the better-evidenced** here — RCTs for BPD/PD | ✅ mode-map | B |
| 16 | **Schema 18-EMS / 5-domains sorter** | Schema Therapy | 18 early maladaptive schemas grouped in 5 domains | Schema *labels* validated; layout varies by trainer | ◇ new (sorter/grid) | C(+psychoed) |
| 17 | **Structural dissociation (ANP/EP)** | structural dissociation theory | personality split into Apparently-Normal + Emotional parts; primary/secondary/tertiary | Influential in complex-trauma; supporting neuroimaging is **small-n/few-study**; high-stakes population | ◐ parts-map (barrier) | C |
| 18 | **Karpman drama triangle** | TA (Karpman) | Persecutor / Rescuer / Victim role-switching | Widely taught heuristic; not an outcome measure | ✅ relational-field (drama-triangle) | B |
| 19 | **Winner's / empowerment triangle** | TA (Choy) | the positive reframe: Creator / Challenger / Coach | Heuristic; the hopeful counterpart to #18 | ◐ relational-field | B |
| 20 | **DBT states of mind** | DBT | Reasonable ∩ Emotion = Wise Mind | Core DBT psychoeducation; a heuristic (not a brain model) inside an evidenced programme | ◇ new (Venn) | B |

## FIELD — "who/what is in the person's world?" (→ `relational-field` / genogram, `resource-anchor`, `body-map`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 21 | **Genogram** (3-generation) | systemic (McGoldrick) | family structure + relationship qualities across generations | Widely used; **weakly evidenced as an instrument**; privacy / family-reading caveats | ✅ relational-field (genogram) | B |
| 22 | **Ecomap** | systemic (Hartman) | person/family ↔ external systems, supports, stressors | Widely used practice tool; not a validated measure | ◐ relational-field / resource-anchor | B |
| 23 | **Social atom / sociogram** | psychodrama (Moreno) | the network of significant others by closeness/role | Practice tool | ◐ relational-field | B |
| 24 | **Cultural genogram / cultural formulation** | systemic + DSM-5 CFI | culture, migration, identity, belief across the family | Practice/assessment aid; **cultural-humility + appropriation caveats** | ◐ relational-field | C |
| 25 | **Resource / anchor map** | strengths-based / cross-school | strengths, safe people/places, values, coping anchors | A "path-of-hope" staple; co-created | ✅ resource-anchor | B |
| 26 | **Body / sensation map** | somatic (Nummenmaa research) | where emotions/sensations are felt in the body | The *descriptive* maps replicate cross-culturally; **body-mapping-as-treatment** is thinner; trauma/dissociation caveat | ✅ body-map | B |
| 27 | **CFT three circles** (threat/drive/soothing) | CFT (Gilbert) | three emotion-regulation systems; grow the soothing system | CFT has systematic-review support for self-criticism/shame; "three systems" is a neuroscientific **simplification** | ◇ new (three circles) | B |
| 28 | **Window of tolerance** | Siegel/Ogden | hyper- / optimal / hypo-arousal bands | Ubiquitous, intuitive; **largely heuristic**, light direct validation | ✅ state-map (bands) | B |
| 29 | **Polyvagal "ladder"** | Dana / Porges | ventral (safe) → sympathetic (mobilised) → dorsal (shutdown) | **⚠ Most contested item.** A 38-author critique (*Clin. Neurophysiology*) disputes the core neurophysiology; even defenders retreat to "interventions help regardless of mechanism." **Use as metaphor with that disclaimer; do not teach as settled neuroscience** | ✅ state-map (bands) + caveat | B |

## JOURNEY — "what is the trajectory / story over time?" (→ `timeline`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 30 | **Life timeline / lifeline** | cross-school | key events, transitions, turning points over time | A narrative organiser; not a measure | ✅ timeline | B |
| 31 | **Longitudinal CBT formulation** | CBT (Beck) | early experiences → core beliefs → assumptions → triggers → maintenance | Standard CBT formulation; clinician-led, shareable | ◐ timeline | B |
| 32 | **5 Ps timeline** | integrative | Predisposing → Precipitating → Perpetuating → Protective (over time) | A widely taught formulation scaffold; not an instrument | ◐ timeline | B |
| 33 | **River of life / Tree-of-Life roots** | narrative (Ncube) | the journey/origins as a river or tree roots; strengths-forward | Practice tool; strongly client-led, culturally adaptable | ◇ new (tree/branching) / ◐ timeline | L |
| 34 | **Trauma timeline (titrated)** | trauma therapies | events + triggers + resources across time, paced | Distress caveat — pace, consent, resourcing first | ◐ timeline | C(+shared) |

## CHANGE — "what is the treatment direction / what to do?" (→ `intervention-sequence`, `two-triangles`, `decision-nav`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 35 | **Malan two triangles** | psychodynamic (Menninger/Ezriel → Malan) | Triangle of Conflict (defence/anxiety/feeling) + Triangle of Person (therapist/other/parent) | STPP/ISTDP have **moderate, caveated** Cochrane support; the *triangles themselves are untested* as a mechanism — don't conflate therapy efficacy with the diagram | ✅ two-triangles | C(+psychoed) |
| 36 | **Intervention sequence** | cross-school | ordered steps/skills toward a goal | A plan, not a measure | ✅ intervention-sequence | B |
| 37 | **DBT chain analysis** | DBT (Linehan) | vulnerability → prompt → links (thought/emotion/body/urge/act) → behaviour → consequences | The primary DBT assessment procedure; DBT is strongly evidenced. Can feel interrogative — pair with validation + solution analysis | ◐ intervention-sequence (chain) | B |
| 38 | **ACT Choice Point** | ACT (Harris; Bailey/Ciarrochi) | a present-moment fork: toward-moves vs away-moves, hooks & values | Accessible ACT entry; ACT evidenced (the format is a delivery tool). **Don't run with the Matrix simultaneously** | ◐ decision-nav (fork) | L |
| 39 | **Exposure hierarchy / fear ladder** | CBT (Wolpe) | feared situations ranked by SUDS, least → most | Exposure therapy has **strong** support; **the ladder is a planning aid**, and the Craske *inhibitory-learning* turn questions strict graded ordering / SUDS-drop stopping rules | ◇ new (ranked ladder) / ◐ intervention-sequence | B |
| 40 | **Behavioural-activation activity grid** | CBT (Lewinsohn; Martell) | weekly schedule with Mastery/Pleasure ratings | BA is **strongly evidenced** (COBRA non-inferior to CBT; Dimidjian); the grid worksheet is a tool, not the evidence | ◇ new (week grid) | B |
| 41 | **Crisis / safety plan** (Stanley–Brown) | suicide prevention | warning signs → internal coping → social distraction → contacts → professionals → means-restriction | SPI+ (plan **+ follow-up**) associated with ~45% fewer suicidal behaviours (2018 **cohort comparison**, not a standalone RCT). **A collaborative intervention — NOT a no-suicide contract, NOT a risk-prediction tool** | ✅ decision-nav | B |
| 42 | **Relapse-prevention / staying-well plan** | CBT/MBCT (Marlatt; Segal) | triggers → early warning signs → coping → support → reasons to stay well | Approach evidenced (incl. MBCT PREVENT — a viable *alternative*, not proven *superior*); the worksheet isn't a measure. **A wellness tool, not a crisis tool** | ◐ decision-nav / intervention-sequence | B |
| 43 | **SORC/SORCK functional analysis** | behavioural (Kanfer–Saslow) | Stimulus–Organism–Response–Consequence–Contingency | Influential clinician formulation heuristic; hard to standardise | ◐ intervention-sequence | C(+shared) |
| 44 | **ABC functional analysis** | behavioural (Skinner) / REBT (Ellis) | A→B→C (operant) **or** Activating-event→Beliefs→Consequences→Dispute→Effect (REBT) — two distinct lineages | Both are teaching/self-monitoring tools; REBT's belief-mediation is the key differentiator | ◐ intervention-sequence | B |
| 45 | **Values bullseye** | ACT (Lundgren) | life domains plotted as on-/off-target to values | Client values-clarification tool | ◇ new (radial bullseye) | L |
| 46 | **Decisional balance / pros-cons** | MI (Miller–Rollnick) | costs/benefits of change vs staying the same (2×2) | MI is evidenced; decisional-balance is a tool (and MI now uses it cautiously re ambivalence) | ◇ new (2×2 sorter) | B |
| 47 | **Goal ladder / scaling** | solution-focused (de Shazer) | scaling 0–10 + steps up; preferred future | SFBT practice tool | ◐ intervention-sequence / timeline | B |

## RITUAL — "what symbolic/ceremonial process?" (→ `ritual`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 48 | **Ritual structure** (van Gennep phases) | cross-cultural / therapeutic ritual | separation → liminal → incorporation, with a secular variant | Rituals reliably affect *subjective* anxiety/control/meaning, **not** objective disease markers (§F). Honest non-medical framing required | ✅ ritual | B |
| 49 | **Grief ritual / rite of passage** | grief/loss work | a structured, consented ceremony for a transition | As above; cultural-permission caveats for closed traditions (§6) | ✅ ritual | B |

## COMPOSITE — "one case across several views" (→ `renderComposite`)

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 50 | **Composite case board** | integrative | several family views of one case, cross-linked by shared node ids | The "many views, one model" payoff; honest that no single view is the truth | ✅ composite (renderComposite) | B |
| 51 | **PTMF narrative** (Power–Threat–Meaning–Response) | BPS framework (Johnstone–Boyle) | "what happened to you / how did it affect you / what sense did you make / what did you do to survive" | A **non-diagnostic** framework, usually narrative + several views, not one fixed diagram | ◐ composite / timeline | B |

---

## Build plan (for the help-site example library)

- **The shipped example set is the machine-verified manifest `examples/catalog.json`** (the source of
  truth; `conformance/catalog.test.ts` asserts every row is a real, catalogued, correctly-typed
  `.psyuml` and no example is un-catalogued — ADR-0027). **45 non-showcase examples ship today** on the
  shipped renderers, spanning all 8 families — each real and rendered, golden-stable under the overlap
  / legibility / layout-quality / edge↔edge invariants. Reused base examples (state-map, parts-map,
  mode-map, relational-field, drama-triangle, body-map, decision-nav, resource-anchor, process-loop,
  cat-sdr, timeline, intervention-sequence, ritual, two-triangles) are joined by instances incl.
  panic / social / OCD / **safety-behaviour** cycles; depression vicious flower; **reciprocal-roles**;
  **dilemma / snag** (trap ships via cat-sdr); IFS (parts-map) + **structural-dissociation**;
  **health-anxiety, PTSD/Ehlers–Clark, metacognitive/Wells, eating-disorder/Fairburn,
  psychosis/Morrison** maintenance models; longitudinal + 5 Ps + **trauma** timelines; DBT chain;
  ACT choice point; **SORC / ABC**; relapse-prevention; goal ladder; grief ritual (ritual.psyuml);
  and the field set — **empowerment-triangle, ecomap, social-atom, cultural-genogram,
  narrative-externalising** (White). The catalogued **composite** board is rendered live
  (`renderComposite` over several views) rather than a single `.psyuml`; the ◇ new-type rows stay
  catalogued-not-faked pending their renderers.
- **◇ new-type rows are catalogued, not faked** (sorter/2×2 grid, Venn/overlapping-circles,
  three-circles, tree/branching, ranked ladder, radial bullseye, hub/hexagon). Each is a candidate
  **new renderer** — a future milestone, recorded here so the help site can show them as "planned"
  rather than mis-render them on a renderer that distorts their meaning.
- Every shipped example carries its **honest evidence note** (the table above) in the help-site
  gallery, and renders in the client/clinician/picture **audience profiles** with the standing
  disclaimer — so the library teaches the humility, not just the pictures.

---

## Shipped example library (generated)

The table below is **generated from `examples/catalog.json`** (the manifest is the single source of
truth, ADR-0028) and **verified against the rendered corpus** by `conformance/catalog.test.ts`, so it
can never drift from what actually ships. To change it, edit the manifest and run
`node scripts/build-catalog.mjs`.

<!-- BEGIN catalog:generated -->

_Generated from `examples/catalog.json` by `scripts/build-catalog.mjs` — do not edit by hand. 45 shipped examples across 8 families, each a verified row (ADR-0027/0028). Audience: **C** clinician · **L** client · **B** both._

### Cycle

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| CBT 5-part (hot cross bun) | CBT (Padesky & Mooney) | B | A generic maintaining cycle. The model underpins evidenced CBT; the diagram itself is a co-drawn heuristic, not a measure. | `process-loop.psyuml` |
| Vicious flower (depression) | CBT (Moorey 2010) | B | A low-mood maintaining cycle. A formulation, not an outcome measure; the way out is behavioural activation. | `depression-flower.psyuml` |
| Panic vicious cycle | CBT (Clark 1986) | B | The fear-of-fear loop: sensation → catastrophic thought → panic → safety behaviour → more sensations. A well-evidenced cognitive model. | `panic-cycle.psyuml` |
| Social-anxiety cycle | CBT (Clark–Wells 1995) | B | Self-focused attention + safety behaviours maintain the fear. A well-evidenced model; the cycle is the formulation. | `social-anxiety-loop.psyuml` |
| OCD maintenance cycle | CBT | B | Intrusion → appraisal → distress → compulsion → relief → more intrusions. Underpins evidenced ERP; the exit is response prevention. | `ocd-cycle.psyuml` |
| Nervous-system state ladder / window of tolerance | polyvagal-informed / cross-school | B | Bands of nervous-system states + what shifts between them, and a way back. A useful map; over-physiologised versions inherit the contested polyvagal theory — use as metaphor. | `state-map.psyuml` |
| Safety-behaviour maintenance cycle | CBT (Salkovskis 1991) | B | Threat belief → anxiety → safety behaviour → disconfirmation blocked → the belief survives. Mechanism shown experimentally; the safety-behaviour vs adaptive-coping line is contested (Telch). | `safety-behaviour.psyuml` |
| Health-anxiety loop (disorder-specific) | CBT | B | Body sensation → "something is wrong" → checking / reassurance → more noticing. A maintaining cycle; the way out is dropping the safety behaviour and tolerating uncertainty. | `health-anxiety.psyuml` |
| PTSD maintenance — Ehlers–Clark (disorder-specific) | CBT (Ehlers & Clark 2000) | B | A sense of current threat kept alive by intrusions + avoidance / suppression / hypervigilance. Underpins evidenced trauma-focused CBT; pace the work and resource first. | `ptsd-cycle.psyuml` |
| Metacognitive CAS — Wells (disorder-specific) | MCT (Wells) | B | Worry / rumination + threat-monitoring + thought-control (the Cognitive-Attentional Syndrome) maintain distress. The way out is detached mindfulness, not more thinking. | `metacognitive-cas.psyuml` |
| Eating disorder — transdiagnostic, Fairburn (disorder-specific) | CBT-E (Fairburn) | B | Over-evaluation of shape / weight / control → strict dieting → binge → compensation → confirms the over-evaluation. Underpins evidenced CBT-E; the diagram is the formulation, not the measure. | `eating-disorder.psyuml` |
| Psychosis — cognitive maintenance, Morrison (disorder-specific) | CBT for psychosis (Morrison) | B | An unusual experience → a threatening interpretation → distress + safety behaviours → the meaning goes unchallenged. A shared, non-judgemental account of experience. | `psychosis-cycle.psyuml` |

### Pattern

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| CAT SDR — reciprocal roles + trap | CAT (Ryle) | B | Reciprocal roles, traps/dilemmas/snags and exits. CAT works *through the alliance*; the map is a co-drawn heuristic — its one dismantling trial found the reformulation letter redundant. | `cat-sdr.psyuml` |
| Reciprocal-roles diagram (CAT) | CAT (Ryle) | B | criticising ⇄ criticised, and the procedure that follows from the role. The core CAT construct; co-created and owned by the client. | `reciprocal-roles.psyuml` |
| Dilemma — a false either/or (CAT) | CAT (Ryle) | B | A false either/or ("comply or be rejected") that traps. A school-agnostic loop shape; the way out is naming the false binary and finding a third option. | `dilemma.psyuml` |
| Snag — success undone (CAT) | CAT (Ryle) | B | Legitimate goals undone by guilt ("I don't deserve it" / others will lose out). A self-sabotage pattern; the way out is allowing the good thing and tolerating the guilt. | `snag.psyuml` |

### Parts

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| IFS parts map | IFS (Schwartz) | B | Self + protective/wounded parts. IFS is popular but thinly evidenced (~2 RCTs); "parts" is a metaphor — avoid reifying it, especially with dissociation. | `parts-map.psyuml` |
| Parts map — perfectionism | IFS / schema | B | A worked parts map with a contested-origin marker where schools disagree about a part — a formulation, not a measure. | `perfectionism-parts.psyuml` |
| Schema mode map | Schema Therapy (Young) | B | Modes + Healthy Adult "in the driver’s seat". Among the better-evidenced models here (RCTs for personality disorder). | `mode-map.psyuml` |
| Structural dissociation (ANP/EP) | structural dissociation theory | C | An Apparently-Normal Part that runs daily life, dissociated by a barrier from trauma-fixed Emotional Parts. Influential in complex trauma; supporting neuroimaging is small-n — a high-stakes map, pace it. | `structural-dissociation.psyuml` |

### Field

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| Karpman drama triangle | TA (Karpman) | B | Persecutor/Rescuer/Victim role-switching. A widely-taught heuristic; "Victim" means a *stance*, not an actual victim of harm — never use it to dismiss real harm. | `drama-triangle.psyuml` |
| Genogram (3-generation) | systemic (McGoldrick) | B | Three-generation family map. Widely used but weakly evidenced as an instrument (SAGE-PAGE found no clinical effect); privacy/family-reading caveats. | `family-genogram.psyuml` |
| Relational field | systemic | B | People and ties in the person’s world. A practice tool, not a validated instrument. | `relational-field.psyuml` |
| Resource / anchor map | strengths-based | B | Strengths, safe people/places, values — the "path of hope". Co-created. | `resource-anchor.psyuml` |
| Body / sensation map | somatic (Nummenmaa) | B | Where emotions are felt in the body. The descriptive maps replicate cross-culturally; body-mapping-as-treatment is thinner; can be triggering for trauma. | `body-map.psyuml` |
| Empowerment (winner's) triangle | TA (Choy) | B | The hopeful reframe of the drama triangle: Creator / Challenger / Coach. A heuristic, not an outcome measure — the counterpart to Karpman. | `empowerment-triangle.psyuml` |
| Ecomap — person in their systems | systemic (Hartman) | B | The person / family and their external systems — supports and strains, by tie quality. A widely used practice tool, not a validated measure. | `ecomap.psyuml` |
| Social atom / sociogram | psychodrama (Moreno) | B | Significant others mapped by closeness and tie quality (close / distant / fused / cut-off). A practice tool for the relational field. | `social-atom.psyuml` |
| Externalising map — narrative (disorder-agnostic) | narrative (White) | L | The person is never the problem — "the Worry" is mapped as a separate entity, alongside unique outcomes and allies who know the real person. A co-authored, client-led tool. | `narrative-externalising.psyuml` |
| Cultural genogram — heritage & identity | systemic + DSM-5 CFI | C | Family plus heritage, faith, identity and migration. An assessment aid — hold it with cultural humility; the client is the expert on their own culture. | `cultural-genogram.psyuml` |

### Journey

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| Life timeline / lifeline | cross-school | B | Events and turning points over time. A narrative organiser, not a measure. | `timeline.psyuml` |
| Longitudinal CBT formulation | CBT (Beck) | B | How early experiences → beliefs → rules → current triggers. Belief links are tentative hypotheses — the least-reliable part of any formulation. | `longitudinal-formulation.psyuml` |
| 5 Ps timeline | integrative (Weerasekera) | B | Predisposing/precipitating/perpetuating/protective factors. By nature a grid, not really a diagram; shown here as a factor timeline. (Not coined by Macneil 2012.) | `five-ps.psyuml` |
| Trauma timeline (titrated) | trauma therapies | B | Events + meanings + resources across time, paced. Distress caveat — consent, resourcing and grounding first; titrate exposure. | `trauma-timeline.psyuml` |

### Change

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| Malan two triangles | psychodynamic (Malan) | C | Conflict (defence/anxiety/feeling) + Person (therapist/other/parent). The therapy is moderately evidenced; the diagram itself is untested as a mechanism. | `two-triangles.psyuml` |
| Intervention sequence | cross-school | B | Ordered steps/skills toward a goal. A plan, not a measure. | `intervention-sequence.psyuml` |
| DBT chain analysis | DBT (Linehan) | B | Vulnerability → prompt → links → behaviour, with a skill to interrupt it. DBT is strongly evidenced; do it with kindness, not blame. | `dbt-chain.psyuml` |
| ACT Choice Point | ACT (Harris) | L | A moment’s fork: toward-moves vs away-moves, with hooks and values. ACT is evidenced; the format is a delivery tool. | `act-choice-point.psyuml` |
| Crisis / safety plan | suicide-prevention (Stanley–Brown) | B | One decision per step, resources on every screen, no dead-ends. A collaborative plan — never a no-suicide contract or a risk-prediction tool. | `decision-nav.psyuml` |
| Relapse-prevention plan | CBT/MBCT (Marlatt) | B | Triggers → early signs → coping → support. The approach is evidenced; the worksheet isn’t. A wellness plan, NOT a crisis plan. | `relapse-prevention.psyuml` |
| Goal ladder / scaling | solution-focused | B | Small steps toward a preferred future. A practice tool. | `goal-ladder.psyuml` |
| Stages of Change wheel (TTM) | transtheoretical (Prochaska–DiClemente) | B | The change cycle. Popular but genuinely contested as a *stage* model (West 2005) — treat the stages as a heuristic. | `stages-of-change.psyuml` |
| SORC functional analysis | behavioural (Kanfer–Saslow) | C | Stimulus → Organism → Response → Consequence — a shared map of one episode and where to intervene. An influential clinician heuristic, hard to standardise. | `sorc.psyuml` |
| ABC(DE) functional analysis | REBT (Ellis) | B | Activating event → Beliefs → Consequence, then Dispute → Effect. A teaching / self-monitoring tool; belief-mediation is the REBT differentiator. | `abc.psyuml` |

### Ritual

| Diagram | School | Aud. | What it shows (honest note) | Example |
| --- | --- | --- | --- | --- |
| Ritual structure (van Gennep) | cross-cultural / therapeutic ritual | B | Van Gennep phases with a secular variant. Rituals reliably affect *subjective* anxiety/meaning, not objective disease markers (§F). | `ritual.psyuml` |

<!-- END catalog:generated -->

---

## Showcase examples — one feature-dense model per diagram type

Beyond the simple per-school examples, the gallery ships **one "full showcase" model for each of the
12 diagram types** (marked ★ in the picker, `examples/showcase-*.psyuml`). Each is a deliberately
dense, validated model that exercises as much of the notation as that type sensibly carries — so you
can see, and live-edit, the system's full range in one place. All twelve are corpus-lint clean,
overlap-clean (ADR-0012), legibility/dual-coding clean (ADR-0011), and pinned by a golden render.

| Type (★ showcase) | Capabilities it exercises |
|---|---|
| **State Map** | 3 patterned bands · ⚑ triggers · 3 worded EXITs (path of hope) · observed/reported/clinician-inferred + confidence · intensity/valence · client labels · recorded consent |
| **Process / Loop** | reinforcing-loop badge (R) · CAT loop-topology `trap` · ⚑ trigger · worded way-out · client-believed vs clinician-inferred + confidence |
| **Parts Map** | Self + manager/firefighter/exile · every part `as-if` (metaphor-flagged) · contested-origin ⚖ (IFS vs schema) · containment · polarization · dissociative barrier |
| **Mode Map** | 6 hand-placed schema modes · dominance weighting · Healthy Adult · inferred/observed/jointly-agreed |
| **Relational Field** | genogram + ecomap · index person (double ring) · all 5 tie kinds (close/distant/conflict/cutoff/fused) · contexts (work/faith/services) |
| **Body Map** | hand-placed sensations · graded intensity scale · plain-language client labels |
| **Timeline** | 5 time bands · events (reported) over meanings (client-believed/inferred/jointly-agreed → planned) |
| **Intervention Sequence** | 3 swimlanes (client/therapist/support) · phased steps · gate conditions on arrows · jointly-agreed step |
| **Ritual** | separation→threshold→return · every act `symbolic` · non-medical framing + secular variant + consent · a `tradition-claimed` element |
| **Decision-Nav (crisis chart)** | branching with no dead-ends · crisis resources on every screen · acute-risk flag · question/crisis/action/safe vocabulary |
| **Resource / Anchor** | 5 anchor categories holding many strengths — the "path of hope", client-owned |
| **Two Triangles (Malan)** | Triangle of Conflict (defence/anxiety/hidden feeling) × Triangle of Person (current/therapist/past) linked by transference · confidence + clinician-inferred depth |

---

## Additional catalogued diagrams (surfaced by the deep research)

These belong to the families above (kept in one block because they surfaced later in the research, not
because they're a separate family): **52 / 55 (process-loop)** → Cycle; **53 (decision-nav)** → Change;
**54 (process-loop hub)** → Cycle; **56 (◇ circle/hands)** → Field; **57 / 59 (relational-field)** →
Field; **58 (process-loop reciprocal)** → Pattern. **See also** (related clusters): safety plans
**41 ↔ 53** (Stanley–Brown vs the RCT-supported Crisis Response Plan); roles **18 ↔ 19** (drama vs
empowerment triangle); functional analysis **43 ↔ 44 ↔ 55** (SORC / ABC / ARC); relational procedures
**9 / 13 ↔ 58** (CAT reciprocal roles ↔ CCRT).

| # | Diagram | School | What it shows | Evidence / limits | PsyUML | Aud. |
|---|---|---|---|---|---|---|
| 52 | **Stages of Change wheel (TTM)** | transtheoretical (Prochaska–DiClemente) | precontemplation → contemplation → preparation → action → maintenance (↺ relapse) | **Contested as a *stage* model** (West 2005: arbitrary boundaries); popular + intuitive as a cycle | ◐ process-loop | B |
| 53 | **Crisis Response Plan** (Bryan–Rudd) | suicide prevention | escalation: self-management → reasons for living → support → professional/crisis | **The RCT-supported safety plan** (Bryan 2017: ~76% fewer attempts vs a contract); a worded way-out path | ◐ decision-nav | B |
| 54 | **Persons mechanism hub-and-spoke** | CBT (Jacqueline Persons) | one central mechanism → arrows to the problems it generates/maintains | A genuine integrative formulation *diagram*; inferential core's reliability is modest (finding 3) | ◐ process-loop (hub) | C(+shared) |
| 55 | **UP functional model + ARC** | transdiagnostic CBT (Barlow) | neuroticism → aversive reaction to emotion → avoidance loop; ARC = antecedent→response→consequence | ARC ≈ a rebranded ABC; UP evidenced as a therapy, the figure is a teaching aid | ◐ process-loop / intervention-sequence | B |
| 56 | **Circle of Security** | attachment (Cooper/Hoffman/Marvin/Powell) | secure-base (explore) top / safe-haven (comfort) bottom; hands = caregiver | **Graphic ≠ program**: 2016 meta positive but the 2025 NHS COSI RCT found **no added benefit** — teach the graphic, don't claim the program | ◇ new (circle/hands) | L (caregiver) |
| 57 | **Sociogram** | sociometry (Moreno) | who chooses/rejects whom in a group; stars, isolates, cliques | Ancestor of social-network analysis; **negative-nomination ethics** (labelling/stigma) — never expose individual results | ◐ relational-field | C |
| 58 | **CCRT / CMP relational cycle** | psychodynamic (Luborsky; Strupp–Binder) | Wish → Response-of-Other → Response-of-Self (the recurring pattern) | CCRT *coding* is reliable (κ ≈ .6–.7); the client-facing *diagram* is not separately validated; cousin of CAT reciprocal roles | ◐ process-loop (reciprocal) | C |
| 59 | **Attachment hierarchy / network** | attachment (Bowlby–Ainsworth) | attachment figures ranked most→least accessible | Mainstream *construct*; no single standardised client diagram | ◐ relational-field / resource-anchor | C(+psychoed) |

## Excluded by design — worksheets/tables/scales, **not diagrams**

The research's clearest methodological warning: a "40+ *diagram* library" must not pad itself with tools whose
meaning is **not** carried by 2-D spatial topology. Litmus test: *does what-connects-to-what carry load-bearing
meaning?* If it is fundamentally fill-in / score-it / list-it / ask-these-questions, it is **not** a diagram and is
**excluded** from the rendered library:

- **Thought record** (column table) · **PHQ-9 / GAD-7** (rating scales) · **SMART goals** (mnemonic checklist) ·
  **DSM-5 Cultural Formulation Interview** + **Kleinman's 8 questions** (interviews) · **Decisional balance**
  (2×2 pros/cons table) · **Readiness ruler** (0–10 scale) · **5 Ps** & **biopsychosocial grid** (matrices) ·
  activity/mood/gratitude **logs**.

The genuinely-diagrammatic ◇ rows (2×2 sorter, Venn, three-circles, tree/branching, ranked ladder, radial
bullseye, hub/hexagon, circle-of-security) are candidate **new renderers** — catalogued, not mis-rendered.

## Safety & cultural caveats (consolidated)

The per-row "Evidence / limits" weave caveats in unevenly; the **safety-** and **culture-critical** ones
are gathered here so none is missed (each still appears on its row). Treat these as gating, not optional:

- **Suicide / crisis (41, 53):** a safety plan is a **collaborative intervention, never a no-suicide
  contract and never a risk-prediction tool**; the **Crisis Response Plan (Bryan–Rudd)** is the
  RCT-supported one; Stanley–Brown's evidence is **SPI+ (plan + follow-up)**, a cohort comparison.
- **Trauma / dissociation (17, 26, 29, 34):** reifying parts or pushing a trauma timeline can
  destabilise dissociative clients — **resource and consent first, titrate, keep it the client's**;
  structural dissociation is a high-stakes, specialist map.
- **Psychosis (Morrison cycle):** a shared, **non-judgemental** account of experience — not a label.
- **Sharing harm (all):** sharing a formulation distresses a **meaningful minority** (Chadwick 2003;
  finding 4), with a clinician–client asymmetry — the paced, collaborative relationship is the safeguard.
- **Cultural (21, 24, 57):** genograms/sociograms carry **family-reading, privacy, and labelling**
  risks; the cultural genogram needs **cultural humility** (the client is the expert on their culture);
  never expose individual sociometric (negative-nomination) results.
- **Contested theory (14, 27, 29, 51, 52, 56):** flag, don't echo — polyvagal, IFS-popularity-≫-evidence,
  PTMF, TTM-as-stages, Circle-of-Security-program-vs-graphic (see findings 5 + the rows).

## References

Author–year anchors used across the rows (corroborated via secondary sources where the primary was
paywalled). Reliability: **Flinn 2015**; **Bieling & Kuyken 2003**. Alliance: **Flückiger 2018**. CAT
diagram-vs-relationship: **Tyrer & Masterson 2019**. Sharing harms: **Chadwick 2003**, **Redhead 2015**,
**Halpin 2016**, **Thrower 2024**. Polyvagal critique: **Grossman 2023** (38-author). IFS: **2025 scoping
review**. Genogram: **Rogers & Rohrbaugh 1991** (SAGE-PAGE). TTM critique: **West 2005**. Safety:
**Stanley & Brown 2018** (SPI+), **Bryan 2017** (CRP RCT). Models: **Clark 1986** (panic), **Clark &
Wells 1995** (social anxiety), **Salkovskis 1991** (safety behaviours), **Ehlers & Clark 2000** (PTSD),
**Wells** (MCT/CAS), **Fairburn** (CBT-E transdiagnostic), **Morrison** (psychosis), **Moorey 2010**
(vicious flower / depression), **Lewinsohn / Martell** (behavioural activation), **Dimidjian / COBRA**
(BA evidence). Attribution: **Padesky & Mooney 1990** (hot cross bun), **Weerasekera 1993** (4/5 Ps),
**Menninger / Ezriel → Malan** (two triangles). Frameworks: **BPS DCP 2011**, **Engel 1977**,
**Johnstone & Boyle 2018** (PTMF). Accessibility: **Chinn & Homeyard 2016**.

## Sources & method

Synthesis of a cited, adversarially-verified five-angle deep-research pass (web-sourced where possible; each angle
returned per-claim confidence + adversarial flags). **Research input for a teaching library, not clinical
guidance**, inheriting PsyUML's unvalidated-v0.x status. Key anchors: reliability — Flinn 2015, Bieling & Kuyken
2003; alliance — Flückiger 2018; CAT diagram-vs-relationship — Tyrer & Masterson 2019; sharing harms — Chadwick
2003, Redhead 2015, Thrower 2024; polyvagal critique — Grossman et al.; IFS — 2025 scoping review; genogram —
Rogers & Rohrbaugh 1991; TTM critique — West 2005; safety — Stanley 2018 + Bryan 2017; accessibility — Chinn &
Homeyard 2016; frameworks — BPS DCP 2011, Engel 1977, Weerasekera 1993. (Several primary PDFs were paywalled;
those points were corroborated via secondary sources.)
