import assert from "node:assert/strict";
import test from "node:test";
import { HemoEngine, wallLoadRatio } from "../app/hemo-engine.js";

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

test("a stenosis creates a faster jet and stronger wall-shear estimate", () => {
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

test("pressure-load lesson scales independently with pressure, radius, and thickness", () => {
  assert.equal(wallLoadRatio(120, 1, 1), 1);
  assert.equal(wallLoadRatio(180, 1, 1), 1.5);
  assert.equal(wallLoadRatio(120, 1.4, 1), 1.4);
  assert.equal(wallLoadRatio(120, 1, 0.5), 2);
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
