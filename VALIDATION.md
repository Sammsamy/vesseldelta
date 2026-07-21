# VesselDelta validation record

## Reproduce

```bash
npm install
npm test
npm run benchmark
```

`npm test` builds the production app and runs six structural, numerical, geometry, and scaling tests. `npm run benchmark` independently advances the production-resolution healthy and stenosis engines for 10,000 steady solver steps each and prints machine-readable JSON.

## Latest local result

Run on July 21, 2026 from the working state before public release:

| Measurement | Healthy | Stenosis |
|---|---:|---:|
| Grid | 160 × 70 | 160 × 70 |
| Solver steps | 10,000 | 10,000 |
| Solver throughput in Node | 1,819 steps/s | 1,932 steps/s |
| Fitted profile-shape L2 error | 0.0709% | 0.0469% |
| Maximum Mach number | 0.04695 | 0.07546 |
| Density spread | 0.00262 | 0.00493 |
| Mean-density deviation | 0.1332% | 0.2310% |
| Signed mass-flux mismatch | 0.2473% | 0.2681% |
| Counted safety interventions | 0 | 0 |
| Minimum diameter / baseline | 1.000 | 0.600 |

At the settled 10,000-step comparison, the stenosis produced:

- `1.6072×` peak speed;
- `3.5048×` peak normalized wall-shear estimate;
- `3.3306×` peak local vorticity.

The browser demo intentionally exposes earlier evolving values rather than relabeling them as converged. In local browser QA, both simultaneous fields rendered at `60 FPS` and approximately `240 combined solver steps/s` at the default viewport.

## What these checks establish

- The implemented field remains within the intended low-Mach envelope.
- Density variation stays small after settling.
- Signed inlet/outlet mass flux agrees to within about `0.3%` in the two benchmark geometries.
- The straight upstream profile has the expected parabolic shape.
- A 40% diameter reduction produces the expected directional changes: a faster throat jet, larger wall-gradient estimate, and larger local vorticity.
- Default and preset runs do not trigger the invalid-density or excess-speed safety guards.

## What these checks do not establish

- The profile check fits the computed peak amplitude, so it validates shape rather than physical pressure-flow calibration.
- The absolute straight-wall shear estimate is approximately `13.5%` below its planar reference on this grid. The product therefore reports a **normalized wall-shear estimate** and emphasizes edited-versus-control ratios, where much of that fixed discretization bias cancels.
- Grid-level agreement is not patient-specific or clinical validation.
- A steady 2D field does not validate chronic plaque biology, aneurysm growth, rupture risk, or clinical decision-making.
- Browser FPS depends on hardware, viewport, power state, and other open work.

## Visual and interaction QA completed

- healthy, stenosis, and aneurysm presets;
- direct pointer sculpting of a wall;
- velocity, vorticity, wall-shear, and wall-load lenses;
- pressure-factor input changes the separate wall-load layer without changing flow drive;
- flow-drive input updates the CFD setting;
- prediction-before-reveal path;
- verification and model-card dialogs;
- clean console after a fresh development-server restart;
- desktop first viewport with the interactive vessel visible;
- responsive layout rules and reduced-motion behavior in code.

## Release interpretation

This validation supports an educational causal instrument. It does not support diagnosis, therapy selection, “plaque here,” “rupture risk,” patient-specific predictions, or calibrated clinical WSS.
