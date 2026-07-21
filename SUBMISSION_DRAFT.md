# VesselDelta — Devpost submission draft

## Entry

- **Name:** VesselDelta
- **Tagline:** Shape the vessel. Watch the flow answer.
- **Primary track:** Education
- **Team:** Individual — Fuzlullah Syed
- **Demo URL:** pending owner-authorized deployment
- **Repository:** pending owner-authorized public repository and license
- **Video:** pending recording/upload
- **Codex session ID:** pending final `/feedback`

## Short description

VesselDelta is a live vascular-mechanics instrument. Pinch or widen an idealized artery while two synchronized lattice-Boltzmann fluid solvers compute the edited vessel and healthy control locally in your browser, then compare velocity, vorticity, and normalized wall shear. A separate pressure–radius wall-load lens teaches why blood pressure and flow shear are related physiologically but are not the same mechanical force.

## Inspiration

“Blood binds a vessel” is usually taught with static arrows, and hypertension is often represented by a red number. Those explanations hide the causal mechanics. We wanted a learner to change one variable with their own hand and watch the field answer, while being able to inspect whether the simulation is real.

## What it does

The learner can:

- drag either vessel wall or choose healthy, stenosis, and aneurysm presets;
- see the locally computed velocity field and advected tracer particles;
- switch to vorticity and a normalized wall-shear estimate;
- compare peak speed, shear, and vorticity against a simultaneously running healthy control;
- make a prediction before revealing the stenosis result;
- adjust flow drive independently from a simplified pressure–radius wall-load relation;
- inspect live FPS, Mach number, density stability, a fitted Poiseuille-profile shape check, safety-intervention count, equations, and model limits.

The instrument runs locally with no login, upload, server simulation, or paid runtime model call.

## How we built it

The core is an original JavaScript D2Q9 BGK lattice-Boltzmann solver with pull streaming, halfway bounce-back rigid walls, a parabolic Zou–He velocity inlet, and fixed-density Zou–He outlet. The editable lumen is represented by constrained smooth wall profiles. Pointer edits update the solid mask while newly opened fluid nodes warm-start from neighboring equilibrium values.

The UI runs two `160 × 70` fields under identical conditions: the edited vessel and the untouched counterfactual. Canvas rendering turns the calculated velocity and vorticity arrays into the field and advects visible tracers from the same computed velocities. A near-wall velocity-gradient estimate produces the normalized shear lens. The pressure-load lens is deliberately separate and uses the dimensionless thin-wall relation `(P/P0) × (r/r0) × (t0/t)`.

Codex with GPT-5.6 helped implement and adversarially audit the numerical method, boundary conditions, geometry editing, performance, medical claims, accessibility, validation, and submission framing.

## Challenges

### Prior art changed the product

Our first claim was that browser blood-flow/WSS tools barely existed. Research disproved it: analytic browser hemodynamics and browser LBM obstacle demos already exist. We changed the contribution to the complete causal learning loop: direct constrained vessel sculpting, continuously recomputed local CFD, a synchronized control, two mechanically distinct force lessons, prediction-before-reveal, and visible numerical verification.

### Pretty was initially slow

The first glow renderer measured about 5 FPS. The issue was not the solver; it was high-DPI canvas work, per-pixel color allocation, and hundreds of blurred wall segments. We introduced color lookup tables, reusable image buffers, a one-pass wall glow, lower-cost particles, and a bounded device-pixel ratio. The same browser then held 60 FPS while advancing both fields at approximately 240 combined steps/s.

### We removed a feature that looked impressive

An accelerated pulse/oscillation mode generated boundary-reflection artifacts at demo speed. Instead of presenting those colors as biology, we removed the feature and shipped a stable steady model. That decision is documented because scientific restraint is part of the product.

### Medical language had to be narrower

A 2D rigid-wall model cannot show where plaque will form or predict aneurysm rupture. VesselDelta consistently says “normalized wall-shear estimate,” keeps pressure separate from flow drive, counts numerical guard events, exposes a model card, and makes no diagnostic claim.

## Accomplishments

- Real editable-boundary CFD at 60 FPS in a normal browser.
- A second live solver makes every headline number a measured counterfactual rather than a canned baseline.
- Six automated production/numerical tests pass.
- A reproducible 10,000-step benchmark reports `<0.3%` signed mass-flux mismatch in both healthy and stenosis cases, low Mach numbers, no counted safety interventions, `1.607×` stenosis peak speed, and `3.505×` relative peak shear.
- The first viewport contains the working instrument, not a marketing splash screen.
- The educator guide turns the interaction into a 12-minute prediction–experiment–explanation lesson.
- Prior art and limitations are first-class documentation rather than buried disclaimers.

## What we learned

The most important insight is also the lesson VesselDelta teaches: one red “danger” layer is not enough. Fast flow, wall shear, vorticity, and circumferential pressure load are different quantities. A medically honest instrument becomes more interesting when it lets a learner separate them instead of flattening them into a fake risk score.

We also learned that visible falsifiability is a design feature. Showing equations, runtime checks, a control field, and numerical interventions makes the experience more compelling—not less polished.

## What is next

- classroom testing with pre/post concept questions;
- educator-reviewed language and accessibility research;
- a longer-period, validated pulsatile boundary implementation;
- grid-convergence tooling and improved wall-normal shear sampling;
- optional WebGL compute for larger grids;
- carefully scoped compliant-wall experiments;
- never patient-specific or diagnostic use without a fundamentally different validation program.

## Built with

Codex, GPT-5.6, TypeScript, React, vinext, Canvas 2D, D2Q9 lattice-Boltzmann methods, Cloudflare runtime, Node test runner.

## Required disclosures

VesselDelta is a 2D Newtonian rigid-wall educational model. It is not clinical CFD, a medical device, diagnosis, advice, a plaque locator, or an aneurysm-rupture predictor. No physician review, classroom study, or clinical validation was completed before submission.

The solver and product code were written for this project; no third-party LBM source was copied. Numerical methods are cited in the README and METHODS document. License selection is pending owner authorization.

## Official checklist

- [ ] Public testable demo
- [ ] Public/shared repository with approved license
- [ ] README collaboration story
- [ ] Codex session ID from `/feedback`
- [ ] Public YouTube video, under three minutes, with real voiceover
- [ ] Education category selected
- [ ] Individual submission
- [ ] Final owner approval before Devpost submission

Rules reference: https://openai.devpost.com/rules

FAQ reference: https://openai.devpost.com/details/faqs
