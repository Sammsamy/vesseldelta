# VesselDelta methods and model contract

## Scope

VesselDelta solves a deliberately idealized two-dimensional channel-flow problem to build mechanics intuition through controlled within-model comparisons. All CFD values are lattice units. Outputs are normalized or relative unless explicitly stated otherwise.

The product has one numerical source of truth: the current **2D D2Q9 slice**. The 3D cutaway, RBC-inspired objects, scenario names, lifestyle cards, treatment pathways, and rupture-boundary interaction are interpretive layers. They do not add hidden physics to the solver.

## D2Q9 BGK model

The velocity set is

```text
e0=(0,0)
e1=(1,0)   e2=(0,1)   e3=(-1,0)  e4=(0,-1)
e5=(1,1)   e6=(-1,1)  e7=(-1,-1) e8=(1,-1)
```

with weights `4/9`, `1/9` for cardinal directions, and `1/36` for diagonals. Density and velocity are recovered from distribution moments. The equilibrium distribution is

```text
f_i_eq = w_i rho [1 + 3(e_i·u) + 4.5(e_i·u)^2 - 1.5(u·u)]
```

and collision is

```text
f_i* = f_i - (f_i - f_i_eq) / tau
```

with `tau = 0.62` and `nu = (tau - 0.5)/3`.

Streaming uses a pull scheme. When a source is solid, the local opposite post-collision population supplies halfway bounce-back. The west boundary prescribes a smooth parabolic velocity profile using Zou–He reconstruction. The east boundary prescribes unit density with the corresponding Zou–He reconstruction.

The browser advances two `160 × 70` fields under the same flow-drive setting: the editable field and an untouched straight control. The control is recomputed continuously; it is not a table of canned ratios.

The exposed inlet-flow control is limited to `0.012–0.020` lattice units. The upper bound was checked for 10,000 steps at the tightest reachable `0.54×` lumen: the field remained below `Ma 0.10`, finite, within density/flux gates, and free of counted safety interventions.

The interface also evaluates the live edited and reference fields before showing comparison ratios. If Mach reaches `0.10`, density leaves the live gate, a value is non-finite, or a safety intervention is counted, the three headline comparisons are replaced with an outside-gate warning.

## Geometry editing and scenario definitions

The upper and lower walls are smooth one-dimensional profiles. Pointer motion applies a bounded Gaussian displacement to one wall, followed by spatial smoothing. Constraints preserve:

- a minimum lumen gap;
- a maximum local slope;
- connected fluid space;
- straight protected inlet and outlet buffers.

When a solid node becomes fluid, its distributions are initialized to local equilibrium from neighboring density and velocity.

The four interface stories map to the solver as follows:

| Interface story | Geometry / state | Important limitation |
|---|---|---|
| Reference channel | Straight channel | A numerical reference, not measured anatomy |
| Idealized artery narrowing | Gaussian 40% minimum-diameter reduction | No carotid bifurcation and no plaque tissue model |
| Idealized aortic-like bulge | Smooth off-center expansion, roughly `1.3–1.5×` maximum diameter in tests | No patient aorta, wall compliance, or rupture mechanics |
| Higher pressure state | Straight channel; illustrative pressure factor initialized to `160/120` only in the separate wall-tension relation | The CFD flow drive does not change; the number is a dimensionless ratio, not mm Hg or a patient-specific input |

The anatomical names communicate familiar contexts; they do not claim body-specific geometry.

## Normalized axial near-wall gradient proxy

At each wall sample, VesselDelta takes two inward vertical-grid samples of the axial component `uₓ`. The displayed proxy is proportional to

```text
proxy ≈ nu * (Delta u_x / Delta y)
```

and is normalized against the straight control channel. It is not a slope-aware projection of tangential velocity onto the local wall normal, and the app does not report pascals.

This grid-dependent near-wall proxy is useful for within-model comparison, not clinical wall-shear-stress measurement.

## Separate relative wall-tension relation

The wall-tension lens is not part of the LBM solve. The production interface holds wall thickness constant and displays the dimensionless relation

```text
T_relative = (P/P0) * (r/r0)
```

