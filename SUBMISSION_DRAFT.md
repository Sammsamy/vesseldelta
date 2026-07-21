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

VesselDelta turns vascular mechanics into a hands-on experiment. Rotate an illustrative 3D vessel cutaway, open and sculpt the current 2D D2Q9 grid beneath it, compare the edited field with a second live reference, and learn why modeled velocity, an axial near-wall gradient proxy, and relative pressure–radius wall tension are different—and why none of them can predict rupture here.

## Inspiration

As a third-year medical student, I kept seeing blood pressure, stenosis, aneurysm, and plaque explained with static arrows or one red danger color. Those images hide the most useful question: **what was actually measured or computed?**

I wanted a learner to change one boundary with their own hand, see the field answer, and inspect the model’s limits. The broader need is real. The CDC reports that `48.1%`, or `119.9 million`, U.S. adults met its cited hypertension definition in NHANES 2017–March 2020 estimates. VesselDelta does not diagnose or treat them; it makes one foundational distinction visible: flow-related shear and pressure-driven circumferential wall tension are different quantities. [CDC source](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)

## What it does

The learner can:

- rotate an axisymmetric 3D cutaway derived from the current vessel profile;
- switch to the current computed `160 × 70` slice and sculpt either wall;
- explore four clearly bounded stories: **Reference channel**, **Idealized artery narrowing**, **Idealized aortic-like bulge**, and **Higher pressure state**;
- view modeled velocity, signed vorticity, a normalized axial near-wall gradient proxy, and a separate constant-thickness pressure–radius wall-tension lens;
- compare peak speed, the axial near-wall gradient proxy, and vorticity against a simultaneously running reference field;
- complete a three-step predict-before-reveal check whose answers drive the live model: throat jet, pressure-versus-flow separation, and the rupture boundary;
- run **idealized lumen restoration**, a stent-like geometry counterfactual that reaches the reference lumen and recomputes a reseeded steady field;
- inspect current FPS, Mach number, density stability, a fitted Poiseuille-profile shape check, safety-intervention count, equations, and model limits;
- explore source-linked hypertension burden, sustained lifestyle ranges, and medication mechanism animations;
- ask **Can this vessel rupture?** and see exactly why this rigid-wall model cannot answer.

The 3D scene is transparent about its construction. A cell-by-cell 8-bit color map of the current grid appears inside a surface-of-revolution cutaway; signed vorticity stays signed, while the shear and wall-tension lenses are derived display maps. The surrounding rings display axial peak magnitude, not volumetric flow. RBC-shaped objects are massless visual tracers on that plane, driven by sampled `uₓ,uᵧ` with a display-only time scale. Amber marks modeled narrowing geometry, not plaque biology.

The instrument runs locally with no login, upload, server simulation, or paid runtime model call.

## How we built it

The numerical core is an original JavaScript D2Q9 BGK lattice-Boltzmann solver with pull streaming, halfway bounce-back rigid walls, a parabolic Zou–He velocity inlet, and fixed-density Zou–He outlet. The editable lumen uses constrained smooth wall profiles. Pointer edits rebuild the solid mask while newly opened fluid nodes warm-start from neighboring equilibrium values.

Two `160 × 70` fields run under the same flow drive: the edited vessel and the untouched reference. Canvas rendering displays the current velocity and signed vorticity arrays, advects passive tracers, and computes a normalized axial near-wall grid-gradient proxy. It is not a slope-aware clinical WSS measurement. The wall-tension lens is deliberately separate and, with thickness fixed, uses the dimensionless relation `(P/P0) × (r/r0)`.

Three.js turns the current wall profiles into a rotatable axisymmetric cutaway. It color-encodes the current grid cell by cell in a planar texture and repeats an axial peak-magnitude display around each ring for interpretation. Shear and wall-tension lenses are labeled derived display maps. There is no hidden 3D solve. Ninety-two RBC-inspired forms advance from the current 2D `uₓ,uᵧ` field with a visual time multiplier but contribute no mass or momentum.

Idealized lumen restoration changes only geometry. It removes the complete narrowing amplitude and rebuilds the field boundary. Because the model has no physical time calibration, the final reference geometry is reseeded as a steady counterfactual rather than treating the transition as a device-deployment timescale. The visual rings do not enter the equations.

Codex with GPT-5.6 helped implement and adversarially audit the solver, boundary conditions, geometry editing, 2D-to-3D mapping, performance, medical claims, accessibility, tests, and submission framing.

## Challenges

### Making 3D more honest than a flat screenshot

Adding depth could easily have turned a 2D model into a fake 3D-CFD claim. The solution was to make the mapping visible: a computed-grid color plane inside a surface generated from the same wall profile, plus a persistent `2D D2Q9 CFD · 3D cutaway · Illustrative` receipt. Depth improves intuition without changing what was calculated.

### Showing blood cells without claiming blood-cell physics

RBC-shaped particles create immediate visual recognition, but they can overpromise rheology. Every tracer remains massless, stays on the computed plane, samples only `uₓ,uᵧ`, and is labeled as a visual guide. The model card explicitly excludes hematocrit, cell deformation, aggregation, and non-Newtonian blood.

### Showing a geometry intervention without faking efficacy

A stent-like ring animation is compelling, but a ring mesh is not a medical-device simulation. We constrained the feature to one falsifiable action: restore the idealized lumen to the reference geometry and recompute a steady field. VesselDelta makes no claim about physical deployment time, device mechanics, patient selection, restenosis, embolic risk, or clinical success.

### Teaching hypertension without turning food into instant vessel physics

The current AHA ranges for DASH-style eating, sodium reduction, and aerobic exercise describe sustained, variable effects. The interface scopes them as approximate averages for adults without hypertension, marks them as overlapping and non-additive, and never feeds them into the CFD. [AHA source](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf)

### Explaining treatment without prescribing

The medication theatre explains high-level ACE inhibitor/ARB, calcium-channel blocker, thiazide, and statin pathways using FDA sources. It includes no dose, efficacy estimate, adverse-effect model, interaction, or recommendation, and it never changes the flow field. [FDA hypertension source](https://www.fda.gov/consumers/health-education-resources/hypertension) · [FDA statin source](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy)

### Prior art changed the product

Our first claim was that browser blood-flow/WSS tools barely existed. Research disproved it: analytic browser hemodynamics and browser LBM demos already exist. We changed the contribution to the complete learning loop: direct constrained vessel sculpting, continuously recomputed CFD, a synchronized control, an inspectable 2D-to-3D translation, two mechanically distinct force lessons, treatment and lifestyle interpretation with hard boundaries, prediction-before-reveal, and visible numerical verification.

## Accomplishments

- A rotatable vessel cutaway that carries a current-grid color map without claiming volumetric CFD or raw 3D values.
- Four vessel stories whose geometry and model boundaries are documented.
- A second live solver that makes every headline ratio a measured counterfactual rather than a canned score.
- A full geometry-restoration interaction that reseeds and recomputes the final steady reference geometry instead of presenting a transition as treatment time.
- Eight automated production/numerical tests, including lumen restoration without diameter overshoot and the worst-case reachable flow/geometry envelope.
- A reproducible 10,000-step benchmark with `<0.3%` signed mass-flux mismatch in both healthy and stenosis cases, no counted safety interventions, `1.607×` stenosis peak speed, and a `3.505×` relative axial near-wall gradient proxy.
- Primary-source receipts for the CDC burden figures, AHA lifestyle ranges, and FDA treatment mechanisms.
- A rupture interaction whose payoff is a scientifically correct refusal.
- A three-step mechanics check that turns the core claims into falsifiable learner predictions and labels its local score as non-validated.
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
