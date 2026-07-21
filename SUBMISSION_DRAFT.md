# VesselDelta Devpost submission draft

## Entry

- **Name:** VesselDelta
- **Tagline:** Change a vessel. See what pressure and flow do.
- **Primary track:** Education
- **Team:** Individual, Fuzlullah Syed
- **Demo URL:** https://vesseldelta.ankigpt.workers.dev/
- **Repository:** https://github.com/Sammsamy/vesseldelta (public, MIT)
- **Video:** pending recording/upload
- **Codex session ID:** `019f48c7-345a-70d3-bf51-81bbc847143b`

## Short description

VesselDelta lets anyone narrow a vessel, add a bulge, raise pressure, and see the mechanics change. A live flow model shows the jet and swirl. A separate real-unit wall lab computes `stress = pressure × radius ÷ thickness` and makes clear that its threshold tear is a teaching animation, not a rupture prediction.

## Inspiration

As a third-year medical student, I kept seeing blood vessels explained with static arrows and one red danger color. Those pictures blur together three different ideas: pressure pushes outward, flow moves along the wall, and tissue strength belongs to a separate wall problem.

I wanted anyone, not only a medical learner, to change one thing and see what follows. Nearly half of U.S. adults met the CDC hypertension definition in the cited national estimate. That number is context, not proof that VesselDelta changes health or learning. [CDC source](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)

## What it does

Anyone can:

- choose a straight, narrowed, bulging, or higher-pressure vessel story;
- see where flow speeds up, slows down, swirls, and changes near the wall;
- drag either wall and compare the changed vessel with a live straight reference;
- rotate a 3D cutaway that keeps its computed 2D source visible;
- raise pressure without pretending that pressure automatically makes flow faster;
- open a separate wall lab with pressure, radius, thickness, and selected tissue-strength controls;
- see `σ = P · r / t` calculated with `mm Hg`, `mm`, and `kPa`;
- trigger a clearly labeled teaching tear when calculated stress crosses the selected illustrative strength;
- use a four-case section to separate immediate shape and pressure mechanics from longer-term diet, activity, and medicine pathways;
- inspect the numerical checks and source receipts behind the result.

The 3D scene shows where its picture comes from. A color plane displays the current 2D grid inside a layered vessel with an outer wall, inner lining, and cut edges made from the same wall shape. The red blood cell forms are massless visual tracers on that plane. They help a visitor follow motion but do not act like real cells. Amber marks the narrowed shape, not plaque tissue.

The instrument runs locally with no login, upload, server simulation, or paid runtime model call.

Safety scope: VesselDelta is educational and does not predict a person's vessel damage, treatment response, or rupture risk.

## How we built it

The numerical core is an original JavaScript D2Q9 BGK lattice-Boltzmann solver with pull streaming, halfway bounce-back rigid walls, a parabolic Zou–He velocity inlet, and fixed-density Zou–He outlet. The editable lumen uses constrained smooth wall profiles. Pointer edits rebuild the solid mask while newly opened fluid nodes warm-start from neighboring equilibrium values.

Two `160 × 70` fields run under the same flow setting: the edited vessel and the untouched reference. Canvas rendering shows flow speed and swirl, moves passive tracers, and computes a normalized near-wall flow-change proxy. It is not a clinical wall-shear measurement. A separate relative wall-load lens shows that pressure and radius belong to a different relation.

