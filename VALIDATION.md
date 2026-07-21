# VesselDelta validation record

## Validation claim

The evidence below supports a stable, reproducible **two-dimensional educational flow model** and a transparent mapping from that model into the interface. It does not validate anatomy, blood-cell behavior, medication response, stent outcomes, chronic vascular biology, plaque location, or rupture risk.

## Reproduce

```bash
npm install
npm test
npm run benchmark
```

`npm test` runs TypeScript validation, builds the production app, and executes eight structural, numerical, geometry, envelope, and scaling tests. `npm run benchmark` independently advances the production-resolution reference and stenosis engines for 10,000 steady solver steps each and prints machine-readable JSON.

## Latest local numerical result

Run on July 21, 2026 from the current working state:

| Measurement | Reference (`healthy` preset) | Narrowing (`stenosis` preset) |
|---|---:|---:|
| Grid | 160 × 70 | 160 × 70 |
| Solver steps | 10,000 | 10,000 |
| Solver throughput in Node | 1,794 steps/s | 1,807 steps/s |
| Fitted profile-shape L2 error | 0.0709% | 0.0469% |
| Maximum Mach number | 0.04695 | 0.07546 |
| Density spread | 0.00262 | 0.00493 |
| Mean-density deviation | 0.1332% | 0.2310% |
| Signed mass-flux mismatch | 0.2473% | 0.2681% |
| Counted safety interventions | 0 | 0 |
| Minimum diameter / baseline | 1.000 | 0.600 |

At the settled 10,000-step comparison, the stenosis produced:

- `1.6072×` peak speed;
- `3.5048×` peak normalized axial near-wall gradient proxy;
- `3.3306×` peak local vorticity.

The separate worst-case reachable-input test uses the maximum exposed `0.020` flow drive and repeatedly sculpts to the `0.54×` minimum diameter. After 10,000 steps it measured `Ma 0.09417`, density spread `0.00870`, signed flux mismatch `0.6723%`, and zero counted safety interventions. The interface additionally withholds comparison cards if either live field crosses its numerical gate.

Throughput is machine- and run-dependent. The physical field values and ratios are the reproducibility targets; the steps-per-second figures are a performance receipt from this run.

## Automated checks

The current suite establishes that:

- the straight control recovers a stable Poiseuille-like profile;
- both benchmark fields remain inside the intended low-Mach envelope;
- density variation remains small after settling;
- all distribution values remain finite and safety interventions are counted;
- a 40% diameter reduction produces a faster throat jet and larger local shear/vorticity measures than the control;
- the full idealized lumen-restoration function reaches but does not exceed the reference diameter, stays finite and low-Mach after settling, and brings speed and shear back near the reference;
- the bulge preset expands rather than closes the lumen;
- pressure, radius, and optional thickness scale algebraically in the helper independently of the CFD; the production wall-tension lens fixes thickness at its reference value;
- repeated sculpting preserves a connected minimum gap and a finite field;
- the tightest reachable sculpted lumen at the maximum exposed `0.020` flow drive remains below `Ma 0.10`, below the density/flux gates, finite, and free of counted safety interventions after 10,000 steps;
- the server-rendered production shell includes the explicit `2D D2Q9 CFD`, `3D cutaway`, `Illustrative`, treatment-mechanism, burden, and three-step predict-before-reveal receipts.

## What each interface layer inherits from the solver

| Interface element | Validation basis | Remaining gap |
|---|---|---|
| Computed 2D slice | Direct display of current solver arrays | No clinical calibration or grid-convergence study |
| Edited-versus-reference ratios | Two independently advanced fields under the same flow drive | Directional education only; not a patient comparison |
| 3D cut plane | Cell-by-cell 8-bit color encoding of the current `160 × 70` grid; signed vorticity remains signed, while shear/tension are explicitly derived display maps | Not raw values; visual mapping has not been validated as anatomy |
| 3D surface color | Axial peak-magnitude samples repeated around rings | Not a volumetric field and cannot validate 3D flow |
| RBC-inspired tracers | Coordinates advanced from current `uₓ,uᵧ` samples with a visual time multiplier | No physical time, cell mechanics, mass, collisions, or rheology |
| Idealized lumen restoration | Tested full geometry restoration, final-field reseeding, and post-settle behavior | No stent, device, tissue, procedural, or clinical validation |
| Relative wall tension | Constant-thickness production index `P/P0 × r/r0`; optional thickness algebra is unit-tested only in the helper | No measured pressure, calibrated tension/stress, tissue failure law, or personal risk |
| Lifestyle and medication panels | Source-linked copy and strict non-coupling to CFD | No efficacy, adherence, safety, PK/PD, or individual response model |
| Rupture lesson | Explicit absence of deformation/failure mechanics | Cannot and does not estimate rupture |

