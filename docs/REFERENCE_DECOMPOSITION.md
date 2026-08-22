# REFERENCE DECOMPOSITION — the ten approved visual targets

**Status:** design authority for the experience surface's visual reconstruction.
Sits *below* `MASTER_IMPLEMENTATION_DOSSIER.md` and the Truth Constitution, *above*
any implementation detail. Written after studying all ten references at native
resolution (2528×1686–1696) plus detail crops.

**Source:** `design-references/01..10`, supplied by the owner as approved visual
targets, not inspiration. Image 11 (SYSTEM MAP) is deliberately out of scope.

---

## 0. How to read this document

Three laws govern every decision below, in this order:

1. **Engineering truth.** A visual that could exist without the backend being real
   is decoration and is wrong (dossier §1.3). Words baked into the reference images
   are AI-generated and are **never** a source of truth. Repository content and
   measured telemetry are.
2. **Reference fidelity.** Composition, hierarchy, rhythm, spatial relationship,
   lighting direction, material language, object scale, depth, atmosphere, and
   typographic hierarchy are preserved. The references are reconstructed, not
   reinterpreted.
3. **Technical implementation is free.** Medium, decomposition, shader technique,
   instancing strategy, and module layout are engineering decisions recorded here.

Where 1 and 2 collide, 1 wins and the collision is logged in §3 with the honest
substitution that replaced it.

### 0.1 Three collisions with locked items — stated before anything else

Studying the references surfaced three places where they contradict something
dossier §12 marks **locked**. Two are escalated to the owner; one is resolved here
because the rule permits only one resolution.

| # | Locked item | What the references do | Disposition |
|---|---|---|---|
| **C1** | §3.4 / §12: *"cold electric white-cyan = the isolation boundary, nothing else, ever"* | Cyan is the most-used hue in the set — edge lines, TLS arrows, packet beads, tile fills, LIVE glows, rim light on nearly every plate | **Resolved here.** A rule may never be loosened (CLAUDE.md). Cyan is re-reserved; the references' cyan is redistributed across the register and a new non-register *structure* tone. See §1.5. |
| **C2** | §3.2 / §12: operational-evidence register — *"volumetric glowing shapes in darkness is the visual language of every AI product since 2023… genre, and genre is forgettable"* | The references are precisely that: luminous isometric cities, glowing cores, volumetric shafts | **Ruled 22 Aug 2026 — reference form, evidence content.** See §0.2. |
| **C3** | §2.1 / §12: the five-beat arc, its order, and **one continuous take** — no cuts, no page transitions | The references show a ten-section site with a persistent top nav (`01/ENTER … 10/END`), "SCROLL TO EXPLORE", and per-section hero type — a scrolling multi-page portfolio | **Ruled 22 Aug 2026 — one take, ten camera stations.** See §0.2. |

### 0.2 The two rulings, and what they bind

Both escalations were put to the owner on 22 Aug 2026 and ruled the same day.

**C2 — reference form, evidence content.** Composition, lighting, depth and
material language are reconstructed exactly as the references show them. The
locked §3.2 register is preserved not as *less light* but as **provenance**:

> **The glow rule.** Nothing emits light unless it is carrying a real
> measurement. An unlit panel means idle, not unstyled.

This is stricter than §3.2 as originally written, not looser — §3.2 restrained
saturation, and this restrains *cause*. It is also the rule that makes the
references safe to follow at full fidelity: a luminous world whose every lumen is
earned is not the genre §3.2 was warning about, because the genre's glow is
decorative and this one is a readout. Every object in §2 inherits it, and it is
what §1.6's "idle means dark" enforces at the signal layer.

**C3 — one take, ten camera stations.** The references' numbered nav survives as a
visible **station index**, not as page links. Scrolling or clicking flies the
camera through continuous space; there are no cuts and no page transitions. Every
station remains directly addressable by URL per §2.9, and a deep link *arrives*
at its station rather than loading a page there. The reference nav bar is a
persistent overlay, which is why both could be satisfied at once.

The five-beat arc is unaffected: it is the *path* a first-time visitor is flown
along through the ten stations, and the stations it passes through are Arrival
(01), Recognition (02), Ownership (03), Confrontation (03/04), Consequence (10).

Everything in §1 and §2 below was written to survive either answer, so both
rulings confirm the plan rather than change it. §1.4's camera graph and §1.7's
transition system are now load-bearing rather than contingent.

---

## 1. THE SHARED VISUAL SYSTEM

Ten references, one world. Nothing below is authored twice. The test applied to
every object: *does this need to exist as its own thing, or is it an instance of
something already in the kit with different parameters?*

### 1.1 The kit — ten primitives that compose all ten scenes

