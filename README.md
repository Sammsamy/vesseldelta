# VesselDelta

**Shape the vessel. Watch the flow answer.**

VesselDelta is a zero-install vascular-mechanics learning instrument. A learner reshapes an idealized artery while a D2Q9 lattice-Boltzmann solver recomputes the flow beside a synchronized, untouched control. The result is a causal experiment: change one boundary, then see the measured change in velocity, vorticity, and normalized wall shear.

VesselDelta also teaches a distinction that common blood-pressure graphics blur:

- **Flow shear** acts tangentially along the vessel wall. It comes from the computed fluid field.
- **Pressure-driven wall load** acts circumferentially around the wall. It is shown separately with an explicitly simplified thin-cylinder relation.

The two layers are never merged into a medical “risk score.”

## Five-second demo

1. Open **Stenosis** or drag either wall inward.
2. Watch the central jet accelerate and the wall-shear band change.
3. Switch among **Velocity**, **Vorticity**, and **Wall shear**.
4. Compare the live ratios against the untouched control.
5. Open **Verify physics** to inspect FPS, Mach number, density stability, the Poiseuille-profile check, and the model card.

No sign-in, upload, server simulation, or paid runtime API is required.

## What is actually computed

The hot loop is a client-side two-dimensional, nine-velocity lattice-Boltzmann model (D2Q9) with a single-relaxation-time BGK collision operator:

```text
rho = sum_i(f_i)
u   = sum_i(f_i * e_i) / rho
f_i* = f_i - (f_i - f_i_eq) / tau
nu = (tau - 0.5) / 3
```

The production instrument uses:

- two synchronized `160 × 70` fields: edited vessel and untouched control;
- `tau = 0.62`;
- low-Mach inlet velocities;
- halfway bounce-back at rigid walls;
- a prescribed parabolic west inlet and fixed-density Zou–He east outlet;
- smooth Gaussian wall deformation with protected inlet/outlet buffers;
- warm initialization of newly exposed fluid cells;
- a normalized near-wall tangential velocity-gradient shear estimate.

Particle traces are visual tracers advected by the computed velocity field. They do not drive the physics.

## Counterfactual, not decoration

The reference vessel is a second solver, not a hard-coded “healthy” number. Both fields use the same resolution, relaxation time, and steady inlet setting. The three headline ratios divide the edited field by that running control:

- peak speed;
- peak normalized wall-shear estimate;
- peak local vorticity (“swirl”).

This makes the main claim directly falsifiable: reset to **Healthy control** and the ratios return to approximately `1.00×`; narrow the lumen and the independently computed values separate.

## Hypertension lesson, scoped correctly

VesselDelta does **not** model systemic hypertension by making the inlet faster. That would confuse two different variables.

The interface instead exposes:

1. **Flow drive**, which changes the idealized inlet velocity used by the CFD model.
2. **Pressure load**, which changes only the separate dimensionless thin-wall relation

```text
relative wall load = (P / P0) * (r / r0) * (t0 / t)
```

This illustrates why higher transmural pressure and a larger radius can increase circumferential wall load under the thin-cylinder assumption. It does not estimate rupture probability, tissue failure, or an individual’s risk.

## Validation

Run the complete build and numerical suite:

```bash
npm install
npm test
npm run benchmark
```

The tests currently cover:

- production build and server-rendered shell;
- straight-channel Poiseuille-profile shape error;
- low-Mach and density-stability gates;
- finite distribution values;
- stenosis jet, shear, and vorticity changes relative to control;
- aneurysm geometry constraints;
- independent pressure/radius/thickness scaling;
- minimum-gap preservation during repeated sculpting.

The latest 10,000-step steady benchmark produced `<0.3%` signed inlet/outlet mass-flux mismatch in both healthy and stenosis presets, with no counted safety interventions. The stenosis reached `1.607×` peak speed and `3.505×` relative peak shear versus the control. See [VALIDATION.md](./VALIDATION.md) for the exact record, limitations, and reproduction command.

The browser verification drawer displays runtime measurements rather than copying test constants. The exact numbers vary while the live field iterates after geometry edits.

## Medical and numerical limits

**VesselDelta is an educational intuition tool, not clinical CFD, medical advice, a diagnostic device, or a patient-risk model. No physician review or clinical validation was performed.**

It includes a 2D Newtonian fluid, rigid walls, idealized boundary conditions, normalized rather than calibrated wall shear, and a simplified thin-cylinder pressure-load relation. It does not include patient anatomy, compliant or anisotropic tissue, non-Newtonian blood rheology, 3D secondary flow, blood cells, clotting, plaque biology, calibrated pascal outputs, or rupture mechanics.