## Numerical limitations observed

- The profile check fits the computed peak amplitude, so it validates **shape**, not physical pressure-flow calibration.
- The absolute straight-wall axial gradient proxy is approximately `13.5%` below its planar reference on this grid. The product therefore reports a **normalized axial near-wall gradient proxy** and emphasizes edited-versus-control ratios, where much of that fixed discretization bias cancels. It is not a slope-aware wall-normal derivative.
- The geometry uses finite-resolution staircase bounce-back.
- A single production grid and one steady benchmark do not establish grid convergence, pulsatile accuracy, non-Newtonian behavior, or clinical validity.
- The browser intentionally exposes early evolving values rather than relabeling them as converged.

## 3D and performance status

The 3D cutaway is an axisymmetric surface-of-revolution interpretation of the 2D wall profile. It contains a cell-by-cell 8-bit color rendering of the current grid, with derived display maps for shear and wall tension; its ring-projected surface colors and depth are illustrative. There is no 3D solver to validate.

The live FPS card reports the main instrument animation loop, not independent GPU timing for the Three.js renderer. On July 21, 2026, the current local 3D build was exercised in the Codex in-app Chromium browser at its default `1280 × 720` viewport and at a temporary `390 × 844` responsive viewport. Reference, narrowing, full lumen restoration, higher-pressure separation, 3D/2D switching, and the rupture-boundary modal were inspected. The card held `60 FPS` and approximately `239–241` twin solver steps/s during those checks, and a final fresh load produced no console errors. This is one-browser local evidence—not a cross-device GPU guarantee.

The production build now code-splits the 3D renderer. In the audited build, the instrument-shell chunk was approximately `52 KiB` raw (`15.6 KiB` gzip) and the lazily loaded Three.js theatre chunk was approximately `532 KiB` raw (`135 KiB` gzip). Vite still reports its conservative `>500 kB` raw-chunk warning for that theatre chunk. Release QA should still record:

- WebGL success/fallback on at least two desktop browsers;
- rotation and keyboard controls;
- 3D-to-2D view switching;
- sustained visual smoothness while both solvers advance;
- reduced-motion behavior;
- performance on an integrated-GPU laptop;
- the fallback path when WebGL cannot initialize.

## Manual release checklist

The following interactions must be exercised on the final deployed build before claiming release completion:

- all four stories: Reference channel, Idealized artery narrowing, Idealized aortic-like bulge, Higher pressure state;
- 3D interpretation and Computed slice views;
- direct wall sculpting in the 2D slice;
- Modeled velocity, Vorticity, Shear proxy, and Wall tension lenses;
- edited/control ratios return near `1.00×` after reset;
- idealized lumen restoration reaches the reference geometry and the reseeded field visibly evolves again;
- the illustrative pressure factor changes only the separate constant-thickness wall-tension relation;
- flow drive changes both CFD fields;
- prediction-before-reveal interaction;
- all three mechanics-check answers trigger the intended live scenario or lens, produce a local `3 / 3` result when correct, and retain the non-validated-assessment disclosure;
- rupture-boundary modal;
- all lifestyle and medication source links;
- Verify physics and model-card dialogs;
- clean console after a fresh production load;
- responsive and reduced-motion behavior.

Until that checklist is recorded against the deployed URL, numerical green tests are local evidence only.

## Medical evidence receipt

The public-health and treatment copy is traceable to direct institutional sources:

- [CDC High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html): `48.1%`, `119.9 million`, `22.5%` controlled, and `680,179` 2024 death certificates listing high blood pressure as a primary or contributing cause.
- [AHA Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf): approximate systolic ranges for DASH-style eating (`3–7 mm Hg`), sodium reduction (`1–4 mm Hg`), and aerobic exercise (`2–7 mm Hg`), scoped in the interface as approximate averages for adults without hypertension.
- [AHA/ACC 2025 High Blood Pressure Guideline summary](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know): lifestyle measures and the need for clinical context in medication decisions.
- [FDA Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension): high-level mechanisms for ACE inhibitors, ARBs, calcium-channel blockers, and diuretics.
- [FDA Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy): statin liver/cholesterol mechanism and long-horizon cardiovascular context.

These sources validate the cited copy, not the VesselDelta mechanics as a model of treatment response.

## Release interpretation

VesselDelta is an educational mechanics instrument. It is not clinical CFD, a medical device, diagnosis, advice, a plaque locator, a stent recommendation, an antihypertensive response calculator, or an aneurysm-rupture predictor. No physician review, educator study, or clinical validation was completed before the Build Week submission.