| # | Primitive | What it is | Appears in |
|---|---|---|---|
| **K1** | `Plate` | The load-bearing element of the whole set. A rounded slab — stepped platform, exploded architecture layer, or instrument deck. Two materials: **PCB** (dark, matte, scattered emissive windows) and **Frost** (translucent, refractive, bright top rim). | 01 stack · 02 islands · 03 layers · 05 decks · 06 ring · 09 base · 10 ground |
| **K2** | `Chip` | Squircle tile carrying an icon and a real label. Instanced; hundreds per scene at no cost. | 02 · 03 core services · 04 stages · 05 experiment tiles · 06 service row |
| **K3** | `Conduit` | Bezier / Catmull-Rom tube routing between anchors, carrying `Bead` packets. **Bead speed is measured latency.** The most reused object in the set. | every reference |
| **K4** | `Core` | Emissive centre with volumetric shafts. Intensity bound to real load, never to a clock. | 01 apex · 02 engineering core · 03 mesh · 05 lab core · 08 cube · 10 spire |
| **K5** | `CityField` | Instanced dark blocks with emissive windows. Atmosphere and parallax, never subject matter. | 01 · 02 · 08 · 10 |
| **K6** | `Housing` | Machined dark-metal enclosure: bevelled edges, brushed normal detail, matte with a narrow specular. The "hardware" register. | 05 lab core · 06 control plane · 09 archive |
| **K7** | `Drawer` | Edge-lit card that slides out of a `Housing`. Each drawer is one real record. | 09 — and the mechanism for peeling the membrane open |
| **K8** | `Globe` | Earth: albedo, night-lights emissive, atmosphere rim, great-circle arcs. The only primitive needing image assets. | 06, small inset in 02 |
| **K9** | `Membrane` | The isolation surface. Invisible until struck, then a soap-film interference flare. **Already shipped** — `render/shaders.ts`. | the peak, wherever it lands |
| **K10** | `Field` | GPU point field driven from a vertex shader. | 05 GPU field · 05 shader surface · 08 lattice haze |

`Plate + Chip + Conduit + Core` alone compose references 01, 02, 03 and 10.

### 1.2 The medium law

Decided per object, not per scene:

| Medium | Gets | Rationale |
|---|---|---|
| **Three.js / R3F** | K1–K10. Anything with genuine depth, parallax, occlusion, or that the camera moves *through*. | Real spatial elements only. |
| **HTML / CSS** | **All text, without exception.** Nav, hero type, section numbers, instrument panels, station lists, tables, event streams, trace ribbons, buttons, callout labels. | Exact spelling, accessible, responsive, animatable, SEO-legible, sourced from the repo. Explicitly directed. |
| **SVG** | Leader lines from label to 3D anchor · flat connector diagrams (09 evidence flow, 09 decision tree, 05 lifecycle) · icons · ring gauges. | Vector, crisp, themeable, cheap. Not spatial — forcing these into 3D is the error the directive warns against. |
| **Canvas 2D** | Sparklines, waveform strips, 06's observability histograms, flow-health bars. | Dozens per screen, redrawn every tick; DOM or SVG at that count is the wrong tool. |
| **Image asset** | Earth albedo / night / normal maps (K8). Headshot (07, 08). Nothing else. | Everything else is generated. |
| **API-driven** | Every number, status, trace, event, region, latency, tenant reference and record on all ten screens. | §3. |

**No text is ever drawn into a texture, and no reference's baked words survive.**
The one exception already in the tree — in-world `drei/Text` plane labels — stays,
because it is structural typography in depth (§3.5), not content.

### 1.3 The lighting rig — one rig, ten scenes

There is no sun and no key light in any reference; every one is lit from inside its
own subject matter. That matches dossier §3.7 exactly, and is the single biggest
reason these references and this project fit each other at all.

- **Emissive-first.** Objects carry their own light. `MeshStandardMaterial` with
  emissive maps for `Housing` and `Plate-PCB`; a custom transmission-lite shader
  for `Plate-Frost` — full `MeshTransmissionMaterial` is tier-3 only, being a
  render-target-per-frame cost that will not hold 60fps on mid-range.
- **Three bound lights, no more.** One point light inside each active `Core`,
  intensity = real load. When the system is idle the world is genuinely darker.
- **Rim light is geometry, not lighting.** The bright top edge on every plate in 03
  and 09 is a shader term (fresnel × edge mask), not a light. Cheap, stable, and it
  survives every quality tier.
- **Bloom, restrained.** Threshold high enough that only emissive cores and beads
  bloom; plates must not. Tier 1 drops bloom for a cheap radial composite.
- **Fog is the depth cue.** Exponential fog tinted to ground. This is what makes 01,
  08 and 10 read as *vast* rather than *cluttered*, and it costs nothing.
- **Depth of field: tier 3 only**, focus bound to the camera's current anchor.

### 1.4 The camera system

One perspective camera. One rig. GSAP-driven, with weight — lead-in and settle,
never linear, never snapped (§3.8).

Every reference is a **named station**: `{ position, target, fov, focus }`. Moving
between references is a camera move through continuous space, never a cut.

The isometric feel of 01–03 and 09 is a **low-FOV camera at a high oblique angle**,
not an orthographic projection. Orthographic would kill the parallax that makes the
depth read, and parallax is most of why these images feel spatial.

Station anchors are declared in one table, so the world's geography is fixed and
knowable: the estate is laid out once and the ten references are ten places to
stand in it. That is what makes this one environment rather than ten scenes — and
it is what lets C3 be answered either way, since the stations exist whether the
visitor flies between them continuously or deep-links to one.

### 1.5 Colour — resolving C1

The references' chromatic rhythm is **cool structure / violet intelligence / warm
data / green health / red denial**. That rhythm is preserved. The hue assignments
move, because cyan is spoken for.

