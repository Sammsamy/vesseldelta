# VesselDelta validation record

## Validation claim

The evidence below supports a stable, reproducible **two-dimensional educational flow model** and a transparent mapping from that model into the interface. It does not validate anatomy, blood-cell behavior, medication response, stent outcomes, chronic vascular biology, plaque location, or rupture risk.

## Reproduce

```bash
npm ci
npm test
npm run benchmark
npm run release:audit
npm run release:verify-local
```

`npm test` runs TypeScript validation, builds the production app, executes 17 structural, numerical, geometry, envelope, gating, scaling, gallery-integrity, and server-render tests, then boots the production bundle and fetches every public client asset. `npm run benchmark` independently advances the production-resolution reference and stenosis engines for 10,000 constant-boundary solver steps each and prints machine-readable JSON. `npm run release:verify-local` also runs lint, a production-dependency security audit, and the phase-aware release-evidence audit; it does not convert local checks into proof of deployment or submission.

## Recorded local numerical result

One run on July 21, 2026 from this release-candidate working state:

| Measurement | Reference (`healthy` preset) | Narrowing (`stenosis` preset) |
|---|---:|---:|
| Grid | 160 × 70 | 160 × 70 |
| Solver steps | 10,000 | 10,000 |
| Solver throughput in Node | 1,825 steps/s | 2,090 steps/s |
| Fitted profile-shape L2 error | 0.0709% | 0.0519% |
| Maximum Mach number | 0.04695 | 0.07548 |
| Density spread | 0.00262 | 0.00484 |
| Mean-density deviation | 0.1332% | 0.2169% |
| Absolute mass-flux mismatch | 0.2473% | 0.3081% |
| Counted safety interventions | 0 | 0 |
| Minimum diameter / baseline | 1.000 | 0.600 |

At the recorded 10,000-step comparison, the stenosis produced:

- `1.6078×` peak speed;
- `3.4922×` peak normalized axial near-wall gradient proxy;
- `3.3254×` peak local vorticity.

One centered tight-lumen stress path uses the maximum exposed `0.020` flow drive and repeatedly moves the upper wall to the constrained `0.54×` minimum diameter. After 10,000 steps it measured `Ma 0.09417`, density spread `0.00870`, absolute flux mismatch `0.6723%`, and zero counted safety interventions. This is one tested path, not a worst-case claim over every reachable wall shape.

The same centered path at the rejected `0.024` setting reached `Ma 0.11290`, above the instrument’s `< 0.10` low-Mach gate, even though its density spread, flux mismatch, finite values, and intervention count remained acceptable. The UI range was reduced to `0.020`, but the slider maximum is not treated as a universal validity guarantee.

An adversarial reachable offset path at `0.020`—eight upper-wall sculpts near column 66 paired with eight lower-wall sculpts near column 98—reached `Ma 0.12118`, density spread `0.01659`, absolute flux mismatch `0.2597%`, and 3,195 counted interventions after 10,000 steps. Its distributions remained finite, but `comparisonMetricsReady` returned false because the Mach/intervention gates failed. The interface therefore withholds the ratios and asks the learner to reset geometry or reduce flow. The test establishes the refusal behavior, not physical validity for that field.

Throughput is machine- and run-dependent. The physical field values and ratios are the reproducibility targets; the steps-per-second figures are a performance receipt from this run.

## Automated checks

The current suite establishes that:

