"use client";

import { useEffect, useRef, useState } from "react";
import { HemoEngine, wallLoadRatio } from "./hemo-engine.js";

type Layer = "velocity" | "vorticity" | "shear" | "wallLoad";
type Scenario = "healthy" | "stenosis" | "aneurysm";

type EngineMetrics = ReturnType<HemoEngine["getMetrics"]>;

const EMPTY_METRICS: EngineMetrics = {
  peakSpeed: 0,
  peakShear: 0,
  peakShearRatio: 0,
  maxVorticity: 0,
  meanVorticity: 0,
  reverseFraction: 0,
  minDiameterRatio: 1,
  meanDensity: 1,
  densitySpread: 0,
  massDrift: 0,
  fluxMismatch: 0,
  mach: 0,
  sanitizationCount: 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const mix = (a: number, b: number, amount: number) =>
  Math.round(a + (b - a) * amount);

function colorRamp(
  stops: Array<[number, [number, number, number]]>,
  value: number,
  alpha = 255,
) {
  const t = clamp(value, 0, 1);
  let left = stops[0];
  let right = stops[stops.length - 1];
  for (let i = 1; i < stops.length; i += 1) {
    if (t <= stops[i][0]) {
      left = stops[i - 1];
      right = stops[i];
      break;
    }
  }
  const span = Math.max(0.0001, right[0] - left[0]);
  const local = clamp((t - left[0]) / span, 0, 1);
  return [
    mix(left[1][0], right[1][0], local),
    mix(left[1][1], right[1][1], local),
    mix(left[1][2], right[1][2], local),
    alpha,
  ] as const;
}

const VELOCITY_STOPS: Array<[number, [number, number, number]]> = [
  [0, [18, 8, 37]],
  [0.22, [48, 18, 76]],
  [0.48, [122, 24, 79]],
  [0.72, [237, 70, 92]],
  [0.9, [255, 170, 105]],
  [1, [255, 244, 209]],
];

const VORTICITY_STOPS: Array<[number, [number, number, number]]> = [
  [0, [19, 220, 211]],
  [0.42, [22, 59, 83]],
  [0.5, [14, 17, 31]],
  [0.58, [79, 23, 76]],
  [1, [255, 76, 143]],
];

const SHEAR_STOPS: Array<[number, [number, number, number]]> = [
  [0, [57, 224, 199]],
  [0.38, [142, 212, 172]],
  [0.62, [255, 192, 92]],
  [0.82, [255, 98, 132]],
  [1, [255, 228, 247]],
];

function makeLut(stops: Array<[number, [number, number, number]]>) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i += 1) {
    const color = colorRamp(stops, i / 255);
    lut[i * 3] = color[0];
    lut[i * 3 + 1] = color[1];
    lut[i * 3 + 2] = color[2];
  }
  return lut;
}