| Reference hue | Where it appears | Becomes | Why |
|---|---|---|---|
| Cyan on structural edges | plate rims, grid lines, TLS arrows | **`--structure` `#8fa3c8`** — new, desaturated blue-grey, **not a register entry** | Structural edges carry no state. A material property, like border colour. Keeps the cool reading without spending the locked hue. |
| Cyan on a tenancy boundary | 03 "TENANT ISOLATION", 04 tenant scope, denied paths | **`--isolation` `#67e8f9`** — unchanged | The one legitimate use. Far rarer than in the references, which is the point: it should be startling. |
| Green | LIVE badges, healthy sparklines, success traces | **`--signal` `#4ade80`** | Direct match. |
| Violet / magenta | core services, AI routing, archive drawers, decision trees | **`--record` `#a78bfa`** | Maps precisely — 09's drawers *are* the written record. |
| Orange / amber on the data plane | queue, cache, event stream, pipeline | **warm ember, as material temperature, not register** | Dossier §3.3: "load raises their internal temperature." Heat is a measurement here, so it is honest. Amber-the-register stays reserved for pre-launch status. |
| Red | 403s, denied service, error rate | **`--fault` `#f87171`** | Direct match. |

**One flagged casualty.** Reference 01 sets "I operate." in a cyan→violet→orange
gradient. Under the register that is one word claiming five states. Recommendation:
set it solid in `--signal` — it is the claim that he runs things in production,
which is exactly what signal means. Recorded as a recommendation, not a change: it
is the set's most distinctive typographic moment and the owner should rule on it.

### 1.6 The signal system

One bus. Every travelling light in all ten references — bead, arc, pulse, drawer
glow, sparkline tick — originates from a real `LiveEvent` on the existing wire
contract (`services/api/src/live/envelope.ts`), or from the labelled recording when
the live plane is unreachable.

- Bead **speed** = `durationMs`. Unmeasured (`null`) draws **no bead**, never a
  default-speed one.
- Bead **colour** = register, by `outcome`.
- `denied` beads terminate in a `Membrane` flare.
- **Idle means dark.** There is no ambient traffic generator. Adding one so a
  screenshot matches a reference would be the precise failure this project exists
  to disprove.

### 1.7 The transition system

Ten references, nine transitions. Each is a camera move plus a continuity object
present on both sides, so the visitor never loses the thread:

| | Move | Continuity object |
|---|---|---|
| 01→02 | pull back and up | the stack becomes one island of four |
| 02→03 | fly into one island | the island's core survives as the mesh core |
| 03→04 | layers rotate to edge-on and flatten | one request threads all seven layers |
| 04→05 | follow the request past production | the trace ribbon persists along the bottom |
| 05→06 | rise off the lab floor | the lab deck becomes the control ring |
| 06→07 | descend to the terminator | the globe's night side becomes the window |
| 07→08 | turn from desk to city | the desk lamp becomes the cube's glow |
| 08→09 | descend into the machine room | the cube becomes the archive's lock |
| 09→10 | pull back off the archive base | the base becomes the estate's ground plane |

---

## 2. THE TEN DECOMPOSITIONS

Each reference is decomposed on all thirteen required axes. `[K*]` cites the kit
primitive; medium is given per object.

---

### 01 — ENTER

**1. Spatial / 3D environment.** A night city seen from high oblique, roughly 35°
above horizon, with a stepped ziggurat rising from its centre. Camera is low-FOV
(≈28°), placed left-of-centre so the hero type occupies dead air on the left third.
Depth range is enormous — foreground blocks at ~8 units, city haze out past 200.

**2. Foreground.** The hero type block and the CTA (HTML). The trace ribbon panel,
bottom centre (HTML). Both float over the world with no plate under them.

**3. Midground.** The seven-tier stack `[K1 PCB]`, each tier a square plate with a
bright rim and scattered emissive windows, tiers shrinking upward. The plasma
`[K4]` at the apex with vertical volumetric shafts. Six annotated satellites right
of the stack — brain, monitor, database cylinders, cache, storage `[K2/K6]` — each
tethered by a `[K3]` conduit carrying beads.

**4. Background.** `[K5]` city field, instanced, fading into fog. Not subject
matter; it exists to give the stack somewhere to be.

**5. Lighting.** Entirely internal. Apex plasma is the brightest thing in frame and
the only strong point light. Plate rims are shader fresnel. Everything else is
emissive windows. Fog does the rest.

**6. Materials.** Plate-PCB: matte dark slate, low roughness variation, emissive
window mask. Conduits: additive tubes. Plasma: raymarched noise or a cheap
billboard-stack on lower tiers.

**7. Colour semantics.** Under §1.5: plate rims `--structure`; apex core
`--record`; the six satellites take their register by what they *are* — database
and cache run ember (data plane heat), monitoring runs `--signal`, AI runs
`--record`. The hero gradient is the flagged casualty.

**8. Typography.** Three tiers, and this hierarchy is the reference's real
contribution: (a) a mono eyebrow at ~12px, letterspaced ~0.12em, uppercase;
(b) a very large sans display, tight leading (~0.95), three lines, each line a
sentence; (c) mono body at ~15px. Metrics row uses tabular mono at ~28px over 10px
uppercase labels. **All HTML.**