The wall stress and strength lab is independent of both flow fields. It computes `σ = P · r / t`, converts `mm Hg` and `mm` into `kPa`, and compares the result with a strength value selected for the lesson. More pressure, a larger radius, or a thinner wall raises calculated stress. The `680 kPa` default is the arithmetic midpoint of two ex-vivo abdominal aortic aneurysm tissue group means, not a clinical cutoff. When calculated stress crosses the selected strength, the visible tear is triggered by arithmetic and remains labeled as an illustration. [Strength source](https://pubmed.ncbi.nlm.nih.gov/16520175/) · [Thickness source](https://pubmed.ncbi.nlm.nih.gov/16337949/)

Three.js turns the same wall shape into a rotatable cutaway and places the live 2D color plane inside it. There is no hidden 3D flow solve. Ninety-two red blood cell forms follow the current 2D velocity field with a visual time scale and never add mass, momentum, or blood-cell physics.

Idealized lumen restoration changes only geometry. It removes the complete narrowing amplitude and rebuilds the field boundary. Because the model has no physical time calibration, the final reference geometry is reseeded as a steady counterfactual rather than treating the transition as a device-deployment timescale. The visual rings do not enter the equations.

Codex with GPT-5.6 helped implement and adversarially audit the solver, boundary conditions, geometry editing, 2D-to-3D mapping, performance, medical claims, accessibility, tests, and submission framing.

## Challenges

### Making 3D more honest than a flat screenshot

Adding depth could easily have turned a 2D model into a fake 3D-CFD claim. The solution was to make the mapping visible: a computed-grid color plane inside a surface generated from the same wall profile, plus a persistent `2D D2Q9 CFD · 3D cutaway · Illustrative` receipt. Depth improves intuition without changing what was calculated.

### Showing blood cells without claiming blood-cell physics

RBC-shaped particles create immediate visual recognition, but they can overpromise rheology. Every tracer remains massless, stays on the computed plane, samples only `uₓ,uᵧ`, and is labeled as a visual guide. The model card explicitly excludes hematocrit, cell deformation, aggregation, and non-Newtonian blood.

### Showing a geometry intervention without faking efficacy

A stent-like ring animation is compelling, but a ring mesh is not a medical-device simulation. We constrained the feature to one falsifiable action: restore the idealized lumen to the reference geometry and recompute a steady field. VesselDelta makes no claim about physical deployment time, device mechanics, patient selection, restenosis, embolic risk, or clinical success.

### Showing wall failure without faking a prediction

A tear is the strongest visual in the project, so it has the strictest boundary. The equation and unit conversion are real. The strength is selected for the lesson. The `680 kPa` starting value is a derived midpoint of published ex-vivo group means, not a reported cutoff. The tear appears only when the arithmetic stress reaches that selected value, and the interface calls it an illustrative threshold crossing. No crack mechanics or patient risk is calculated.

### Keeping clinical context outside the solver

AHA lifestyle ranges and FDA-sourced medication pathways remain optional context. They describe sustained population evidence and high-level mechanisms without entering the CFD, becoming additive personal forecasts, simulating dose or efficacy, or recommending treatment. [AHA source](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf) · [FDA hypertension source](https://www.fda.gov/consumers/health-education-resources/hypertension)

### Prior art changed the product

Our first claim was that browser blood-flow tools barely existed. Research disproved it. Analytic browser hemodynamics and browser fluid demos already exist. We changed the contribution to the complete experience: direct vessel sculpting, a continuously recomputed flow comparison, an inspectable 2D-to-3D translation, separate pressure and flow lessons, a real-unit thin-wall stress experiment, an honestly labeled threshold animation, and visible numerical verification.

## Accomplishments

- A rotatable vessel cutaway that carries a current-grid color map without claiming volumetric CFD or raw 3D values.
- Four vessel stories whose geometry and model boundaries are documented.
- A second live solver that makes every headline ratio a measured counterfactual rather than a canned score.
- A full geometry-restoration interaction that reseeds and recomputes the final steady reference geometry instead of presenting a transition as treatment time.
- A numerical and release suite plus a production smoke check, including reachable inside-gate and rejected flow shapes, unit conversion, stress scaling, threshold labels, lumen restoration, gallery fixtures, and the lazy 3D bundle.
- A reproducible 10,000-step benchmark with `<0.4%` absolute mass-flux mismatch in both healthy and stenosis cases, no counted safety interventions, `1.608×` stenosis peak speed, and a `3.492×` relative axial near-wall gradient proxy.
- Primary-source receipts for the CDC burden figures, AHA lifestyle ranges, and FDA treatment mechanisms.
- A real-unit thin-wall calculator with adjustable pressure, radius, wall thickness, and selected strength.
- A threshold-crossing tear that is visibly separated from the flow solver and labeled as a teaching animation.
- A default three-step tour that turns the core claims into simple predictions and drives the live scene.
- A model card that separates computed mechanics from every interpretive layer.

## What we learned

The strongest visual needs the clearest explanation. VesselDelta became better when the 3D view exposed its 2D source, the blood cells admitted they were tracers, and the tear said exactly what triggered it. The equation can be real while the animation remains illustrative.

We also learned that visible testing can be part of the design. A visitor can reset to the reference, inspect current numerical checks, change the geometry, watch the results change, and read exactly what remains outside the model.

## What is next

- classroom testing with pre/post concept questions;
- run the documented informal learner protocol and report only genuine, fully disclosed results;
- physician and educator review of language and pedagogy;
- WebGL performance and fallback QA across representative devices;
- grid-convergence tooling and improved wall-normal shear sampling;
- a longer-period, validated pulsatile boundary implementation;
- optional higher-resolution or WebGL compute experiments;
- carefully scoped compliant-wall and failure-mechanics research;
- never patient-specific, diagnostic, or treatment-guiding use without a fundamentally different model and validation program.

## Built with

Codex, GPT-5.6, TypeScript, React, vinext, Three.js, WebGL, Canvas 2D, D2Q9 lattice-Boltzmann methods, Cloudflare runtime, and the Node test runner.

## Required disclosures

VesselDelta computes a steady 2D rigid-wall flow field and a separate uniform thin-wall stress equation. Its 3D cutaway, red blood cell tracers, lumen-restoration rings, pressure arrows, and threshold tear are illustrative views with visible boundaries.

VesselDelta is educational, not clinical CFD, a medical device, medical advice, or a rupture-risk tool. No physician review, educator study, or clinical validation was completed before submission.

VesselDelta was created during the submission period; the current Git history begins July 21, 2026. The solver and product code were written for this project, and no third-party LBM source was copied. Numerical methods and public-health sources are cited in the README and METHODS document. Direct framework and dependency licenses are disclosed in `THIRD_PARTY_NOTICES.md`. VesselDelta is released under the MIT License.

## Official checklist

- [x] Public testable demo
- [x] Public repository with approved MIT license
- [x] Local cover and gallery images with bounded captions
- [x] README collaboration story
- [x] Primary-task Codex Session ID verified from the active task metadata
- [ ] Public YouTube video under three minutes with real voiceover
- [ ] Education category selected
- [ ] Individual submission
- [ ] United States selected as country of residence
- [ ] Final description revised into Fuzlullah's natural voice rather than pasted unchanged
- [ ] Contest terms reviewed and accepted by Fuzlullah
- [ ] Final owner approval before Devpost submission

Rules reference: https://openai.devpost.com/rules

FAQ reference: https://openai.devpost.com/details/faqs
