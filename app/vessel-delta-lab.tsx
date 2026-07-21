"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { comparisonMetricsReady, HemoEngine, wallLoadRatio } from "./hemo-engine.js";

const VesselTheatre3D = lazy(() =>
  import("./vessel-theatre-3d").then((module) => ({ default: module.VesselTheatre3D })),
);

type Layer = "velocity" | "vorticity" | "shear" | "wallLoad";
type Scenario = "healthy" | "stenosis" | "aneurysm" | "hypertension";
type StageView = "anatomy" | "slice";
type ChallengeChoice = "throat" | "downstream" | "tension" | "jet" | "cannot" | "threshold";

const PRESET_WARMUP_STEPS = 5_000;
const EDIT_WARMUP_STEPS = 1_200;
const WARMUP_STEPS_PER_FRAME = 12;

const CHALLENGES: Array<{
  id: "flow" | "pressure" | "rupture";
  question: string;
  options: Array<{ id: ChallengeChoice; label: string }>;
  correct: ChallengeChoice;
  explanation: string;
}> = [
  {
    id: "flow",
    question: "Where will a narrowing create the fastest modeled flow?",
    options: [
      { id: "throat", label: "At the narrowest throat" },
      { id: "downstream", label: "Inside the downstream turning field" },
    ],
    correct: "throat",
    explanation: "Continuity accelerates the modeled jet at the throat; downstream flow can turn while moving more slowly.",
  },
  {
    id: "pressure",
    question: "If pressure rises while flow drive stays fixed, what changes here?",
    options: [
      { id: "tension", label: "Only the wall-tension index rises" },
      { id: "jet", label: "The CFD jet automatically accelerates" },
    ],
    correct: "tension",
    explanation: "Pressure belongs to a separate thin-cylinder P × r wall-tension relation. It is not silently converted into faster CFD flow.",
  },
  {
    id: "rupture",
    question: "Can the brightest region tell us this vessel will rupture?",
    options: [
      { id: "cannot", label: "No—wall-failure inputs are absent" },
      { id: "threshold", label: "Yes—it marks a rupture threshold" },
    ],
    correct: "cannot",
    explanation: "Rigid-wall CFD has no tissue strength, measured thickness, growth history, or fluid–structure failure law. Color is not rupture risk.",
  },
];

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
        : type === "aneurysm"
          ? "M2 6 C8 6 9 2.5 14 2.5 C19 2.5 20 6 26 6 M2 10 C8 10 9 13.5 14 13.5 C19 13.5 20 10 26 10"
          : "M2 8 H7 L9 4 L12 12 L15 3 L18 9 H26";
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
  const instrumentPanelRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<HemoEngine | null>(null);
  const controlRef = useRef<HemoEngine | null>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; px: number; py: number; life: number }>>([]);
  const dragSideRef = useRef<"top" | "bottom" | null>(null);
  const animationRef = useRef<number | null>(null);
  const layerRef = useRef<Layer>("velocity");
  const stageViewRef = useRef<StageView>("anatomy");
  const pressureRef = useRef(120);
  const pausedRef = useRef(false);
  const instrumentVisibleRef = useRef(true);
  const settlingUntilStepRef = useRef(0);
  const flowEffectReadyRef = useRef(false);
  const stentTimerRef = useRef<number | null>(null);
  const [layer, setLayer] = useState<Layer>("velocity");
  const [scenario, setScenario] = useState<Scenario>("stenosis");
  const [stageView, setStageView] = useState<StageView>("anatomy");
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
  const [edited, setEdited] = useState(true);
  const [prediction, setPrediction] = useState<ChallengeChoice | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeResults, setChallengeResults] = useState<boolean[]>([]);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [ruptureOpen, setRuptureOpen] = useState(false);
  const [stentProgress, setStentProgress] = useState(0);
  const [stentStatus, setStentStatus] = useState<"idle" | "deploying" | "restored">("idle");
  const [mechanism, setMechanism] = useState<"ace" | "ccb" | "thiazide" | "statin">("ace");

  useEffect(() => {
    const engine = new HemoEngine(160, 70, { preset: "stenosis" });
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
    settlingUntilStepRef.current = engine.stepCount + PRESET_WARMUP_STEPS;

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      instrumentVisibleRef.current = entry.isIntersecting;
    }, { rootMargin: "160px" });
    if (instrumentPanelRef.current) visibilityObserver.observe(instrumentPanelRef.current);

    const animate = (now: number) => {
      const active = engineRef.current;
      const baseline = controlRef.current;
      const canvas = canvasRef.current;
      if (!active || !baseline || !canvas || !fieldCanvasRef.current) return;
      if (!instrumentVisibleRef.current) {
        lastTime = now;
        lastReport = now;
        frameCounter = 0;
        simulatedSteps = 0;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      frameCounter += 1;
      if (!pausedRef.current) {
        const dt = now - lastTime;
        const warming = active.stepCount < settlingUntilStepRef.current;
        const steps = warming
          ? Math.min(settlingUntilStepRef.current - active.stepCount, dt > 28 ? 6 : WARMUP_STEPS_PER_FRAME)
          : dt > 28 ? 1 : 2;
        active.step(steps);
        baseline.step(steps);
        simulatedSteps += steps * 2;
      }
      if (stageViewRef.current === "slice") {
        renderInstrument(
          canvas,
          active,
          fieldCanvasRef.current,
          layerRef.current,
          pressureRef.current,
          particlesRef.current,
          reducedMotion,
        );
      }
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
      visibilityObserver.disconnect();
    };
  }, []);

  useEffect(() => () => {
    if (stentTimerRef.current !== null) window.clearInterval(stentTimerRef.current);
  }, []);

  useEffect(() => {
    layerRef.current = layer;
  }, [layer]);

  useEffect(() => {
    stageViewRef.current = stageView;
  }, [stageView]);

  useEffect(() => {
    pressureRef.current = pressure;
  }, [pressure]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    engineRef.current?.setFlowDrive(flowDrive);
    controlRef.current?.setFlowDrive(flowDrive);
    if (!flowEffectReadyRef.current) {
      flowEffectReadyRef.current = true;
      return;
    }
    settlingUntilStepRef.current = (engineRef.current?.stepCount ?? 0) + EDIT_WARMUP_STEPS;
    setSettling(true);
  }, [flowDrive]);

  const applyScenario = (next: Scenario) => {
    if (stentTimerRef.current !== null) {
      window.clearInterval(stentTimerRef.current);
      stentTimerRef.current = null;
    }
    setStentProgress(0);
    setStentStatus("idle");
    setScenario(next);
    setEdited(next !== "healthy");
    setRevealed(false);
    const active = engineRef.current;
    const solverPreset = next === "stenosis" || next === "aneurysm" ? next : "healthy";
    active?.setPreset(solverPreset);
    controlRef.current?.setPreset("healthy");
    setPressure(next === "hypertension" ? 160 : 120);
    setStageView("anatomy");
    particlesRef.current.forEach((particle) => {
      particle.life = 0;
    });
    settlingUntilStepRef.current = (active?.stepCount ?? 0) + PRESET_WARMUP_STEPS;
    setSettling(true);
  };

  const deployIdealizedStent = () => {
    if (stentTimerRef.current !== null) window.clearInterval(stentTimerRef.current);
    const active = engineRef.current;
    const baseline = controlRef.current;
    if (!active || !baseline) return;
    setScenario("stenosis");
    setEdited(true);
    setRevealed(false);
    setPressure(120);
    setStageView("anatomy");
    setStentStatus("deploying");
    setStentProgress(0.01);
    active.setPreset("stenosis");
    baseline.setPreset("healthy");
    particlesRef.current.forEach((particle) => { particle.life = 0; });
    let step = 0;
    stentTimerRef.current = window.setInterval(() => {
      step += 1;
      const progress = clamp(step / 24, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      active.setStenosisRestoration(eased);
      setStentProgress(progress);
      settlingUntilStepRef.current = active.stepCount + (progress >= 1 ? PRESET_WARMUP_STEPS : EDIT_WARMUP_STEPS);
      setSettling(true);
      if (progress >= 1) {
        if (stentTimerRef.current !== null) window.clearInterval(stentTimerRef.current);
        stentTimerRef.current = null;
        setStentStatus("restored");
      }
    }, 54);
  };

  const activeChallenge = CHALLENGES[challengeIndex];
  const challengeScore = challengeResults.filter(Boolean).length;

  const revealChallenge = () => {
    if (!prediction || !activeChallenge) return;
    const correct = prediction === activeChallenge.correct;
    setChallengeResults((current) => {
      const next = [...current];
      next[challengeIndex] = correct;
      return next;
    });
    if (activeChallenge.id === "flow") {
      applyScenario("stenosis");
      setLayer("velocity");
      setStageView("slice");
    } else if (activeChallenge.id === "pressure") {
      applyScenario("hypertension");
      setLayer("wallLoad");
      setStageView("anatomy");
    } else {
      applyScenario("aneurysm");
      setLayer("wallLoad");
      setStageView("anatomy");
    }
    setRevealed(true);
  };

  const advanceChallenge = () => {
    if (challengeIndex >= CHALLENGES.length - 1) {
      setChallengeComplete(true);
      setRevealed(false);
      return;
    }
    setChallengeIndex((current) => current + 1);
    setPrediction(null);
    setRevealed(false);
  };

  const resetChallenge = () => {
    setChallengeIndex(0);
    setChallengeResults([]);
    setChallengeComplete(false);
    setPrediction(null);
    setRevealed(false);
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
    settlingUntilStepRef.current = engine.stepCount + EDIT_WARMUP_STEPS;
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
    settlingUntilStepRef.current = (engine?.stepCount ?? 0) + EDIT_WARMUP_STEPS;
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
  const stable = metrics.mach < 0.1 && metrics.densitySpread < 0.02;
  const fluxReady = metrics.fluxMismatch < 0.02 && controlMetrics.fluxMismatch < 0.02;
  const comparisonsValid = comparisonMetricsReady(metrics, controlMetrics, settling)
    && Number.isFinite(speedRatio)
    && Number.isFinite(shearRatio)
    && Number.isFinite(vorticityRatio);
  const unavailableDetail = settling
    ? "field recomputing"
    : !fluxReady
      ? "flux mismatch above 2%"
      : "outside numerical gate";
  const fieldStatus = settling ? "FIELD RECOMPUTING" : !fluxReady ? "FLUX GATE >2%" : "FIELD EVOLVING";

  const interpretation =
    !comparisonsValid
      ? settling
        ? "Comparison values are withheld while both fields recompute and inlet/outlet flux mismatch returns below the 2% validation gate."
        : !fluxReady
          ? "Comparison values are withheld because at least one field remains above the 2% inlet/outlet flux-mismatch gate. Wait for the field; if the warning persists, reset the geometry or reduce flow drive."
          : "Comparison values are withheld because the current field is outside the instrument’s numerical gate. Reset the geometry or reduce flow drive, then inspect Verify physics."
      : scenario === "hypertension"
      ? `The higher illustrative pressure state raises the relative wall-tension index to ${loadRatio.toFixed(2)}× baseline while the CFD flow drive remains independently controlled.`
      : scenario === "aneurysm" || maxRadiusRatio > 1.18
      ? `The widened wall raises this model’s relative circumferential wall-tension index to ${loadRatio.toFixed(2)}× baseline. The fluid layer separately shows slower cavity flow and an altered axial near-wall gradient proxy.`
      : metrics.minDiameterRatio < 0.88
        ? `In this idealized 2D field, the narrowed lumen produces a ${speedRatio.toFixed(2)}× modeled peak-speed jet and ${shearRatio.toFixed(2)}× axial near-wall gradient proxy relative to the matched reference. Downstream turning is different from the throat gradient.`
        : "A smooth straight channel produces a near-parabolic velocity profile. Sculpt the wall to create a counterfactual under the same boundary conditions.";

  const layerOptions: Array<{ id: Layer; label: string }> = [
    { id: "velocity", label: "Modeled velocity" },
    { id: "vorticity", label: "Vorticity" },
    { id: "shear", label: "Shear proxy" },
    { id: "wallLoad", label: "Wall tension" },
  ];

  const mechanismCopy = {
    ace: {
      eyebrow: "ACE INHIBITOR / ARB",
      title: "Reduce a vasoconstrictor signal.",
      body: "ACE inhibitors reduce formation of angiotensin II; ARBs instead block angiotensin II signaling at AT₁ receptors. Both can reduce vasoconstrictor and aldosterone signaling, but they are distinct mechanisms.",
      boundary: "No fixed drug-response number is sent into the CFD. A hypothetical pressure factor can be explored only in the separate ratio-based wall-tension control—not in the local flow field.",
      source: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=350c6fc9-9774-4d49-9242-19e96944f83b",
      sourceLabel: "ACE inhibitor label",
      source2: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf",
      sourceLabel2: "ARB label",
    },
    ccb: {
      eyebrow: "CALCIUM-CHANNEL BLOCKER",
      title: "Relax vascular smooth muscle.",
      body: "Long-acting dihydropyridine calcium-channel blockers reduce calcium entry into vascular smooth muscle, allowing systemic resistance vessels to relax.",
      boundary: "This does not dissolve an atherosclerotic narrowing. VesselDelta leaves the modeled narrowing geometry unchanged.",
      source: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf",
      sourceLabel: "FDA prescribing information",
    },
    thiazide: {
      eyebrow: "THIAZIDE-TYPE DIURETIC",
      title: "Change the renal sodium-volume pathway.",
      body: "Thiazide-type diuretics increase renal sodium and chloride excretion. Their educational pathway runs through volume and blood pressure—not through local plaque or blood viscosity.",
      boundary: "The tracer field does not become ‘thinner blood,’ and no medication is recommended for an individual here.",
      source: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf",
      sourceLabel: "FDA prescribing information",
    },
    statin: {
      eyebrow: "STATIN · NOT A BP DRUG",
      title: "Change a long-horizon LDL pathway.",
      body: "Statins inhibit HMG-CoA reductase and lower LDL through hepatic pathways over time. They do not instantly shrink the modeled narrowing or alter this CFD field.",
      boundary: "No plaque-regression animation, aneurysm claim, or personal treatment result is produced.",
      source: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf",
      sourceLabel: "FDA prescribing information",
    },
  }[mechanism];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#instrument" aria-label="VesselDelta home">
          <span className="brand-mark"><i /></span>
          <span>VESSELΔ</span>
        </a>
        <div className="topbar-center" aria-label="Model summary">
          <span>2D D2Q9 CFD</span>
          <i />
          <span>3D cutaway</span>
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
          <p className="hero-deck">Pinch or widen the wall while synchronized local solvers recompute modeled velocity, an axial near-wall gradient proxy, and vorticity against a matched reference.</p>
        </div>

        <div className="story-tabs" role="tablist" aria-label="Vessel stories">
          {(["healthy", "stenosis", "aneurysm", "hypertension"] as Scenario[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-label={item === "healthy" ? "Reference channel" : item === "stenosis" ? "Idealized artery narrowing" : item === "aneurysm" ? "Idealized aortic-like bulge" : "Higher pressure state"}
              aria-selected={scenario === item && !(item === "healthy" && edited)}
              className={scenario === item && !(item === "healthy" && edited) ? "active" : ""}
              onClick={() => applyScenario(item)}
            >
              <ScenarioIcon type={item} />
              <span>{item === "healthy" ? "Reference" : item === "stenosis" ? "Artery narrowing" : item === "aneurysm" ? "Aortic-like bulge" : "Higher pressure"}</span>
            </button>
          ))}
        </div>

        <div className="instrument-grid">
          <section ref={instrumentPanelRef} className="canvas-panel" aria-label="Interactive blood flow experiment">
            <div className="canvas-status">
              <span className="live-pill"><i /> {paused ? "PAUSED" : "LIVE SOLVE"}</span>
              <span className={settling || !fluxReady ? "settling" : "evolving"}>{fieldStatus}</span>
              <span className="runtime-pill">{fps || "—"} FPS · {stepsPerSecond || "—"} TWIN STEPS/S</span>
            </div>
            <div className="stage-switcher" role="group" aria-label="Choose anatomical or computed view">
              <button type="button" className={stageView === "anatomy" ? "active" : ""} onClick={() => setStageView("anatomy")}>3D interpretation</button>
              <button type="button" className={stageView === "slice" ? "active" : ""} onClick={() => setStageView("slice")}>Computed slice</button>
            </div>
            {stageView === "anatomy" ? (
              <Suspense fallback={<div className="theatre-loading"><span>Preparing the 3D interpretation</span></div>}>
                <VesselTheatre3D
                  engineRef={engineRef}
                  controlRef={controlRef}
                  scenario={scenario}
                  layer={layer}
                  pressure={pressure}
                  paused={paused}
                  stentProgress={stentProgress}
                  onShowSlice={() => setStageView("slice")}
                />
              </Suspense>
            ) : null}
            <div className={`canvas-instruction ${stageView === "slice" && !edited ? "" : "stage-hidden"}`} aria-hidden={edited || stageView !== "slice"}>
              <span className="gesture-ring" />
              <strong>{edited ? "Keep sculpting" : "Drag either vessel wall"}</strong>
              <small>The ghost line is the untouched control</small>
            </div>
            <canvas
              ref={canvasRef}
              className={`flow-canvas ${stageView === "slice" ? "stage-active" : "stage-inactive"}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label={`Live computed two-dimensional flow field. ${interpretation}`}
              aria-hidden={stageView !== "slice"}
            />
            <div className={`flow-direction ${stageView === "slice" ? "" : "stage-hidden"}`}><span>INLET</span><i /><span>FLOW</span></div>
            <div className={`legend ${stageView === "slice" ? "" : "stage-hidden"}`}>
              <span>{layer === "vorticity" ? "NEGATIVE" : "LOW"}</span><i className={`legend-${layer}`} /><span>{layer === "vorticity" ? "POSITIVE" : "HIGH"}</span>
            </div>
            <div className="canvas-caption" aria-live="polite">
              <span className="caption-index">{stageView === "anatomy" ? "3D" : "2D"}</span>
              <p>{stageView === "anatomy" ? `An axisymmetric cutaway wraps a color rendering of the current computed grid without claiming volumetric CFD. ${interpretation}` : interpretation}</p>
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
                    aria-label={option.label}
                    aria-pressed={layer === option.id}
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
                <span>{scenario === "healthy" && edited ? "CUSTOM" : scenario === "stenosis" ? "IDEALIZED NARROWING" : scenario === "aneurysm" ? "AORTIC-LIKE BULGE" : scenario === "hypertension" ? "HIGHER PRESSURE" : "REFERENCE"} VS REFERENCE</span>
                <small>same steady flow drive</small>
              </div>
              <div className="metric-grid">
                <MetricCard eyebrow="Modeled peak speed" value={comparisonsValid ? formatDelta(speedRatio) : "—"} detail={comparisonsValid ? `${formatRatio(speedRatio)} reference` : unavailableDetail} tone="cyan" />
                <MetricCard eyebrow="Peak shear proxy" value={comparisonsValid ? formatDelta(shearRatio) : "—"} detail={comparisonsValid ? `${formatRatio(shearRatio)} reference` : unavailableDetail} tone="rose" />
                <MetricCard eyebrow="Modeled peak vorticity" value={comparisonsValid ? formatRatio(vorticityRatio) : "—"} detail={comparisonsValid ? (vorticityRatio >= 2 ? "more than doubled" : "local turning") : unavailableDetail} tone="amber" />
              </div>
              {!comparisonsValid ? <p className="metric-gate-warning" role="status">{settling ? "Comparisons withheld · fields recomputing" : !fluxReady ? "Comparisons withheld · flux mismatch above 2% · wait or inspect Verify physics" : "Comparisons withheld · reset geometry or reduce flow drive · inspect Verify physics"}</p> : null}
              {scenario === "stenosis" ? (
                <button type="button" className="stent-action" onClick={deployIdealizedStent} disabled={stentStatus === "deploying"}>
                  <span>{stentStatus === "deploying" ? "MORPHING GEOMETRY" : stentStatus === "restored" ? "REPLAY RESTORATION" : "IDEALIZED LUMEN RESTORATION"}</span>
                  <strong>{stentStatus === "restored" ? "Modeled lumen widened; field recomputing" : "Apply a geometric counterfactual"}</strong>
                  <small>Geometry counterfactual · not an outcome prediction</small>
                </button>
              ) : null}
            </section>

            <section className="rail-section controls-section">
              <div className="rail-heading">
                <span>TWO INDEPENDENT FORCES</span>
                <small>Do not confuse pressure with shear</small>
              </div>
              <label className="control-row">
                <span><b>Flow drive</b><small>sets inlet velocity · capped to verified sculpting envelope</small></span>
                <output>{Math.round((flowDrive / 0.018) * 100)}%</output>
                <input
                  data-testid="flow-drive"
                  type="range"
                  min="0.012"
                  max="0.020"
                  step="0.001"
                  value={flowDrive}
                  onInput={(event) => setFlowDrive(Number(event.currentTarget.value))}
                />
              </label>
              <label className="control-row pressure-control">
                <span><b>Illustrative pressure factor</b><small>ratio only · not a measured BP · does not change CFD</small></span>
                <output>{(pressure / 120).toFixed(2)}× baseline</output>
                <input
                  data-testid="pressure-factor"
                  type="range"
                  min="90"
                  max="180"
                  step="5"
                  value={pressure}
                  aria-label="Illustrative relative pressure factor"
                  aria-valuetext={`${(pressure / 120).toFixed(2)} times model baseline; illustrative relative pressure, not millimeters of mercury`}
                  onInput={(event) => setPressure(Number(event.currentTarget.value))}
                />
              </label>
              <div className="load-readout">
                <span>Relative wall-tension index</span>
                <strong>{loadRatio.toFixed(2)}×</strong>
                <small>Thin-cylinder relation · not rupture risk</small>
              </div>
            </section>
          </aside>
        </div>

        <section className="prediction-card" aria-label="Three-step mechanics check">
          {challengeComplete ? (
            <>
              <div>
                <span className="prediction-number">MECHANICS CHECK COMPLETE</span>
                <h2>{challengeScore} / {CHALLENGES.length} model distinctions correct</h2>
              </div>
              <div className="prediction-actions">
                <button type="button" onClick={resetChallenge}>Try the check again</button>
                <button type="button" className="reveal-button" onClick={() => setRuptureOpen(true)}>Inspect the model boundary</button>
              </div>
              <div className="prediction-result correct"><strong>Local result only.</strong><span>This checks three concepts in the current session; it is not evidence of learning efficacy or clinical competence.</span></div>
            </>
          ) : (
            <>
              <div>
                <span className="prediction-number">PREDICT BEFORE REVEAL · {challengeIndex + 1} / {CHALLENGES.length}</span>
                <h2>{activeChallenge.question}</h2>
              </div>
              <div className="prediction-actions">
                {activeChallenge.options.map((option) => (
                  <button key={option.id} type="button" disabled={revealed} className={prediction === option.id ? "selected" : ""} onClick={() => { setPrediction(option.id); setRevealed(false); }}>{option.label}</button>
                ))}
                <button type="button" className="reveal-button" disabled={!prediction || revealed} onClick={revealChallenge}>Reveal with the model</button>
              </div>
              {revealed ? (
                <div className={`prediction-result ${prediction === activeChallenge.correct ? "correct" : "learn"}`}>
                  <span><strong>{prediction === activeChallenge.correct ? "Prediction supported." : "The model shows a different distinction."}</strong>{activeChallenge.explanation}</span>
                  <button type="button" className="prediction-next" onClick={advanceChallenge}>{challengeIndex === CHALLENGES.length - 1 ? "See result" : "Next challenge"}</button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </section>

      <section className="lesson-section">
        <div className="lesson-intro">
          <p className="kicker"><span /> The lesson hiding in plain sight</p>
          <h2>Blood loads a vessel through<br /><em>two distinct mechanics.</em></h2>
          <p>Flow produces tangential wall shear, while pressure acts normally on the wall and is related to circumferential wall tension. VesselDelta keeps the live axial near-wall gradient proxy separate from a thin-cylinder pressure–radius tension relation.</p>
        </div>
        <div className="force-cards">
          <article className="force-card shear-force">
            <span className="force-index">A</span>
            <div className="force-visual shear-visual"><i /><i /><i /><i /></div>
            <p className="force-kicker">TANGENTIAL</p>
            <h3>Flow shear</h3>
            <p>VesselDelta samples the axial velocity inward from the stair-stepped wall. It is a normalized grid proxy, not the true wall-normal derivative on a sloped vessel.</p>
            <code>normalized proxy ∝ ν · Δuₓ/Δy</code>
          </article>
          <article className="force-card pressure-force">
            <span className="force-index">B</span>
            <div className="force-visual pressure-visual"><i /><i /><i /><i /></div>
            <p className="force-kicker">NORMAL PRESSURE → CIRCUMFERENTIAL</p>
            <h3>Wall tension relation</h3>
            <p>A separate thin-cylinder relation shows why both higher pressure and a larger radius raise the relative circumferential wall-tension index. This is not a rupture-probability model.</p>
            <code>relative tension index = P/P₀ · r/r₀</code>
          </article>
        </div>
        <button type="button" className="rupture-boundary" onClick={() => setRuptureOpen(true)}>
          <span>MODEL BOUNDARY</span>
          <strong>Can this model predict rupture?</strong>
          <small>Open the missing-physics receipt</small>
        </button>
      </section>

      <section className="burden-section" aria-labelledby="burden-title">
        <div className="burden-intro">
          <p className="kicker"><span /> Evidence, not alarm</p>
          <h2 id="burden-title">A mechanics lesson for<br /><em>119.9 million adults.</em></h2>
          <p>Nearly half of U.S. adults meet the CDC hypertension definition. VesselDelta does not diagnose or treat them; it makes one foundational distinction visible: pressure-driven wall load is not the same quantity as flow-related shear.</p>
          <a href="https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html" target="_blank" rel="noreferrer">Read the current CDC evidence ↗</a>
        </div>
        <div className="burden-stats">
          <article><strong>48.1%</strong><span>of U.S. adults</span><small>119.9 million; CDC NHANES 2017–March 2020 estimate</small></article>
          <article><strong>22.5%</strong><span>of adults with hypertension had it controlled below 130/80</span><small>CDC NHANES 2017–March 2020 estimate</small></article>
          <article><strong>680,179</strong><span>2024 death certificates</span><small>high BP was a primary or contributing cause—not necessarily the sole cause</small></article>
        </div>
      </section>

      <section className="evidence-section" aria-labelledby="evidence-title">
        <div className="evidence-heading">
          <p className="kicker"><span /> What sustained habits can change</p>
          <h2 id="evidence-title">Show the evidence.<br /><em>Do not fake the biology.</em></h2>
          <p>These are approximate average systolic blood-pressure reductions summarized by the AHA for adults without hypertension. Do not arithmetically sum the displayed ranges into a personal forecast; combined effects vary.</p>
        </div>
        <div className="evidence-cards">
          <article>
            <span>EVIDENCE · DIET PATTERN</span><strong>≈ 3–7 mm Hg</strong><h3>Sustained DASH-style pattern</h3><p>A heart-healthy eating pattern can lower blood pressure over time. It does not instantly erase a modeled narrowing.</p>
          </article>
          <article>
            <span>EVIDENCE · SODIUM</span><strong>≈ 1–4 mm Hg</strong><h3>Reducing sodium toward guidance</h3><p>This is a sustained population effect range—not a “salty meal” animation or a viscosity change.</p>
          </article>
          <article>
            <span>EVIDENCE · MOVEMENT</span><strong>≈ 2–7 mm Hg</strong><h3>Regular aerobic activity</h3><p>A structured exercise habit can help lower pressure. One workout does not remodel this artery.</p>
          </article>
        </div>
        <div className="evidence-footer">
          <span>Ranges overlap · combined effects vary · not a personal forecast</span>
          <a href="https://professional.heart.org/en/-/media/files/health-topics/high-blood-pressure/bp-health-guide.pdf" target="_blank" rel="noreferrer">AHA 2025 BP-lowering ranges ↗</a>
        </div>
      </section>

      <section className="mechanism-section" aria-labelledby="mechanism-title">
        <div className="mechanism-heading">
          <p className="kicker"><span /> Treatment mechanism theatre</p>
          <h2 id="mechanism-title">Watch the pathway.<br /><em>Keep efficacy out of the fiction.</em></h2>
          <p>Medication classes can be taught without pretending this local vessel predicts a person’s response. The animation is illustrative; the CFD remains unchanged unless the learner independently changes geometry or flow drive.</p>
        </div>
        <div className="mechanism-shell">
          <div className="mechanism-tabs" role="tablist" aria-label="Medication mechanism classes">
            {(["ace", "ccb", "thiazide", "statin"] as const).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={mechanism === item} className={mechanism === item ? "active" : ""} onClick={() => setMechanism(item)}>
                {item === "ace" ? "ACEi / ARB" : item === "ccb" ? "Calcium blocker" : item === "thiazide" ? "Thiazide" : "Statin"}
              </button>
            ))}
          </div>
          <div className={`mechanism-visual mechanism-${mechanism}`} aria-hidden="true">
            <div className="signal-stream"><i /><i /><i /><i /><i /><i /></div>
            <div className="mechanism-organ"><i /><i /><i /></div>
            <div className="tone-ring"><i /></div>
            <span className="mechanism-arrow">→</span>
          </div>
          <article className="mechanism-copy" aria-live="polite">
            <span>{mechanismCopy.eyebrow} · ILLUSTRATIVE</span>
            <h3>{mechanismCopy.title}</h3>
            <p>{mechanismCopy.body}</p>
            <small>{mechanismCopy.boundary}</small>
            <a href={mechanismCopy.source} target="_blank" rel="noreferrer">{mechanismCopy.sourceLabel} ↗</a>
            {"source2" in mechanismCopy ? <a href={mechanismCopy.source2} target="_blank" rel="noreferrer">{mechanismCopy.sourceLabel2} ↗</a> : null}
          </article>
        </div>
        <p className="review-disclosure"><strong>Review status</strong> No physician review, educator study, or clinical validation was completed. Educational mechanics only; not medical advice, diagnosis, prediction, or treatment guidance.</p>
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
          <article><span>04</span><h3>Honest scope</h3><p>Two-dimensional, Newtonian fluid, rigid walls, idealized boundaries. A mechanics-intuition tool—not clinical CFD.</p><strong>Model card always visible</strong></article>
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
              <article><span>INCLUDES</span><p>2D D2Q9 BGK lattice-Boltzmann flow, rigid no-slip walls, smooth constrained geometry, a normalized axial near-wall gradient proxy, and a separate thin-cylinder pressure–radius relative wall-tension relation. The 3D cutaway revolves that 2D wall profile; RBC-shaped massless tracers follow the computed slice.</p></article>
              <article><span>DOES NOT INCLUDE</span><p>Patient anatomy, pulsatile flow, compliant or anisotropic tissue, non-Newtonian or cell-resolved blood physics, hematocrit, cell deformation, aggregation, collisions, hemolysis or margination, 3D secondary flow, plaque biology, clotting, a physical time scale, calibrated clinical units, diagnosis, treatment selection or response, or rupture prediction.</p></article>
              <article><span>READ COLOR CAREFULLY</span><p>Bright color marks a modeled quantity—not “disease here.” Low, high, and oscillatory shear can each matter in different biological contexts. This instrument cannot tell where plaque will form.</p></article>
              <article><span>PRESSURE ≠ FLOW SHEAR</span><p>The pressure slider changes only the separate thin-cylinder P × r relative-tension teaching layer. It is not hoop stress and does not silently make the CFD run faster. That separation is the lesson.</p></article>
            </div>
            <p className="citation-note">Methods follow the standard D2Q9 BGK formulation and Zou–He velocity/density boundaries. 3D geometry, medication pathways, and lifestyle evidence are interpretive layers—not additional solver physics. Scientific references and validation scripts are documented in the project README. No physician review or clinical validation was performed. Educational use only; not diagnostic, predictive, or treatment guidance.</p>
            <button type="button" className="modal-primary" onClick={() => setLimitsOpen(false)}>Return to the instrument</button>
          </section>
        </div>
      ) : null}

      {ruptureOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRuptureOpen(false)}>
          <section className="verification-modal rupture-modal" role="dialog" aria-modal="true" aria-labelledby="rupture-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setRuptureOpen(false)} aria-label="Close rupture boundary">×</button>
            <p className="modal-kicker">MODEL BOUNDARY · NOT CALCULATED</p>
            <h2 id="rupture-title">This model<br /><em>cannot answer.</em></h2>
            <p className="modal-deck">A rigid-wall flow solver has no deforming tissue and no failure criterion. A cinematic tear would look dramatic but would not be physics.</p>
            <div className="missing-inputs">
              <article><span>01</span><strong>Wall thickness</strong><p>Not measured or spatially modeled.</p></article>
              <article><span>02</span><strong>Tissue strength</strong><p>No patient-specific material or failure law.</p></article>
              <article><span>03</span><strong>Growth and context</strong><p>No patient-specific location, diameter, wall morphology, longitudinal growth, symptoms, smoking history, genetic context, or prior hemorrhage.</p></article>
              <article><span>04</span><strong>Fluid–structure coupling</strong><p>The displayed wall is deliberately rigid.</p></article>
            </div>
            <div className="boundary-equation"><span>Computed: fluid field + relative wall-tension index</span><i /> <span>Not computed: rupture stress, threshold, probability, or timing</span></div>
            <button type="button" className="modal-primary" onClick={() => setRuptureOpen(false)}>Return to the instrument</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