const VELOCITY_LUT = makeLut(VELOCITY_STOPS);
const VORTICITY_LUT = makeLut(VORTICITY_STOPS);
const FIELD_IMAGES = new WeakMap<HTMLCanvasElement, ImageData>();

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toFixed(value >= 10 ? 1 : 2)}×`;
}

function formatDelta(value: number) {
  if (!Number.isFinite(value)) return "—";
  const percent = Math.round((value - 1) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function ScenarioIcon({ type }: { type: Scenario }) {
  const path =
    type === "healthy"
      ? "M2 8 C7 8 9 8 14 8 C19 8 21 8 26 8"
      : type === "stenosis"
        ? "M2 5 C8 5 9 7.5 14 7.5 C19 7.5 20 5 26 5 M2 11 C8 11 9 8.5 14 8.5 C19 8.5 20 11 26 11"
        : "M2 6 C8 6 9 2.5 14 2.5 C19 2.5 20 6 26 6 M2 10 C8 10 9 13.5 14 13.5 C19 13.5 20 10 26 10";
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LayerIcon({ type }: { type: Layer }) {
  if (type === "wallLoad") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M3 10h14M5 7l-3 3 3 3m10-6 3 3-3 3" />
      </svg>
    );
  }
  if (type === "vorticity") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M16 7a7 7 0 1 0 .2 6M16 7V3m0 4h-4" />
      </svg>
    );
  }
  if (type === "shear") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M3 6h12m-3-3 3 3-3 3M17 14H5m3-3-3 3 3 3" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M2 10c3-5 5 5 8 0s5 5 8 0" />
    </svg>
  );
}

function renderInstrument(
  canvas: HTMLCanvasElement,
  engine: HemoEngine,
  fieldCanvas: HTMLCanvasElement,
  layer: Layer,
  pressure: number,
  particles: Array<{ x: number; y: number; px: number; py: number; life: number }>,
  reducedMotion: boolean,
) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const dpr = 1;
  const targetWidth = Math.round(rect.width * dpr);
  const targetHeight = Math.round(rect.height * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  if (fieldCanvas.width !== engine.nx || fieldCanvas.height !== engine.ny) {
    fieldCanvas.width = engine.nx;
    fieldCanvas.height = engine.ny;
  }
  const field = fieldCanvas.getContext("2d", { alpha: true });
  const context = canvas.getContext("2d");
  if (!field || !context) return;
  let image = FIELD_IMAGES.get(fieldCanvas);
  if (!image || image.width !== engine.nx || image.height !== engine.ny) {
    image = field.createImageData(engine.nx, engine.ny);
    FIELD_IMAGES.set(fieldCanvas, image);
  }
  const data = image.data;

  for (let y = 0; y < engine.ny; y += 1) {
    for (let x = 0; x < engine.nx; x += 1) {
      const cell = engine.index(x, y);
      const pixel = cell * 4;
      if (engine.solid[cell]) {
        data[pixel] = 3;
        data[pixel + 1] = 7;
        data[pixel + 2] = 13;
        data[pixel + 3] = 255;
        continue;
      }
      const speed = Math.hypot(engine.ux[cell], engine.uy[cell]);
      let lut = VELOCITY_LUT;
      let colorIndex = 0;
      if (layer === "vorticity") {
        lut = VORTICITY_LUT;
        colorIndex = Math.round(clamp(0.5 + engine.vorticity[cell] / 0.018, 0, 1) * 255) * 3;
      } else if (layer === "velocity") {
        colorIndex = Math.round(clamp(Math.pow(speed / 0.058, 0.72), 0, 1) * 255) * 3;
      } else {
        colorIndex = Math.round(clamp(Math.pow(speed / 0.07, 0.8), 0, 1) * 255) * 3;
      }
      const muted = layer !== "velocity" && layer !== "vorticity";
      data[pixel] = muted ? Math.round(lut[colorIndex] * 0.38) : lut[colorIndex];
      data[pixel + 1] = muted ? Math.round(lut[colorIndex + 1] * 0.32) : lut[colorIndex + 1];
      data[pixel + 2] = muted ? Math.round(lut[colorIndex + 2] * 0.48) : lut[colorIndex + 2];
      data[pixel + 3] = 255;
    }
  }
  field.putImageData(image, 0, 0);

  const w = canvas.width;
  const h = canvas.height;
  const sx = w / engine.nx;
  const sy = h / engine.ny;
  context.clearRect(0, 0, w, h);
  const background = context.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#020711");
  background.addColorStop(0.52, "#080716");
  background.addColorStop(1, "#03070d");
  context.fillStyle = background;
  context.fillRect(0, 0, w, h);
  context.imageSmoothingEnabled = true;
  context.drawImage(fieldCanvas, 0, 0, w, h);

  context.save();
  context.globalCompositeOperation = "screen";
  context.strokeStyle = "rgba(222, 244, 255, .24)";
  context.lineWidth = Math.max(1, dpr);
  context.setLineDash([5 * dpr, 8 * dpr]);
  context.beginPath();
  for (let x = 0; x < engine.nx; x += 1) {
    const px = x * sx;
    const py = (engine.center - engine.baseRadius) * sy;
    if (x === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  for (let x = engine.nx - 1; x >= 0; x -= 1) {
    context.lineTo(x * sx, (engine.center + engine.baseRadius) * sy);
  }
  context.stroke();
  context.restore();

  let maxRadius = engine.baseRadius;
  for (let x = 0; x < engine.nx; x += 1) {
    maxRadius = Math.max(maxRadius, (engine.bottom[x] - engine.top[x]) / 2);
  }
  const load = wallLoadRatio(pressure, maxRadius / engine.baseRadius);
  const referenceShear = (6 * engine.nu * engine.meanVelocity) / (engine.baseRadius * 2);

  const drawWall = (wall: Float32Array, values: Float32Array) => {
    context.save();
    context.lineCap = "round";
    context.globalCompositeOperation = "screen";
    context.strokeStyle = "rgba(155, 239, 227, .32)";
    context.shadowColor = "rgba(91, 224, 207, .35)";
    context.shadowBlur = 7;
    context.lineWidth = layer === "velocity" || layer === "vorticity" ? 1.15 : 2.8;
    context.beginPath();
    context.moveTo(0, wall[0] * sy);
    for (let x = 1; x < engine.nx; x += 1) context.lineTo(x * sx, wall[x] * sy);
    context.stroke();
    context.shadowBlur = 0;
    if (layer !== "velocity" && layer !== "vorticity") for (let x = 1; x < engine.nx; x += 1) {
      let t = 0.22;
      if (layer === "shear") t = Math.abs(values[x]) / Math.max(referenceShear * 4, 1e-7);
      if (layer === "wallLoad") {
        const localRadius = (engine.bottom[x] - engine.top[x]) / 2;
        t = wallLoadRatio(pressure, localRadius / engine.baseRadius) / Math.max(2.2, load);
      }
      const color = colorRamp(SHEAR_STOPS, t);
      context.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, .95)`;
      context.lineWidth = 2.1;
      context.beginPath();
      context.moveTo((x - 1) * sx, wall[x - 1] * sy);
      context.lineTo(x * sx, wall[x] * sy);
      context.stroke();
    }
    context.restore();
  };
  drawWall(engine.top, engine.shearTop);
  drawWall(engine.bottom, engine.shearBottom);

  if (!reducedMotion) {
    context.save();
    context.globalCompositeOperation = "lighter";
    for (const particle of particles) {
      const gx = clamp(Math.floor(particle.x), 0, engine.nx - 1);
      const gy = clamp(Math.floor(particle.y), 0, engine.ny - 1);
      const cell = engine.index(gx, gy);
      particle.px = particle.x;
      particle.py = particle.y;
      if (engine.solid[cell] || particle.life <= 0 || particle.x >= engine.nx - 2) {
        particle.x = Math.random() * 6 + 1;
        particle.y = engine.top[1] + 2 + Math.random() * (engine.bottom[1] - engine.top[1] - 4);
        particle.px = particle.x;
        particle.py = particle.y;
        particle.life = 180 + Math.random() * 260;
        continue;
      }
      particle.x += engine.ux[cell] * 48;
      particle.y += engine.uy[cell] * 48;
      particle.life -= 1;
      const speed = Math.hypot(engine.ux[cell], engine.uy[cell]);
      const alpha = clamp(0.18 + speed * 12, 0.18, 0.78);
      context.strokeStyle = layer === "vorticity" ? `rgba(205,255,249,${alpha})` : `rgba(255,232,196,${alpha})`;
      context.lineWidth = clamp(0.65 + speed * 22, 0.65, 1.8) * dpr;
      context.beginPath();
      context.moveTo(particle.px * sx, particle.py * sy);
      context.lineTo(particle.x * sx, particle.y * sy);
      context.stroke();
    }
    context.restore();
  }

  const vignette = context.createRadialGradient(w / 2, h / 2, h * 0.16, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.54)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, w, h);
}

