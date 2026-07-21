# VesselDelta methods and validation protocol

## Scope

VesselDelta solves a deliberately idealized two-dimensional channel-flow problem to support causal learning. All fluid values are lattice units. Outputs are normalized or relative unless explicitly described otherwise.

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

## Geometry editing

The upper and lower walls are smooth one-dimensional profiles. Pointer motion applies a bounded Gaussian displacement to one wall, followed by short spatial smoothing. Constraints preserve:

- a minimum lumen gap;
- a maximum local slope;
- connected fluid space;
- straight protected inlet and outlet buffers.

When a solid node becomes fluid, its distributions are initialized to local equilibrium from neighboring density and velocity.

## Normalized wall-shear estimate

At each wall sample, VesselDelta takes two inward samples of tangential velocity and estimates the wall-normal derivative. The displayed instantaneous shear proxy is proportional to

```text
tau_wall ≈ rho * nu * (du_t / dn)
```

and is normalized against the straight control channel. The app does not report pascals.

## Separate pressure-load relation

The wall-load lens is not part of the LBM solve. It uses the dimensionless thin-cylinder relation

```text
L = (P/P0) * (r/r0) * (t0/t)
```

This is a directional teaching model under a thin, cylindrical, uniform-wall assumption. It cannot represent compliant, anisotropic, spatially varying vascular tissue or rupture.

## Automated validation gates

`tests/hemo-engine.test.mjs` checks:

1. straight-channel normalized L2 profile error `< 3%` after settling;
2. maximum Mach number `< 0.10`;
3. density spread `< 0.02` and mean-density drift `< 0.01` in the baseline benchmark;
4. all distribution values remain finite;
5. the preset stenosis stays within a constrained diameter range;
6. stenosis peak speed exceeds baseline by at least `1.35×`;
7. stenosis peak shear exceeds baseline by at least `2.5×`;
8. stenosis peak vorticity exceeds baseline by at least `2.5×`;
9. the aneurysm preset enlarges rather than closes the lumen;
10. pressure-load scaling is algebraically independent of the CFD state;
11. repeated sculpting preserves the minimum gap and low-Mach field.

These are numerical and directional checks, not clinical validation.

## Live verification

The UI separately displays current:

- render frames per second;
- combined edited/control solver steps per second;
- peak Mach number;
- density spread and mean-density drift;
- fitted upstream Poiseuille-profile error;
- finite-field assertion and counted numerical safety interventions;
- grid and twin-solver configuration.

Transient readings can temporarily worsen immediately after a preset or wall edit. The UI says **field evolving** rather than representing the new field as instantaneously converged.

## Known limitations

- 2D rather than 3D;
- single-phase Newtonian rather than non-Newtonian blood;
- rigid rather than compliant walls;
- simplified inlet/outlet boundary conditions;
- staircase bounce-back geometry at finite grid resolution;
- no physical-unit calibration for WSS;
- no patient data, tissue model, or biology;
- no diagnosis, treatment guidance, plaque prediction, or rupture prediction.

## Primary numerical references

- [Qian, d’Humières & Lallemand (1992)](https://doi.org/10.1209/0295-5075/17/6/001)
- [Zou & He (1997)](https://doi.org/10.1063/1.869307)
