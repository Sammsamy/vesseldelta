import { performance } from "node:perf_hooks";
import { HemoEngine } from "../app/hemo-engine.js";

const STEPS = Number(process.env.BENCHMARK_STEPS ?? 10_000);
const presets = ["healthy", "stenosis"];
const results = {};

for (const preset of presets) {
  const engine = new HemoEngine(160, 70, { preset });
  const started = performance.now();
  for (let step = 0; step < STEPS; step += 1) engine.step();
  const elapsedMs = performance.now() - started;
  const metrics = engine.getMetrics();
  results[preset] = {
    steps: STEPS,
    solverStepsPerSecond: Math.round((STEPS / elapsedMs) * 1000),
    profileShapeL2Percent: Number((engine.analyticProfileError() * 100).toFixed(4)),
    mach: Number(metrics.mach.toFixed(5)),
    densitySpread: Number(metrics.densitySpread.toFixed(5)),
    meanDensityDriftPercent: Number((metrics.massDrift * 100).toFixed(4)),
    signedMassFluxMismatchPercent: Number((metrics.fluxMismatch * 100).toFixed(4)),
    peakSpeed: Number(metrics.peakSpeed.toFixed(6)),
    peakWallShearEstimate: Number(metrics.peakShear.toFixed(8)),
    peakWallShearToPlanarReference: Number(metrics.peakShearRatio.toFixed(4)),
    peakVorticity: Number(metrics.maxVorticity.toFixed(6)),
    minimumDiameterRatio: Number(metrics.minDiameterRatio.toFixed(4)),
    countedSafetyInterventions: metrics.sanitizationCount,
  };
}

results.stenosisVsHealthy = {
  peakSpeedRatio: Number((results.stenosis.peakSpeed / results.healthy.peakSpeed).toFixed(4)),
  peakWallShearEstimateRatio: Number(
    (results.stenosis.peakWallShearEstimate / results.healthy.peakWallShearEstimate).toFixed(4),
  ),
  peakVorticityRatio: Number(
    (results.stenosis.peakVorticity / results.healthy.peakVorticity).toFixed(4),
  ),
};

console.log(JSON.stringify(results, null, 2));