function MetricCard({
  eyebrow,
  value,
  detail,
  tone,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  tone: "cyan" | "rose" | "amber";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{eyebrow}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function VesselDeltaLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<HemoEngine | null>(null);
  const controlRef = useRef<HemoEngine | null>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; px: number; py: number; life: number }>>([]);
  const dragSideRef = useRef<"top" | "bottom" | null>(null);
  const animationRef = useRef<number | null>(null);
  const layerRef = useRef<Layer>("velocity");
  const pressureRef = useRef(120);
  const pausedRef = useRef(false);
  const settlingUntilStepRef = useRef(0);
  const [layer, setLayer] = useState<Layer>("velocity");
  const [scenario, setScenario] = useState<Scenario>("healthy");
  const [pressure, setPressure] = useState(120);
  const [flowDrive, setFlowDrive] = useState(0.018);
  const [paused, setPaused] = useState(false);
  const [metrics, setMetrics] = useState<EngineMetrics>(EMPTY_METRICS);
  const [controlMetrics, setControlMetrics] = useState<EngineMetrics>(EMPTY_METRICS);
  const [liveChecks, setLiveChecks] = useState({
    maxRadiusRatio: 1,
    profileError: 0,
    benchmarkReady: false,
  });
  const [fps, setFps] = useState(0);
  const [stepsPerSecond, setStepsPerSecond] = useState(0);
  const [settling, setSettling] = useState(true);
  const [edited, setEdited] = useState(false);
  const [prediction, setPrediction] = useState<"throat" | "downstream" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);

  useEffect(() => {
    const engine = new HemoEngine(160, 70, { preset: "healthy" });
    const control = new HemoEngine(160, 70, { preset: "healthy" });
    engineRef.current = engine;
    controlRef.current = control;
    fieldCanvasRef.current = document.createElement("canvas");
    particlesRef.current = Array.from({ length: 64 }, () => ({
      x: Math.random() * engine.nx,
      y: engine.center - engine.baseRadius + 3 + Math.random() * (engine.baseRadius * 2 - 6),
      px: 0,
      py: 0,
      life: 60 + Math.random() * 360,
    }));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastTime = performance.now();
    let frameCounter = 0;
    let lastReport = lastTime;
    let simulatedSteps = 0;
    settlingUntilStepRef.current = engine.stepCount + 110;

    const animate = (now: number) => {
      const active = engineRef.current;
      const baseline = controlRef.current;
      const canvas = canvasRef.current;
      if (!active || !baseline || !canvas || !fieldCanvasRef.current) return;
      frameCounter += 1;
      if (!pausedRef.current) {
        const dt = now - lastTime;
        const steps = dt > 28 ? 1 : 2;
        active.step(steps);
        baseline.step(steps);
        simulatedSteps += steps * 2;
      }
      renderInstrument(
        canvas,
        active,
        fieldCanvasRef.current,
        layerRef.current,
        pressureRef.current,
        particlesRef.current,
        reducedMotion,
      );
      if (now - lastReport >= 500) {
        const elapsed = (now - lastReport) / 1000;
        setFps(Math.round(frameCounter / elapsed));
        setStepsPerSecond(Math.round(simulatedSteps / elapsed));
        setMetrics(active.getMetrics());
        setControlMetrics(baseline.getMetrics());
        let maxRadiusRatio = 1;
        for (let x = 0; x < active.nx; x += 1) {
          maxRadiusRatio = Math.max(
            maxRadiusRatio,
            (active.bottom[x] - active.top[x]) / (active.baseRadius * 2),
          );
        }
        setLiveChecks({
          maxRadiusRatio,
          profileError: baseline.analyticProfileError(),
          benchmarkReady: baseline.stepCount >= 180,
        });
        setSettling(active.stepCount < settlingUntilStepRef.current);
        frameCounter = 0;
        simulatedSteps = 0;
        lastReport = now;
      }
      lastTime = now;
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    layerRef.current = layer;
  }, [layer]);

  useEffect(() => {
    pressureRef.current = pressure;
  }, [pressure]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    engineRef.current?.setFlowDrive(flowDrive);
    controlRef.current?.setFlowDrive(flowDrive);
  }, [flowDrive]);

  const applyScenario = (next: Scenario) => {
    setScenario(next);
    setEdited(next !== "healthy");
    setRevealed(false);
    const active = engineRef.current;
    active?.setPreset(next);
    controlRef.current?.setPreset("healthy");
    particlesRef.current.forEach((particle) => {
      particle.life = 0;
    });
    settlingUntilStepRef.current = (active?.stepCount ?? 0) + 110;
    setSettling(true);
  };

  const canvasPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * engine.nx,
      y: ((event.clientY - rect.top) / rect.height) * engine.ny,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const position = canvasPosition(event);
    const engine = engineRef.current;
    if (!position || !engine) return;
    const ix = clamp(Math.round(position.x), 0, engine.nx - 1);
    const center = (engine.top[ix] + engine.bottom[ix]) / 2;
    dragSideRef.current = position.y < center ? "top" : "bottom";
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.sculpt(position.x, position.y, dragSideRef.current);
    settlingUntilStepRef.current = engine.stepCount + 100;
    setEdited(true);
    setRevealed(false);
    setSettling(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragSideRef.current) return;
    const position = canvasPosition(event);
    if (!position) return;
    const engine = engineRef.current;
    engine?.sculpt(position.x, position.y, dragSideRef.current);
    settlingUntilStepRef.current = (engine?.stepCount ?? 0) + 100;
    setEdited(true);
  };

  const onPointerUp = () => {
    dragSideRef.current = null;
  };

  const speedRatio = controlMetrics.peakSpeed > 0 ? metrics.peakSpeed / controlMetrics.peakSpeed : 1;
  const shearRatio = controlMetrics.peakShear > 0 ? metrics.peakShear / controlMetrics.peakShear : 1;
  const vorticityRatio = controlMetrics.maxVorticity > 0 ? metrics.maxVorticity / controlMetrics.maxVorticity : 1;
  const { maxRadiusRatio, profileError, benchmarkReady } = liveChecks;
  const loadRatio = wallLoadRatio(pressure, maxRadiusRatio);
  const stable = metrics.mach < 0.1 && metrics.densitySpread < 0.03;

  const interpretation =
    scenario === "aneurysm" || maxRadiusRatio > 1.18
      ? `The widened wall raises this model’s pressure-load estimate to ${loadRatio.toFixed(2)}× baseline. The fluid layer separately shows slower cavity flow and altered wall shear.`
      : metrics.minDiameterRatio < 0.88
        ? `The narrowed lumen creates a ${speedRatio.toFixed(2)}× peak-speed jet and ${shearRatio.toFixed(2)}× peak shear estimate. Downstream disturbed flow is different from throat shear.`
        : "A smooth straight channel produces a near-parabolic velocity profile. Sculpt the wall to create a counterfactual under the same boundary conditions.";

  const layerOptions: Array<{ id: Layer; label: string }> = [
    { id: "velocity", label: "Velocity" },
    { id: "vorticity", label: "Vorticity" },
    { id: "shear", label: "Wall shear" },
    { id: "wallLoad", label: "Wall load" },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#instrument" aria-label="VesselDelta home">
          <span className="brand-mark"><i /></span>
          <span>VESSELΔ</span>
        </a>
        <div className="topbar-center" aria-label="Model summary">
          <span>D2Q9 LBM</span>
          <i />
          <span>Runs locally</span>
          <i />
          <span>Illustrative</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="quiet-button" onClick={() => setVerifyOpen(true)}>Verify physics</button>
          <button type="button" className="pause-button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      <section className="hero" id="instrument">
        <div className="hero-copy">
          <p className="kicker"><span /> Live hemodynamics instrument</p>
          <h1>Shape the vessel.<br /><em>Watch the flow answer.</em></h1>
          <p className="hero-deck">Pinch or widen the wall while synchronized local solvers recompute velocity, wall-shear estimate, and vorticity against a healthy control.</p>
        </div>

        <div className="story-tabs" role="tablist" aria-label="Vessel stories">
          {(["healthy", "stenosis", "aneurysm"] as Scenario[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={scenario === item && !(item === "healthy" && edited)}
              className={scenario === item && !(item === "healthy" && edited) ? "active" : ""}
              onClick={() => applyScenario(item)}
            >
              <ScenarioIcon type={item} />
              <span>{item === "healthy" ? "Healthy control" : item[0].toUpperCase() + item.slice(1)}</span>
            </button>
          ))}
        </div>

        <div className="instrument-grid">
          <section className="canvas-panel" aria-label="Interactive blood flow experiment">
            <div className="canvas-status">
              <span className="live-pill"><i /> {paused ? "PAUSED" : "LIVE SOLVE"}</span>
              <span className={settling ? "settling" : "evolving"}>{settling ? "INITIALIZING" : "FIELD EVOLVING"}</span>
              <span className="runtime-pill">{fps || "—"} FPS · {stepsPerSecond || "—"} TWIN STEPS/S</span>
            </div>
            <div className="canvas-instruction" aria-hidden={edited}>
              <span className="gesture-ring" />
              <strong>{edited ? "Keep sculpting" : "Drag either vessel wall"}</strong>
              <small>The ghost line is the untouched control</small>
            </div>
            <canvas
              ref={canvasRef}
              className="flow-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label={`Live flow field. ${interpretation}`}
            />
            <div className="flow-direction"><span>INLET</span><i /><span>FLOW</span></div>
            <div className="legend">
              <span>LOW</span><i className={`legend-${layer}`} /><span>HIGH</span>
            </div>
            <div className="canvas-caption" aria-live="polite">
              <span className="caption-index">01</span>
              <p>{interpretation}</p>
            </div>
          </section>

          <aside className="control-rail">
            <section className="rail-section layer-section">
              <div className="rail-heading">
                <span>FIELD LENS</span>
                <small>Choose what the solver reveals</small>
              </div>
              <div className="layer-grid">
                {layerOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={layer === option.id ? "active" : ""}
                    onClick={() => setLayer(option.id)}
                  >
                    <LayerIcon type={option.id} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rail-section comparison-section">
              <div className="rail-heading">
                <span>{scenario === "healthy" && edited ? "CUSTOM" : scenario.toUpperCase()} VS HEALTHY</span>
                <small>same steady flow drive</small>
              </div>
              <div className="metric-grid">
                <MetricCard eyebrow="Jet speed" value={formatDelta(speedRatio)} detail={`${formatRatio(speedRatio)} baseline`} tone="cyan" />
                <MetricCard eyebrow="Peak wall shear" value={formatDelta(shearRatio)} detail={`${formatRatio(shearRatio)} baseline`} tone="rose" />
                <MetricCard eyebrow="Peak vorticity" value={formatRatio(vorticityRatio)} detail={vorticityRatio >= 2 ? "more than doubled" : "local turning"} tone="amber" />
              </div>
            </section>

            <section className="rail-section controls-section">
              <div className="rail-heading">
                <span>TWO INDEPENDENT FORCES</span>
                <small>Do not confuse pressure with shear</small>
              </div>
              <label className="control-row">
                <span><b>Flow drive</b><small>sets inlet velocity</small></span>
                <output>{Math.round((flowDrive / 0.018) * 100)}%</output>
                <input
                  data-testid="flow-drive"
                  type="range"
                  min="0.012"
                  max="0.024"
                  step="0.001"
                  value={flowDrive}
                  onInput={(event) => setFlowDrive(Number(event.currentTarget.value))}
                />
              </label>
              <label className="control-row pressure-control">
                <span><b>Relative pressure factor</b><small>separate wall model · does not change CFD</small></span>
                <output>{(pressure / 120).toFixed(2)}× baseline</output>
                <input
                  data-testid="pressure-factor"
                  type="range"
                  min="90"
                  max="180"
                  step="5"
                  value={pressure}
                  onInput={(event) => setPressure(Number(event.currentTarget.value))}
                />
              </label>
              <div className="load-readout">
                <span>Relative wall load</span>
                <strong>{loadRatio.toFixed(2)}×</strong>
                <small>Thin cylindrical-wall estimate, not rupture risk</small>
              </div>
            </section>
          </aside>
        </div>

        <section className="prediction-card" aria-label="Prediction challenge">
          <div>
            <span className="prediction-number">PREDICT BEFORE REVEAL</span>
            <h2>Where will a narrowing create the fastest flow?</h2>
          </div>
          <div className="prediction-actions">
            <button type="button" className={prediction === "throat" ? "selected" : ""} onClick={() => { setPrediction("throat"); setRevealed(false); }}>At the narrowest throat</button>
            <button type="button" className={prediction === "downstream" ? "selected" : ""} onClick={() => { setPrediction("downstream"); setRevealed(false); }}>Inside the downstream turning field</button>
            <button type="button" className="reveal-button" disabled={!prediction} onClick={() => { applyScenario("stenosis"); setRevealed(true); setLayer("velocity"); }}>Reveal with physics</button>
          </div>
          {revealed ? (
            <p className={`prediction-result ${prediction === "throat" ? "correct" : "learn"}`}>
              <strong>{prediction === "throat" ? "Prediction supported." : "The field shows a different answer."}</strong>
              Continuity accelerates the jet at the throat; downstream flow can turn while moving more slowly.
            </p>
          ) : null}
        </section>
      </section>

      <section className="lesson-section">
        <div className="lesson-intro">
          <p className="kicker"><span /> The lesson hiding in plain sight</p>
          <h2>Blood pushes on a vessel<br />in <em>two different ways.</em></h2>
          <p>Blood pressure and flow-related shear are often discussed as if they were the same force. They are not. VesselDelta keeps the live flow field separate from a simple pressure–radius wall-load relation.</p>
        </div>
        <div className="force-cards">
          <article className="force-card shear-force">
            <span className="force-index">A</span>
            <div className="force-visual shear-visual"><i /><i /><i /><i /></div>
            <p className="force-kicker">TANGENTIAL</p>
            <h3>Flow shear</h3>
            <p>The LBM field estimates the velocity gradient at the wall. A stenosis can produce high throat shear and a distinct downstream disturbed-flow region.</p>
            <code>τ ≈ ρν · ∂uₜ/∂n</code>
          </article>
          <article className="force-card pressure-force">
            <span className="force-index">B</span>
            <div className="force-visual pressure-visual"><i /><i /><i /><i /></div>
            <p className="force-kicker">CIRCUMFERENTIAL</p>
            <h3>Pressure wall load</h3>
            <p>A separate thin-wall model shows why both higher pressure and a larger radius raise circumferential load. This is not a rupture-probability model.</p>
            <code>relative load = P/P₀ · r/r₀ · t₀/t</code>
          </article>
        </div>
      </section>

      <section className="proof-section" id="proof">
        <div className="proof-heading">
          <p className="kicker"><span /> Inspectable, falsifiable, local</p>
          <h2>Trust the instrument<br />because you can <em>test it.</em></h2>
          <button type="button" className="primary-button" onClick={() => setVerifyOpen(true)}>Open live verification</button>
        </div>
        <div className="proof-grid">
          <article><span>01</span><h3>Real solve</h3><p>D2Q9 BGK collision and streaming continue while the vessel wall changes. No prerecorded field or distance-to-shape trick.</p><strong>{fps || "—"} FPS · {stepsPerSecond || "—"} twin steps/s</strong></article>
          <article><span>02</span><h3>Analytic check</h3><p>The untouched straight channel is compared against the planar Poiseuille profile expected from the same boundary conditions.</p><strong>{benchmarkReady ? `${(profileError * 100).toFixed(2)}% profile-shape error` : "reference field warming"}</strong></article>
          <article><span>03</span><h3>Stability watch</h3><p>Density, Mach number, and finite values remain visible instead of hiding solver failure behind pretty particles.</p><strong>{(metrics.massDrift * 100).toFixed(2)}% mean-density drift</strong></article>
          <article><span>04</span><h3>Honest scope</h3><p>Two-dimensional, Newtonian fluid, rigid walls, idealized boundaries. A causal intuition tool—not clinical CFD.</p><strong>Model card always visible</strong></article>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><span className="brand-mark"><i /></span><strong>VESSELΔ</strong></div>
        <p>A live vascular-mechanics learning instrument. Built with Codex + GPT-5.6.</p>
        <div><button type="button" onClick={() => setLimitsOpen(true)}>Model limits</button><button type="button" onClick={() => setVerifyOpen(true)}>Verification</button><a href="#proof">Methods</a></div>
      </footer>

      {verifyOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setVerifyOpen(false)}>
          <section className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setVerifyOpen(false)} aria-label="Close verification">×</button>
            <p className="modal-kicker">LIVE INSTRUMENT CHECKS</p>
            <h2 id="verification-title">Inspect the running model.</h2>
            <p className="modal-deck">These readings come from the running solver. A green check means the field is inside this educational model’s numerical envelope, not that it is clinically validated.</p>
            <div className="verification-grid">
              <article><span className={fps >= 30 ? "check" : "warn"}>{fps >= 30 ? "✓" : "!"}</span><div><small>RENDER LOOP</small><strong>{fps} frames/s</strong><p>Adaptive two-step update for both edited and control vessels.</p></div></article>
              <article><span className={metrics.mach < 0.1 ? "check" : "warn"}>{metrics.mach < 0.1 ? "✓" : "!"}</span><div><small>LOW-MACH GATE</small><strong>Ma {metrics.mach.toFixed(3)}</strong><p>Target below 0.10 for the weakly compressible LBM approximation.</p></div></article>
              <article><span className={!benchmarkReady ? "neutral" : profileError < 0.08 ? "check" : "warn"}>{!benchmarkReady ? "·" : profileError < 0.08 ? "✓" : "!"}</span><div><small>UPSTREAM PROFILE SHAPE</small><strong>{benchmarkReady ? `${(profileError * 100).toFixed(2)}% L₂ error` : "Reference field warming"}</strong><p>Current untouched upstream profile versus a fitted analytic parabola.</p></div></article>
              <article><span className={stable ? "check" : "warn"}>{stable ? "✓" : "!"}</span><div><small>DENSITY STABILITY</small><strong>Δρ {metrics.densitySpread.toFixed(4)}</strong><p>Density spread is watched for numerical instability.</p></div></article>
              <article><span className={Number.isFinite(metrics.peakSpeed) && metrics.sanitizationCount === 0 ? "check" : "warn"}>{Number.isFinite(metrics.peakSpeed) && metrics.sanitizationCount === 0 ? "✓" : "!"}</span><div><small>FINITE FIELD</small><strong>{metrics.sanitizationCount === 0 ? "No intervention" : `${metrics.sanitizationCount} safety resets`}</strong><p>Invalid density or excess-speed guards are counted instead of silently hidden.</p></div></article>
              <article><span className="check">✓</span><div><small>LOCAL COMPUTE</small><strong>160 × 70 × 2</strong><p>Two synchronized D2Q9 fields run in this browser tab.</p></div></article>
            </div>
            <div className="equation-strip"><span>fᵢ* = fᵢ − (fᵢ − fᵢᵉᵠ) / τ</span><i /><span>ν = (τ − 0.5) / 3</span><i /><span>τ = 0.62</span></div>
            <button type="button" className="modal-primary" onClick={() => { setVerifyOpen(false); setLimitsOpen(true); }}>Read the model card</button>
          </section>
        </div>
      ) : null}

      {limitsOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLimitsOpen(false)}>
          <section className="verification-modal limits-modal" role="dialog" aria-modal="true" aria-labelledby="limits-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setLimitsOpen(false)} aria-label="Close model limits">×</button>
            <p className="modal-kicker">MODEL CARD · READ BEFORE INTERPRETING</p>
            <h2 id="limits-title">Illustrative mechanics,<br />not personal risk.</h2>
            <div className="limits-grid">
              <article><span>INCLUDES</span><p>2D D2Q9 BGK lattice-Boltzmann flow, rigid no-slip walls, smooth constrained geometry, normalized wall-shear estimate, and a separate thin-cylinder pressure-load relation.</p></article>
              <article><span>DOES NOT INCLUDE</span><p>Patient anatomy, non-Newtonian rheology, compliant or anisotropic tissue, 3D secondary flow, blood cells, plaque biology, clotting, calibrated pressure in pascals, diagnosis, or rupture prediction.</p></article>
              <article><span>READ COLOR CAREFULLY</span><p>Bright color marks a modeled quantity—not “disease here.” Low, high, and oscillatory shear can each matter in different biological contexts. This instrument cannot tell where plaque will form.</p></article>
              <article><span>PRESSURE ≠ FLOW SHEAR</span><p>The pressure-load slider changes only the separate P × r ÷ t teaching layer. It does not silently make the CFD run faster. That separation is the lesson.</p></article>
            </div>
            <p className="citation-note">Methods follow the standard D2Q9 BGK formulation and Zou–He velocity/density boundaries. Scientific references and validation scripts are documented in the project README.</p>
            <button type="button" className="modal-primary" onClick={() => setLimitsOpen(false)}>Return to the instrument</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