- the straight control recovers a stable Poiseuille-like profile;
- both benchmark fields remain inside the intended low-Mach envelope;
- density variation remains small after settling;
- all distribution values remain finite and safety interventions are counted;
- a 40% diameter reduction produces a faster throat jet, a larger axial near-wall gradient proxy, and larger local vorticity than the control;
- the full idealized lumen-restoration function reaches but does not exceed the reference diameter, stays finite and low-Mach after settling, and brings speed and the axial near-wall gradient proxy back near the reference;
- the bulge preset expands rather than closes the lumen;
- pressure and radius scale algebraically in the thin-cylinder wall-tension helper independently of the CFD;
- comparison ratios are withheld during settling and whenever either field exceeds the `2%` absolute flux-mismatch gate;
- repeated sculpting preserves a connected minimum gap and a finite field;
- one centered minimum-lumen path at `0.020` remains inside the gate after 10,000 steps, while a reachable irregular offset path is correctly withheld when its Mach/intervention gates fail;
- the server-rendered production shell includes the explicit `2D D2Q9 CFD`, `3D cutaway`, `Illustrative`, treatment-mechanism, burden, and three-step predict-before-reveal receipts;
- the release audit rejects a missing or renamed cover, extension/content mismatch, sixth gallery image, truncated JPEG, duplicate content, and wrong non-cover dimensions;
- the built production server returns the HTML shell and every non-metadata public file byte-for-byte, including the lazily loaded Three.js theatre chunk.

## What each interface layer inherits from the solver

| Interface element | Validation basis | Remaining gap |
|---|---|---|
| Computed 2D slice | Direct display of current solver arrays | No clinical calibration or grid-convergence study |
| Edited-versus-reference ratios | Two independently advanced fields under the same flow drive | Directional education only; not a patient comparison |
| 3D cut plane | Cell-by-cell 8-bit color encoding of the current `160 × 70` grid; signed vorticity remains signed, while shear/tension are explicitly derived display maps | Not raw values; visual mapping has not been validated as anatomy |
| 3D surface color | Layer-specific derived axial samples repeated around rings: interior peak magnitude for velocity/vorticity, local wall-gradient proxy for shear, and pressure–radius index for tension | Not a volumetric field and cannot validate 3D flow |
| RBC-inspired tracers | Coordinates advanced from current `uₓ,uᵧ` samples with a visual time multiplier | No physical time, cell mechanics, mass, collisions, or rheology |
| Idealized lumen restoration | Tested full geometry restoration, final-field reseeding, and post-settle behavior | No stent, device, tissue, procedural, or clinical validation |
| Relative wall tension | Thin-cylinder membrane-tension index `P/P0 × r/r0`, separate from the CFD | No measured pressure, calibrated tension, hoop stress, tissue failure law, or personal risk |
| Lifestyle and medication panels | Source-linked copy and strict non-coupling to CFD | No efficacy, adherence, safety, PK/PD, or individual response model |
| Rupture lesson | Explicit absence of deformation/failure mechanics | Cannot and does not estimate rupture |

## Numerical limitations observed

- The profile check fits the computed peak amplitude, so it validates **shape**, not physical pressure-flow calibration.
- The absolute straight-wall axial gradient proxy is approximately `13.5%` below its planar reference on this grid. The product therefore reports a **normalized axial near-wall gradient proxy** and emphasizes edited-versus-control ratios, where much of that fixed discretization bias cancels. It is not a slope-aware wall-normal derivative.
- The geometry uses finite-resolution staircase bounce-back.
- A single production grid and one constant-boundary benchmark do not establish grid convergence, pulsatile accuracy, non-Newtonian behavior, or clinical validity.
- The browser intentionally exposes early evolving values rather than relabeling them as converged.

## 3D and performance status

The 3D cutaway is an axisymmetric surface-of-revolution interpretation of the 2D wall profile. It contains a cell-by-cell 8-bit color rendering of the current grid, with derived display maps for shear and wall tension; its ring-projected surface colors and depth are illustrative. There is no 3D solver to validate.

The live FPS card reports the main instrument animation loop, not independent GPU timing for the Three.js renderer. On July 21, 2026, the current local 3D build was exercised in the Codex in-app Chromium browser at its default `1280 × 720` viewport and at a temporary `390 × 844` responsive viewport. Reference, narrowing, full lumen restoration, higher-pressure separation, 3D/2D switching, and the rupture-boundary modal were inspected. The normal display cadence held `60 FPS` and approximately `239–241` twin solver steps/s during those checks. After the accelerated warm-up was added, a fresh default narrowing load exposed gate-passing comparison values after approximately `7.2 seconds` on that same local browser; the post-warm-up card showed `FIELD EVOLVING`.

