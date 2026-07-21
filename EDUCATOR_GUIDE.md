# VesselDelta educator guide

## A 15-minute lesson: one slice, two forces, four stories

VesselDelta is designed for a prediction–experiment–explanation loop in physiology, anatomy, biophysics, biomedical engineering, or public science education. Its central teaching move is not “red means danger.” It is learning to ask **which quantity is being shown, which model produced it, and what that model cannot answer**.

## Learning objectives

By the end, a learner should be able to:

1. identify the 2D D2Q9 slice as the computational source of truth and the 3D cutaway as an axisymmetric interpretation;
2. predict that narrowing a fixed-flow pathway accelerates a throat jet;
3. distinguish modeled velocity, signed vorticity, a normalized axial near-wall gradient proxy, and a thin-cylinder relative wall-tension index;
4. explain why idealized lumen restoration is a steady geometry counterfactual rather than a stent or treatment-outcome model;
5. interpret population lifestyle ranges without adding them or applying them to an individual;
6. explain why a rigid-wall model cannot predict rupture;
7. name at least three limitations separating VesselDelta from clinical CFD.

## Before class

- Open VesselDelta in a current desktop browser.
- Confirm the default **Guided lab** opens on **Idealized artery narrowing** in **3D interpretation**. Use **Free explore** for manual field lenses, controls, and lumen restoration.
- Rotate the cutaway, then switch to **Computed slice** and confirm the current computed grid is visible.
- Confirm the healthy edited/control tiles settle near `1.00×`.
- Open **Verify physics** and check that the field is finite and inside the low-Mach gate.
- Follow the fallback to the 2D slice if WebGL is unavailable; the computed lesson remains usable.

## Minute-by-minute script

### 0:00–2:00 — establish the model receipt

Begin in the default **Guided lab** and **3D interpretation**. Ask:

> “Is this a 3D fluid simulation?”

The intended answer is **no**. Rotate the cutaway, then choose **Computed slice**.

State:

> “This `160 × 70` grid is what the browser computes. The cutaway revolves its wall shape and carries a cell-by-cell color map into 3D. The surrounding ring color is a layer-specific derived axial display, not a volumetric field. The RBC-shaped objects are massless tracers with visually scaled time, not simulated cells.”

Have students name one phenomenon that therefore cannot be represented: branch flow, out-of-plane vortices, wall compliance, red-cell deformation, or patient anatomy.

### 2:00–4:30 — predict and run the narrowing

Ask:

> “If I narrow this pathway, where will speed peak: at the narrowest throat or in the downstream turning field?”

Students commit in guided step 1. **Reveal with the live model** changes the scene to the computed narrowing slice. Point out that the ratios remain blank while the fields recompute and appear only after the numerical gate passes.

Ask students to locate:

- the untouched ghost outline;
- the central speed field;
- the passive tracer paths;
- the edited-versus-control metric tiles.

The intended observation is a faster throat jet. Explain that this is a generic 2D stenosis, not reconstructed carotid anatomy or plaque biology.

### 4:30–6:30 — change the field lens

Choose **Free explore**, then switch in order:

1. **Modeled velocity** — magnitude of local flow.
2. **Vorticity** — signed local turning, not a blanket claim of turbulence.
3. **Shear proxy** — a normalized axial near-wall grid gradient, not a slope-aware wall-normal derivative and not pascals.
4. **Wall tension** — a separate thin-cylinder pressure–radius index, not a CFD quantity.

Ask:

> “Must the fastest region, strongest wall gradient, and greatest local turning occupy the same place?”

The intended answer is no.

### 6:30–8:00 — run idealized lumen restoration

Return to **3D interpretation** and select **Idealized lumen restoration**.

Ask students to describe only what is actually changed: the lumen geometry progressively reaches the reference shape, the solid mask changes, and the final steady field is reseeded and recomputed. Because the model has no physical time calibration, the animation is not a deployment timescale.

Then ask what is missing:

- strut–flow interaction;
- device deployment mechanics;
- vessel injury or recoil;
- embolic risk or restenosis;
- patient selection or treatment outcome.

Correct sentence:

> “Restoring this idealized steady geometry changes this model’s flow.”

Incorrect sentence:

> “The app proves a stent will fix this patient.”

### 8:00–10:30 — separate shear from pressure load

Return to **Guided lab** for step 2, commit to an answer, and reveal the higher-pressure story. Then choose **Free explore** if you want to vary the illustrative pressure factor directly.

Write:

```text
relative wall-tension index = (P / P0) × (r / r0)
```

Ask:

- If pressure rises while radius stays fixed, which direction does the index move?
- If radius increases while pressure stays fixed, which direction does it move?
- Did the pressure slider make the CFD run faster?

The intended answers are: up, up, and no.

Choose **Higher pressure state** and point out that the story initializes a `160/120` illustrative ratio while leaving the straight CFD geometry and flow drive independent. The thin-cylinder `P × r` number is not mm Hg or hoop stress, does not diagnose hypertension, and does not reproduce a person’s blood pressure.

The outward arrows and circumferential pulse are a labeled force-direction cue only. They do not show wall deformation, calibrated force, a pressure solution, or rupture risk; under reduced-motion preferences they remain static.

### 10:30–11:30 — ask the rupture question

Use guided step 3, then open **Can this model predict rupture?**