The interface varies the illustrative pressure factor and derives local radius from the idealized geometry. The exported helper retains an optional thickness-ratio argument for an algebraic unit test, but every production call uses its default `t/t0 = 1`; no thickness is measured or spatially modeled. This is a directional teaching index under a thin, cylindrical, uniform-wall assumption. It is not calibrated tension or stress and cannot represent compliant, anisotropic, spatially varying vascular tissue or rupture.

## Computed-grid color map and 3D mapping

The Three.js layer does not solve another field.

1. The active top and bottom 2D wall profiles are sampled at 74 axial rings.
2. Each profile sample is revolved across 32 sides to form an axisymmetric cutaway surface.
3. The current `160 × 70` grid is converted cell by cell into an 8-bit RGBA `DataTexture` inside the cutaway. Velocity and signed vorticity use current cell values; the shear lens extends the axial wall-gradient proxy into the lumen with a labeled display fade, and wall tension is a separate derived geometric display.
4. Surface color separately takes an axial peak-magnitude sample from the current 2D field and repeats it around each ring.
5. The untouched control profile is rendered as a faint wireframe reference.

This mapping provides depth and anatomical intuition without representing a solved volumetric velocity field. It cannot show branch flow, Dean vortices, helical flow, out-of-plane recirculation, or any other 3D secondary-flow phenomenon.

## RBC-inspired massless tracers

The 3D scene contains 92 biconcave-inspired visual objects. Each tracer:

- samples `uₓ,uᵧ` from one current 2D fluid cell;
- advances its 2D coordinates by those sampled components with a visual time multiplier;
- stays on the `z = 0` computed plane;
- is reset when it reaches a boundary or outlet;
- has no mass, momentum feedback, collision, deformation, aggregation, or effect on viscosity.

The simpler 2D particle paths are also passive visual tracers. Neither representation is a blood-cell simulation.

## Amber narrowing overlay

The amber surface is computed only from the reduction in the idealized lumen radius. It makes the stenosis visible in the cutaway. It has no plaque composition, histology, calcification, cap thickness, inflammation, growth, or rupture state. Documentation and UI therefore call it modeled narrowing geometry, not simulated plaque.

## Idealized lumen-restoration geometry counterfactual

The UI animation calls `setStenosisRestoration(easedProgress)`. The engine removes the full original Gaussian narrowing amplitude by the end and rebuilds the wall mask. VesselDelta has no physical time calibration, so at completion it reinitializes the distribution on the final reference geometry instead of presenting the numerical transient as a device-deployment timescale. The same D2Q9 equations then advance the restored steady counterfactual.

The displayed stent-like rings are not solver obstacles or structural elements. The model omits strut thickness, deployment pressure, contact, recoil, malapposition, vessel injury, embolization, restenosis, antiplatelet therapy, and clinical selection. It is a lumen-geometry counterfactual, not a stent simulation or outcome prediction.

## Lifestyle evidence layer

The interface displays three approximate systolic-blood-pressure ranges from the American Heart Association’s 2025 guide:

- DASH-style eating: `3–7 mm Hg`;
- reduced sodium intake: `1–4 mm Hg`;
- aerobic exercise: `2–7 mm Hg`.

Source: [AHA, Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf).

The interface scopes these as approximate average ranges for adults without hypertension. They are overlapping, non-additive values associated with sustained behavior, not personal forecasts. They do not modify wall geometry, blood viscosity, flow drive, the illustrative pressure factor, or any person-specific prediction. The 2025 AHA/ACC guideline broadly recommends lifestyle measures in prevention and management while requiring clinical context for treatment decisions. [AHA/ACC guideline summary](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know)

## Medication mechanism theatre

The medication panel is a fixed explanatory animation with source-linked copy. It teaches only high-level direction:

- ACE inhibitors and ARBs reduce angiotensin-pathway vessel-narrowing signals through different molecular mechanisms;
- calcium-channel blockers can relax vascular smooth muscle;
- thiazide-type diuretics act through renal sodium and volume pathways;
- statins act through liver cholesterol pathways and are explicitly not represented as blood-pressure drugs.

The panel does not alter either solver. It contains no dose, exposure, pharmacokinetics, adverse-effect model, comparative efficacy, indication, contraindication, drug interaction, or individualized recommendation. Source context: [FDA Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension), an official [ACE-inhibitor label in DailyMed](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=350c6fc9-9774-4d49-9242-19e96944f83b), FDA [ARB/thiazide prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf), FDA [calcium-channel-blocker/statin prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf), and the [FDA Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy).