After the default guided-lab refactor at source commit `4278a39`, the browser journey was repeated end to end at `1280 × 720`: the narrowing answer forced ratios to remain blank until the field returned inside the gate, the pressure step left CFD drive unchanged, the rupture step opened the explicit refusal, the `3 / 3` receipt rendered, and Guided Lab re-entry restored the appropriate scenario. The optional Clinical context disclosure opened correctly, and its thiazide tab changed the visible mechanism copy without affecting the solver. At `390 × 844`, the rendered page collapsed to a single-column instrument with a horizontally scrollable story selector, stacked theatre and guided rail, readable body copy, and enlarged primary controls. The final local console log contained no warning or error entries. This is one-browser local evidence—not a cross-device GPU, assistive-technology, deployment, or load-time guarantee.

After the final interaction pass, the `1280 × 720` journey was repeated again. The Higher pressure step rendered six outward arrows, a circumferential pulse, and the label `ILLUSTRATIVE FORCE DIRECTION · CFD DRIVE UNCHANGED`; its receipt simultaneously stated that the cue does not deform tissue or alter CFD. The completed lab kept its primary **Sculpt the computed slice** action visible in the 720-pixel frame, and activating it selected **Free explore**, **Computed slice**, and the velocity lens. Vessel-story controls exposed labeled pressed-button-group semantics. The verification dialog received initial focus, wrapped `Shift+Tab` and `Tab` between its last and first controls, closed with Escape, and restored focus to **Verify physics**; the same shared focus manager is used by all three dialogs. The final development log contained no warning or error entry. These exact final-pass checks were desktop-only; the prior mobile check does not substitute for final deployed mobile QA.

The production build now code-splits the 3D renderer. In the audited build, the instrument-shell chunk was approximately `52 KiB` raw (`15.6 KiB` gzip) and the lazily loaded Three.js theatre chunk was approximately `532 KiB` raw (`135 KiB` gzip). Vite still reports its conservative `>500 kB` raw-chunk warning for that theatre chunk.

The automated local production smoke check starts the built Vinext server on an isolated port, requires the SSR shell and its model receipt, then fetches all 19 public bundle files and verifies their byte counts against `dist/client`, including the lazy 3D chunk. This proves local bundle completeness, not Cloudflare deployment behavior, cache policy, first-load performance, or cross-browser WebGL support. Release QA should still record:

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
- the illustrative pressure factor changes only the separate thin-cylinder wall-tension relation;
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

- [CDC High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html): `48.1%`, `119.9 million`, `22.5% of adults with hypertension had controlled blood pressure`, and `680,179` 2024 death certificates listing high blood pressure as a primary or contributing cause.
- [AHA Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf): approximate systolic ranges for DASH-style eating (`3–7 mm Hg`), sodium reduction (`1–4 mm Hg`), and aerobic exercise (`2–7 mm Hg`). [Table 12 of the full 2025 guideline](https://www.ahajournals.org/doi/10.1161/HYP.0000000000000249) supplies the `without hypertension` population column used by the interface.
- [AHA/ACC 2025 High Blood Pressure Guideline summary](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know): lifestyle measures and the need for clinical context in medication decisions.
- [FDA Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension): high-level mechanisms for ACE inhibitors, ARBs, calcium-channel blockers, and diuretics.
- [FDA Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy): statin liver/cholesterol mechanism and long-horizon cardiovascular context.

These sources validate the cited copy, not the VesselDelta mechanics as a model of treatment response.

## Release interpretation

VesselDelta is an educational mechanics instrument. It is not clinical CFD, a medical device, diagnosis, advice, a plaque locator, a stent recommendation, an antihypertensive response calculator, or an aneurysm-rupture predictor. No physician review, educator study, or clinical validation was completed before the Build Week submission.
