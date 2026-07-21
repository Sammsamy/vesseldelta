# VesselDelta

**Change a vessel. See what pressure and flow do.**

**[Open the live instrument](https://vesseldelta.ankigpt.workers.dev/) · [Inspect the source](https://github.com/Sammsamy/vesseldelta)**

VesselDelta is a zero-install vessel experiment for anyone. Narrow a vessel and a faster jet appears. Add a bulge and the flow slows and swirls. Raise the teaching pressure and the outward wall load rises without making the flow model run faster.

A separate wall stress and strength lab uses the real thin-wall equation `σ = P · r / t`. It converts pressure, radius, and wall thickness into kilopascals, then compares the result with a tissue-strength value chosen by the user. If the arithmetic crosses that selected value, a tear appears as a teaching animation. It is not a simulated rupture or a patient prediction.

The product keeps three layers visible:

1. **Live flow:** two `160 × 70` two-dimensional fields compare the changed vessel with a straight reference.
2. **Wall stress:** an independent thin-wall calculator uses pressure in `mm Hg`, radius and thickness in `mm`, and reports circumferential stress in `kPa`.
3. **3D view:** a rotatable cutaway adds an outer wall, inner lining, and cut edges around the same two-dimensional boundary. The red blood cell forms are massless visual tracers.

The 3D view and tear are visual explanations. They never become hidden inputs to the flow solver.

## First-minute path

1. Choose **Narrow → fast jet**. Watch the jet become fastest at the tightest point.
2. Choose **Bulge → swirl**. Switch to **Swirl** and watch the wider space change the flow.
3. Choose **Pressure ↑ → wall stress ↑**. The separate wall stress and strength test opens.
4. Raise pressure, increase radius, or make the wall thinner. The live flow setting stays unchanged.
5. Choose **Illustrative threshold crossing**. The calculated stress crosses the selected teaching strength and triggers a tear labeled as an illustration.
6. Open **Try it yourself** to drag either wall and let both flow fields recompute.

The four-case section then separates immediate mechanics from slower body pathways. Shape and selected pressure change the teaching models now. Diet patterns, activity, and medicine cards explain evidence and mechanisms over time, then hand the visitor back to a selected pressure what-if. They do not invent a personal response.

No sign-in, upload, server simulation, or paid runtime API is required.

## What is real, and what is illustrative

| Element | What VesselDelta does | What it does not claim |
|---|---|---|
| Computed slice | Advances two local D2Q9 BGK fields and exposes velocity, vorticity, density, and a normalized axial near-wall gradient proxy | Patient-specific CFD, calibrated clinical WSS, pulsatile blood flow, or 3D secondary flow |
| 3D interpretation | Revolves the current 2D wall profile into an axisymmetric cutaway; color-encodes the current grid on the cut plane; displays a layer-specific derived axial value around each ring | Raw values, a volumetric solve, reconstructed anatomy, branching vessels, or compliant tissue |
| Higher-pressure force cue | Draws outward arrows and changes a separate pressure and radius wall-load display | Tissue deformation, faster CFD, or a pressure solution inside the flow solver |
| RBC-inspired forms | Advances 92 massless visual tracers from sampled `uₓ,uᵧ`, with a display-only time multiplier, while keeping them on the computed plane | Physical time, red-cell mass, hematocrit, deformation, aggregation, collisions, viscosity effects, or cell-resolved rheology |
| Amber narrowing overlay | Makes the modeled stenosis geometry readable | Histology, plaque composition, plaque growth, calcification, or vulnerability |
| Idealized lumen restoration | Smoothly reopens the mathematical stenosis to the reference geometry and reseeds the final constant-boundary field | A stent simulation, device mechanics, physical deployment time, strut–flow interaction, embolic risk, restenosis, procedural success, or a treatment recommendation |
| Optional clinical context | Keeps population burden and sustained lifestyle ranges from CDC/AHA sources behind an explicit context drawer | A personal forecast, diagnosis, immediate meal-to-flow response, or additive benefit estimate |
| Optional medication theatre | Explains high-level pathways for ACE inhibitors/ARBs, calcium-channel blockers, thiazide-type diuretics, and statins without competing with the core guided lab | Dose, efficacy, adverse effects, interactions, PK/PD, prescribing, or an individual response |
| Wall stress and strength lab | Computes `σ = P · r / t` with explicit unit conversion and compares it with a selected illustrative strength | Patient anatomy, local stress concentration, a clinical failure cutoff, rupture probability, timing, or personal risk |
| Threshold-crossing tear | Appears only when calculated thin-wall stress reaches the strength value selected in the teaching lab | A simulated tear, tissue failure propagation, or a rupture prediction |
| 45-second tour | Runs three plain-language questions, changes the live scenario after each answer, and finishes with a compact model receipt | Learning efficacy, clinical competence, diagnosis, or a validated assessment |

## Four honest scenarios

The scenario names are teaching stories, not reconstructed body-specific anatomy.

| Story | Solver state | Intended lesson | Boundary |
|---|---|---|---|
| **Reference channel** | Straight idealized channel at the selected flow drive | Establish the parabolic reference and `1.00×` counterfactual | Not a population-average artery |
| **Idealized artery narrowing** | Smooth Gaussian 40% minimum-diameter reduction | A narrowed lumen produces a throat jet, larger near-wall gradient, and a different downstream turning field | Not a carotid bifurcation and not plaque biology |
| **Idealized aortic-like bulge** | Smooth off-center expansion of the same 2D channel | Widening changes the local flow field while radius independently raises the relative wall-load display | Not patient aortic anatomy and not an aneurysm rupture model |
| **Higher pressure state** | Straight flow geometry plus a selected `160 mm Hg` teaching pressure in the separate wall-load display | Pressure pushes outward and raises the relative wall load without making the flow field run faster | The selected pressure is not a patient reading, treatment target, or pressure boundary for the flow solver |

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

New presets receive a deterministic 5,000-step accelerated warm-up. The browser advances up to 12 LBM iterations per animation frame during that phase, then returns to its normal display cadence. These are warm-up iterations, not physical time or proof of formal convergence; ratios stay blank until warm-up finishes and both fields pass the `2%` absolute flux-mismatch gate.

The exposed flow drive is limited to `0.012–0.020` lattice units. In one documented centered tight-lumen sculpt path, a 10,000-step test at `0.020` remained at `Ma 0.0942` with zero counted safety interventions. That is not proof that every reachable hand-drawn shape stays inside the gate: an adversarial offset sculpt at `0.020` crossed it. The live Mach, density, flux, finite-value, and intervention checks therefore remain authoritative; VesselDelta withholds all comparison cards for an out-of-gate field and directs the visitor to **Verify physics**.

## The 3D cutaway

`app/vessel-theatre-3d.tsx` uses Three.js/WebGL to construct a surface of revolution from the active top and bottom wall profiles. The current `160 × 70` grid is converted cell by cell into an 8-bit planar color texture inside that cutaway. Velocity and signed vorticity encode current cells; the shear lens is a derived axial-gradient display fade and wall tension is a separate geometric display. Around each ring, the surface repeats a layer-specific derived axial sample: interior peak magnitude for velocity/vorticity, the local wall-gradient proxy for shear, or the pressure–radius index for wall tension. None is a solved 3D velocity volume.

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

## Pressure, flow, and wall stress

Pressure pushes outward. Flow moves along the wall. VesselDelta keeps those ideas separate.

The **Flow setting** changes the inlet speed used by both live flow fields. The **Teaching pressure** changes only the separate wall-load display. Raising pressure does not secretly make the flow solver run faster.

The wall stress and strength lab is a second calculation. It uses the thin-wall cylinder relation:

```text
wall stress = pressure × radius ÷ wall thickness
σ = P · r / t
```

Selected pressure is converted from `mm Hg` to pascals. Radius and thickness are converted from `mm` to metres. The result is reported in `kPa`. The sliders let a user change pressure, radius, thickness, and an illustrative tissue-strength value. More pressure, a larger radius, or a thinner wall raises the calculated circumferential stress.

The starting example uses a `7.0 cm` diameter and `2.5 mm` thickness reported as group means for electively repaired abdominal aortic aneurysms. Its `120 mm Hg` pressure is a teaching input. The selected `680 kPa` strength is only the arithmetic midpoint of two reported group means, `540 kPa` and `820 kPa`. It is not a measured clinical cutoff. [Di Martino et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16520175/)

A thinner-wall example uses the `1.48 mm` median reported across four necropsy abdominal aortic aneurysms. That paper found strong regional variation, from `0.23 mm` to `4.26 mm`. The example demonstrates equation sensitivity, not a typical patient. [Raghavan et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16337949/)

When calculated stress reaches the selected strength, the interface shows a visible split. The equation, conversion, and comparison are real arithmetic. The tear is an explicitly illustrative threshold-crossing animation. It does not model crack growth, tissue failure, or clinical rupture risk.

## Hypertension and sustained habits

The burden cards quote the CDC’s June 2, 2026 summary: `48.1%` or `119.9 million` U.S. adults met its cited hypertension definition, and `22.5%` of adults with hypertension had controlled blood pressure, both from NHANES 2017–March 2020 estimates; high blood pressure was also a primary or contributing cause on `680,179` U.S. death certificates in 2024. “Primary or contributing” is not “sole cause.” [CDC: High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)

The lifestyle cards reproduce the approximate systolic ranges shown in the American Heart Association’s 2025 guide. The interface uses the population column for adults without hypertension in Table 12 of the full guideline. These are not personal forecasts:

- DASH-style eating pattern: about `3–7 mm Hg`;
- lower sodium intake: about `1–4 mm Hg`;
- aerobic exercise: about `2–7 mm Hg`.

These are overlapping, variable, sustained effects. The displayed ranges are not arithmetically summed into a personal forecast, applied to the CFD, or used to forecast an individual; combined effects vary. [AHA: Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf) [AHA/ACC: full 2025 guideline, Table 12](https://www.ahajournals.org/doi/10.1161/HYP.0000000000000249) The broader guideline strongly recommends heart-healthy eating, sodium reduction, physical activity, and other lifestyle measures while tying medication decisions to clinical context. [AHA/ACC: Top Things to Know](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know)

## Medication mechanism theatre

The mechanism panel is explanatory animation only. It does not send a drug effect into either solver.

- **ACE inhibitor / ARB:** two different mechanisms that reduce angiotensin-pathway narrowing signals.
- **Calcium-channel blocker:** an illustrative vascular-smooth-muscle relaxation pathway.
- **Thiazide-type diuretic:** an illustrative renal sodium/volume pathway.
- **Statin:** explicitly labeled “not a BP drug”; a long-horizon cholesterol and cardiovascular-risk pathway, not an instant plaque-removal effect.

The FDA summarizes ACE inhibitors and ARBs as keeping vessels from narrowing, calcium-channel blockers as allowing vessels to relax, and diuretics as removing extra water and sodium. [FDA: Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension) FDA describes statins as reducing liver cholesterol production, helping the liver remove cholesterol from blood, and potentially stabilizing plaque over time. [FDA: Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy) VesselDelta intentionally omits doses, comparative efficacy, adverse effects, interactions, contraindications, and recommendations; those require a clinician and current drug-specific information.

## What the tear does and does not mean

The wall lab can calculate thin-wall circumferential stress and compare it with a strength value chosen for the lesson. It cannot predict whether a real vessel will rupture. Real tissue has changing thickness, anisotropy, layers, thrombus, residual stress, motion, local three-dimensional stress concentration, remodeling, and patient history. None of those are in this model.

Crossing the selected strength means only that `calculated stress ≥ selected strength` for the current sliders. It is not a safety classification, probability, diagnosis, or treatment recommendation.

## Validation

Run the complete build and numerical suite:

```bash
npm ci
npm run release:verify-local
```

The automated suite covers:

- production build, server-rendered shell, and a local production-server smoke test that fetches every public file including the lazy 3D theatre chunk;
- straight-channel Poiseuille-profile shape error;
- low-Mach and density-stability gates;
- finite distribution values;
- stenosis jet, shear, and vorticity changes relative to control;
- idealized lumen restoration without overshooting the control diameter;
- aneurysm geometry constraints;
- independent pressure/radius scaling;
- explicit `mm Hg` to `Pa`, `mm` to `m`, and `Pa` to `kPa` conversion in the wall-stress calculator;
- linear stress scaling with pressure and radius and inverse scaling with wall thickness;
- finite input bounds, threshold arithmetic, evidence receipts, and nonclinical threshold labels;
- minimum-gap preservation during repeated sculpting;
- adversarial release-gallery fixtures for exact filenames/counts/dimensions, complete JPEG data, distinct content, and the required thumbnail.

The recorded constant-boundary 10,000-step benchmark produced `<0.4%` absolute inlet/outlet mass-flux mismatch in both healthy and stenosis presets, with no counted safety interventions. The stenosis reached `1.608×` peak speed and a `3.492×` relative axial near-wall gradient proxy versus the control. Live comparison cards are now withheld while either field is recomputing or remains above the same `2%` flux-mismatch gate. See [VALIDATION.md](./VALIDATION.md) for the exact record and what it does **not** establish.

The browser verification drawer reads the current solver rather than copying benchmark constants. The numbers vary while a newly edited field evolves. The WebGL layer has no independent clinical or numerical validation: its integrity comes from an inspectable mapping back to the current 2D field.

## Medical and numerical limits

**VesselDelta is an educational model, not clinical CFD, medical advice, a medical device, or a rupture-risk tool. No physician review, educator study, or clinical validation was performed.**

The flow experiment uses a steady 2D Newtonian fluid, rigid walls, idealized boundaries, lattice units, normalized rather than calibrated shear, and no physical time scale. The separate wall lab uses real units in a simplified uniform thin-cylinder equation. It does not include patient anatomy, compliant or anisotropic tissue, local 3D stress concentration, thrombus, non-Newtonian blood, cell-resolved blood, clotting, plaque biology, treatment response, or rupture mechanics.

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

VesselDelta was designed and implemented during OpenAI Build Week with Codex and GPT-5.6. Three decisions show how the collaboration changed the result rather than merely generating code:

| Problem | GPT-5.6/Codex contribution | Human decision | Inspectable evidence |
|---|---|---|---|
| The original flow slider exposed `0.024`, but hand-sculpted shapes had not been stress-tested. | Tested a centered tight-lumen path at both settings, then added an irregular offset path that deliberately exercises the live numerical gate. | Reduce the exposed range to `0.020`, keep the live diagnostics authoritative, and do not imply the slider cap validates every shape. | The centered 10,000-step path reached `Ma 0.11290` at rejected `0.024` and `Ma 0.09417` at `0.020`; the irregular `0.020` path is withheld. See `VALIDATION.md`, the tests, and Git history. |
| The first concept claimed browser blood-flow/WSS tools barely existed. | Conducted a hostile prior-art audit across analytic browser tools, LBM demos, SimVascular workflows, and AortaCFD. | Kill the “first browser simulator” claim and focus the contribution on the guided falsifiable learning loop. | The named prior-art section below and the submission’s “What we learned” record the correction. |
| A 3D renderer and threshold tear could easily look like a patient simulation. | Audited every visual layer against the actual arrays and separated the flow solver, thin-wall calculator, 3D cutaway, and threshold animation. | Keep the 2D source visible and label the tear as arithmetic-driven teaching imagery. | Persistent model receipt, wall-lab equation, source-linked presets, nonclinical status text, and tests. |

Codex also supported D2Q9/Zou–He implementation review, dynamic-mask and restoration failure analysis, performance profiling, accessible interaction, reduced-motion behavior, medical-claim narrowing, tests, and adversarial rubric review.

There is no runtime model call. The project demonstrates meaningful Codex/GPT-5.6 use in the build itself without imposing paid API dependence on judges or learners.

VesselDelta was created during the Build Week submission period. The current Git history begins on July 21, 2026; the solver and product code are original to this project, and no third-party LBM implementation was copied.

The primary VesselDelta task reports Codex Session ID `019f48c7-345a-70d3-bf51-81bbc847143b`, recorded for the Devpost `/feedback Codex Session ID` field.

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

The reviewed source is published at [Sammsamy/vesseldelta](https://github.com/Sammsamy/vesseldelta) under the MIT License. The public, no-login build is deployed at [vesseldelta.ankigpt.workers.dev](https://vesseldelta.ankigpt.workers.dev/).

## Repository map

```text
app/hemo-engine.js          transparent D2Q9 solver and relative-tension helper
app/wall-failure-model.js   thin-wall unit conversion, stress, threshold, and evidence receipts
app/wall-stress-lab.tsx     independent pressure, radius, thickness, and strength experiment
app/vessel-delta-lab.tsx    instrument UI, scenarios, teaching layers, live checks
app/vessel-theatre-3d.tsx   Three.js axisymmetric cutaway and massless tracers
app/globals.css             responsive visual system and accessibility states
tests/hemo-engine.test.mjs  numerical, geometry, and restoration checks
tests/wall-failure-model.test.mjs unit, scaling, threshold, clamp, and evidence checks
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
- Di Martino ES et al. [Biomechanical properties of ruptured versus electively repaired abdominal aortic aneurysm wall tissue](https://pubmed.ncbi.nlm.nih.gov/16520175/). *Journal of Vascular Surgery* (2006).
- Raghavan ML et al. [Regional distribution of wall thickness and failure properties of human abdominal aortic aneurysm](https://pubmed.ncbi.nlm.nih.gov/16337949/). *Journal of Biomechanics* (2006).

### Burden, lifestyle, and treatment context

- CDC. [High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html), updated June 2, 2026.
- AHA. [Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf), 2025.
- AHA/ACC. [2025 High Blood Pressure Guideline summary](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know).
- FDA. [Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension).
- DailyMed. [Official ACE-inhibitor label](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=350c6fc9-9774-4d49-9242-19e96944f83b).
- FDA. [ARB/thiazide prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf).
- FDA. [Calcium-channel-blocker/statin prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf).
- FDA. [Statin Drug Safety Communication and Mechanism Summary](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy).

## License and release status

VesselDelta is open source under the [MIT License](LICENSE). The public repository is [Sammsamy/vesseldelta](https://github.com/Sammsamy/vesseldelta), and the no-login competition build is available at [vesseldelta.ankigpt.workers.dev](https://vesseldelta.ankigpt.workers.dev/). Public release does not imply clinical validation: every scientific and medical limitation above still applies.