## Hypertension burden layer

The app’s `48.1%`, `119.9 million`, and `22.5%` cards come from the NHANES 2017–March 2020 estimates summarized on the CDC’s June 2, 2026 page. The `680,179` figure is a 2024 death-certificate count on which high blood pressure was listed as a primary **or contributing** cause; it does not mean hypertension was the sole cause in every death. [CDC High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)

These epidemiologic numbers are not model parameters.

## Rupture-boundary lesson

The rupture interaction is a refusal designed as a lesson. A rigid-wall solver has no deformation or failure criterion. The interface names four absent domains:

1. spatially measured wall thickness;
2. patient-specific tissue strength or material law;
3. longitudinal growth and asymmetric anatomy;
4. fluid–structure coupling.

Accordingly, VesselDelta reports no rupture stress, threshold, probability, or timing. The separate constant-thickness pressure–radius tension index must not be interpreted as rupture risk.

## Automated validation gates

`tests/hemo-engine.test.mjs` checks:

1. straight-channel normalized L2 profile error `< 3%` after settling;
2. maximum Mach number `< 0.10`;
3. density spread `< 0.02` and mean-density drift `< 0.01` in the baseline benchmark;
4. all distribution values remain finite;
5. the preset stenosis stays within a constrained diameter range;
6. stenosis peak speed exceeds baseline by at least `1.35×`;
7. stenosis peak axial near-wall gradient proxy exceeds baseline by at least `2.5×`;
8. stenosis peak vorticity exceeds baseline by at least `2.5×`;
9. full idealized lumen restoration reaches but does not exceed the reference diameter, remains finite and low-Mach after settling, and reduces the stenosis jet and shear toward the reference;
10. the aneurysm preset enlarges rather than closes the lumen;
11. the wall-tension helper’s pressure, radius, and optional thickness scaling is algebraically independent of the CFD state, while the production interface fixes thickness at its reference value;
12. repeated sculpting preserves the minimum gap and a finite, low-Mach field;
13. the tightest reachable lumen at the maximum exposed `0.020` flow drive remains below `Ma 0.10`, finite, inside density/flux gates, and free of counted safety interventions after 10,000 steps.

`tests/rendered-html.test.mjs` separately confirms that the production shell renders the 2D/3D model receipt, treatment theatre, current burden claim, and illustrative label.

These are software, numerical, and directional checks—not anatomical, educational, device, or clinical validation.

## Live verification

The UI separately displays current:

- render frames per second from the instrument loop;
- combined edited/control solver steps per second;
- peak Mach number;
- density spread and mean-density drift;
- fitted upstream Poiseuille-profile error;
- finite-field assertion and counted numerical safety interventions;
- grid and twin-solver configuration.

Transient readings can temporarily worsen after a preset, wall edit, or lumen restoration. The UI says **field evolving** rather than representing the new field as converged.

The displayed FPS is not a full GPU frame-time benchmark of the separate Three.js renderer. WebGL compatibility and performance must be checked during release QA on representative devices.

## Known limitations

- 2D rather than 3D CFD;
- axisymmetric presentation rather than measured anatomy;
- single-phase Newtonian rather than non-Newtonian or cell-resolved blood;
- rigid rather than compliant walls;
- simplified steady inlet/outlet boundary conditions;
- staircase bounce-back geometry at finite grid resolution;
- no physical-unit calibration for WSS;
- no patient data, tissue model, drug-response model, or chronic biology;
- no physical time calibration, diagnosis, treatment guidance, plaque prediction, stent-outcome prediction, or rupture prediction;
- no physician review, educator study, or clinical validation.

## References

### Numerical method

- [Qian, d’Humières & Lallemand (1992)](https://doi.org/10.1209/0295-5075/17/6/001)
- [Zou & He (1997)](https://doi.org/10.1063/1.869307)

### Public-health and treatment context

- [CDC: High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)
- [AHA: Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf)
- [AHA/ACC: 2025 High Blood Pressure Guideline—Top Things to Know](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know)
- [FDA: Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension)
- [DailyMed: official ACE-inhibitor label](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=350c6fc9-9774-4d49-9242-19e96944f83b)
- [FDA: ARB/thiazide prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf)
- [FDA: calcium-channel-blocker/statin prescribing information](https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf)
- [FDA: Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy)
