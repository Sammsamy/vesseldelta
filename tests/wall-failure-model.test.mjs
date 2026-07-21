import assert from "node:assert/strict";
import test from "node:test";
import {
  MMHG_TO_PA,
  WALL_FAILURE_DISCLOSURE,
  WALL_FAILURE_EVIDENCE,
  WALL_FAILURE_INPUT_LIMITS,
  WALL_FAILURE_PRESETS,
  wallFailureRangeState,
  wallFailureState,
  wallStressKpa,
} from "../app/wall-failure-model.js";

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("thin-wall stress performs explicit mmHg, mm, and kPa conversion", () => {
  const stressKpa = wallStressKpa({
    pressureMmHg: 100,
    radiusMm: 10,
    wallThicknessMm: 1,
  });
  close(stressKpa, (100 * MMHG_TO_PA * 0.01) / 0.001 / 1000);
  close(stressKpa, 133.322387415);
});

test("thin-wall stress scales linearly with pressure and radius and inversely with thickness", () => {
  const base = wallStressKpa({ pressureMmHg: 120, radiusMm: 20, wallThicknessMm: 2 });
  close(
    wallStressKpa({ pressureMmHg: 240, radiusMm: 20, wallThicknessMm: 2 }),
    base * 2,
  );
  close(
    wallStressKpa({ pressureMmHg: 120, radiusMm: 40, wallThicknessMm: 2 }),
    base * 2,
  );
  close(
    wallStressKpa({ pressureMmHg: 120, radiusMm: 20, wallThicknessMm: 4 }),
    base / 2,
  );
});

test("wall failure state returns the integration contract and arithmetic reserve", () => {
  const state = wallFailureState(WALL_FAILURE_PRESETS.literatureReference);
  close(state.stressKpa, 223.9816108572);
  assert.equal(state.strengthKpa, 680);
  close(state.utilization, state.stressKpa / state.strengthKpa);
  close(state.reserveKpa, state.strengthKpa - state.stressKpa);
  close(state.reserveRatio, state.strengthKpa / state.stressKpa);
  assert.equal(state.crossedThreshold, false);
  assert.equal(state.state, "below-selected-threshold");
  assert.match(state.label, /not a safety finding/i);
});

test("threshold crossing remains explicitly nonclinical", () => {
  const state = wallFailureState({
    pressureMmHg: 300,
    radiusMm: 60,
    wallThicknessMm: 0.2,
    strengthKpa: 100,
  });
  assert.equal(state.crossedThreshold, true);
  assert.ok(state.reserveKpa < 0);
  assert.ok(state.utilization > 1);
  assert.match(state.label, /not a rupture prediction/i);
  assert.match(state.disclosure, /not a clinical rupture prediction/i);
});

test("finite inputs are clamped to declared nonclinical teaching bounds with receipts", () => {
  const state = wallFailureState({
    pressureMmHg: 999,
    radiusMm: -4,
    wallThicknessMm: 0,
    strengthKpa: 9999,
  });
  assert.deepEqual(state.inputs, {
    pressureMmHg: WALL_FAILURE_INPUT_LIMITS.pressureMmHg.max,
    radiusMm: WALL_FAILURE_INPUT_LIMITS.radiusMm.min,
    wallThicknessMm: WALL_FAILURE_INPUT_LIMITS.wallThicknessMm.min,
    strengthKpa: WALL_FAILURE_INPUT_LIMITS.strengthKpa.max,
  });
  assert.equal(state.clamps.length, 4);
  assert.ok(state.clamps.every((receipt) => receipt.requested !== receipt.used));
});

test("non-finite or non-numeric inputs fail instead of producing false precision", () => {
  assert.throws(
    () => wallStressKpa({ pressureMmHg: Number.NaN, radiusMm: 10, wallThicknessMm: 1 }),
    /pressureMmHg must be a finite number/,
  );
  assert.throws(
    () => wallFailureState({ pressureMmHg: 120, radiusMm: 10, wallThicknessMm: 1 }),
    /strengthKpa must be a finite number/,
  );
  assert.throws(
    () =>
      wallFailureState({
        pressureMmHg: 120,
        radiusMm: Infinity,
        wallThicknessMm: 1,
        strengthKpa: 680,
      }),
    /radiusMm must be a finite number/,
  );
});

test("strength-range state returns bounded reserve ratios without implying probability", () => {
  const preset = WALL_FAILURE_PRESETS.literatureReference;
  const state = wallFailureRangeState({
    pressureMmHg: preset.pressureMmHg,
    radiusMm: preset.radiusMm,
    wallThicknessMm: preset.wallThicknessMm,
    strengthRangeKpa: preset.strengthRangeKpa,
  });
  assert.deepEqual(state.strengthRangeKpa, { min: 540, max: 820 });
  close(state.reserveRatioRange.min, 540 / state.stressKpa);
  close(state.reserveRatioRange.max, 820 / state.stressKpa);
  assert.equal(state.relation, "below-selected-range");
  assert.throws(
    () =>
      wallFailureRangeState({
        pressureMmHg: 120,
        radiusMm: 35,
        wallThicknessMm: 2.5,
        strengthRangeKpa: { min: 900, max: 500 },
      }),
    /min must not exceed/,
  );
});

test("evidence receipts preserve specimen context and derived-threshold caveat", () => {
  const evidence = WALL_FAILURE_EVIDENCE.circumferentialStrength;
  assert.equal(evidence.rupturedRepairMeanKpa, 540);
  assert.equal(evidence.electiveRepairMeanKpa, 820);
  assert.equal(evidence.defaultThresholdKpa, 680);
  assert.match(evidence.specimenContext, /ex vivo/i);
  assert.match(evidence.thresholdDerivation, /not a measured failure cutoff/i);
  assert.match(WALL_FAILURE_DISCLOSURE, /not a clinical rupture prediction/i);
});

test("the animation preset crosses only the selected illustrative threshold", () => {
  const preset = WALL_FAILURE_PRESETS.illustrativeThresholdCrossing;
  const state = wallFailureState(preset);
  assert.equal(state.crossedThreshold, true);
  assert.ok(state.stressKpa >= state.strengthKpa);
  assert.ok(state.utilization > 1 && state.utilization < 1.02);
  assert.ok(state.assumptions.thinWallThicknessToRadius <= 0.1);
  assert.match(preset.note, /synthetic sensitivity combination/i);
  assert.match(preset.note, /not .* rupture-risk cutoff/i);
  assert.match(state.label, /not a rupture prediction/i);
});
