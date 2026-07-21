# VesselDelta submission gallery

The current images were captured before the plain-language redesign and the wall stress and strength lab. Recapture all five images from the final deployed build before upload. Keep the exact filenames and dimensions because the release audit checks them.

Use `thumbnail-1200x800.jpg` for the Devpost `3:2` thumbnail. Use `00-cover-1280x720.jpg` as the 16:9 gallery cover and YouTube thumbnail fallback.

## Required order and captions

### 1. `00-cover-1280x720.jpg`

**Required frame:** The final layered 3D hero with the outer wall, inner lining, cut edges, and four plain scenario buttons visible.

**Caption:** Change the vessel and watch the model respond. Narrowing creates a faster jet, a bulge changes the swirl, and the separate wall lab shows how pressure, radius, and thickness change stress.

### 2. `01-guided-gated-reveal-1280x720.jpg`

**Required frame:** Narrow → fast jet after both live fields pass their numerical checks.

**Caption:** A narrowed vessel creates its fastest modeled jet at the tightest point. The app compares it with a straight vessel at the same flow setting and hides the numbers while either field is still updating.

### 3. `02-pressure-separation-1280x720.jpg`

**Required frame:** Pressure ↑ → wall stress ↑ with outward arrows, selected pressure, relative wall load, and unchanged flow setting visible.

**Caption:** Pressure pushes outward while flow moves along the wall. Raising the teaching pressure changes the wall-load lesson but does not make the live flow model run faster.

### 4. `03-rupture-boundary.jpg`

The filename is retained for the release audit. Replace its old contents with the new wall stress and strength lab.

**Required frame:** Illustrative threshold crossing with the equation, calculated stress, selected strength, and nonclinical warning all visible.

**Caption:** The separate wall lab computes `stress = pressure × radius ÷ wall thickness` with real units. Crossing the selected teaching strength triggers an illustrative tear, not a simulated rupture or a patient prediction.

### 5. `04-live-verification-1280x720.jpg`

**Required frame:** Live verification with Mach number, profile error, density, finite-value status, and twin-field configuration visible.

**Caption:** The live verification panel shows the current flow model checks. Separate automated tests verify the wall-stress unit conversion, scaling, finite bounds, threshold arithmetic, and evidence receipts.

## Upload boundary

Compare every recaptured image with the final public deployment at the same viewport. Do not crop away the model receipt or the threshold warning. Screenshots are gallery material, not validation evidence.

VesselDelta is an educational model, not clinical CFD, medical advice, or a rupture-risk tool.
