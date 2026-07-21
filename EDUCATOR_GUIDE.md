# VesselDelta educator guide

## A 12-minute lesson: one vessel, two forces

VesselDelta is designed for a short prediction–experiment–explanation loop in physiology, anatomy, biophysics, biomedical engineering, or public science education.

### Learning objectives

By the end, a learner should be able to:

1. predict that narrowing a fixed-flow pathway accelerates a local jet;
2. distinguish a fast throat jet from downstream disturbed flow;
3. explain that flow-induced wall shear and pressure-induced circumferential wall load are different mechanical quantities;
4. use the simplified `P × radius ÷ thickness` relation directionally without treating it as rupture risk;
5. name at least three limitations that separate this instrument from clinical CFD.

### Before class

- Open VesselDelta in a current desktop browser.
- Confirm **Healthy control** reads close to `1.00×` for all three counterfactual tiles.
- Leave **Velocity** selected.
- If the computer is slow, pause other animated tabs. VesselDelta adapts its solve rate while keeping the field local.

## Minute-by-minute script

### 0:00–1:30 — predict

Ask: **“If I narrow this vessel, where will flow be fastest: at the narrowest throat or inside the region after it?”**

Students commit using the two prediction buttons. Do not reveal yet.

### 1:30–3:30 — run the counterfactual

Choose **Stenosis** or drag both vessel walls inward.

Ask students to identify four independent visual signals:

- the healthy ghost outline;
- the central speed color;
- the particle-tracer paths;
- the edited-to-control metric tiles.

Then use **Reveal with physics**. The expected observation is a faster throat jet. The exact ratios vary while the field continues iterating.

### 3:30–5:30 — change the lens

Switch in order:

1. **Velocity** — magnitude of the local flow field.
2. **Vorticity** — local turning/rotation, not “turbulence.”
3. **Wall shear** — a normalized near-wall gradient estimate, not pascals.
4. **Wall load** — a separate pressure–radius relation, not part of the CFD field.

Ask: **“Does the brightest speed region have to be the same as the strongest disturbed-flow region?”** The intended answer is no.

### 5:30–8:00 — separate the two forces

Open **Aneurysm** and then **Wall load**.

Increase the pressure-load slider while leaving the flow-drive slider unchanged.

State explicitly:

> “This control changes only the separate wall-load teaching relation. It does not secretly make the fluid move faster.”

Write:

```text
relative load = (P / P0) × (r / r0) × (t0 / t)
```

Ask:

- If pressure rises while radius and thickness stay fixed, which direction does the estimate move?
- If a vessel radius increases while pressure stays fixed, which direction does it move?
- What real biology is missing from this thin-wall relation?

### 8:00–10:00 — challenge the model

Open **Verify physics**.

Have students find:

- grid size and twin-solver claim;
- frames per second;
- Mach-number gate;
- straight-channel profile error;
- density stability;
- model assumptions.

Ask: **“Which check tests numerical behavior, and which would require clinical data?”**

### 10:00–12:00 — exit ticket

Students answer in one sentence each:

1. A stenosis increased local velocity because…
2. Wall shear differs from pressure wall load because…
3. VesselDelta cannot predict plaque or rupture because…

## Common misconceptions

### “Red means disease.”

No. Color means a higher displayed model quantity. It does not locate plaque, tissue failure, or future disease.

### “Vorticity means turbulent blood.”

No. Vorticity is local rotation in the velocity field. VesselDelta does not claim resolved 3D turbulence.

### “Higher blood pressure just means faster blood.”

No. Systemic pressure, local pressure gradient, flow rate, resistance, compliance, and autoregulation interact. VesselDelta deliberately keeps its simplified flow-drive and wall-load controls separate.

### “The aneurysm layer predicts rupture.”

No. Real aneurysm mechanics depend on 3D geometry, wall thickness and composition, anisotropy, remodeling, inflammation, boundary conditions, and many other factors absent here.

### “The ghost control is a formula.”

No. It is a second D2Q9 field running under the same numerical and inlet settings. The ratios are computed field-to-field.

## Assessment rubric

| Skill | 0 | 1 | 2 |
|---|---|---|---|
| Predicts stenosis response | No causal prediction | Predicts faster flow without location | Predicts a throat jet and distinguishes downstream flow |
| Separates forces | Conflates pressure and shear | Names both | Explains tangential shear versus circumferential wall load |
| Interprets color | Treats color as risk | Calls it a model value | Explains quantity, normalization, and biological context |
| Critiques the model | No limitation | Names one limitation | Names three and explains why they matter |

## Safety and review disclosure

VesselDelta is an illustrative 2D rigid-wall Newtonian model. It is not a diagnostic tool, medical advice, patient-specific CFD, or a plaque/rupture predictor. No physician review, classroom study, or clinical validation was completed before the Build Week submission.
