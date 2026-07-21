/**
 * A deliberately small wall-mechanics teaching model.
 *
 * This module does not estimate clinical rupture risk. It applies the thin-wall
 * cylinder relation to user-selected illustrative inputs and compares the
 * resulting circumferential stress with a user-selected ex-vivo tissue-strength
 * teaching threshold. Geometry, pressure, strength, and wall thickness are not
 * patient-specific and no uncertainty, anisotropy, remodeling, thrombus,
 * residual stress, dynamic loading, or three-dimensional stress concentration
 * is modeled.
 */

export const MMHG_TO_PA = 133.322387415;

export const WALL_FAILURE_DISCLOSURE =
  "Illustrative thin-wall teaching comparison only. Crossing a user-selected ex-vivo strength comparison value is not a clinical rupture prediction, safety classification, diagnosis, or treatment recommendation.";

/**
 * Hard numerical bounds keep an interactive control finite and legible. They
 * are not normal ranges, treatment targets, or clinical decision thresholds.
 */
export const WALL_FAILURE_INPUT_LIMITS = Object.freeze({
  pressureMmHg: Object.freeze({ min: 20, max: 300, unit: "mmHg" }),
  radiusMm: Object.freeze({ min: 1, max: 60, unit: "mm" }),
  wallThicknessMm: Object.freeze({ min: 0.2, max: 6, unit: "mm" }),
  strengthKpa: Object.freeze({ min: 100, max: 3000, unit: "kPa" }),
});

/**
 * Primary-source receipts for the illustrative defaults.
 *
 * Di Martino et al. tested fresh, circumferentially oriented AAA specimens to
 * failure. The reported group means were 540 +/- 60 kPa for tissue obtained
 * during ruptured-AAA repair and 820 +/- 90 kPa for elective repair. The paper
 * also reported mean wall thicknesses of 3.6 +/- 0.3 and 2.5 +/- 0.1 mm and
 * mean aneurysm diameters of 7.8 +/- 0.6 and 7.0 +/- 0.5 cm, respectively.
 * The default 680 kPa threshold is only the arithmetic midpoint of the two
 * reported group means; it is not a measured clinical cutoff.
 *
 * Raghavan et al. measured marked regional thickness variability in four
 * necropsy AAAs: 0.23-4.26 mm, median 1.48 mm. Those bounds motivate a teaching
 * sensitivity preset, not a patient-specific thickness distribution.
 */
export const WALL_FAILURE_EVIDENCE = Object.freeze({
  circumferentialStrength: Object.freeze({
    study:
      "Di Martino ES et al. Biomechanical properties of ruptured versus electively repaired abdominal aortic aneurysm wall tissue. Journal of Vascular Surgery. 2006;43(3):570-576.",
    doi: "10.1016/j.jvs.2005.10.072",
    url: "https://doi.org/10.1016/j.jvs.2005.10.072",
    openAbstractUrl:
      "https://www.sciencedirect.com/science/article/pii/S074152140501921X",
    specimenContext:
      "Fresh circumferential AAA wall strips tested ex vivo in uniaxial tension; 26 specimens from 16 elective-repair patients and 13 specimens from 9 ruptured-AAA patients.",
    electiveRepairMeanKpa: 820,
    electiveRepairSemKpa: 90,
    rupturedRepairMeanKpa: 540,
    rupturedRepairSemKpa: 60,
    defaultTeachingRangeKpa: Object.freeze({ min: 540, max: 820 }),
    defaultThresholdKpa: 680,
    thresholdDerivation:
      "Arithmetic midpoint of the two reported group means; not a measured failure cutoff or prediction interval.",
  }),
  wallThickness: Object.freeze({
    study:
      "Raghavan ML et al. Regional distribution of wall thickness and failure properties of human abdominal aortic aneurysm. Journal of Biomechanics. 2006;39(16):3010-3016.",
    doi: "10.1016/j.jbiomech.2005.10.021",
    url: "https://pubmed.ncbi.nlm.nih.gov/16337949/",
    specimenContext:
      "About 100 thickness sites per aneurysm across three unruptured and one ruptured AAA obtained at necropsy.",
    observedMinimumMm: 0.23,
    observedMedianMm: 1.48,
    observedMaximumMm: 4.26,
  }),
});

