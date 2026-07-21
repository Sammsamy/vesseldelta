# VesselDelta

**Shape the vessel. Watch the flow answer.**

VesselDelta is a zero-install vascular-mechanics learning instrument. A learner can rotate a three-dimensional cutaway, open the current computed two-dimensional grid, reshape an idealized vessel wall, and watch two synchronized D2Q9 lattice-Boltzmann solvers recompute the edited vessel and an untouched control.

The product is deliberately split into two layers:

1. **Computed mechanics:** a `160 × 70` two-dimensional, rigid-wall D2Q9 flow field; edited-versus-reference velocity and vorticity; a normalized axial near-wall gradient proxy; and a separate constant-thickness relative wall-tension index.
2. **Interpretive teaching:** an axisymmetric 3D cutaway, RBC-inspired massless tracers, four vessel stories, population-level hypertension evidence, medication-mechanism animations, an idealized lumen-restoration animation, and a lesson about why rupture cannot be calculated here.

The interpretive layer never becomes hidden solver input. There is no 3D CFD, blood-cell model, pharmacokinetic model, treatment-response model, plaque-growth model, or rupture model.

## Five-second demo

1. Choose **Idealized artery narrowing** in the default **3D interpretation** view.
2. Rotate the cutaway and watch the RBC-inspired tracers cross the narrowed segment.
3. Switch to **Computed slice** to see and sculpt the current 2D grid that drives the presentation.
4. Compare the edited vessel with the independently running reference channel.
5. Return to 3D and choose **Idealized lumen restoration** to reopen the model geometry and recompute the field.
6. Finish the **Three-step mechanics check**: predict the throat jet, separate pressure from flow, and refuse a rupture claim the model cannot support.

No sign-in, upload, server simulation, or paid runtime API is required.

## What is real, and what is illustrative

| Element | What VesselDelta does | What it does not claim |
|---|---|---|
| Computed slice | Advances two local D2Q9 BGK fields and exposes velocity, vorticity, density, and a normalized axial near-wall gradient proxy | Patient-specific CFD, calibrated clinical WSS, pulsatile blood flow, or 3D secondary flow |
| 3D interpretation | Revolves the current 2D wall profile into an axisymmetric cutaway; color-encodes the current grid on the cut plane; displays an axial peak-magnitude value around each ring | Raw values, a volumetric solve, reconstructed anatomy, branching vessels, or compliant tissue |
| RBC-inspired forms | Advances 92 massless visual tracers from sampled `uₓ,uᵧ`, with a display-only time multiplier, while keeping them on the computed plane | Physical time, red-cell mass, hematocrit, deformation, aggregation, collisions, viscosity effects, or cell-resolved rheology |
| Amber narrowing overlay | Makes the modeled stenosis geometry readable | Histology, plaque composition, plaque growth, calcification, or vulnerability |
| Idealized lumen restoration | Smoothly reopens the mathematical stenosis to the reference geometry and reseeds the final steady field | A stent simulation, device mechanics, physical deployment time, strut–flow interaction, embolic risk, restenosis, procedural success, or a treatment recommendation |
| Hypertension evidence | Shows current population burden and sustained lifestyle ranges from CDC/AHA sources | A personal forecast, diagnosis, immediate meal-to-flow response, or additive benefit estimate |
| Medication theatre | Explains high-level pathways for ACE inhibitors/ARBs, calcium-channel blockers, thiazide-type diuretics, and statins | Dose, efficacy, adverse effects, interactions, PK/PD, prescribing, or an individual response |
| Rupture boundary | Names the missing inputs and explicitly refuses to animate or predict rupture | Wall failure stress, threshold, probability, timing, or clinical risk |
| Three-step mechanics check | Runs three local predict-before-reveal questions and changes the live scenario or lens after each answer | Learning efficacy, clinical competence, diagnosis, or a validated assessment |

## Four honest scenarios

The scenario names are teaching stories, not reconstructed body-specific anatomy.

| Story | Solver state | Intended lesson | Boundary |
|---|---|---|---|
| **Reference channel** | Straight idealized channel at the selected flow drive | Establish the parabolic reference and `1.00×` counterfactual | Not a population-average artery |
| **Idealized artery narrowing** | Smooth Gaussian 40% minimum-diameter reduction | A narrowed lumen produces a throat jet, larger near-wall gradient, and a different downstream turning field | Not a carotid bifurcation and not plaque biology |
| **Idealized aortic-like bulge** | Smooth off-center expansion of the same 2D channel | Widening changes the local flow field while radius independently raises the constant-thickness wall-tension index | Not patient aortic anatomy and not an aneurysm rupture model |
| **Higher pressure state** | Straight CFD geometry plus a `160/120 = 1.33×` illustrative pressure factor in the separate wall-tension relation | Higher pressure raises a relative circumferential-tension index without pretending that blood pressure is simply faster flow | The number is a dimensionless model ratio, not millimeters of mercury, a patient reading, or a CFD pressure boundary |

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
- a normalized axial near-wall velocity-gradient proxy sampled on the vertical grid.

