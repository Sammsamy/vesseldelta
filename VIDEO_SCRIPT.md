# VesselDelta video script

Target: **2 minutes 40 seconds**. Use a real voiceover and keep the final export below three minutes. The working instrument should fill the frame; face camera is optional for the opening and close.

## Recording setup

- Browser at 1280×720 or 1440×900.
- Start on the default **Guided lab**, step 1, **Idealized artery narrowing**, and **3D interpretation**.
- Wait until the status changes from **FIELD RECOMPUTING** to **FIELD EVOLVING** before starting. The first reveal deliberately recomputes the preset and withholds its ratios; record that state, then make one clean jump cut after the gate passes. The audited local warm-up took about seven seconds; deployment timing may differ.
- Confirm the 3D cutaway rotates smoothly before recording.
- Practice the three guided reveals, **Free explore**, **Idealized lumen restoration**, **Verify physics**, and the optional **Clinical context** drawer.
- Record a clean take with natural pauses, then trim dead time.
- Do not claim 3D CFD, simulated blood cells, real plaque, treatment efficacy, immediate diet effects, rupture prediction, patient specificity, or “the first browser blood-flow simulator.”

## Script and actions

### 0:00–0:09 — open on the guided instrument

**Action:** Begin on the rotating narrowing cutaway with **Guided lab · Step 1 of 3** visible.

**Say:**

> I’m Fuzlullah, a third-year medical student. This is VesselDelta: a guided lab where the model has to earn every reveal.

### 0:09–0:25 — make the 2D-to-3D contract visible

**Action:** Rotate the narrowing once and point to the model receipt.

**Say:**

> It looks three-dimensional, but the flow solve is two-dimensional. The cutaway revolves its wall shape, and the plane color-encodes the current D2Q9 grid. The red-cell shapes are massless visual tracers, not simulated blood cells.

### 0:25–0:54 — predict, gate, then reveal

**Action:** Choose **At the narrowest throat**, then **Reveal with the live model**. Show **FIELD RECOMPUTING** and the blank ratio receipt for a beat. Jump cut only after **FIELD EVOLVING** and the live ratios appear in the guide.

**Say:**

> First, I have to predict where narrowing makes flow fastest. A second untouched vessel runs beside the edited field. While either field recomputes or misses the two-percent flux gate, VesselDelta refuses to show comparison numbers. Only then does it reveal the throat jet and larger axial near-wall gradient proxy. Those are model ratios, not clinical wall shear.

### 0:54–1:14 — separate pressure from flow

**Action:** Choose **Next distinction**, select **Only the wall-tension index rises**, and reveal step 2. Point to the `1.33×` relative index and the words `CFD drive unchanged`.

**Say:**

> Next, pressure. VesselDelta keeps flow drive separate from a thin-cylinder pressure-times-radius relation. The illustrative higher-pressure state raises a relative circumferential-tension index while CFD drive stays unchanged. It is dimensionless, not millimeters of mercury, tissue stress, or patient risk.

### 1:14–1:34 — make refusal the payoff

**Action:** Advance to step 3, select **No—wall-failure inputs are absent**, reveal, and open **Inspect why rupture is not calculated**.

**Say:**

> Finally: can the brightest region predict rupture? No. This rigid-wall solver has no measured wall thickness, tissue strength, growth history, or fluid–structure failure law. A dramatic tear would be fiction, so the product refuses.

### 1:34–1:52 — show free exploration without overclaiming treatment

**Action:** Return to the instrument, choose **Free explore**, switch to the narrowing story, and run **Idealized lumen restoration**.

**Say:**

> The guided path is the lesson; free exploration is the instrument. This lumen-restoration animation changes only idealized geometry, reseeds the final steady field, and recomputes. It is not a stent deployment, treatment recommendation, or outcome forecast.

### 1:52–2:12 — inspect the proof

**Action:** Open **Verify physics**. Point to FPS, Mach number, profile error, density, finite-field card, and `160 × 70 × 2`.

**Say:**

> The proof is inspectable: two local fields, low-Mach and flux gates, density stability, a fitted Poiseuille-profile check, and every numerical intervention. The repository adds nine automated tests and a reproducible ten-thousand-step benchmark.

### 2:12–2:24 — keep clinical context optional

**Action:** Close verification, scroll to **Optional clinical context**, open it briefly, then close it.

**Say:**

> CDC burden, AHA lifestyle ranges, and FDA-sourced medication pathways stay in an optional context drawer. They never feed the solver or become a personal forecast. No physician review, educator study, or clinical validation was completed.

### 2:24–2:40 — Codex decisions and close

**Action:** Return to the completed guided receipt and the rotating cutaway.

**Say:**

> Codex with GPT-5.6 implemented and stress-tested the D2Q9 boundaries, caught an unstable flow control, exposed the 2D source inside the 3D view, and narrowed every medical claim. VesselDelta: predict, inspect, and know when the model cannot answer.

## Natural delivery notes

- Say “two-dimensional” once before using “2D.”
- Rehearse the final Codex sentence at a natural pace; do not rush it to beat the limit.
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