const DEFAULT_STRENGTH_KPA =
  WALL_FAILURE_EVIDENCE.circumferentialStrength.defaultThresholdKpa;

export const WALL_FAILURE_PRESETS = Object.freeze({
  literatureReference: Object.freeze({
    id: "literature-reference",
    label: "Large-AAA teaching reference",
    pressureMmHg: 120,
    radiusMm: 35,
    wallThicknessMm: 2.5,
    strengthKpa: DEFAULT_STRENGTH_KPA,
    strengthRangeKpa: Object.freeze({ min: 540, max: 820 }),
    note:
      "Uses half the elective-repair group's reported 7.0 cm maximum AAA diameter as a 35 mm cylinder radius—not a measured lumen radius—plus its 2.5 mm mean thickness, a selected 120 mmHg pressure, and a derived 680 kPa teaching midpoint.",
  }),
  higherPressureSensitivity: Object.freeze({
    id: "higher-pressure-sensitivity",
    label: "Higher-pressure sensitivity",
    pressureMmHg: 180,
    radiusMm: 35,
    wallThicknessMm: 2.5,
    strengthKpa: DEFAULT_STRENGTH_KPA,
    strengthRangeKpa: Object.freeze({ min: 540, max: 820 }),
    note:
      "Changes only the selected transmural pressure to show the equation's linear sensitivity; 180 mmHg is not a patient forecast or a treatment threshold.",
  }),
  thinnerWallSensitivity: Object.freeze({
    id: "thinner-wall-sensitivity",
    label: "Thinner-wall sensitivity",
    pressureMmHg: 120,
    radiusMm: 35,
    wallThicknessMm: 1.48,
    strengthKpa: DEFAULT_STRENGTH_KPA,
    strengthRangeKpa: Object.freeze({ min: 540, max: 820 }),
    note:
      "Uses the 1.48 mm median thickness reported across four necropsy AAAs only to expose inverse thickness sensitivity.",
  }),
  illustrativeThresholdCrossing: Object.freeze({
    id: "illustrative-threshold-crossing",
    label: "Constructed arithmetic crossing",
    pressureMmHg: 220,
    radiusMm: 35,
    wallThicknessMm: 1.5,
    strengthKpa: DEFAULT_STRENGTH_KPA,
    strengthRangeKpa: Object.freeze({ min: 540, max: 820 }),
    note:
      "A synthetic sensitivity combination chosen to cross the derived 680 kPa teaching threshold. It is not a reported patient, a failure experiment, or a rupture-risk cutoff.",
  }),
});

function finiteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return value;
}

function clampField(value, field) {
  const checked = finiteNumber(value, field);
  const limit = WALL_FAILURE_INPUT_LIMITS[field];
  return Math.min(limit.max, Math.max(limit.min, checked));
}

function normalizedInputs({ pressureMmHg, radiusMm, wallThicknessMm }) {
  return {
    pressureMmHg: clampField(pressureMmHg, "pressureMmHg"),
    radiusMm: clampField(radiusMm, "radiusMm"),
    wallThicknessMm: clampField(wallThicknessMm, "wallThicknessMm"),
  };
}

function clampReceipts(requested, normalized) {
  return Object.keys(normalized)
    .filter((field) => requested[field] !== normalized[field])
    .map((field) => ({
      field,
      requested: requested[field],
      used: normalized[field],
      unit: WALL_FAILURE_INPUT_LIMITS[field].unit,
      reason: "outside nonclinical teaching-control bounds",
    }));
}

/**
 * Compute thin-wall circumferential stress in kPa.
 *
 * sigma = P * r / t
 * P: selected transmural pressure, converted from mmHg to Pa
 * r, t: selected inner radius and wall thickness, converted from mm to m
 * Output: Pa converted to kPa
 */
export function wallStressKpa({ pressureMmHg, radiusMm, wallThicknessMm }) {
  const normalized = normalizedInputs({ pressureMmHg, radiusMm, wallThicknessMm });
  const pressurePa = normalized.pressureMmHg * MMHG_TO_PA;
  const radiusM = normalized.radiusMm / 1000;
  const wallThicknessM = normalized.wallThicknessMm / 1000;
  return (pressurePa * radiusM) / wallThicknessM / 1000;
}