Color means “high or low value in this model,” not “disease here.” Wall shear is biologically contextual: low, high, and oscillatory patterns can matter in different vascular contexts. This steady 2D instrument does not calculate chronic biology and cannot show exactly where plaque will form or where an aneurysm will rupture.

## Why this is not “the first browser blood-flow simulator”

That claim would be false. Our prior-art review found:

- [MySimulator Blood Flow](https://www.mysimulator.uk/blood-flow/), a browser analytic hemodynamics simulator with stenosis, WSS, and pulsatility;
- [MySimulator Lattice-Boltzmann](https://www.mysimulator.uk/lattice-boltzmann/), a browser D2Q9 obstacle-painting fluid demo;
- [Daniel Schroeder’s Fluid Dynamics Demo](https://physics.weber.edu/schroeder/software/demos/FluidDynamics.html), a long-running browser LBM demonstration;
- [SimVascular](https://simvascular.github.io/) and [svMorph](https://github.com/SimVascular/svMorph), full vascular modeling and geometry workflows;
- [AortaCFD](https://jiewangnk.github.io/AortaCFD-web/), a patient-specific CFD pipeline and web viewer.

In our bounded search, we did not find a polished public, zero-install learning instrument combining **constrained direct vessel sculpting, continuously recomputed local CFD, a synchronized counterfactual control, an independent pressure-load lesson, prediction-before-reveal pedagogy, and visible numerical verification**. That combination—not browser CFD itself—is the defensible product contribution.

## Codex + GPT-5.6 collaboration

VesselDelta was designed and implemented during OpenAI Build Week with Codex and GPT-5.6. The collaboration was used for concrete engineering and critique, including:

- hostile prior-art review that rejected the original “browser blood-flow does not exist” premise;
- derivation and implementation review of D2Q9 BGK collision/streaming and Zou–He boundaries;
- dynamic-mask and wall-shear failure analysis;
- medical-claim narrowing around plaque, aneurysm rupture, and hypertension;
- performance profiling that found a 5 FPS rendering failure;
- renderer optimization to a measured 60 FPS in the local browser;
- accessible interaction, reduced-motion behavior, numerical tests, model card, and educator materials;
- adversarial scoring against the official four-part rubric.

There is no runtime model call. The project demonstrates meaningful Codex/GPT-5.6 use in the build itself without imposing paid API dependence on judges or learners.

The required Codex session link/ID will be added to this section immediately after `/feedback` is completed for the final build.

## Run locally

```bash
npm install
npm run dev
```

Then open the displayed local URL. Production verification:

```bash
npm run build
npm test
npm run benchmark
```

## Repository map

```text
app/hemo-engine.js        transparent D2Q9 solver and wall-load relation
app/vessel-delta-lab.tsx  instrument UI, renderer, interactions, live checks
app/globals.css           responsive visual system and accessibility states
tests/hemo-engine.test.mjs
tests/rendered-html.test.mjs
EDUCATOR_GUIDE.md         12-minute prediction-to-explanation lesson
METHODS.md                equations, assumptions, and validation protocol
VALIDATION.md             reproducible 10,000-step benchmark record
```

## Scientific references

- Qian YH, d’Humières D, Lallemand P. [Lattice BGK Models for Navier–Stokes Equation](https://doi.org/10.1209/0295-5075/17/6/001). *Europhysics Letters* (1992).
- Zou Q, He X. [On pressure and velocity boundary conditions for the lattice Boltzmann BGK model](https://doi.org/10.1063/1.869307). *Physics of Fluids* (1997).
- Malek AM, Alper SL, Izumo S. [Hemodynamic shear stress and its role in atherosclerosis](https://pubmed.ncbi.nlm.nih.gov/10591386/). *JAMA* (1999).
- Meng H et al. [High WSS or low WSS? Complex interactions in aneurysm biology](https://pmc.ncbi.nlm.nih.gov/articles/PMC7966576/). *AJNR* review.
- NCBI Bookshelf. [Mechanics of blood vessels and Laplace-type wall relations](https://www.ncbi.nlm.nih.gov/books/NBK534265/).

## License and release status

Local competition build. A public repository license has not yet been selected for VesselDelta. Do not treat the separate SNAP project’s license authorization as authorization for this project. A license and public repository will be added only after the owner explicitly approves them.