Have students name the missing inputs before revealing the list: measured wall thickness, material strength/failure law, longitudinal growth and asymmetric anatomy, and fluid–structure coupling.

State:

> “A relative wall-tension index can move upward without becoming a rupture probability.”

### 11:30–13:30 — evidence without fake biology

Open the optional **Clinical context** drawer, then inspect the lifestyle cards. The AHA guide lists approximate systolic ranges for sustained DASH-style eating (`3–7 mm Hg`), sodium reduction (`1–4 mm Hg`), and aerobic exercise (`2–7 mm Hg`); Table 12 of the full guideline identifies the displayed column as adults without hypertension. Ask why the ranges should not be arithmetically summed into a personal forecast. Intended reasons include overlapping mechanisms, variable populations, adherence, baseline differences, and individual response.

Open one medication mechanism. Emphasize that the animation explains a pathway while the CFD remains unchanged. Ask which statement is more defensible:

- “Thiazide-type diuretics act through renal sodium/volume pathways.”
- “This animation predicts how many mm Hg a particular person will drop.”

Only the first statement is supported by the product.

Sources:

- [CDC High Blood Pressure Facts](https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html)
- [AHA Your Guide to Better Blood Pressure Health](https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf)
- [AHA/ACC full 2025 guideline, Table 12](https://www.ahajournals.org/doi/10.1161/HYP.0000000000000249)
- [AHA/ACC 2025 High Blood Pressure Guideline summary](https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know)
- [FDA Hypertension](https://www.fda.gov/consumers/health-education-resources/hypertension)
- [FDA Statin Drug Safety Communication](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy)

### 13:30–14:30 — consolidate the guided receipt

Return to the completed **Guided lab** receipt. Each reveal changed the live instrument so learners could inspect the claim they made:

1. the fastest flow in the narrowing appears at the throat;
2. the higher-pressure story raises only the separate wall-tension index, not the CFD jet;
3. the brightest color cannot predict rupture.

The local `3 / 3` result records these three distinctions only. It is not a validated assessment of learning, clinical competence, or medical judgment.

### 14:30–15:00 — inspect and exit

Open **Verify physics**. Students identify one numerical check and one question that would require a different validation program.

Exit ticket, one sentence each:

1. The computed source of truth is…
2. A narrowing increased local speed because…
3. Relative pressure–radius wall tension differs from flow shear because…
4. Lumen restoration can show…, but cannot show…
5. VesselDelta cannot predict rupture because…

## Common misconceptions

### “The 3D cutaway means the app solves 3D flow.”

No. The current 2D wall profile is revolved for presentation. A color rendering of the current computed grid stays on a planar slice, and axial samples are projected around rings for color.

### “Those are simulated red blood cells.”

No. They are massless, RBC-inspired markers whose coordinates advance from the sampled 2D velocity field with a visual time multiplier. They do not carry momentum or model physical time, hematocrit, deformation, aggregation, or viscosity.

### “Amber means dangerous plaque.”

No. Amber makes the mathematical narrowing visible. There is no plaque composition, biology, or vulnerability model.

### “Red means disease.”

No. Color means a higher displayed model quantity. It does not locate plaque, tissue failure, or future disease.

### “Vorticity means turbulent blood.”

No. Vorticity is local rotation in the 2D velocity field. VesselDelta does not claim resolved 3D turbulence.

### “Higher blood pressure just means faster blood.”

No. Systemic pressure, local pressure gradients, flow, resistance, compliance, and autoregulation interact. VesselDelta deliberately keeps flow drive and the simplified pressure-load factor separate.

### “Lumen restoration demonstrates stent efficacy.”

No. It reaches the reference lumen geometry, reseeds the final steady field, and recomputes. It omits physical deployment time, the device–tissue system, and clinical outcome.

### “The lifestyle ranges can be added to predict my result.”

No. They are approximate, overlapping population ranges for sustained behaviors and are not individual forecasts.

### “The medication animation recommends a drug.”

No. It is mechanism theatre. It omits diagnosis, dose, efficacy, adverse effects, interactions, contraindications, and clinician judgment.

### “The aneurysm lesson predicts rupture.”

No. Real rupture mechanics require patient-specific geometry, wall thickness and composition, material behavior, growth, loading, and clinical context absent here.

## Assessment rubric

| Skill | 0 | 1 | 2 |
|---|---|---|---|
| Separates compute from presentation | Calls the cutaway 3D CFD | Notes the 2D solver | Explains the computed-grid color plane, ring projection, and missing volumetric flow |
| Predicts stenosis response | No within-model prediction | Predicts faster flow | Predicts a throat jet and separates it from downstream turning |
| Separates forces | Conflates pressure and shear | Names both | Explains tangential shear versus thin-cylinder relative wall tension |
| Interprets treatment counterfactual | Calls it efficacy | Notes geometry changed | States what recomputes and names absent device/clinical mechanics |
| Interprets evidence | Adds ranges or personalizes | Calls them population ranges | Explains overlap, sustained behavior, and non-coupling to CFD |
| Critiques the model | No limitation | Names one limitation | Names three and explains why they matter |

## Safety and review disclosure

VesselDelta is an illustrative 2D rigid-wall Newtonian model with an axisymmetric 3D presentation. It is not a diagnostic tool, medical advice, patient-specific CFD, a plaque locator, a treatment selector, a stent-outcome model, or a rupture predictor. No physician review, classroom study, educator validation, or clinical validation was completed before the Build Week submission.