The reference vessel is a second solver, not a hard-coded “healthy” number. The three headline ratios divide the edited field by that running control:

- peak speed;
- peak normalized axial near-wall gradient proxy;
- peak local vorticity (“turning” or “swirl,” not a claim of resolved turbulence).

Resetting to **Reference channel** returns the ratios toward `1.00×`. Narrowing the lumen makes independently computed fields separate.

The exposed flow drive is capped at `0.020` lattice units. At the tightest reachable `0.54×` lumen, a 10,000-step envelope test remained at `Ma 0.0942` with zero counted safety interventions. If any live field nevertheless crosses the Mach, density, finite-value, or intervention gate, VesselDelta withholds all comparison cards and directs the learner to **Verify physics**.

## The 3D cutaway

`app/vessel-theatre-3d.tsx` uses Three.js/WebGL to construct a surface of revolution from the active top and bottom wall profiles. The current `160 × 70` grid is converted cell by cell into an 8-bit planar color texture inside that cutaway. Velocity and signed vorticity encode current cells; the shear lens is a derived axial-gradient display fade and wall tension is a separate geometric display. The surrounding surface repeats an axial peak-magnitude value around each ring for interpretation; none of these are a solved 3D velocity volume.

The 3D renderer also includes:

- a faint wireframe surface derived from the untouched control;
- a cutaway vessel wall and luminous field surface;
- 92 RBC-shaped, massless tracers advanced from sampled `uₓ,uᵧ` at `z = 0`, with visually scaled time and no feedback into the field;
- an amber geometry overlay when the channel is narrowed;
- a visible but purely illustrative ring representation during lumen restoration;
- mouse, pointer, and keyboard rotation;
- a fallback that sends unsupported browsers to the tested, computed 2D slice.

## Idealized lumen-restoration counterfactual

The **Idealized lumen restoration** button is a geometry experiment with a stent-like ring animation. It gradually removes the complete preset narrowing amplitude and rebuilds the solid mask. Because VesselDelta has no calibrated physical time, completion reseeds the distribution on the final reference geometry rather than presenting a numerical transient as a device-deployment timescale. The same D2Q9 equations then advance the final field.

The rings do not enter the collision or boundary equations. The feature therefore supports only this question: **“If the lumen geometry were restored in this idealized steady model, how would the field differ?”** It cannot answer whether a person should receive a stent or predict any device or clinical outcome.

## Pressure, hypertension, and sustained habits

VesselDelta does **not** model systemic hypertension by increasing inlet speed. The interface exposes two independent controls:

1. **Flow drive** changes the idealized inlet velocity used by both CFD fields.
2. **Illustrative pressure factor** changes only the separate constant-thickness wall-tension lesson:

```text
relative wall-tension index = (P / P0) * (r / r0)
```

The interface fixes thickness and illustrates only the direction of pressure and radius under a thin, cylindrical, uniform-wall assumption. It is a dimensionless relative index, not calibrated wall stress, tissue failure, rupture probability, or patient risk.

The burden cards quote the CDC’s June 2, 2026 summary: `48.1%` or `119.9 million` U.S. adults met its cited hypertension definition, and `22.5%` of adults with hypertension had controlled blood pressure, both from NHANES 2017–March 2020 estimates; high blood pressure was also a primary or contributing cause on `680,179` U.S. death certificates in 2024. “Primary or contributing” is not “sole cause.” [CDC: High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)

The lifestyle cards reproduce the approximate systolic ranges shown in the American Heart Association’s 2025 guide. The interface scopes them as approximate averages for adults without hypertension rather than personal forecasts:

- DASH-style eating pattern: about `3–7 mm Hg`;
- lower sodium intake: about `1–4 mm Hg`;
- aerobic exercise: about `2–7 mm Hg`.

These are overlapping, variable, sustained effects. They are not added together, applied to the CFD, or used to forecast an individual. [AHA: Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf) The broader 2025 AHA/ACC guideline strongly recommends heart-healthy eating, sodium reduction, physical activity, and other lifestyle measures while tying medication decisions to clinical context. [AHA/ACC: 2025 High Blood Pressure Guideline—Top Things to Know](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know)

## Medication mechanism theatre

The mechanism panel is explanatory animation only. It does not send a drug effect into either solver.