/**
 * Compare thin-wall stress with one explicitly selected illustrative strength.
 * `crossedThreshold` describes arithmetic only; it must never be rendered as a
 * rupture outcome or clinical safety state.
 */
export function wallFailureState({
  pressureMmHg,
  radiusMm,
  wallThicknessMm,
  strengthKpa,
}) {
  const requested = { pressureMmHg, radiusMm, wallThicknessMm, strengthKpa };
  const inputs = normalizedInputs(requested);
  const normalizedStrengthKpa = clampField(strengthKpa, "strengthKpa");
  const stressKpa = wallStressKpa(inputs);
  const utilization = stressKpa / normalizedStrengthKpa;
  const reserveKpa = normalizedStrengthKpa - stressKpa;
  const reserveRatio = normalizedStrengthKpa / stressKpa;
  const crossedThreshold = stressKpa >= normalizedStrengthKpa;
  const normalizedWithStrength = { ...inputs, strengthKpa: normalizedStrengthKpa };

  return {
    stressKpa,
    strengthKpa: normalizedStrengthKpa,
    utilization,
    reserveKpa,
    reserveRatio,
    crossedThreshold,
    state: crossedThreshold
      ? "at-or-above-selected-threshold"
      : "below-selected-threshold",
    label: crossedThreshold
      ? "Modeled thin-wall stress is at or above the selected illustrative ex-vivo comparison value. This is not a rupture prediction."
      : "Modeled thin-wall stress is below the selected illustrative ex-vivo comparison value. This is not a safety finding.",
    inputs: normalizedWithStrength,
    clamps: clampReceipts(requested, normalizedWithStrength),
    assumptions: Object.freeze({
      pressureMeaning: "selected transmural pressure",
      geometry: "uniform thin-walled circular cylinder",
      stressComponent: "circumferential membrane stress",
      omitted:
        "patient anatomy, local stress concentration, anisotropy, thrombus, residual stress, wall remodeling, pulsatility, material variability, and failure propagation",
      thinWallThicknessToRadius: inputs.wallThicknessMm / inputs.radiusMm,
      thinWallApproximationFlag:
        inputs.wallThicknessMm / inputs.radiusMm <= 0.1
          ? "ratio-at-or-below-0.10"
          : "ratio-above-0.10-assumption-strained",
    }),
    disclosure: WALL_FAILURE_DISCLOSURE,
  };
}

/**
 * Sensitivity envelope for a configurable illustrative strength range.
 * The two reserve ratios are bounds induced by the selected strength range,
 * not a probability interval.
 */
export function wallFailureRangeState({
  pressureMmHg,
  radiusMm,
  wallThicknessMm,
  strengthRangeKpa,
}) {
  if (!strengthRangeKpa || typeof strengthRangeKpa !== "object") {
    throw new TypeError("strengthRangeKpa must contain finite min and max values");
  }
  const requestedMin = finiteNumber(strengthRangeKpa.min, "strengthRangeKpa.min");
  const requestedMax = finiteNumber(strengthRangeKpa.max, "strengthRangeKpa.max");
  if (requestedMin > requestedMax) {
    throw new RangeError("strengthRangeKpa.min must not exceed strengthRangeKpa.max");
  }
  const minKpa = clampField(requestedMin, "strengthKpa");
  const maxKpa = clampField(requestedMax, "strengthKpa");
  const stressKpa = wallStressKpa({ pressureMmHg, radiusMm, wallThicknessMm });

  return {
    stressKpa,
    strengthRangeKpa: { min: minKpa, max: maxKpa },
    reserveRatioRange: {
      min: minKpa / stressKpa,
      max: maxKpa / stressKpa,
    },
    utilizationRange: {
      min: stressKpa / maxKpa,
      max: stressKpa / minKpa,
    },
    relation:
      stressKpa < minKpa
        ? "below-selected-range"
        : stressKpa > maxKpa
          ? "above-selected-range"
          : "within-selected-range",
    disclosure: WALL_FAILURE_DISCLOSURE,
  };
}
