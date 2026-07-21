"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { comparisonMetricsReady, HemoEngine, wallLoadRatio } from "./hemo-engine.js";
import { WallStressLab } from "./wall-stress-lab";

const VesselTheatre3D = lazy(() =>
  import("./vessel-theatre-3d").then((module) => ({ default: module.VesselTheatre3D })),
);

type Layer = "velocity" | "vorticity" | "shear" | "wallLoad";
type Scenario = "healthy" | "stenosis" | "aneurysm" | "hypertension";
type StageView = "anatomy" | "slice";
type ExperienceMode = "guided" | "explore";
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
    question: "Where does flow move fastest in a narrowed vessel?",
    options: [
      { id: "throat", label: "At the tightest spot" },
      { id: "downstream", label: "Past the tight spot" },
    ],
    correct: "throat",
    explanation: "The same inlet setting is squeezed through a smaller opening, so the fastest jet forms at the tightest spot.",
  },
  {
    id: "pressure",
    question: "If pressure rises but the flow setting stays the same, what changes?",
    options: [
      { id: "tension", label: "The wall-load number rises" },
      { id: "jet", label: "The flow speeds up by itself" },
    ],
    correct: "tension",
    explanation: "Higher pressure raises the separate pressure × vessel-size wall load. It does not make this flow model run faster by itself.",
  },
  {
    id: "rupture",
    question: "What raises wall stress in the simple strength test?",
    options: [
      { id: "threshold", label: "More pressure, a wider bulge, or a thinner wall" },
      { id: "cannot", label: "A brighter flow color by itself" },
    ],
    correct: "threshold",
    explanation: "The real thin-wall equation is stress = pressure × radius ÷ thickness. Compare it with a chosen tissue-strength value in the wall test.",
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
  const dialogRef = useRef<HTMLElement | null>(null);
  const clinicalContextRef = useRef<HTMLDetailsElement | null>(null);
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
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>("guided");
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
  const [keyboardSculptX, setKeyboardSculptX] = useState(80);

  useEffect(() => {
    if (!verifyOpen && !limitsOpen && !ruptureOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusInitial = window.requestAnimationFrame(() => {
      (dialog.querySelector<HTMLElement>(focusSelector) ?? dialog).focus();
    });
    const closeDialog = () => {
      if (verifyOpen) setVerifyOpen(false);
      else if (limitsOpen) setLimitsOpen(false);
      else setRuptureOpen(false);
    };
    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusInitial);
      document.removeEventListener("keydown", onDialogKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [limitsOpen, ruptureOpen, verifyOpen]);

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

  const scrollTo = (target: Element | null) => {
    if (!target) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    target.scrollIntoView({ behavior, block: "start" });
  };

  const runPublicCase = (next: Scenario) => {
    setExperienceMode("explore");
    applyScenario(next);
    if (next === "hypertension") setRuptureOpen(true);
    window.requestAnimationFrame(() => scrollTo(document.getElementById("instrument")));
  };

  const openEverydayPathways = () => {
    if (!clinicalContextRef.current) return;
    clinicalContextRef.current.open = true;
    window.requestAnimationFrame(() => scrollTo(clinicalContextRef.current));
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      active.setStenosisRestoration(1);
      setStentProgress(1);
      settlingUntilStepRef.current = active.stepCount + PRESET_WARMUP_STEPS;
      setSettling(true);
      setStentStatus("restored");
      return;
    }
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

  const enterGuidedMode = () => {
    if (experienceMode === "guided") return;
    setExperienceMode("guided");
    if (activeChallenge.id === "flow") {
      applyScenario("stenosis");
      setLayer("velocity");
      setStageView(revealed ? "slice" : "anatomy");
    } else if (activeChallenge.id === "pressure") {
      applyScenario("hypertension");
      setLayer("wallLoad");
    } else {
      applyScenario("aneurysm");
      setLayer("wallLoad");
    }
    if (revealed) setRevealed(true);
  };

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
    setExperienceMode("guided");
    applyScenario("stenosis");
    setLayer("velocity");
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

  const onCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setKeyboardSculptX((current) => clamp(current + direction * 4, engine.buffer + 2, engine.nx - engine.buffer - 3));
      return;
    }
    const ix = clamp(Math.round(keyboardSculptX), 0, engine.nx - 1);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    engine.sculpt(keyboardSculptX, engine.top[ix] + direction, "top");
    engine.sculpt(keyboardSculptX, engine.bottom[ix] - direction, "bottom");
    settlingUntilStepRef.current = engine.stepCount + EDIT_WARMUP_STEPS;
    setEdited(true);
    setRevealed(false);
    setSettling(true);
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
  const fieldStatus = settling ? "UPDATING BOTH MODELS" : !fluxReady ? "NUMERICAL CHECK RUNNING" : "LIVE RESULT READY";

  const interpretation =
    !comparisonsValid
      ? settling
        ? "The model is updating and checking that flow entering and leaving still matches. Numbers appear when that check passes."
        : !fluxReady
          ? "The model is still balancing flow in and flow out. Wait a moment; if this stays visible, reset the vessel or lower the flow setting."
          : "This shape pushed the model outside its reliable range. Reset the vessel or lower the flow setting, then open Verify physics."
      : scenario === "hypertension"
      ? `The higher pressure setting raises relative wall load to ${loadRatio.toFixed(2)}× the straight-vessel baseline. The flow-speed setting did not change.`
      : scenario === "aneurysm" || maxRadiusRatio > 1.18
      ? `The wider section raises relative wall load to ${loadRatio.toFixed(2)}× the straight-vessel baseline. Flow also slows and swirls inside the wider space.`
      : metrics.minDiameterRatio < 0.88
        ? `At the pinch, the fastest modeled flow is ${speedRatio.toFixed(2)}× the straight-vessel result and the near-wall flow change is ${shearRatio.toFixed(2)}× as large.`
        : "The straight vessel gives a smooth baseline. Draw the wall to test your own shape under the same flow setting.";

  const layerOptions: Array<{ id: Layer; label: string }> = [
    { id: "velocity", label: "Flow speed" },
    { id: "vorticity", label: "Swirl" },
    { id: "shear", label: "Near-wall change" },
    { id: "wallLoad", label: "Relative wall load" },
  ];

  const mechanismCopy = {
    ace: {
      eyebrow: "ACE INHIBITOR / ARB",
      title: "Turn down a vessel-tightening signal.",
      body: "ACE inhibitors reduce production of angiotensin II. ARBs block one of its receptors. Both can reduce vessel-tightening and salt-retaining signals, but they work at different steps.",
      boundary: "The live flow does not invent a drug response. You can change the separate pressure input yourself to ask a what-if question.",
      source: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=350c6fc9-9774-4d49-9242-19e96944f83b",
      sourceLabel: "ACE inhibitor label",
      source2: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf",
      sourceLabel2: "ARB label",
    },
    ccb: {
      eyebrow: "CALCIUM-CHANNEL BLOCKER",
      title: "Help artery muscle relax.",
      body: "Calcium helps the smooth muscle around arteries contract. These medicines reduce calcium entry, so that muscle can relax and resistance can fall.",
      boundary: "This does not dissolve plaque. VesselDelta leaves the modeled narrowing unchanged.",
      source: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/021540s045lbl.pdf",
      sourceLabel: "FDA prescribing information",
    },
    thiazide: {
      eyebrow: "THIAZIDE-TYPE DIURETIC",
      title: "Help the kidneys remove sodium and water.",
      body: "Thiazide-type diuretics increase sodium and water loss through the kidneys. Over time, that can reduce blood volume and blood pressure.",
      boundary: "They do not make blood physically thinner in this animation, and VesselDelta does not recommend a medicine.",
      source: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/020387s063lbl.pdf",
      sourceLabel: "FDA prescribing information",
    },
    statin: {
      eyebrow: "STATIN · NOT A BP DRUG",
      title: "Lower LDL cholesterol over time.",
      body: "Statins reduce cholesterol production in the liver and help lower LDL. They do not instantly shrink this modeled narrowing or change the live flow field.",
      boundary: "No plaque-shrinking or personal treatment result is being predicted here.",
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
          <span>2D LIVE FLOW MODEL</span>
          <i />
          <span>3D VIEW</span>
          <i />
          <span>EDUCATIONAL</span>
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
          <p className="kicker"><span /> Live vessel experiment</p>
          <h1>Change a vessel.<br /><em>See what pressure and flow do.</em></h1>
          <p className="hero-deck">Pinch the vessel and modeled blood forms a faster jet. Widen it and flow swirls. Raise pressure or thin the wall and wall stress climbs.</p>
        </div>

        <div className="story-tabs" role="group" aria-label="Vessel stories">
          {(["healthy", "stenosis", "aneurysm", "hypertension"] as Scenario[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-label={item === "healthy" ? "Show the straight reference vessel" : item === "stenosis" ? "Show narrowing and a faster jet" : item === "aneurysm" ? "Show a bulge and swirling flow" : "Open the higher-pressure wall-stress test"}
              aria-pressed={scenario === item && !(item === "healthy" && edited)}
              className={scenario === item && !(item === "healthy" && edited) ? "active" : ""}
              onClick={() => {
                setExperienceMode("explore");
                applyScenario(item);
                if (item === "hypertension") setRuptureOpen(true);
              }}
            >
              <ScenarioIcon type={item} />
              <span>{item === "healthy" ? "Straight vessel" : item === "stenosis" ? "Narrow → fast jet" : item === "aneurysm" ? "Bulge → swirl" : "Pressure ↑ → wall stress ↑"}</span>
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
              <button type="button" aria-pressed={stageView === "anatomy"} className={stageView === "anatomy" ? "active" : ""} onClick={() => setStageView("anatomy")}>3D interpretation</button>
              <button type="button" aria-pressed={stageView === "slice"} className={stageView === "slice" ? "active" : ""} onClick={() => setStageView("slice")}>Live flow slice</button>
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
              <strong>{edited ? "Keep changing the vessel" : "Drag either vessel wall or use arrow keys"}</strong>
              <small>Left/right choose a spot · up/down changes it · faint line is the straight comparison</small>
            </div>
            <canvas
              ref={canvasRef}
              className={`flow-canvas ${stageView === "slice" ? "stage-active" : "stage-inactive"}`}
              tabIndex={stageView === "slice" ? 0 : -1}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onCanvasKeyDown}
              aria-label={`Live computed two-dimensional flow field. Keyboard sculpting: left and right choose a column; up widens and down narrows at column ${Math.round(keyboardSculptX) + 1} of 160. ${interpretation}`}
              aria-hidden={stageView !== "slice"}
            />
            <div className={`flow-direction ${stageView === "slice" ? "" : "stage-hidden"}`}><span>INLET</span><i /><span>FLOW</span></div>
            <div className={`legend ${stageView === "slice" ? "" : "stage-hidden"}`}>
              <span>{layer === "vorticity" ? "NEGATIVE" : "LOW"}</span><i className={`legend-${layer}`} /><span>{layer === "vorticity" ? "POSITIVE" : "HIGH"}</span>
            </div>
            <div className="canvas-caption">
              <span className="caption-index">{stageView === "anatomy" ? "3D" : "2D"}</span>
              <p>{stageView === "anatomy" ? `This 3D vessel is shaped from the live 2D flow model. ${interpretation}` : interpretation}</p>
            </div>
          </section>

          <aside className="control-rail">
            <div className="experience-switch" role="group" aria-label="Choose guided lab or free exploration">
              <button type="button" className={experienceMode === "guided" ? "active" : ""} aria-pressed={experienceMode === "guided"} onClick={enterGuidedMode}>45-second tour</button>
              <button type="button" className={experienceMode === "explore" ? "active" : ""} aria-pressed={experienceMode === "explore"} onClick={() => setExperienceMode("explore")}>Try it yourself</button>
            </div>

            {experienceMode === "guided" ? (
              <section className={`guided-rail ${challengeComplete ? "guided-complete" : ""}`} aria-label="Three-step live mechanics lab">
                {challengeComplete ? (
                  <>
                    <div className="guided-progress complete"><span>LAB COMPLETE</span><i /></div>
                    <span className="guided-eyebrow">THREE CHANGES · ONE LIVE MODEL</span>
                    <h2>Flow, pressure, and wall strength<br />change for different reasons.</h2>
                    <div className="guided-receipt">
                      <article><span>01</span><p><strong>Narrowing</strong> makes the fastest jet at the tightest spot.</p></article>
                      <article><span>02</span><p><strong>Higher pressure</strong> increases the load carried by the wall.</p></article>
                      <article><span>03</span><p><strong>Pressure, size, thickness, and strength</strong> set the simple wall-stress margin.</p></article>
                    </div>
                    <p className="guided-boundary">{challengeScore} / {CHALLENGES.length} correct in this local check. This is not a validated assessment or evidence of learning efficacy.</p>
                    <div className="guided-footer-actions">
                      <button type="button" className="guided-primary" onClick={() => { setExperienceMode("explore"); setStageView("slice"); setLayer("velocity"); window.requestAnimationFrame(() => canvasRef.current?.focus()); }}>Draw your own vessel</button>
                      <button type="button" onClick={resetChallenge}>Run again</button>
                      <button type="button" onClick={() => setLimitsOpen(true)}>Open model receipt</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="guided-progress"><span>STEP {challengeIndex + 1} OF {CHALLENGES.length}</span><i style={{ width: `${((challengeIndex + (revealed ? 1 : 0.35)) / CHALLENGES.length) * 100}%` }} /></div>
                    <span className="guided-eyebrow">MAKE A GUESS, THEN TEST IT</span>
                    <h2>{activeChallenge.question}</h2>
                    <p className="guided-prompt">Choose an answer. The model compares the changed vessel with the same straight reference.</p>
                    <div className="guided-options" role="group" aria-label={activeChallenge.question}>
                      {activeChallenge.options.map((option, optionIndex) => (
                        <button key={option.id} type="button" disabled={revealed} aria-pressed={prediction === option.id} className={prediction === option.id ? "selected" : ""} onClick={() => { setPrediction(option.id); setRevealed(false); }}>
                          <span>{String.fromCharCode(65 + optionIndex)}</span>{option.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="guided-reveal" disabled={!prediction || revealed} onClick={revealChallenge}>Run the live test</button>
                    {revealed ? (
                      <div className={`guided-result ${prediction === activeChallenge.correct ? "correct" : "learn"}`} role="status" aria-live="polite">
                        <span>{prediction === activeChallenge.correct ? "PREDICTION SUPPORTED" : "MODEL SHOWS A DIFFERENT DISTINCTION"}</span>
                        <p>{activeChallenge.explanation}</p>
                        {activeChallenge.id === "flow" ? (
                          <div className="guided-live-readout">
                            <small>{comparisonsValid ? "LIVE COMPARISON PASSED ITS CHECK" : settling ? "BOTH VESSELS ARE UPDATING" : "WAITING FOR THE NUMERICAL CHECK"}</small>
                            <strong>{comparisonsValid ? `${formatRatio(speedRatio)} faster jet · ${formatRatio(shearRatio)} near-wall change` : "— · —"}</strong>
                          </div>
                        ) : activeChallenge.id === "pressure" ? (
                          <div className="guided-live-readout">
                            <small>PRESSURE × VESSEL SIZE</small>
                            <strong>{loadRatio.toFixed(2)}× wall load · flow setting unchanged</strong>
                          </div>
                        ) : (
                          <button type="button" className="guided-boundary-button" onClick={() => setRuptureOpen(true)}>Open the wall stress &amp; strength test</button>
                        )}
                        <button type="button" className="guided-next" disabled={activeChallenge.id === "flow" && !comparisonsValid} onClick={advanceChallenge}>{activeChallenge.id === "flow" && !comparisonsValid ? "Waiting for gated field" : challengeIndex === CHALLENGES.length - 1 ? "Finish lab" : "Next distinction"}</button>
                      </div>
                    ) : null}
                    <button type="button" className="guided-skip" onClick={() => setExperienceMode("explore")}>Skip to try it yourself</button>
                  </>
                )}
              </section>
            ) : (
              <>
                <section className="rail-section layer-section">
                  <div className="rail-heading">
                    <span>WHAT DO YOU WANT TO SEE?</span>
                    <small>Switch the live view</small>
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
                    <span>{scenario === "healthy" && edited ? "YOUR VESSEL" : scenario === "stenosis" ? "NARROWING" : scenario === "aneurysm" ? "BULGE" : scenario === "hypertension" ? "HIGHER PRESSURE" : "STRAIGHT VESSEL"} VS STRAIGHT</span>
                    <small>same steady flow drive</small>
                  </div>
                  <div className="metric-grid">
                    <MetricCard eyebrow="Fastest flow" value={comparisonsValid ? formatDelta(speedRatio) : "—"} detail={comparisonsValid ? `${formatRatio(speedRatio)} vs. straight vessel` : unavailableDetail} tone="cyan" />
                    <MetricCard eyebrow="Near-wall flow change" value={comparisonsValid ? formatDelta(shearRatio) : "—"} detail={comparisonsValid ? `${formatRatio(shearRatio)} vs. straight vessel` : unavailableDetail} tone="rose" />
                    <MetricCard eyebrow="Strongest swirl" value={comparisonsValid ? formatRatio(vorticityRatio) : "—"} detail={comparisonsValid ? (vorticityRatio >= 2 ? "more than doubled" : "local turning") : unavailableDetail} tone="amber" />
                  </div>
                  {!comparisonsValid ? <p className="metric-gate-warning" role="status">{settling ? "Results stay hidden until both models finish updating." : !fluxReady ? "Results stay hidden until both models pass the numerical checks." : "Reset the shape or lower the flow setting, then inspect Verify physics."}</p> : null}
                  {scenario === "stenosis" ? (
                    <button type="button" className="stent-action" onClick={deployIdealizedStent} disabled={stentStatus === "deploying"}>
                      <span>{stentStatus === "deploying" ? "WIDENING THE PASSAGE" : stentStatus === "restored" ? "REPLAY THE CHANGE" : "SHOW A WIDER PASSAGE"}</span>
                      <strong>{stentStatus === "restored" ? "Passage widened; flow updating" : "Widen this modeled narrowing"}</strong>
                      <small>Shape experiment · not a treatment prediction</small>
                    </button>
                  ) : null}
                </section>

                <section className="rail-section controls-section">
                  <div className="rail-heading">
                    <span>PRESSURE AND FLOW ARE DIFFERENT</span>
                    <small>Pressure pushes outward. Flow moves along the wall.</small>
                  </div>
                  <label className="control-row">
                    <span><b>Flow setting</b><small>changes the model&apos;s inlet speed</small></span>
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
                    <span><b>Pressure input</b><small>pushes outward · does not change the flow setting</small></span>
                    <output>{pressure} mm Hg</output>
                    <input
                      data-testid="pressure-factor"
                      type="range"
                      min="90"
                      max="180"
                      step="5"
                      value={pressure}
                      aria-label="Selected teaching pressure"
                      aria-valuetext={`${pressure} millimeters of mercury selected for the separate wall-load lesson`}
                      onInput={(event) => setPressure(Number(event.currentTarget.value))}
                    />
                  </label>
                  <div className="load-readout">
                    <span>Relative wall load</span>
                    <strong>{loadRatio.toFixed(2)}×</strong>
                    <small>Higher pressure and a larger radius raise it</small>
                  </div>
                  <button type="button" className="wall-lab-open" onClick={() => setRuptureOpen(true)}>Open wall stress &amp; strength test</button>
                </section>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="lesson-section">
        <div className="lesson-intro">
          <p className="kicker"><span /> Two forces, one vessel</p>
          <h2>Flow drags along the wall.<br /><em>Pressure pushes it outward.</em></h2>
          <p>Pinch the passage and the flow forms a faster jet. Widen it and flow can swirl. More pressure, a wider vessel, or a thinner wall raises the stress carried by the wall.</p>
        </div>
        <div className="force-cards">
          <article className="force-card shear-force">
            <span className="force-index">A</span>
            <div className="force-visual shear-visual"><i /><i /><i /><i /></div>
            <p className="force-kicker">TANGENTIAL</p>
            <h3>Near-wall flow change</h3>
            <p>The live solver shows how quickly modeled flow changes next to the wall. Narrowing usually makes that change sharper.</p>
            <code>normalized proxy ∝ ν · Δuₓ/Δy</code>
          </article>
          <article className="force-card pressure-force">
            <span className="force-index">B</span>
            <div className="force-visual pressure-visual"><i /><i /><i /><i /></div>
            <p className="force-kicker">NORMAL PRESSURE → CIRCUMFERENTIAL</p>
            <h3>Wall stress and strength</h3>
            <p>The wall test uses real units to show why more pressure, a wider vessel, or a thinner wall removes mechanical margin.</p>
            <code>wall stress = pressure · radius / thickness</code>
          </article>
        </div>
        <button type="button" className="rupture-boundary" onClick={() => setRuptureOpen(true)}>
          <span>INTERACTIVE TEST</span>
          <strong>How do pressure, bulging, thickness, and tissue strength combine?</strong>
          <small>Change all four inputs and cross the selected teaching threshold</small>
        </button>
      </section>

      <section className="public-cases" aria-labelledby="public-cases-title">
        <div className="public-cases-heading">
          <div>
            <p className="kicker"><span /> Four real questions</p>
            <h2 id="public-cases-title">What changes now?<br /><em>What changes over time?</em></h2>
          </div>
          <p>Shape and pressure change the mechanics immediately. Food patterns, activity, and medicines work through body pathways over time. Run each case without mixing those timelines together.</p>
        </div>
        <div className="public-case-grid">
          <button type="button" onClick={() => runPublicCase("stenosis")}>
            <span><b>01</b> LIVE FLOW</span>
            <h3>What happens when plaque narrows the passage?</h3>
            <p>The same flow setting is squeezed through a smaller opening. The model forms a faster jet and a sharper near-wall flow change.</p>
            <strong>Run the narrowing case →</strong>
            <small>Models plaque shape, not plaque growth</small>
          </button>
          <button type="button" onClick={() => runPublicCase("hypertension")}>
            <span><b>02</b> WALL MECHANICS</span>
            <h3>What does higher pressure do to the wall?</h3>
            <p>Pressure pushes outward. Raise it in the wall lab and the calculated stress rises immediately in real units.</p>
            <strong>Test pressure, size, and thickness →</strong>
            <small>Interactive equation, not personal risk</small>
          </button>
          <button type="button" onClick={() => runPublicCase("aneurysm")}>
            <span><b>03</b> BULGE CASE</span>
            <h3>Why does a wider vessel change two things?</h3>
            <p>Flow slows and swirls inside the wider space. The larger radius separately raises the wall-stress estimate.</p>
            <strong>Run the bulge case →</strong>
            <small>Live flow plus a separate wall equation</small>
          </button>
          <button type="button" onClick={openEverydayPathways}>
            <span><b>04</b> OVER TIME</span>
            <h3>How can diet, activity, and medicines change pressure?</h3>
            <p>Explore sodium, DASH-style eating, movement, ACEi or ARB, calcium blockers, thiazides, and statins. Then run a pressure what-if.</p>
            <strong>Open the evidence pathways →</strong>
            <small>Source-backed group evidence, not a prescription</small>
          </button>
        </div>
      </section>

      <details ref={clinicalContextRef} className="clinical-context" id="clinical-context">
        <summary>
          <span className="context-index">WHY HIGH BLOOD PRESSURE MATTERS</span>
          <span className="context-summary-copy">
            <span className="context-title">See what can lower pressure<br /><em>over time.</em></span>
            <span className="context-deck">Open plain-language evidence on high blood pressure, food patterns, sodium, movement, and common medication pathways.</span>
          </span>
          <strong><span className="context-open-label">Open context</span><span className="context-close-label">Close context</span><i>+</i></strong>
        </summary>
        <div className="clinical-context-content">
      <section className="burden-section" aria-labelledby="burden-title">
        <div className="burden-intro">
          <p className="kicker"><span /> Evidence, not alarm</p>
          <h2 id="burden-title">A mechanics lesson for<br /><em>119.9 million adults.</em></h2>
          <p>Nearly half of U.S. adults meet the CDC hypertension definition. Pressure pushes a vessel wall outward. Moving blood drags along its inner surface. VesselDelta lets anyone see both mechanics without pretending to diagnose them.</p>
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
          <h2 id="evidence-title">Pressure can change over time.<br /><em>A vessel does not redraw itself in seconds.</em></h2>
          <p>These AHA ranges summarize average changes in the top blood-pressure number for groups of adults without hypertension. They are not a personal forecast and should not be added together.</p>
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
          <a href="https://www.ahajournals.org/doi/10.1161/HYP.0000000000000249" target="_blank" rel="noreferrer">AHA/ACC Table 12 population columns ↗</a>
        </div>
        <button type="button" className="pathway-wall-action" onClick={() => setRuptureOpen(true)}>
          <span>RUN A LIVE WHAT-IF</span>
          <strong>Choose a lower or higher pressure and watch wall stress change</strong>
          <small>You select the value. VesselDelta does not invent a personal diet response.</small>
        </button>
      </section>

      <section className="mechanism-section" aria-labelledby="mechanism-title">
        <div className="mechanism-heading">
          <p className="kicker"><span /> How common medicine classes work</p>
          <h2 id="mechanism-title">Follow the body pathway.<br /><em>Then test pressure separately.</em></h2>
          <p>These animations explain what each medicine class changes in the body. They do not predict one person’s response, and they never secretly alter the live flow.</p>
        </div>
        <div className="mechanism-shell">
          <div className="mechanism-tabs" role="group" aria-label="Medication mechanism classes">
            {(["ace", "ccb", "thiazide", "statin"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={mechanism === item} className={mechanism === item ? "active" : ""} onClick={() => setMechanism(item)}>
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
            <button type="button" onClick={() => setRuptureOpen(true)}>Run a pressure what-if →</button>
          </article>
        </div>
        <p className="review-disclosure"><strong>Review status</strong> No physician review, educator study, or clinical validation was completed. Educational mechanics only; not medical advice, diagnosis, prediction, or treatment guidance.</p>
      </section>
        </div>
      </details>

      <section className="proof-section" id="proof">
        <div className="proof-heading">
          <p className="kicker"><span /> Inspectable, falsifiable, local</p>
          <h2>Trust the instrument<br />{" "}because you can <em>test it.</em></h2>
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
        <p>A live vessel experiment for anyone. Built with Codex + GPT-5.6.</p>
        <div><button type="button" onClick={() => setLimitsOpen(true)}>Model limits</button><button type="button" onClick={() => setVerifyOpen(true)}>Verification</button><a href="#proof">Methods</a></div>
      </footer>

      {verifyOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setVerifyOpen(false)}>
          <section ref={dialogRef} tabIndex={-1} className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-title" onMouseDown={(event) => event.stopPropagation()}>
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
          <section ref={dialogRef} tabIndex={-1} className="verification-modal limits-modal" role="dialog" aria-modal="true" aria-labelledby="limits-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setLimitsOpen(false)} aria-label="Close model limits">×</button>
            <p className="modal-kicker">MODEL CARD · READ BEFORE INTERPRETING</p>
            <h2 id="limits-title">Illustrative mechanics,<br />not personal risk.</h2>
            <div className="limits-grid">
              <article><span>INCLUDES</span><p>Live 2D D2Q9 flow, rigid walls, editable geometry, a normalized near-wall flow-change view, and a separate thin-wall stress experiment with pressure, radius, thickness, and a chosen ex-vivo tissue-strength value. The 3D cutaway wraps the computed 2D wall profile.</p></article>
              <article><span>DOES NOT INCLUDE</span><p>Patient anatomy, pulsatile flow, moving or anisotropic tissue, thrombus, remodeling, local 3D stress concentration, non-Newtonian or cell-resolved blood physics, plaque biology, clotting, diagnosis, treatment selection, personal risk, or clinical rupture prediction.</p></article>
              <article><span>READ COLOR CAREFULLY</span><p>Bright color marks a modeled quantity—not “disease here.” Low, high, and oscillatory shear can each matter in different biological contexts. This instrument cannot tell where plaque will form.</p></article>
              <article><span>PRESSURE ≠ FLOW</span><p>The pressure control changes a separate wall-load lesson and does not silently make the live flow field run faster. The wall test computes σ = P · r / t in real units; its selected tissue strength and tear animation remain illustrative.</p></article>
            </div>
            <p className="citation-note">Methods follow the standard D2Q9 BGK formulation and Zou–He velocity/density boundaries. 3D geometry, medication pathways, and lifestyle evidence are interpretive layers—not additional solver physics. Scientific references and validation scripts are documented in the project README. No physician review or clinical validation was performed. Educational use only; not diagnostic, predictive, or treatment guidance.</p>
            <button type="button" className="modal-primary" onClick={() => setLimitsOpen(false)}>Return to the instrument</button>
          </section>
        </div>
      ) : null}

      {ruptureOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRuptureOpen(false)}>
          <section ref={dialogRef} tabIndex={-1} className="verification-modal rupture-modal" role="dialog" aria-modal="true" aria-labelledby="rupture-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setRuptureOpen(false)} aria-label="Close wall stress test">×</button>
            <div id="rupture-title"><WallStressLab /></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
