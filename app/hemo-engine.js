const CX = new Int8Array([0, 1, 0, -1, 0, 1, -1, -1, 1]);
const CY = new Int8Array([0, 0, 1, 0, -1, 1, 1, -1, -1]);
const OPP = new Uint8Array([0, 3, 4, 1, 2, 7, 8, 5, 6]);
const W = new Float32Array([
  4 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 36,
  1 / 36,
  1 / 36,
  1 / 36,
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function equilibrium(i, rho, ux, uy) {
  const cu = CX[i] * ux + CY[i] * uy;
  return W[i] * rho * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * (ux * ux + uy * uy));
}

/**
 * A deliberately small, transparent D2Q9 BGK lattice-Boltzmann solver.
 * It models a 2D Newtonian fluid inside a rigid, editable channel. Values are
 * lattice units; medical-unit conversion is intentionally not implied.
 */
export class HemoEngine {
  constructor(nx = 184, ny = 80, options = {}) {
    this.nx = nx;
    this.ny = ny;
    this.n = nx * ny;
    this.tau = options.tau ?? 0.62;
    this.omega = 1 / this.tau;
    this.nu = (this.tau - 0.5) / 3;
    this.meanVelocity = options.meanVelocity ?? 0.018;
    this.stepCount = 0;
    this.scenario = "healthy";
    this.baseRadius = Math.round(ny * 0.29);
    this.center = (ny - 1) / 2;
    this.buffer = 24;

    this.f = new Float32Array(this.n * 9);
    this.post = new Float32Array(this.n * 9);
    this.rho = new Float32Array(this.n);
    this.ux = new Float32Array(this.n);
    this.uy = new Float32Array(this.n);
    this.vorticity = new Float32Array(this.n);
    this.solid = new Uint8Array(this.n);
    this.previousSolid = new Uint8Array(this.n);
    this.top = new Float32Array(nx);
    this.bottom = new Float32Array(nx);
    this.shearTop = new Float32Array(nx);
    this.shearBottom = new Float32Array(nx);
    this.rawShearTop = new Float32Array(nx);
    this.rawShearBottom = new Float32Array(nx);
    this.initialMass = 0;
    this.sanitizationCount = 0;
    this.lastChangedFraction = 0;
    this.setPreset(options.preset ?? "healthy");
  }

  index(x, y) {
    return x + y * this.nx;
  }

  setFlowDrive(value) {
    this.meanVelocity = clamp(value, 0.011, 0.026);
  }

  setPreset(preset) {
    this.scenario = preset;
    const middle = this.nx * 0.52;
    for (let x = 0; x < this.nx; x += 1) {
      const dx = x - middle;
      let radius = this.baseRadius;
      let center = this.center;
      if (preset === "stenosis") {
        radius *= 1 - 0.40 * Math.exp(-(dx * dx) / (2 * 16 * 16));
      } else if (preset === "aneurysm") {
        const pocket = this.baseRadius * 0.78 * Math.exp(-(dx * dx) / (2 * 15 * 15));
        radius += pocket * 0.54;
        center += pocket * 0.46;
      }
      this.top[x] = center - radius;
      this.bottom[x] = center + radius;
    }
    this.rebuildMask(true);
    this.initialize();
  }

  /**
   * Opens the idealized stenosis toward the straight control geometry. This is
   * a geometric counterfactual for teaching, not a device or outcome model.
   */
  setStenosisRestoration(fraction = 0) {
    const restoration = clamp(fraction, 0, 1);
    this.scenario = "stenosis-restoration";
    const middle = this.nx * 0.52;
    for (let x = 0; x < this.nx; x += 1) {
      const dx = x - middle;
      const remainingNarrowing = 0.40 * (1 - restoration);
      const radius = this.baseRadius * (1 - remainingNarrowing * Math.exp(-(dx * dx) / (2 * 16 * 16)));
      this.top[x] = this.center - radius;
      this.bottom[x] = this.center + radius;
    }
    this.rebuildMask(false);
    // The instrument compares steady counterfactuals and has no physical time
    // calibration. Once the idealized restoration is complete, reseed the
    // distribution on the final geometry instead of presenting a transient as
    // a device-outcome timescale.
    if (restoration >= 0.999) this.initialize();
  }

  initialize() {
    this.f.fill(0);
    this.post.fill(0);
    this.stepCount = 0;
    this.sanitizationCount = 0;
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = this.index(x, y);
        if (this.solid[cell]) continue;
        const halfHeight = Math.max(2, (this.bottom[x] - this.top[x]) / 2);
        const center = (this.bottom[x] + this.top[x]) / 2;
        const eta = clamp((y - center) / halfHeight, -1, 1);
        // Seed each axial section with approximately matched volumetric flux.
        // This is only a low-Mach warm start; the same LBM boundaries and
        // collision/streaming equations still determine the evolved field.
        const localMeanVelocity = this.meanVelocity * (this.baseRadius / halfHeight);
        const localUx = 1.5 * localMeanVelocity * (1 - eta * eta);
        for (let i = 0; i < 9; i += 1) {
          this.f[cell * 9 + i] = equilibrium(i, 1, localUx, 0);
        }
      }
    }
    this.updateMacros();
    this.initialMass = this.totalMass();
  }

  rebuildMask(force = false) {
    this.previousSolid.set(this.solid);
    let changed = 0;
    let fluid = 0;
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = this.index(x, y);
        const isSolid = y <= this.top[x] || y >= this.bottom[x];
        this.solid[cell] = isSolid ? 1 : 0;
        if (!isSolid) fluid += 1;
        if (!force && this.solid[cell] !== this.previousSolid[cell]) changed += 1;
      }
    }
    this.lastChangedFraction = fluid ? changed / fluid : 0;
    if (force) return;

    for (let y = 1; y < this.ny - 1; y += 1) {
      for (let x = this.buffer; x < this.nx - this.buffer; x += 1) {
        const cell = this.index(x, y);
        if (this.previousSolid[cell] && !this.solid[cell]) {
          let rho = 0;
          let ux = 0;
          let uy = 0;
          let count = 0;
          const neighbors = [this.index(x - 1, y), this.index(x + 1, y), this.index(x, y - 1), this.index(x, y + 1)];
          for (const neighbor of neighbors) {
            if (!this.solid[neighbor]) {
              rho += this.rho[neighbor] || 1;
              ux += this.ux[neighbor] || 0;
              uy += this.uy[neighbor] || 0;
              count += 1;
            }
          }
          rho = count ? rho / count : 1;
          ux = count ? ux / count : this.meanVelocity;
          uy = count ? uy / count : 0;
          for (let i = 0; i < 9; i += 1) this.f[cell * 9 + i] = equilibrium(i, rho, ux, uy);
        }
      }
    }
  }

  sculpt(x, y, side) {
    const gx = clamp(x, this.buffer + 2, this.nx - this.buffer - 3);
    const sigma = 13;
    const centerLine = (this.top[Math.round(gx)] + this.bottom[Math.round(gx)]) / 2;
    const selected = side ?? (y < centerLine ? "top" : "bottom");
    const source = selected === "top" ? this.top : this.bottom;
    const delta = clamp(y - source[Math.round(gx)], -7, 7);
    for (let ix = this.buffer; ix < this.nx - this.buffer; ix += 1) {
      const distance = ix - gx;
      const leftTaper = clamp((ix - this.buffer) / (sigma * 1.5), 0, 1);
      const rightTaper = clamp((this.nx - this.buffer - 1 - ix) / (sigma * 1.5), 0, 1);
      const edgeTaper = Math.min(leftTaper, rightTaper);
      const smoothTaper = edgeTaper * edgeTaper * (3 - 2 * edgeTaper);
      const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma)) * smoothTaper;
      if (selected === "top") {
        const maximum = this.bottom[ix] - this.baseRadius * 1.08;
        this.top[ix] = clamp(this.top[ix] + delta * weight * 0.68, 5, maximum);
      } else {
        const minimum = this.top[ix] + this.baseRadius * 1.08;
        this.bottom[ix] = clamp(this.bottom[ix] + delta * weight * 0.68, minimum, this.ny - 6);
      }
    }
    this.smoothWalls();
    this.rebuildMask(false);
    return selected;
  }

  smoothWalls() {
    for (let pass = 0; pass < 2; pass += 1) {
      for (const wall of [this.top, this.bottom]) {
        let previous = wall[this.buffer];
        for (let x = this.buffer + 1; x < this.nx - this.buffer - 1; x += 1) {
          const smoothed = (previous + wall[x] * 2 + wall[x + 1]) / 4;
          wall[x] = clamp(smoothed, previous - 0.9, previous + 0.9);
          previous = wall[x];
        }
        let next = wall[this.nx - this.buffer - 1];
        for (let x = this.nx - this.buffer - 2; x > this.buffer; x -= 1) {
          wall[x] = clamp(wall[x], next - 0.9, next + 0.9);
          next = wall[x];
        }
      }
    }
  }

  inletVelocity(y) {
    const halfHeight = (this.bottom[0] - this.top[0]) / 2;
    const center = (this.bottom[0] + this.top[0]) / 2;
    const eta = clamp((y - center) / halfHeight, -1, 1);
    return 1.5 * this.meanVelocity * (1 - eta * eta);
  }

  step(iterations = 1) {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      this.collide();
      this.stream();
      this.applyBoundaries();
      this.stepCount += 1;
    }
    this.updateMacros();
  }

  collide() {
    for (let cell = 0; cell < this.n; cell += 1) {
      const offset = cell * 9;
      if (this.solid[cell]) {
        for (let i = 0; i < 9; i += 1) this.post[offset + i] = 0;
        continue;
      }
      let rho = 0;
      let ux = 0;
      let uy = 0;
      for (let i = 0; i < 9; i += 1) {
        const value = this.f[offset + i];
        rho += value;
        ux += value * CX[i];
        uy += value * CY[i];
      }
      if (!Number.isFinite(rho) || rho < 0.2 || rho > 3) {
        this.sanitizationCount += 1;
        rho = 1;
        ux = 0;
        uy = 0;
      } else {
        ux /= rho;
        uy /= rho;
      }
      const speed = Math.hypot(ux, uy);
      if (speed > 0.085) {
        this.sanitizationCount += 1;
        ux *= 0.085 / speed;
        uy *= 0.085 / speed;
      }
      for (let i = 0; i < 9; i += 1) {
        const current = this.f[offset + i];
        const eq = equilibrium(i, rho, ux, uy);
        this.post[offset + i] = current - this.omega * (current - eq);
      }
    }
  }

  stream() {
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = this.index(x, y);
        if (this.solid[cell]) continue;
        const offset = cell * 9;
        for (let i = 0; i < 9; i += 1) {
          const sourceX = x - CX[i];
          const sourceY = y - CY[i];
          if (sourceX < 0 || sourceX >= this.nx) {
            this.f[offset + i] = 0;
            continue;
          }
          if (sourceY < 0 || sourceY >= this.ny) {
            this.f[offset + i] = this.post[offset + OPP[i]];
            continue;
          }
          const source = this.index(sourceX, sourceY);
          this.f[offset + i] = this.solid[source]
            ? this.post[offset + OPP[i]]
            : this.post[source * 9 + i];
        }
      }
    }
  }

  applyBoundaries() {
    const leftX = 0;
    const rightX = this.nx - 1;
    for (let y = 1; y < this.ny - 1; y += 1) {
      const left = this.index(leftX, y);
      if (!this.solid[left]) {
        const o = left * 9;
        const ux = this.inletVelocity(y);
        const rho = (this.f[o] + this.f[o + 2] + this.f[o + 4] + 2 * (this.f[o + 3] + this.f[o + 6] + this.f[o + 7])) / (1 - ux);
        this.f[o + 1] = this.f[o + 3] + (2 * rho * ux) / 3;
        this.f[o + 5] = this.f[o + 7] + (this.f[o + 4] - this.f[o + 2]) / 2 + (rho * ux) / 6;
        this.f[o + 8] = this.f[o + 6] + (this.f[o + 2] - this.f[o + 4]) / 2 + (rho * ux) / 6;
      }

      const right = this.index(rightX, y);
      if (!this.solid[right]) {
        const o = right * 9;
        const rho = 1;
        const ux = (this.f[o] + this.f[o + 2] + this.f[o + 4] + 2 * (this.f[o + 1] + this.f[o + 5] + this.f[o + 8])) / rho - 1;
        this.f[o + 3] = this.f[o + 1] - (2 * rho * ux) / 3;
        this.f[o + 6] = this.f[o + 8] + (this.f[o + 4] - this.f[o + 2]) / 2 - (rho * ux) / 6;
        this.f[o + 7] = this.f[o + 5] + (this.f[o + 2] - this.f[o + 4]) / 2 - (rho * ux) / 6;
      }
    }
  }

  updateMacros() {
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = this.index(x, y);
        if (this.solid[cell]) {
          this.rho[cell] = 0;
          this.ux[cell] = 0;
          this.uy[cell] = 0;
          this.vorticity[cell] = 0;
          continue;
        }
        const offset = cell * 9;
        let rho = 0;
        let ux = 0;
        let uy = 0;
        for (let i = 0; i < 9; i += 1) {
          const value = this.f[offset + i];
          rho += value;
          ux += value * CX[i];
          uy += value * CY[i];
        }
        this.rho[cell] = rho;
        this.ux[cell] = rho > 0 ? ux / rho : 0;
        this.uy[cell] = rho > 0 ? uy / rho : 0;
      }
    }

    for (let y = 1; y < this.ny - 1; y += 1) {
      for (let x = 1; x < this.nx - 1; x += 1) {
        const cell = this.index(x, y);
        if (this.solid[cell]) continue;
        const dvdx = (this.uy[this.index(x + 1, y)] - this.uy[this.index(x - 1, y)]) / 2;
        const dudy = (this.ux[this.index(x, y + 1)] - this.ux[this.index(x, y - 1)]) / 2;
        this.vorticity[cell] = dvdx - dudy;
      }
    }
    this.updateWallShear();
  }

  updateWallShear() {
    const rawTop = this.rawShearTop;
    const rawBottom = this.rawShearBottom;
    rawTop.fill(0);
    rawBottom.fill(0);
    for (let x = 1; x < this.nx - 1; x += 1) {
      const topY1 = clamp(Math.ceil(this.top[x]) + 1, 1, this.ny - 2);
      const topY2 = clamp(topY1 + 2, 1, this.ny - 2);
      const bottomY1 = clamp(Math.floor(this.bottom[x]) - 1, 1, this.ny - 2);
      const bottomY2 = clamp(bottomY1 - 2, 1, this.ny - 2);
      const topU1 = this.ux[this.index(x, topY1)];
      const topU2 = this.ux[this.index(x, topY2)];
      const bottomU1 = this.ux[this.index(x, bottomY1)];
      const bottomU2 = this.ux[this.index(x, bottomY2)];
      const derivativeTop = (9 * topU1 - 2.25 * topU2) / 6.75;
      const derivativeBottom = (9 * bottomU1 - 2.25 * bottomU2) / 6.75;
      rawTop[x] = this.nu * derivativeTop;
      rawBottom[x] = -this.nu * derivativeBottom;
    }
    for (let x = 2; x < this.nx - 2; x += 1) {
      let top = 0;
      let bottom = 0;
      for (let k = -2; k <= 2; k += 1) {
        const weight = k === 0 ? 3 : Math.abs(k) === 1 ? 2 : 1;
        top += rawTop[x + k] * weight;
        bottom += rawBottom[x + k] * weight;
      }
      this.shearTop[x] = top / 9;
      this.shearBottom[x] = bottom / 9;
    }
  }

  totalMass() {
    let mass = 0;
    for (let cell = 0; cell < this.n; cell += 1) {
      if (!this.solid[cell]) mass += this.rho[cell] || 0;
    }
    return mass;
  }

  getMetrics() {
    let peakSpeed = 0;
    let maxVorticity = 0;
    let vorticitySum = 0;
    let vorticityCells = 0;
    let reverseCells = 0;
    let downstreamCells = 0;
    let densityMin = Infinity;
    let densityMax = -Infinity;
    let peakShear = 0;
    let minDiameter = Infinity;
    for (let x = 0; x < this.nx; x += 1) {
      minDiameter = Math.min(minDiameter, this.bottom[x] - this.top[x]);
      peakShear = Math.max(peakShear, Math.abs(this.shearTop[x]), Math.abs(this.shearBottom[x]));
    }
    for (let y = 1; y < this.ny - 1; y += 1) {
      for (let x = 1; x < this.nx - 1; x += 1) {
        const cell = this.index(x, y);
        if (this.solid[cell]) continue;
        const speed = Math.hypot(this.ux[cell], this.uy[cell]);
        peakSpeed = Math.max(peakSpeed, speed);
        if (x > this.buffer && x < this.nx - this.buffer) {
          maxVorticity = Math.max(maxVorticity, Math.abs(this.vorticity[cell]));
          vorticitySum += Math.abs(this.vorticity[cell]);
          vorticityCells += 1;
        }
        densityMin = Math.min(densityMin, this.rho[cell]);
        densityMax = Math.max(densityMax, this.rho[cell]);
        if (x > this.nx * 0.52) {
          downstreamCells += 1;
          if (this.ux[cell] < -0.0003) reverseCells += 1;
        }
      }
    }

    let qIn = 0;
    let qOut = 0;
    for (let y = 0; y < this.ny; y += 1) {
      const inlet = this.index(4, y);
      const outlet = this.index(this.nx - 5, y);
      qIn += this.rho[inlet] * this.ux[inlet];
      qOut += this.rho[outlet] * this.ux[outlet];
    }
    const referenceShear = (6 * this.nu * this.meanVelocity) / (this.baseRadius * 2);
    const mass = this.totalMass();
    const fluidCells = this.n - this.solid.reduce((sum, value) => sum + value, 0);
    const meanDensity = fluidCells ? mass / fluidCells : 1;
    return {
      peakSpeed,
      peakShear,
      peakShearRatio: referenceShear > 0 ? peakShear / referenceShear : 0,
      maxVorticity,
      meanVorticity: vorticityCells ? vorticitySum / vorticityCells : 0,
      reverseFraction: downstreamCells ? reverseCells / downstreamCells : 0,
      minDiameterRatio: minDiameter / (this.baseRadius * 2),
      meanDensity,
      densitySpread: Number.isFinite(densityMin) ? densityMax - densityMin : 0,
      massDrift: Math.abs(meanDensity - 1),
      fluxMismatch: qIn > 1e-7 ? Math.abs(qIn - qOut) / qIn : 0,
      mach: peakSpeed * Math.sqrt(3),
      sanitizationCount: this.sanitizationCount,
    };
  }

  analyticProfileError(x = 18) {
    const values = [];
    const expected = [];
    const top = this.top[x];
    const bottom = this.bottom[x];
    const center = (top + bottom) / 2;
    const radius = (bottom - top) / 2;
    let fittedPeak = 0;
    for (let y = Math.ceil(top) + 2; y <= Math.floor(bottom) - 2; y += 1) {
      fittedPeak = Math.max(fittedPeak, this.ux[this.index(x, y)]);
    }
    for (let y = Math.ceil(top) + 2; y <= Math.floor(bottom) - 2; y += 1) {
      const eta = (y - center) / radius;
      values.push(this.ux[this.index(x, y)]);
      expected.push(fittedPeak * (1 - eta * eta));
    }
    let error = 0;
    let norm = 0;
    for (let i = 0; i < values.length; i += 1) {
      error += (values[i] - expected[i]) ** 2;
      norm += expected[i] ** 2;
    }
    return norm > 0 ? Math.sqrt(error / norm) : 0;
  }
}

export function wallLoadRatio(pressure, radiusRatio) {
  return (pressure / 120) * radiusRatio;
}

export function comparisonMetricsReady(active, control, settling = false) {
  if (settling) return false;
  return [active, control].every((metrics) => (
    Number.isFinite(metrics.mach)
    && Number.isFinite(metrics.densitySpread)
    && Number.isFinite(metrics.fluxMismatch)
    && metrics.mach < 0.1
    && metrics.densitySpread < 0.02
    && metrics.fluxMismatch < 0.02
    && metrics.sanitizationCount === 0
  ));
}

export function pressurePreset(value) {
  if (value === "higher") return 160;
  if (value === "lower") return 95;
  return 120;
}