**9. Interface elements.** Top nav with numbered sections and an active underline.
Top-right system-status pill with a live sparkline. Bottom-left metrics row.
Bottom-centre live-trace panel with a seven-node horizontal stepper. Bottom-left
scroll affordance. All HTML/CSS + Canvas sparkline.

**10. Animation.** Stack assembles tier-by-tier on arrival, timing driven by the
visitor's real handshake latency (§2.2, already the shipped behaviour). Plasma
breathes on real load. Beads travel at measured latency. Satellites drift on a slow
sine. Trace stepper advances as the real trace resolves.

**11. Interaction.** Hover a satellite → its conduit brightens and its label panel
gains detail. Hover a tier → the tier's plate lifts ~0.3 units and its label
resolves. "ENTER THE SYSTEM" begins the camera move to 02. Scroll drives the same
move continuously.

**12. Data-driven.** Edge PoP + RTT from the real handshake. Trace panel from a
real span. Metrics row — see §3, most of the reference's numbers cannot ship.

**13. Transitions.** From: cold open (black). To: 02, by pulling back until the
stack is one island among four.

---

### 02 — SYSTEMS

**1. Spatial.** Same city ground plane, camera higher and further back. Four
islands arranged around a central core, each island a raised plate carrying one
platform's geometry. This is the dossier's §2.7 scale reveal, and the reference
draws it almost exactly as specified.

**2. Foreground.** Hero type left (HTML). Architecture-overview panel bottom-left,
trace ribbon bottom-centre, systems-overview bottom-right (HTML + SVG + Canvas).

**3. Midground.** Four islands `[K1]` — three real platforms plus the demo. Each
carries a cluster of `[K2]` chips and a small `[K4]` core. The central
`[K4]` engineering core sits on a `[K6]` ring housing. `[K3]` conduits arc between
islands and the core.

**4. Background.** `[K5]`, deeper fog than 01, plus a faint world-map inset in the
bottom-right panel (SVG, not 3D).

**5. Lighting.** Each island lit by its own core; brightness is that system's real
current activity, and the pre-launch island is genuinely dimmer because it has no
traffic. That is a measurement, not a mood.

**6. Materials.** As 01. Island plates get a bevelled skirt — a `[K1]` parameter,
not a new primitive.

**7. Colour semantics.** Per-island register by real status: production islands
`--signal`, pre-launch `--pending`, demo island explicitly labelled and carrying
`--isolation` only on its tenancy boundary. The reference's per-island hue coding
(blue / orange / violet) is replaced by register + ember heat.

**8. Typography.** Hero repeats 01's three tiers. New: the left-hand numbered
dissection index (01–06) in mono with an active-state box — this is the same
device as the static site's index gutter and should share its CSS.

**9. Interface.** Nav, status pill, dissection index, three bottom panels, floating
label chips anchored to island features (HTML + SVG leaders).

**10. Animation.** Islands breathe on real load. Inter-island conduits carry real
cross-system signals where permission allows. Core rotates slowly; rotation rate is
**not** data-bound and should therefore be near-imperceptible.

**11. Interaction.** Click an island → camera flies in, reference 03. Hover → its
chips label up. Dissection index entries are deep links.

**12. Data-driven.** Island status, per-system activity, the systems-overview
counts — all from the machine layer the static site already publishes, read not
re-authored (P6 precedent).

**13. Transitions.** From 01 (pull back). To 03 (fly into an island).

---

### 03 — DISSECTION

**1. Spatial.** The strongest composition in the set. Seven architecture layers
exploded vertically, seen at high oblique, each layer a horizontal slab with
objects standing on it. Camera close enough that the top slab is cropped.

**2. Foreground.** Hero type left, live-system-health panel bottom-left, request
trace strip along the bottom, dissection sidebar right. All HTML.

**3. Midground.** The seven slabs `[K1 Frost]` — this is where the frost material
earns its cost. Slab 1 (client) is near-white and translucent; slabs darken and
saturate downward. Objects on slabs are `[K2]` chips. Vertical tapered arrows drop
between slabs; `[K3]` conduits route around the outside. Three tenant chips fly out
to the right on their own conduits, bracketed "TENANT ISOLATION".

**4. Background.** Almost none, deliberately — a dark machine-room gradient. The
subject is the only thing in frame, and that is why it reads.

**5. Lighting.** Each slab has a bright leading top edge (fresnel rim) and internal
scatter. A violet `[K4]` service-mesh core sits inside the core-services slab and
lights it from within.

**6. Materials.** Frost slabs: translucent, refractive, ~24-unit corner radius at
slab scale, thin bright rim. Chips: squircle, emissive fill, subtle inner bevel.
The reference's material language here is *frosted architectural glass*, and it is
distinct from 01's *circuit board*. Both are `[K1]` parameters.

**7. Colour semantics.** Layer identity by depth, not hue: light at the top,
saturated at the bottom. Core services `--record`; data/events ember; persistence
`--structure`; the tenant-isolation bracket is the frame's only `--isolation`, and
it should be the only cyan on screen.

**8. Typography.** Layer labels in mono uppercase, left-aligned, each with a
hairline leader rule running to its slab — this device is reused everywhere and
belongs in the shared `LabelLayer`. Sidebar uses a label / value stack at 10px /
14px.

