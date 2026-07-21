# VesselDelta — Devpost submission draft

## Entry

- **Name:** VesselDelta
- **Tagline:** Shape the vessel. Watch the flow answer.
- **Primary track:** Education
- **Team:** Individual — Fuzlullah Syed
- **Demo URL:** pending owner-authorized deployment
- **Repository:** pending owner-authorized public licensed repository, or private repository shared with both required judging addresses
- **Video:** pending recording/upload
- **Codex session ID:** pending retrieval from the primary build thread with `/status`

## Short description

VesselDelta turns vascular mechanics into a guided live experiment. Predict a narrowing jet, watch two D2Q9 fields withhold their comparison until they pass a numerical gate, separate flow from pressure–radius wall tension, and finish by refusing a rupture conclusion the model cannot support. Free exploration then exposes the rotatable 3D cutaway and editable computed 2D slice.

## Inspiration

VesselDelta is for early health-professions and physiology learners who need to distinguish velocity, a near-wall gradient proxy, pressure–radius tension, and rupture claims that a model cannot support. As a third-year medical student, I kept seeing those ideas explained with static arrows or one red danger color. Those images hide the most useful question: **what was actually measured or computed?**

I wanted a learner to change one boundary with their own hand, see the field answer, and inspect the model’s limits. The CDC statistic is context, not evidence that VesselDelta improves learning: `48.1%`, or `119.9 million`, U.S. adults met its cited hypertension definition in NHANES 2017–March 2020 estimates. VesselDelta does not diagnose or treat them; it makes one foundational distinction visible: flow-related shear and pressure-driven circumferential wall tension are different quantities. [CDC source](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)

## What it does

The learner can:

- complete a three-step predict-before-reveal lab covering a narrowing jet, pressure-versus-flow separation, and the rupture boundary;
- rotate an axisymmetric 3D cutaway that exposes its current computed `160 × 70` source slice instead of implying 3D CFD;
- sculpt either wall and compare the edited field with a simultaneously running untouched control;
- inspect modeled velocity, signed vorticity, a normalized axial near-wall gradient proxy, and a separate pressure–radius wall-tension lens;
- explore four bounded stories plus idealized lumen restoration while keeping geometry, treatment, and rupture claims explicit;
- inspect live numerical gates, equations, test evidence, model limits, and optional source-linked clinical context.

The 3D scene is transparent about its construction. A cell-by-cell 8-bit color map of the current grid appears inside a surface-of-revolution cutaway; signed vorticity stays signed, while the shear and wall-tension lenses are derived display maps. The surrounding rings repeat a layer-specific derived axial sample, not volumetric flow. RBC-shaped objects are massless visual tracers on that plane, driven by sampled `uₓ,uᵧ` with a display-only time scale. Amber marks modeled narrowing geometry, not plaque biology.

The instrument runs locally with no login, upload, server simulation, or paid runtime model call.

## How we built it

The numerical core is an original JavaScript D2Q9 BGK lattice-Boltzmann solver with pull streaming, halfway bounce-back rigid walls, a parabolic Zou–He velocity inlet, and fixed-density Zou–He outlet. The editable lumen uses constrained smooth wall profiles. Pointer edits rebuild the solid mask while newly opened fluid nodes warm-start from neighboring equilibrium values.

Two `160 × 70` fields run under the same flow drive: the edited vessel and the untouched reference. Canvas rendering displays the current velocity and signed vorticity arrays, advects passive tracers, and computes a normalized axial near-wall grid-gradient proxy. It is not a slope-aware clinical WSS measurement. The wall-tension lens is deliberately separate and uses the thin-cylinder dimensionless relation `(P/P0) × (r/r0)`; it is not hoop stress.

Three.js turns the current wall profiles into a rotatable axisymmetric cutaway. It color-encodes the current grid cell by cell in a planar texture and repeats a layer-specific derived axial sample around each ring for interpretation. Shear and wall-tension lenses remain explicitly derived display maps. There is no hidden 3D solve. Ninety-two RBC-inspired forms advance from the current 2D `uₓ,uᵧ` field with a visual time multiplier but contribute no mass or momentum.

Idealized lumen restoration changes only geometry. It removes the complete narrowing amplitude and rebuilds the field boundary. Because the model has no physical time calibration, the final reference geometry is reseeded as a steady counterfactual rather than treating the transition as a device-deployment timescale. The visual rings do not enter the equations.

Codex with GPT-5.6 helped implement and adversarially audit the solver, boundary conditions, geometry editing, 2D-to-3D mapping, performance, medical claims, accessibility, tests, and submission framing.

## Challenges

### Making 3D more honest than a flat screenshot

Adding depth could easily have turned a 2D model into a fake 3D-CFD claim. The solution was to make the mapping visible: a computed-grid color plane inside a surface generated from the same wall profile, plus a persistent `2D D2Q9 CFD · 3D cutaway · Illustrative` receipt. Depth improves intuition without changing what was calculated.

### Showing blood cells without claiming blood-cell physics

RBC-shaped particles create immediate visual recognition, but they can overpromise rheology. Every tracer remains massless, stays on the computed plane, samples only `uₓ,uᵧ`, and is labeled as a visual guide. The model card explicitly excludes hematocrit, cell deformation, aggregation, and non-Newtonian blood.

### Showing a geometry intervention without faking efficacy

