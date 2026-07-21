# VesselDelta video script

Target: **2 minutes 35 seconds**. Use a real voiceover. The working instrument should fill the frame; face camera is optional for the opening and close.

## Recording setup

- Browser at 1280×720 or 1440×900.
- Start on **Idealized artery narrowing**, **3D interpretation**, **Modeled velocity**, default flow drive, and default illustrative pressure factor.
- Confirm the 3D cutaway rotates smoothly before recording.
- Keep **Computed slice**, **Idealized lumen restoration**, **Verify physics**, and **Can this vessel rupture?** in a practiced click path.
- Record a clean take with natural pauses, then trim dead time.
- Do not claim 3D CFD, simulated blood cells, real plaque, treatment efficacy, immediate diet effects, rupture prediction, patient specificity, or “the first browser blood-flow simulator.”

## Script and actions

### 0:00–0:08 — open on the instrument

**Action:** Begin on the rotating reference cutaway. Click **Idealized artery narrowing**.

**Say:**

> I’m Fuzlullah, a third-year medical student. This is VesselDelta. Change a vessel, and live flow answers.

### 0:08–0:28 — make the 2D-to-3D contract visible

**Action:** Rotate the narrowing once. Point to the model receipt. Click **Computed slice**.

**Say:**

> It looks three-dimensional, but the honest part matters: the flow solve is two-dimensional. This cutaway revolves the wall shape, and its plane color-encodes the current D2Q9 grid. The surrounding ring color shows axial peak magnitude. The red-cell shapes are massless tracers with visually scaled time, not simulated blood cells.

### 0:28–0:48 — prove the live counterfactual

**Action:** Let the stenosis field develop. Point to the ghost outline and the three comparison tiles. Switch from **Modeled velocity** to **Shear proxy**, then briefly to **Vorticity**.

**Say:**

> A second untouched vessel runs beside every edit under the same flow drive. The narrowing creates a faster throat jet, a larger axial near-wall gradient proxy, and a different downstream turning field. Those are computed ratios, not a scripted score or clinical wall-shear measurement.

### 0:48–1:04 — show the restoration boundary

**Action:** Return to **3D interpretation**. Click **Idealized lumen restoration** and let the lumen reach the reference shape.

**Say:**

> This is an idealized steady-geometry counterfactual. The lumen reaches the reference shape, then the final field is reseeded and recomputed. The transition is not physical device time, a recommendation, or a prediction of patient outcome.

### 1:04–1:24 — separate pressure from shear

**Action:** Choose **Idealized aortic-like bulge**, select **Wall tension**, and raise the illustrative pressure factor. Then choose **Higher pressure state**.

**Say:**

> Flow shear acts along the wall. Pressure-driven tension acts around it. This separate constant-thickness relation shows how pressure and radius change a relative tension index without secretly making the CFD run faster. The pressure number is a ratio, not millimeters of mercury, and this is not a tissue-stress or rupture model.

### 1:24–1:36 — turn refusal into a feature

**Action:** Click **Can this vessel rupture?** and hold on the missing-input cards.

**Say:**

> So can this vessel rupture? This model cannot answer. It has no measured wall thickness, tissue strength, growth history, or fluid–structure coupling. A dramatic tear here would be fiction.

### 1:36–1:53 — connect to the real burden

**Action:** Scroll through the CDC burden cards and the three AHA lifestyle cards.

**Say:**

> The CDC reports a 119.9-million-adult estimate from 2017 through early 2020. The lifestyle cards show AHA ranges, scoped here as approximate averages for adults without hypertension. They overlap, vary, and are never added or fed into the flow model.

### 1:53–2:08 — explain medicine without prescribing

**Action:** Open the ACE inhibitor/ARB mechanism, then click **Thiazide** and **Statin**.

**Say:**

> Medication theatre explains pathways without pretending to prescribe. These FDA-sourced animations contain no dose, efficacy forecast, or personal response, and they do not alter the CFD. No physician review or clinical validation was completed.

### 2:08–2:27 — show the proof

**Action:** Open **Verify physics**. Point to FPS, Mach number, profile error, density, finite-field card, and `160 × 70 × 2`.

**Say:**

> The model is inspectable. Judges can see both local fields, the low-Mach gate, density stability, a fitted Poiseuille-profile check, and every numerical safety intervention. The repository includes eight automated tests and a reproducible ten-thousand-step benchmark.

### 2:27–2:35 — Codex and close

**Action:** Return to the rotating cutaway and title.

**Say:**

> Codex with GPT-5.6 helped build and challenge every layer. VesselDelta: shape the vessel, and watch the flow answer.

## Natural delivery notes

- Say “two-dimensional” once before using “2D.”
- Slow down on “not a device simulation” and “this model cannot answer.” Those are strengths, not apologies.
- Do not read every metric. Point while speaking.
- If a field is still settling, wait silently before the take instead of calling it a final result.
- If the 3D view stutters, record the computed slice as the primary demo and use a short pre-verified 3D shot. Do not claim a frame rate you did not measure on the final build.

## YouTube description sources

Include these direct links below the video:

- CDC High Blood Pressure Facts: https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html
- AHA Better Blood Pressure Health guide: https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf
- AHA/ACC 2025 High Blood Pressure Guideline summary: https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know
- FDA Hypertension: https://www.fda.gov/consumers/health-education-resources/hypertension
- FDA Statin Drug Safety Communication: https://www.fda.gov/drugs/drug-safety-and-availability/fda-requests-removal-strongest-warning-against-using-cholesterol-lowering-statins-during-pregnancy
- Numerical methods and limitations: link the public README and METHODS pages after deployment.

## Backup 90-second cut

If a shorter version is needed, keep:

1. the 3D-to-2D receipt;
2. stenosis with live control ratios;
3. the idealized lumen-restoration boundary;
4. pressure versus shear and the rupture refusal;
5. Verify physics;
6. one sentence on source-linked evidence and Codex.

## On-camera option

Use your face only for:

- Opening: “I’m Fuzlullah, a third-year medical student. I wanted vascular mechanics to be something you could touch.”
- Closing: “VesselDelta. Shape the vessel, and watch the flow answer.”

Everything between should show the instrument at readable size.