**9. Interface.** Dissection sidebar (numbered index, system metadata, quick stats,
a documentation link), health panel with four Canvas sparklines, bottom request
trace with per-stage timings.

**10. Animation.** Layers separate on entry, staggered ~80ms. Arrows pulse downward
on real requests. Trace strip fills stage by stage as the real span resolves.

**11. Interaction.** Click a layer → it isolates, others recede and dim. Hover a
chip → its label and role resolve. Sidebar index scrubs between layers. **This is
the natural home for the membrane peel-open** (§2.5): clicking the tenant-isolation
bracket opens the real row-scope predicate and query plan as a `[K7]` drawer.

**12. Data-driven.** Layer contents from real service topology. Health panel from
real telemetry. Trace from a real span. Quick stats — see §3.

**13. Transitions.** From 02. To 04, by rotating the stack edge-on so the layers
flatten into a left-to-right pipeline.

---

### 04 — DATA

**1. Spatial.** The layer stack, re-read horizontally. A single request travels
left→right across seven staged objects on a faint blue grid floor. Shallower depth
than 03; nearly a stage set, and correctly so — this is a *sequence*, and sequence
reads left-to-right.

**2. Foreground.** Trace-ID card (left), user-device card, denied-request cards,
tenant-context card, observability strip, summary and trace-inspector panels
(right), and the live trace ribbon along the bottom. All HTML.

**3. Midground.** Seven stage objects: laptop, edge prism, API gateway slab, a
padlock (auth), the tasks-service `[K6]` housing, the Redis `[K6]` cylinder, the
Postgres cylinder, and the response monitor. `[K3]` conduits between them carry the
labelled request capsule.

**4. Background.** Grid floor with fog. Deliberately empty — nothing competes with
the request.

**5. Lighting.** The travelling request is the brightest object and lights each
stage as it passes. This is the reference's best idea: **the packet is the key
light**, so the sequence is legible as motion even in a still frame.

**6. Materials.** Housings (`[K6]`) here rather than plates. Glass cylinders for
the datastores with internal glow.

**7. Colour semantics.** The request capsule takes the register of its outcome.
Denied branches are `--fault` and drop away downward. The tenant-scope band is the
only `--isolation`. Cache-hit tags run ember.

**8. Typography.** Per-stage: number, name, role — three sizes stacked. Timings in
mono beside each hop. The top summary bar is a horizontal label/value rail.

**9. Interface.** Trace inspector, summary, tenant context, observability strip,
bottom trace ribbon with per-hop timings. All HTML; the ribbon is the same
component as 01/02/03's.

**10. Animation.** One continuous run of the capsule, at real measured per-hop
timings. Denied branches split off and die. Cache-hit shortcut visibly skips a hop.

**11. Interaction.** Scrub the trace ribbon → the capsule seeks. Click a stage →
its real span detail opens. **Fire a denied request → the 403 branch, the membrane
flare, and the audit pulse returning** — the peak beat, if it lands here rather
than in 03.

**12. Data-driven.** Entirely. Every hop timing, the trace ID, the status, the
tenant scope, the query plan. This reference is the one that is *already* mostly
real in the current build.

**13. Transitions.** From 03. To 05, by following the request past the production
boundary onto the lab decks.

---

### 05 — LAB

**1. Spatial.** The densest frame in the set. A wide lab floor, multiple decks at
different heights, camera high oblique and further back than 03. Six experiment
zones arranged around a central `[K6]` lab core.

**2. Foreground.** Hero type left, "what happens if" panel, lab-telemetry panel,
experiment selector along the bottom, active-experiment and controls panels right.
All HTML.

**3. Midground.** Lab core `[K6]` with an orange-lit vent. Around it: a network
topology graph (upper right), a shader surface (right, a displaced mesh), an
AI-routing board of `[K2]` chips, and physics objects on the left deck.

**4. Background.** Dark floor, minimal city. The frame is already full.

**5. Lighting.** Each zone lit by its own experiment. The GPU field (lower left) is
the second brightest thing and is pure additive points `[K10]`.

**6. Materials.** `[K6]` housings, `[K1]` decks, plus two genuinely new shader
surfaces: the point field and the displaced shader-lab mesh. Both are `[K10]`
parameterisations.

**7. Colour semantics.** Experiments are `--record` (they are the written record of
what was tried). Running state `--signal`; the load-test card is `--fault`-adjacent
because it is a stress test. Ember on the core vent.

**8. Typography.** Hero, then a dense label/value telemetry list at 11px/13px with
inline sparklines. Experiment cards: icon + name + one-line role.

**9. Interface.** Experiment selector (six cards), controls (run/pause/reset/change
parameter/compare), active-experiment readout with a real elapsed timer, telemetry
stream. All HTML + SVG icons + Canvas sparklines.

**10. Animation.** Each zone animates only while its experiment runs. The FPS/GPU
readouts are the renderer's **own real** numbers — the one place in the set where
self-measurement is trivially honest and should be exploited.

**11. Interaction.** Select an experiment → camera moves to that zone, controls
rebind. Change a parameter → the zone responds. This is the natural home for the
rate-limit and AI-cost demonstrations.