- **ACE inhibitor / ARB:** two different mechanisms that reduce angiotensin-pathway narrowing signals.
- **Calcium-channel blocker:** an illustrative vascular-smooth-muscle relaxation pathway.
- **Thiazide-type diuretic:** an illustrative renal sodium/volume pathway.
- **Statin:** explicitly labeled “not a BP drug”; a long-horizon cholesterol and cardiovascular-risk pathway, not an instant plaque-removal effect.

The FDA summarizes ACE inhibitors and ARBs as keeping vessels from narrowing, calcium-channel blockers as allowing vessels to relax, and diuretics as removing extra water and sodium. [FDA: Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension) FDA describes statins as reducing liver cholesterol production, helping the liver remove cholesterol from blood, and potentially stabilizing plaque over time. [FDA: Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy) VesselDelta intentionally omits doses, comparative efficacy, adverse effects, interactions, contraindications, and recommendations; those require a clinician and current drug-specific information.

## Rupture-boundary lesson

The **Can this vessel rupture?** interaction answers **no—not from this model**. A rigid wall cannot deform or fail. VesselDelta has no measured wall thickness, patient-specific material law, failure threshold, longitudinal growth history, asymmetric 3D anatomy, or fluid–structure coupling. It computes only the fluid field and a constant-thickness relative wall-tension index. It does not compute rupture stress, probability, or timing.

## Validation

Run the complete build and numerical suite:

```bash
npm ci
npm run release:verify-local
```

The automated suite covers:

- production build and server-rendered shell;
- straight-channel Poiseuille-profile shape error;
- low-Mach and density-stability gates;
- finite distribution values;
- stenosis jet, shear, and vorticity changes relative to control;
- idealized lumen restoration without overshooting the control diameter;
- aneurysm geometry constraints;
- independent pressure/radius/thickness scaling;
- minimum-gap preservation during repeated sculpting.

The recorded 10,000-step steady benchmark produced `<0.3%` signed inlet/outlet mass-flux mismatch in both healthy and stenosis presets, with no counted safety interventions. The stenosis reached `1.607×` peak speed and a `3.505×` relative axial near-wall gradient proxy versus the control. See [VALIDATION.md](./VALIDATION.md) for the exact record and what it does **not** establish.

The browser verification drawer reads the current solver rather than copying benchmark constants. The numbers vary while a newly edited field evolves. The WebGL layer has no independent clinical or numerical validation: its integrity comes from an inspectable mapping back to the current 2D field.

## Medical and numerical limits

**VesselDelta is an educational intuition tool, not clinical CFD, medical advice, a diagnostic device, or a patient-risk model. No physician review, educator study, or clinical validation was performed.**

It uses a steady 2D Newtonian fluid, rigid walls, idealized boundary conditions, lattice units, normalized rather than calibrated shear, no physical time scale, and a simplified constant-thickness wall-tension relation. It does not include patient anatomy, compliant or anisotropic tissue, non-Newtonian blood rheology, cell-resolved blood, hematocrit, 3D secondary flow, clotting, plaque biology, calibrated clinical units, treatment response, or rupture mechanics.

Color means “higher or lower value in this model,” not “disease here.” Wall shear is biologically contextual: low, high, and oscillatory patterns can matter in different vascular settings. This instrument cannot show exactly where plaque will form or where an aneurysm will rupture.

## Why this is not “the first browser blood-flow simulator”

That claim would be false. Our prior-art review found:

- [MySimulator Blood Flow](https://www.mysimulator.uk/blood-flow/), a browser analytic hemodynamics simulator with stenosis, WSS, and pulsatility;
- [MySimulator Lattice-Boltzmann](https://www.mysimulator.uk/lattice-boltzmann/), a browser D2Q9 obstacle-painting fluid demo;
- [Daniel Schroeder’s Fluid Dynamics Demo](https://physics.weber.edu/schroeder/software/demos/FluidDynamics.html), a long-running browser LBM demonstration;
- [SimVascular](https://simvascular.github.io/) and [svMorph](https://github.com/SimVascular/svMorph), vascular modeling and geometry workflows;
- [AortaCFD](https://jiewangnk.github.io/AortaCFD-web/), a patient-specific CFD pipeline and web viewer.

The contribution is the integrated learning experience: constrained wall sculpting, continuously recomputed local CFD, a synchronized counterfactual, an explicit 2D-to-3D model receipt, separate flow-shear and pressure-load lessons, honest treatment and lifestyle interpretation, prediction-before-reveal pedagogy, and visible numerical verification.

## Codex + GPT-5.6 collaboration

VesselDelta was designed and implemented during OpenAI Build Week with Codex and GPT-5.6. The collaboration supported concrete engineering and critique, including:

- prior-art review that rejected the original “browser blood-flow does not exist” premise;
- derivation and implementation review of D2Q9 BGK collision/streaming and Zou–He boundaries;
- dynamic-mask, wall-shear, and geometry-restoration failure analysis;
- the 3D surface-of-revolution renderer and cell-by-cell 8-bit slice mapping;
- medical-claim narrowing around plaque, treatment, hypertension, and rupture;
- performance profiling and renderer optimization;
- accessible interaction, reduced-motion behavior, numerical tests, model card, and educator materials;
- adversarial review against the competition rubric.

There is no runtime model call. The project demonstrates meaningful Codex/GPT-5.6 use in the build itself without imposing paid API dependence on judges or learners.

VesselDelta was created during the Build Week submission period. The current Git history begins on July 21, 2026; the solver and product code are original to this project, and no third-party LBM implementation was copied.

The required primary-thread Codex Session ID is pending owner retrieval with `/status`. The Devpost field is labeled `/feedback Codex Session ID`, but the current event FAQ directs entrants to retrieve the ID from the primary build thread with `/status`.

## Run locally

Prerequisite: Node.js `>=22.13.0`. No account, API key, upload, or sample data is required.

```bash
npm ci
npm run dev
```

Production verification:

```bash
npm run build
npm test
npm run benchmark
npm run release:audit
npm run release:verify-local
```

`release:verify-local` runs a high-confidence secret scan, lint, type/build/tests, dependency audit, the 10,000-step benchmark, and the release-evidence audit. `release:audit` distinguishes technical evidence from owner-controlled and external gates. `release:audit:strict` succeeds only when an exact-commit release receipt proves the license/repository route, deployed QA, public demo, public video, primary Session ID, and final owner approval.

The official repository requirement can be met either by a public repository with the authorized project license or by a private repository shared with both `testing@devpost.com` and `build-week-event@openai.com`. VesselDelta currently has neither route because project-specific license and publication authorization remain pending.

## Repository map

```text
app/hemo-engine.js          transparent D2Q9 solver and relative-tension helper
app/vessel-delta-lab.tsx    instrument UI, scenarios, teaching layers, live checks
app/vessel-theatre-3d.tsx   Three.js axisymmetric cutaway and massless tracers
app/globals.css             responsive visual system and accessibility states
tests/hemo-engine.test.mjs  numerical, geometry, and restoration checks
tests/rendered-html.test.mjs
scripts/release-audit.mjs   machine-readable local/external release gate
scripts/secret-scan.mjs     bounded high-confidence credential scan
release-evidence.template.json structured receipt schema; never proof by itself
RELEASE_RUNBOOK.md          owner/external release and submission handoff
EDUCATOR_GUIDE.md           prediction-to-explanation lesson
LEARNER_TEST_PROTOCOL.md     optional honest pre/post product-feedback protocol
METHODS.md                  equations, mappings, assumptions, and protocol
submission-assets/          verified local cover, gallery images, and captions
THIRD_PARTY_NOTICES.md       direct dependency versions and license notices
VALIDATION.md               reproducible benchmark and release evidence
```

## Scientific and public-health sources

### Numerical method

- Qian YH, d’Humières D, Lallemand P. [Lattice BGK Models for Navier–Stokes Equation](https://doi.org/10.1209/0295-5075/17/6/001). *Europhysics Letters* (1992).
- Zou Q, He X. [On pressure and velocity boundary conditions for the lattice Boltzmann BGK model](https://doi.org/10.1063/1.869307). *Physics of Fluids* (1997).
- Malek AM, Alper SL, Izumo S. [Hemodynamic shear stress and its role in atherosclerosis](https://pubmed.ncbi.nlm.nih.gov/10591386/). *JAMA* (1999).
- Meng H et al. [High WSS or low WSS? Complex interactions in aneurysm biology](https://pmc.ncbi.nlm.nih.gov/articles/PMC7966576/). *AJNR* review.
- NCBI Bookshelf. [Mechanics of blood vessels and Laplace-type wall relations](https://www.ncbi.nlm.nih.gov/books/NBK534265/).

### Burden, lifestyle, and treatment context

- CDC. [High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html), updated June 2, 2026.
- AHA. [Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf), 2025.
- AHA/ACC. [2025 High Blood Pressure Guideline—Top Things to Know](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know).
- FDA. [Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension).
- DailyMed. [Official ACE-inhibitor label](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=350c6fc9-9774-4d49-9242-19e96944f83b).
- FDA. [ARB/thiazide prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf).
- FDA. [Calcium-channel-blocker/statin prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf).
- FDA. [Statin Drug Safety Communication and Mechanism Summary](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy).

## License and release status

Local competition build. The owner has not yet selected VesselDelta's release route: either a public repository with an approved project license, or a private repository shared with both required judging addresses. No repository publication, deployment, or license claim should be inferred until that choice is explicitly authorized and recorded.
