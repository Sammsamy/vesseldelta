import assert from "node:assert/strict";
import test from "node:test";
import { comparisonMetricsReady, HemoEngine, wallLoadRatio } from "../app/hemo-engine.js";

function run(preset, steps = 520) {
  const engine = new HemoEngine(160, 70, { preset });
  for (let step = 0; step < steps; step += 1) engine.step();
  return engine;
}

test("straight channel recovers a stable Poiseuille-like profile", () => {
  const engine = run("healthy");
  const metrics = engine.getMetrics();
  assert.ok(engine.analyticProfileError() < 0.03, `profile error ${engine.analyticProfileError()}`);
  assert.ok(metrics.mach < 0.1, `Mach ${metrics.mach}`);
  assert.ok(metrics.densitySpread < 0.02, `density spread ${metrics.densitySpread}`);
  assert.ok(metrics.massDrift < 0.01, `density drift ${metrics.massDrift}`);
  assert.equal(metrics.sanitizationCount, 0);
  assert.ok(engine.f.every(Number.isFinite), "distribution contains a non-finite value");
});

test("a stenosis creates a faster jet and stronger axial near-wall gradient proxy", () => {
  const healthy = run("healthy");
  const stenosis = run("stenosis");
  const baseline = healthy.getMetrics();
  const narrowed = stenosis.getMetrics();
  assert.ok(narrowed.minDiameterRatio > 0.55 && narrowed.minDiameterRatio < 0.65);
  assert.ok(narrowed.peakSpeed > baseline.peakSpeed * 1.35, `${narrowed.peakSpeed} vs ${baseline.peakSpeed}`);
  assert.ok(narrowed.peakShear > baseline.peakShear * 2.5, `${narrowed.peakShear} vs ${baseline.peakShear}`);
  assert.ok(narrowed.maxVorticity > baseline.maxVorticity * 2.5);
  assert.ok(narrowed.mach < 0.1);
  assert.equal(narrowed.sanitizationCount, 0);
});

test("idealized lumen restoration reopens the stenosis without exceeding the control diameter", () => {
  const reference = run("healthy");
  const narrowed = run("stenosis");
  const engine = new HemoEngine(160, 70, { preset: "stenosis" });
  engine.setStenosisRestoration(1);
  const after = engine.getMetrics().minDiameterRatio;
  assert.ok(after > 0.99, `expected restoration to approach the reference lumen, received ${after}`);
  assert.ok(after <= 1.001, `restored diameter exceeded control: ${after}`);
  for (let step = 0; step < 520; step += 1) engine.step();
  const restored = engine.getMetrics();
  const referenceMetrics = reference.getMetrics();
  const narrowedMetrics = narrowed.getMetrics();
  assert.ok(engine.f.every(Number.isFinite), "all distributions remained finite after geometry restoration");
  assert.equal(restored.sanitizationCount, 0);
  assert.ok(restored.mach < 0.1, `restored Mach ${restored.mach}`);
  assert.ok(restored.densitySpread < 0.02, `restored density spread ${restored.densitySpread}`);
  assert.ok(restored.peakSpeed < narrowedMetrics.peakSpeed * 0.8, "restoration should reduce the modeled peak-speed jet");
  assert.ok(restored.peakShear < narrowedMetrics.peakShear * 0.6, "restoration should reduce the near-wall gradient proxy");
  assert.ok(restored.peakSpeed < referenceMetrics.peakSpeed * 1.08, "restored speed should remain near the reference");
  assert.ok(restored.peakShear < referenceMetrics.peakShear * 1.15, "restored shear should remain near the reference");
});

test("aneurysm preset creates a saccular expansion without closing the lumen", () => {
  const engine = new HemoEngine(160, 70, { preset: "aneurysm" });
  let maxDiameterRatio = 1;
  for (let x = 0; x < engine.nx; x += 1) {
    maxDiameterRatio = Math.max(
      maxDiameterRatio,
      (engine.bottom[x] - engine.top[x]) / (engine.baseRadius * 2),
    );
  }
  assert.ok(maxDiameterRatio > 1.3 && maxDiameterRatio < 1.5, `${maxDiameterRatio}`);
  assert.ok(engine.getMetrics().minDiameterRatio >= 0.99);
});

test("pressure-load lesson scales independently with pressure and radius", () => {
  assert.equal(wallLoadRatio(120, 1), 1);
  assert.equal(wallLoadRatio(180, 1), 1.5);
  assert.equal(wallLoadRatio(120, 1.4), 1.4);
});

test("comparison gate withholds unsettled or high-flux-mismatch fields", () => {
  const ready = { mach: 0.05, densitySpread: 0.005, fluxMismatch: 0.01, sanitizationCount: 0 };
  assert.equal(comparisonMetricsReady(ready, ready), true);
  assert.equal(comparisonMetricsReady(ready, ready, true), false);
  assert.equal(comparisonMetricsReady({ ...ready, fluxMismatch: 0.021 }, ready), false);
  assert.equal(comparisonMetricsReady(ready, { ...ready, densitySpread: 0.021 }), false);

  const warmedReference = run("healthy", 5_000).getMetrics();
  const warmedNarrowing = run("stenosis", 5_000).getMetrics();
  assert.equal(comparisonMetricsReady(warmedNarrowing, warmedReference), true);
});

test("constrained sculpting preserves a connected minimum gap and finite field", () => {
  const engine = new HemoEngine(160, 70);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    engine.sculpt(82, engine.center + 1, "top");
  }
  let minimumGap = Infinity;
  for (let x = 0; x < engine.nx; x += 1) {
    minimumGap = Math.min(minimumGap, engine.bottom[x] - engine.top[x]);
  }
  assert.ok(minimumGap >= engine.baseRadius * 1.08 - 0.01, `${minimumGap}`);
  for (let step = 0; step < 180; step += 1) engine.step();
  assert.ok(engine.f.every(Number.isFinite));
  assert.ok(engine.getMetrics().mach < 0.1);
  assert.equal(engine.getMetrics().sanitizationCount, 0);
});

test("the tightest reachable lumen remains inside the numerical gate at maximum exposed flow drive", () => {
  const engine = new HemoEngine(160, 70, { meanVelocity: 0.020 });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    engine.sculpt(82, engine.center + 1, "top");
  }
  for (let step = 0; step < 10_000; step += 1) engine.step();
  const metrics = engine.getMetrics();
  assert.ok(metrics.minDiameterRatio >= 0.539, `minimum diameter ratio ${metrics.minDiameterRatio}`);
  assert.ok(metrics.mach < 0.1, `Mach ${metrics.mach}`);
  assert.ok(metrics.densitySpread < 0.02, `density spread ${metrics.densitySpread}`);
  assert.ok(metrics.fluxMismatch < 0.02, `flux mismatch ${metrics.fluxMismatch}`);
  assert.equal(metrics.sanitizationCount, 0);
  assert.ok(engine.f.every(Number.isFinite), "distribution contains a non-finite value");
});