**12. Data-driven.** Renderer telemetry is real and local. Experiment results come
from real endpoints. Anything that is a claim about a system rather than about the
renderer goes through §3.

**13. Transitions.** From 04. To 06, by rising off the lab floor until the deck
becomes the control ring.

---

### 06 — LIVE

**1. Spatial.** Earth `[K8]` filling the upper two-thirds, a `[K6]` control-plane
ring floating in front of it, a row of platform panels below. Camera near-level —
the only near-level camera in the set, which is what makes this frame feel like a
*room* rather than a model.

**2. Foreground.** Twelve-plus instrument panels ringing the frame: live trace,
tenant activity, observability feeds, live metrics, active systems, event stream,
deployment pipeline, rate/latency/error charts, and a status bar across the bottom.
All HTML + Canvas.

**3. Midground.** The control-plane ring `[K6]`: concentric machined rings, a
central spire, radial conduits `[K3]` fanning out to the platform panels below.

**4. Background.** `[K8]` earth — night-lights emissive, atmosphere rim, great-
circle `[K3]` arcs to region markers.

**5. Lighting.** Earth's night side is emissive texture. The ring is lit by its own
spire. Region markers pulse on real events.

**6. Materials.** Earth: albedo + night emissive + normal, three image assets, the
only place in the project where an image is the right answer. Ring: `[K6]`.

**7. Colour semantics.** Arcs take the register of the event they carry. Region
markers `--signal` when healthy. Platform panels take their real status. The demo
plane is labelled the demo plane, visibly (§7.4) — the reference has no such label
and **must gain one**.

**8. Typography.** The most instrument-dense typography in the set: 10px uppercase
mono labels over 20–28px tabular values, every one with a sparkline. This is the
`InstrumentPanel` component, and it is used on all ten screens.

**9. Interface.** Everything named in (2), plus a bottom status bar with connection
state, last sync, and auto-refresh. The status bar is where **liveness honesty**
(§12) is discharged: live vs replay is stated here, always.

**10. Animation.** Arcs fire on real events. Sparklines advance on real ticks.
Earth rotates very slowly — decorative, so it must be slow enough to be subliminal,
and it stops under `prefers-reduced-motion`.

**11. Interaction.** Click a region → its latency detail. Click a platform panel →
that system's record. Follow-signal traces one event end to end.

**12. Data-driven.** This screen is *only* honest if it is entirely live. Every
panel needs a real source or it does not ship. See §3 — this reference contains the
largest concentration of unshippable figures in the set.

**13. Transitions.** From 05. To 07, descending to the terminator until the globe's
night side becomes the window behind the desk.

---

### 07 — THINK

**1. Spatial.** Not a diagram. A photographic scene: a person at a desk at night,
city bokeh behind, a circular diagram overlay orbiting their head. Shallow depth of
field. This and 08 are the only two frames with a human in them, and the register
shift is deliberate and correct — §4 says the protagonist is the engineer.

**2. Foreground.** Serif display type left — **the set's one serif**, and it should
be honoured. The five-principles row, the "what I got wrong" column, the career
timeline, and the CTA. All HTML.

**3. Midground.** The subject (image asset). The concentric orbit diagram — SVG,
not 3D: it is a flat overlay in screen space, and building it in 3D would gain
nothing and cost focus.

**4. Background.** Monitor with architecture sketches, city bokeh. Image plus a
`[K5]` bokeh field at very low density.

**5. Lighting.** Practical light only — monitor glow, desk lamp, city. Warm on the
subject, cool on the room. This is the "warmth in a cold room" of §3.1 rendered
literally, and it is the strongest emotional frame in the set.

**6. Materials.** Photographic. No 3D materials.

**7. Colour semantics.** Restrained. `--record` on the orbit diagram (it is
judgment, which is record). Everything else near-neutral.

**8. Typography.** **The set's typographic outlier and its best moment.** A serif
display at ~64px with a coloured emphasis word, over a sans body. Then a second
serif line at ~36px ("Build what matters…"). Then dense mono for the five
principles and the timeline. Three families in one frame, and it works because each
carries a different register: serif = judgment, sans = explanation, mono = record.

**9. Interface.** Five-principles row, "what I got wrong" flow, timeline, CTA card,
footer with real links.

**10. Animation.** Orbit rings rotate slowly (SVG). Type reveals on scroll.
Timeline draws left to right. Everything collapses to opacity under reduced motion.

**11. Interaction.** Hover a principle → expands to its full statement, sourced
from `content/lessons/`. Timeline nodes open the corresponding record.

**12. Data-driven.** Principles and lessons come from repository content
(`lessons/`, `decisions/`), not from prose written for this screen. The "what I got
wrong" column maps directly onto the two shipped lesson documents.

**13. Transitions.** From 06. To 08, turning from desk to window.

---

### 08 — BUILD

**1. Spatial.** Subject in the right third seen from behind, looking out over a
vast lit lattice-city; a glowing cube hovers over it at eye level. Deepest apparent
depth in the set.

**2. Foreground.** Hero type left, CTA, availability block, links (HTML). Desk
objects bottom (image). Footer band.

**3. Midground.** The cube `[K4]` inside a wireframe boundary, on a `[K1]` plinth.
A left-hand capability rail — seven SVG icons with labels and leader lines to the
scene. Two floating status cards.