A stent-like ring animation is compelling, but a ring mesh is not a medical-device simulation. We constrained the feature to one falsifiable action: restore the idealized lumen to the reference geometry and recompute a steady field. VesselDelta makes no claim about physical deployment time, device mechanics, patient selection, restenosis, embolic risk, or clinical success.

### Keeping clinical context outside the solver

AHA lifestyle ranges and FDA-sourced medication pathways remain optional context. They describe sustained population evidence and high-level mechanisms without entering the CFD, becoming additive personal forecasts, simulating dose or efficacy, or recommending treatment. [AHA source](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf) · [FDA hypertension source](https://www.fda.gov/consumers/health-education-resources/hypertension)

### Prior art changed the product

Our first claim was that browser blood-flow/WSS tools barely existed. Research disproved it: analytic browser hemodynamics and browser LBM demos already exist. We changed the contribution to the complete learning loop: a default guided prediction journey, direct constrained vessel sculpting, continuously recomputed CFD, a synchronized control, an inspectable 2D-to-3D translation, two mechanically distinct force lessons, an explicit refusal at the rupture boundary, and visible numerical verification. Treatment and lifestyle interpretation remain optional context rather than separate headline products.

## Accomplishments

- A rotatable vessel cutaway that carries a current-grid color map without claiming volumetric CFD or raw 3D values.
- Four vessel stories whose geometry and model boundaries are documented.
- A second live solver that makes every headline ratio a measured counterfactual rather than a canned score.
- A full geometry-restoration interaction that reseeds and recomputes the final steady reference geometry instead of presenting a transition as treatment time.
- A 17-test numerical and release suite plus a production smoke check, including inside/outside-gate reachable sculpt paths, comparison-ratio withholding, lumen restoration without diameter overshoot, adversarial gallery fixtures, and the lazily loaded 3D bundle.
- A reproducible 10,000-step benchmark with `<0.4%` absolute mass-flux mismatch in both healthy and stenosis cases, no counted safety interventions, `1.608×` stenosis peak speed, and a `3.492×` relative axial near-wall gradient proxy.
- Primary-source receipts for the CDC burden figures, AHA lifestyle ranges, and FDA treatment mechanisms.
- A rupture interaction whose payoff is a scientifically correct refusal.
- A default three-step mechanics lab that turns the core claims into falsifiable learner predictions, drives the live scene, and labels its local score as non-validated.
- A model card that separates computed mechanics from every interpretive layer.

## What we learned

The strongest visual is not necessarily the strongest claim. VesselDelta became better when the 3D view exposed its 2D source, the blood cells admitted they were tracers, lumen restoration stayed a steady geometry counterfactual, and the rupture button said no.

We also learned that visible falsifiability can be part of the design. A learner can reset to the reference, inspect current numerical checks, disturb the geometry, watch ratios change, and read exactly which effects remain outside the model.

## What is next

- classroom testing with pre/post concept questions;
- run the documented informal learner protocol and report only genuine, fully disclosed results;
- physician and educator review of language and pedagogy;
- WebGL performance and fallback QA across representative devices;
- grid-convergence tooling and improved wall-normal shear sampling;
- a longer-period, validated pulsatile boundary implementation;
- optional higher-resolution or WebGL compute experiments;
- carefully scoped compliant-wall research;
- never patient-specific, diagnostic, or treatment-guiding use without a fundamentally different model and validation program.

## Built with

Codex, GPT-5.6, TypeScript, React, vinext, Three.js, WebGL, Canvas 2D, D2Q9 lattice-Boltzmann methods, Cloudflare runtime, and the Node test runner.

## Required disclosures

VesselDelta computes a steady 2D Newtonian rigid-wall educational field with no physical time calibration. Its 3D cutaway, RBC-inspired tracers, story labels, amber narrowing, stent-like lumen-restoration animation, lifestyle evidence, medication mechanisms, and rupture lesson are illustrative layers with explicit boundaries.

It is not clinical CFD, a medical device, diagnosis, advice, a plaque locator, a patient-specific model, a treatment selector, a drug-response calculator, a stent-outcome predictor, or an aneurysm-rupture predictor. No physician review, educator study, or clinical validation was completed before submission.

VesselDelta was created during the submission period; the current Git history begins July 21, 2026. The solver and product code were written for this project, and no third-party LBM source was copied. Numerical methods and public-health sources are cited in the README and METHODS document. Direct framework and dependency licenses are disclosed in `THIRD_PARTY_NOTICES.md`. VesselDelta's own license selection remains pending owner authorization.

## Official checklist

- [ ] Public testable demo
- [ ] Public repository with approved license, or private repository shared with `testing@devpost.com` and `build-week-event@openai.com`
- [x] Local cover and gallery images with bounded captions
- [x] README collaboration story
- [ ] Primary-thread Codex Session ID retrieved with `/status`
- [ ] Public YouTube video under three minutes with real voiceover
- [ ] Education category selected
- [ ] Individual submission
- [ ] United States selected as country of residence
- [ ] Final description revised into Fuzlullah's natural voice rather than pasted unchanged
- [ ] Contest terms reviewed and accepted by Fuzlullah
- [ ] Final owner approval before Devpost submission

Rules reference: https://openai.devpost.com/rules

FAQ reference: https://openai.devpost.com/details/faqs
