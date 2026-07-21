# VesselDelta video script

Target: **2 minutes 44 seconds**. Use a real voiceover and keep the final export below three minutes. The working instrument should fill the frame; face camera is optional for the opening and close.

## Recording setup

- Browser at 1280×720 or 1440×900.
- Start on the default **Guided lab**, step 1, **Idealized artery narrowing**, and **3D interpretation**.
- Wait until the status changes from **FIELD RECOMPUTING** to **FIELD EVOLVING** before starting. The first reveal deliberately recomputes the preset and withholds its ratios; record that state, then make one clean jump cut after the gate passes. The audited local warm-up took about seven seconds; deployment timing may differ.
- Confirm the 3D cutaway rotates smoothly before recording.
- Practice the three guided reveals, the completion handoff into **Free explore**, one clean wall drag in **Computed slice**, and **Verify physics**. Prepare three tightly cropped Codex/diff shots for the closing build story.
- Record a clean take with natural pauses, then trim dead time.
- Do not claim 3D CFD, simulated blood cells, real plaque, treatment efficacy, immediate diet effects, rupture prediction, patient specificity, or “the first browser blood-flow simulator.”

## Script and actions

### 0:00–0:10 — open on the guided instrument

**Action:** Begin on the rotating narrowing cutaway with **Guided lab · Step 1 of 3** visible.

**Say:**

> I’m Fuzlullah, a third-year medical student. Static vessel diagrams show conclusions. VesselDelta makes learners predict before the model reveals them.

### 0:10–0:25 — make the 2D-to-3D contract visible

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

### 1:34–1:55 — shape the vessel for real

**Action:** Close the rupture receipt, finish the lab, and choose **Sculpt the computed slice**. Drag one wall once. Show the ratios disappear during recomputation, then jump cut to the gated comparison.

**Say:**

> The guide hands me to the instrument. I drag one wall, the solid boundary rebuilds, and both local fields recompute. The control stays untouched, so the change remains falsifiable. This is an editable model, not a preset animation.

### 1:55–2:15 — inspect the proof

**Action:** Open **Verify physics**. Point to FPS, Mach number, profile error, density, finite-field card, and `160 × 70 × 2`.

**Say:**

> The proof is inspectable: two local fields, low-Mach and flux gates, density stability, a fitted Poiseuille-profile check, and every numerical intervention. The repository adds a 17-test suite, a production smoke check, and a reproducible ten-thousand-step benchmark.

### 2:15–2:44 — show what GPT-5.6 and Codex changed

**Action:** Use three two-to-three-second, tightly cropped shots from the primary Codex build task or its exact diffs: the tight-lumen/irregular-shape gate tests, the prior-art correction, and the explicit 2D-source/3D-receipt decision. Do not expose private sidebar or account information. Return to the completed lab for the final line.

**Say:**

> There is no runtime AI call. I used GPT-5.6 through Codex to test, not just generate, the build. A tight-lumen test rejected point-zero-two-four; irregular-shape tests made the live gate, not the slider cap, authoritative. Prior-art review killed our “first browser simulator” claim. Model review exposed the computed 2D source inside 3D. VesselDelta: predict, inspect, and know when the model cannot answer.

## Natural delivery notes

- Say “two-dimensional” once before using “2D.”
- Rehearse the final Codex sentence at a natural pace; do not rush it to beat the limit.
- Keep the exported runtime around `2:40–2:45`; the spoken script is intentionally below the three-minute limit, but UI actions still need breathing room.
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
3. one direct wall sculpt and the gated comparison;
4. pressure versus shear and the rupture refusal;
5. Verify physics;
6. one sentence on source-linked evidence and Codex.

## On-camera option

Use your face only for:

- Opening: “I’m Fuzlullah, a third-year medical student. I wanted vascular mechanics to be something you could touch.”
- Closing: “VesselDelta. Shape the vessel, and watch the flow answer.”

Everything between should show the instrument at readable size.