**4. Background.** `[K5]` at its largest extent, plus `[K10]` haze. This is the
frame where the city field is doing the most work.

**5. Lighting.** The cube is the key light and rim-lights the subject's shoulder.
One warm ground trail leads the eye from bottom-left to the cube.

**6. Materials.** `[K4]` cube: nested emissive shells with a wireframe cage.
`[K5]`: instanced, three LODs.

**7. Colour semantics.** `--record` violet on the cube (an undefined next system is
a decision not yet made). `--signal` on the availability dot. The ground trail runs
ember.

**8. Typography.** Returns to sans display, matching 01 — which is what closes the
loop between the first frame and the last CTA. Availability in mono.

**9. Interface.** Capability rail, CTA, contact links, footer with the identity
line. **This is the only frame where the name appears** (§3.11) — the reference
places it in the footer, which is exactly right.

**10. Animation.** Cube breathes. Ground trail pulses toward it. Capability rail
items connect on hover.

**11. Interaction.** Capability rail items are deep links back into the world.
CTA opens contact.

**12. Data-driven.** Availability status and links from `config/site.ts` and
`config/cv.ts`. The "next system: undefined" card is honest by construction and
should stay literal.

**13. Transitions.** From 07. To 09, descending into the machine room.

---

### 09 — PROOF

**1. Spatial.** A machine room. One `[K6]` archive cabinet centre-frame on a
`[K1]` plinth, its door swung open, seven `[K7]` drawers glowing inside. Server
racks recede into darkness behind. Camera at chest height, close.

**2. Foreground.** Hero type left, six-tile stat rail across the top, six panels
around the edges: evidence overview, evidence quality, recent additions, top
artifacts, evidence timeline, trace inspector, system confidence. All HTML + SVG +
Canvas.

**3. Midground.** The cabinet `[K6]` — bevelled dark metal, mesh top panel, hinged
door with an interior index plate. Seven `[K7]` drawers, each edge-lit in its own
hue, each one a real record category. `[K3]` conduits leave the base.

**4. Background.** Racks, `[K5]` at low density with a rack profile. Heavy fog.

**5. Lighting.** The drawers are the only significant light source, spilling onto
the cabinet's interior and the plinth. Beautifully motivated, and cheap: one
emissive per drawer.

**6. Materials.** The set's best material moment: **machined anodised metal**
against **edge-lit acrylic**. Matte body with a narrow specular, bevelled edges,
fine brushed normal. Worth doing properly, because this frame is entirely about
the object.

**7. Colour semantics.** Drawers are `--record` at varying luminance rather than
the reference's rainbow — seven hues would spend the whole register on one object
and mean nothing. Verified state `--signal`; failures `--fault`.

**8. Typography.** Interior index: number + label, mono, evenly leaded. Drawer
faces carry their category. The stat rail is label-over-value with a delta chip.

**9. Interface.** All six panels; the decision-insight tree (SVG); the evidence
flow (SVG, source→destination with a database node); ring gauges (SVG).

**10. Animation.** Door opens on arrival. A drawer slides out when selected. Timeline
advances through collect→normalize→correlate→analyze→archive→verify at real
timestamps.

**11. Interaction.** Click a drawer → it slides out and its records list opens.
This is the same `[K7]` mechanism as the membrane peel in 03, which is why it is
one primitive. Trace inspector opens the full real span.

**12. Data-driven.** Drawer contents are the repository's own record: decisions,
evidence chips, lessons, ADRs, test results. **The archive is genuinely full**, and
this is the frame where the project's own repository becomes the exhibit.

**13. Transitions.** From 08. To 10, pulling back off the plinth.

---

### 10 — END

**1. Spatial.** The estate at distance: a wide dark ground plane of city blocks,
one lit spire, light-trails sweeping in from the lower left, nine section markers
floating over the terrain. Camera high, far, and slightly rolled.

**2. Foreground.** Hero type left, CTA, system-status blocks, footer band with the
name and a single closing line. All HTML.

**3. Midground.** The `[K4]` spire in a glass column on a `[K1]` plinth. Light
trails — `[K3]` conduits at large scale with long trails, the frame's dominant
motion.

**4. Background.** `[K5]` at its widest, heavy fog, faint grid.

**5. Lighting.** The spire and the trails only. The darkest frame in the set, and
it should be: it is the end.

**6. Materials.** As 01, but rougher and darker — the same city seen at rest.

**7. Colour semantics.** Trails carry register. The `[STANDBY]` / `[UNKNOWN]`
readouts are literally honest and should be preserved verbatim: an unknown next
problem is stated as unknown, which is Truth Constitution rule 4 rendered as a
design element. It is the best thing in the reference set.

**8. Typography.** Sans display returns, then the closing line in a bordered strip.
Version string bottom-right in mono.

**9. Interface.** Nine section markers with leader lines (HTML + SVG), three
status blocks, CTA, footer.

**10. Animation.** Trails sweep continuously — this is the one place ambient motion
is defensible, because they are the visitor's own session's requests replayed. If
that cannot be made true, they carry real live events or they do not move.

**11. Interaction.** Section markers are deep links back to each station. CTA opens
contact. **This is where the tenant TTL countdown and the purge belong** (§2.8) —
the reference's readouts are already shaped for it.

