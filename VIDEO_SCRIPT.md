# VesselDelta video script

Target: **2 minutes 15 seconds**. Real voiceover. Face camera is optional for the first and last five seconds; the working instrument should dominate the video.

## Recording setup

- Browser at 1280×720 or 1440×900.
- Start on **Healthy control**, **Velocity**, default flow drive, default pressure factor.
- Keep cursor near the upper vessel wall.
- Record system audio only if you add subtle sound later; voice clarity matters more.
- Do one uninterrupted screen capture if possible, then trim pauses.
- Never say “predicts,” “diagnoses,” “shows where plaque forms,” “rupture risk,” “patient-specific,” “first browser CFD,” or “industry-shattering.”

## Script and actions

### 0:00–0:08 — cold open

**Action:** Start on the working vessel. Immediately click **Stenosis**.

**Say:**

> Pinch an artery, and the flow answers. This is VesselDelta, a live vascular-mechanics instrument running entirely in my browser.

### 0:08–0:27 — prove the core

**Action:** Let the jet develop. Point to the ghost outline and three comparison tiles.

**Say:**

> The color and tracers come from a real D2Q9 lattice-Boltzmann solve. Beside it, a second untouched vessel runs under the same conditions, so these are measured differences—not hard-coded scores. The narrowing creates a faster throat jet and a larger wall-shear estimate.

### 0:27–0:43 — change the lens

**Action:** Click **Vorticity**, then **Wall shear**.

**Say:**

> Velocity, local turning, and wall shear are different fields. A bright throat and the downstream flow do not tell the same mechanical story, and color never means “disease here.”

### 0:43–0:58 — make it tactile

**Action:** Click **Healthy control**, then drag one wall inward and release.

**Say:**

> I can also sculpt the wall directly. The boundary, flow field, and untouched counterfactual update while I drag.

### 0:58–1:20 — hypertension insight without overclaiming

**Action:** Click **Aneurysm**, choose **Wall load**, raise the relative pressure factor to `1.50×`.

**Say:**

> Here is the lesson I wanted as a medical student. Flow-related shear and pressure-driven wall load are not the same force. This separate thin-wall relation shows how pressure and radius multiply circumferential load. It does not change the CFD, and it is not a rupture predictor.

### 1:20–1:41 — visible verification

**Action:** Open **Verify physics**. Slowly point at FPS, Mach, profile error, density, and no-intervention cards.

**Say:**

> The instrument is falsifiable. Judges can inspect the equation, live frame rate, low-Mach gate, density stability, fitted Poiseuille profile shape, and every numerical safety intervention. The full 10,000-step benchmark and tests are in the repository.

### 1:41–1:56 — honest scope

**Action:** Open **Read the model card**.

**Say:**

> This is a two-dimensional Newtonian, rigid-wall learning model—not clinical CFD, diagnosis, plaque location, or patient risk. No physician review or clinical validation was performed.

### 1:56–2:10 — Codex story

**Action:** Return to the hero or briefly show the README collaboration section.

**Say:**

> Codex with GPT-5.6 helped build and audit the solver, interaction, medical language, tests, and performance. That audit made us reject a false novelty claim, remove an unreliable pulse feature, and optimize the first build from five to sixty frames per second.

### 2:10–2:15 — close

**Action:** End on the stenosis field and title.

**Say:**

> VesselDelta. Shape the vessel. Watch the flow answer.

## Backup 90-second cut

If time is short, keep only:

1. stenosis cold open;
2. velocity → shear toggle;
3. aneurysm + separate pressure factor;
4. verification drawer;
5. Codex sentence and end card.

## On-camera option

Use your face for only these lines:

- Opening: “I am a third-year medical student, and I wanted to make vascular mechanics something you can touch.”
- Closing: “VesselDelta. Shape the vessel. Watch the flow answer.”

Everything between should show the instrument at readable size.