**12. Data-driven.** Section markers reflect what the visitor actually visited.
Status blocks are real. The countdown is a real TTL on a real scheduled job.

**13. Transitions.** From 09. Terminal — the arc ends here, on the purge.

---

## 3. TRUTH RECONCILIATION

Every figure baked into the reference images was checked against the Truth
Constitution. The images are AI-generated and their numbers are inventions; several
of them name figures the constitution specifically forbids publishing.

**Nothing below is a design compromise. The composition survives in every case —
only the content of the slot changes.**

| Reference figure | Verdict | What ships in that slot |
|---|---|---|
| `UPTIME 99.99% / 99.98% / 99.96%` (01, 02, 03, 06, 09) | **Forbidden** — rule 7 names uptime figures as non-existent in evidence | The slot carries live/degraded **state**, not a percentage. |
| `ACTIVE TENANTS 12.4K`, `+24 more tenants`, `USERS (ACTIVE) 12.4K` (03, 06) | **Forbidden** — rule 7, no tenant or user counts | Real demo-plane presence from the existing honest presence counter, which already distinguishes *unknown* from *zero*. |
| `REQUESTS/MIN 2,487`, `24.8K`, `9.2K`, `2.48K req/s` (01, 02, 03, 06) | **Forbidden as written** — production throughput is not published | Real demo-plane request counts for the visitor's own session, labelled as such. |
| `ERROR RATE 0.02%`, `0.82%` | **Forbidden** as a production claim | Real demo-plane outcome counts. |
| `128 SERVICES`, `23 REGIONS`, `2.4M EVENTS`, `26 SERVICES`, `3 DATABASES` | **Unstated** — rule 4, unknown facts are never estimated | Omit the tile, or carry a real count of a real thing. **An unpublished figure is unpublished, not zero.** |
| `7,842 cases archived`, `128K artifacts`, `14.6K decisions`, `22.1K tests run`, `3.6M links` (09) | **Fabricated** | Real counts from the repository's own record, countable at build time. Measured 22 Aug 2026: **12** decision records, **5** evidence chips, **2** lessons, **3** systems, **14** integration tests, **4** migrations, **19** phase-log entries. Two orders of magnitude below the reference, and that is the correct outcome — the drawer labelled DECISIONS opens onto twelve decisions a person actually wrote and can be read in full. The reference's scale must not be matched; the reference's *composition* must. Design the panels for two-digit counts. |
| `98.7% evidence quality`, `99.98% confidence`, `flow health 99.98%` (09) | **Meaningless** — no such metric exists | Cut. The panels become real distributions of real record types. |
| `HOSPITALITY OPERATIONS` (02, 03, 06) | **Wrong on two counts** — an AI misrendering of "hospital … operations", and rule 7 forbids naming the hospital | The repository's approved title, verbatim: **"Hospital housekeeping operations"**, with the approved qualifier "a NABH-accredited hospital" where a venue must be referred to at all. |
| `AMS AP-SOUTH-1`, region latency table (03, 06) | **Unverified** | Real edge PoP and RTT, which the arrival beat already measures per visitor. |
| `v3.7.4`, `Deployed 5s ago`, `Menu Platform v0.7.5` (03, 06) | **Unverified** | Real build metadata, or omit. |
| Every `LIVE` badge | **Conditional** — rule 12 | Bound to real connection state. Replay says replay, on the same badge. |
| Demo plane unlabelled (02, 06) | **Missing** — rule 11 | The demo plane gains a visible label. Non-negotiable, and per §7.4 the contrast is the point. |
| `clients` | **Banned word** (`content/banned.json`) | Note that layer label `CLIENT` (singular, 03/04) is *not* banned and is correct usage. |

Two smaller notes. Reference 02's `SYSTEMS OVERVIEW: 3 Primary Systems / 12
Services Online` — the three is real and publishable; the twelve is not. And
reference 06's `SYSTEM STATUS: ALL SYSTEMS OPERATIONAL` must be derived, never
asserted; if the live plane is down, this banner is the first thing that must
say so.

---

## 4. BUILD ORDER

Each stage ends green before the next begins.

| Stage | Delivers | Gate |
|---|---|---|
| **R0** | This document; owner rulings on C2 and C3 | — |
| **R1** | The kit: `Plate`, `Chip`, `Conduit`, `Core` + lighting rig + camera rig + `LabelLayer` + `InstrumentPanel`. No scene yet. | Renders at tier 2, 60fps, on a bench scene |
| **R2** | References 01–03 (`ENTER`, `SYSTEMS`, `DISSECTION`) — the strongest and most reusable compositions | Budgets; reduced motion by execution |
| **R3** | Reference 04 (`DATA`) — largely a re-composition of what already ships | Trace fidelity against real spans |
| **R4** | References 06, 09 (`LIVE`, `PROOF`) — `Housing`, `Drawer`, `Globe` | §3 reconciliation verified against **built** output |
| **R5** | References 05, 07, 08, 10 | Full gate suite |
| **R6** | Transition system end to end | One continuous take, if C3 says so |

**Nothing in R1 depends on the answers to C2 or C3.** The kit, the lighting, the
camera rig, the label layer and the panel component are required under every
outcome, which is why they are first.
