"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { HemoEngine } from "./hemo-engine.js";

type TheatreLayer = "velocity" | "vorticity" | "shear" | "wallLoad";

type VesselTheatreProps = {
  engineRef: RefObject<HemoEngine | null>;
  controlRef: RefObject<HemoEngine | null>;
  scenario: "healthy" | "stenosis" | "aneurysm" | "hypertension";
  layer: TheatreLayer;
  pressure: number;
  paused: boolean;
  stentProgress: number;
  onShowSlice: () => void;
};

type Tracer = {
  x: number;
  y: number;
  spin: number;
};

const RINGS = 74;
const SIDES = 32;
const RBC_COUNT = 92;
const CUTAWAY_START_SIDE = 3;
const CUTAWAY_END_SIDE = 14;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const PALETTES: Record<TheatreLayer, Array<[number, [number, number, number]]>> = {
  velocity: [
    [0, [0.05, 0.12, 0.2]],
    [0.3, [0.08, 0.62, 0.64]],
    [0.7, [0.98, 0.24, 0.34]],
    [1, [1, 0.82, 0.48]],
  ],
  vorticity: [
    [0, [0.05, 0.84, 0.74]],
    [0.46, [0.04, 0.18, 0.23]],
    [0.5, [0.025, 0.04, 0.08]],
    [0.54, [0.24, 0.08, 0.28]],
    [1, [1, 0.24, 0.55]],
  ],
  shear: [
    [0, [0.12, 0.45, 0.42]],
    [0.42, [0.34, 0.88, 0.68]],
    [0.72, [1, 0.55, 0.24]],
    [1, [1, 0.2, 0.4]],
  ],
  wallLoad: [
    [0, [0.15, 0.34, 0.42]],
    [0.48, [0.48, 0.64, 0.68]],
    [0.74, [1, 0.54, 0.25]],
    [1, [1, 0.16, 0.34]],
  ],
};

function paletteColor(layer: TheatreLayer, value: number) {
  const stops = PALETTES[layer];
  const t = clamp(value, 0, 1);
  let left = stops[0];
  let right = stops[stops.length - 1];
  for (let index = 1; index < stops.length; index += 1) {
    if (t <= stops[index][0]) {
      left = stops[index - 1];
      right = stops[index];
      break;
    }
  }
  const span = Math.max(0.0001, right[0] - left[0]);
  const local = clamp((t - left[0]) / span, 0, 1);
  return [
    left[1][0] + (right[1][0] - left[1][0]) * local,
    left[1][1] + (right[1][1] - left[1][1]) * local,
    left[1][2] + (right[1][2] - left[1][2]) * local,
  ] as const;
}

function createTubeGeometry(cutaway = false) {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = RINGS * SIDES;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));

  const indices: number[] = [];
  for (let ring = 0; ring < RINGS - 1; ring += 1) {
    for (let side = 0; side < SIDES; side += 1) {
      if (cutaway && side >= CUTAWAY_START_SIDE && side < CUTAWAY_END_SIDE) continue;
      const nextSide = (side + 1) % SIDES;
      const a = ring * SIDES + side;
      const b = (ring + 1) * SIDES + side;
      const c = (ring + 1) * SIDES + nextSide;
      const d = ring * SIDES + nextSide;
      indices.push(a, b, d, b, c, d);
    }
  }
  geometry.setIndex(indices);
  return geometry;
}

function createWallSectionGeometry() {
  const geometry = new THREE.BufferGeometry();
  const edgeCount = 2;
  const layersPerRing = 2;
  const vertexCount = edgeCount * RINGS * layersPerRing;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));

  const indices: number[] = [];
  for (let edge = 0; edge < edgeCount; edge += 1) {
    const offset = edge * RINGS * layersPerRing;
    for (let ring = 0; ring < RINGS - 1; ring += 1) {
      const inner = offset + ring * layersPerRing;
      const outer = inner + 1;
      const nextInner = inner + layersPerRing;
      const nextOuter = outer + layersPerRing;
      indices.push(inner, nextInner, outer, outer, nextInner, nextOuter);
    }
  }
  geometry.setIndex(indices);
  return geometry;
}

function sampleField(engine: HemoEngine, gx: number, layer: TheatreLayer, pressure: number) {
  if (layer === "wallLoad") {
    const radiusRatio = (engine.bottom[gx] - engine.top[gx]) / (engine.baseRadius * 2);
    return clamp(((pressure / 120) * radiusRatio - 0.55) / 1.35, 0, 1);
  }
  if (layer === "shear") {
    const shear = Math.max(Math.abs(engine.shearTop[gx]), Math.abs(engine.shearBottom[gx]));
    const reference = (6 * engine.nu * engine.meanVelocity) / (engine.baseRadius * 2);
    return clamp(shear / Math.max(reference * 4, 1e-7), 0, 1);
  }

  let peak = 0;
  const top = clamp(Math.ceil(engine.top[gx]) + 1, 1, engine.ny - 2);
  const bottom = clamp(Math.floor(engine.bottom[gx]) - 1, 1, engine.ny - 2);
  for (let gy = top; gy <= bottom; gy += 2) {
    const cell = engine.index(gx, gy);
    const value = layer === "vorticity"
      ? Math.abs(engine.vorticity[cell]) / 0.012
      : Math.hypot(engine.ux[cell], engine.uy[cell]) / 0.058;
    peak = Math.max(peak, value);
  }
  return clamp(peak, 0, 1);
}

function updateTube(
  geometry: THREE.BufferGeometry,
  engine: HemoEngine,
  layer: TheatreLayer,
  pressure: number,
  shell: "wall" | "lining" | "field" | "control",
) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const colors = geometry.getAttribute("color") as THREE.BufferAttribute;

  for (let ring = 0; ring < RINGS; ring += 1) {
    const unitX = ring / (RINGS - 1);
    const gx = clamp(Math.round(unitX * (engine.nx - 1)), 0, engine.nx - 1);
    const center = (engine.top[gx] + engine.bottom[gx]) / 2;
    const centerOffset = ((center - engine.center) / engine.baseRadius) * 0.34;
    const radiusRatio = (engine.bottom[gx] - engine.top[gx]) / (engine.baseRadius * 2);
    const radiusOffset = shell === "wall" ? 0.16 : shell === "lining" ? 0.045 : -0.025;
    const radius = radiusRatio * 0.92 + radiusOffset;
    const previousRing = Math.max(0, ring - 1);
    const nextRing = Math.min(RINGS - 1, ring + 1);
    const previousGx = clamp(Math.round((previousRing / (RINGS - 1)) * (engine.nx - 1)), 0, engine.nx - 1);
    const nextGx = clamp(Math.round((nextRing / (RINGS - 1)) * (engine.nx - 1)), 0, engine.nx - 1);
    const previousCenter = (((engine.top[previousGx] + engine.bottom[previousGx]) / 2 - engine.center) / engine.baseRadius) * 0.34;
    const nextCenter = (((engine.top[nextGx] + engine.bottom[nextGx]) / 2 - engine.center) / engine.baseRadius) * 0.34;
    const previousRadius = ((engine.bottom[previousGx] - engine.top[previousGx]) / (engine.baseRadius * 2)) * 0.92 + radiusOffset;
    const nextRadius = ((engine.bottom[nextGx] - engine.top[nextGx]) / (engine.baseRadius * 2)) * 0.92 + radiusOffset;
    const axialSpan = Math.max(0.001, ((nextRing - previousRing) / (RINGS - 1)) * 9.5);
    const centerSlope = (nextCenter - previousCenter) / axialSpan;
    const radiusSlope = (nextRadius - previousRadius) / axialSpan;
    const fieldValue = sampleField(engine, gx, layer, pressure);
    const fieldColor = paletteColor(layer, fieldValue);
    const wallPressure = clamp((pressure / 120 - 0.7) / 0.8, 0, 1);
    const wallColor = [0.27 + wallPressure * 0.28, 0.035, 0.08 + wallPressure * 0.06] as const;
    const liningColor = [0.72 + wallPressure * 0.12, 0.085, 0.14 + wallPressure * 0.06] as const;
    const x = -4.75 + unitX * 9.5;

    for (let side = 0; side < SIDES; side += 1) {
      const angle = (side / SIDES) * Math.PI * 2;
      const radialY = Math.cos(angle);
      const radialZ = Math.sin(angle);
      const vertex = ring * SIDES + side;
      positions.setXYZ(vertex, x, centerOffset + radialY * radius, radialZ * radius);
      const normalX = -(radiusSlope + centerSlope * radialY);
      const normalLength = Math.hypot(normalX, radialY, radialZ);
      normals.setXYZ(vertex, normalX / normalLength, radialY / normalLength, radialZ / normalLength);
      const color = shell === "wall" ? wallColor : shell === "lining" ? liningColor : fieldColor;
      const tissueVariation = shell === "wall" || shell === "lining"
        ? 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(ring * 0.61 + side * 1.37))
        : 1;
      colors.setXYZ(
        vertex,
        clamp(color[0] * tissueVariation, 0, 1),
        clamp(color[1] * tissueVariation, 0, 1),
        clamp(color[2] * tissueVariation, 0, 1),
      );
    }
  }

  positions.needsUpdate = true;
  normals.needsUpdate = true;
  colors.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function updateWallSection(geometry: THREE.BufferGeometry, engine: HemoEngine, pressure: number) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
  const edgeSides = [CUTAWAY_START_SIDE, CUTAWAY_END_SIDE];
  const layersPerRing = 2;
  const wallPressure = clamp((pressure / 120 - 0.7) / 0.8, 0, 1);

  for (let edge = 0; edge < edgeSides.length; edge += 1) {
    const angle = (edgeSides[edge] / SIDES) * Math.PI * 2;
    const radialY = Math.cos(angle);
    const radialZ = Math.sin(angle);
    const normalDirection = edge === 0 ? -1 : 1;
    const normalY = -Math.sin(angle) * normalDirection;
    const normalZ = Math.cos(angle) * normalDirection;
    const edgeOffset = edge * RINGS * layersPerRing;

    for (let ring = 0; ring < RINGS; ring += 1) {
      const unitX = ring / (RINGS - 1);
      const gx = clamp(Math.round(unitX * (engine.nx - 1)), 0, engine.nx - 1);
      const center = (engine.top[gx] + engine.bottom[gx]) / 2;
      const centerOffset = ((center - engine.center) / engine.baseRadius) * 0.34;
      const radiusRatio = (engine.bottom[gx] - engine.top[gx]) / (engine.baseRadius * 2);
      const innerRadius = radiusRatio * 0.92 + 0.045;
      const outerRadius = radiusRatio * 0.92 + 0.16;
      const x = -4.75 + unitX * 9.5;
      const vertex = edgeOffset + ring * layersPerRing;

      positions.setXYZ(vertex, x, centerOffset + radialY * innerRadius, radialZ * innerRadius);
      positions.setXYZ(vertex + 1, x, centerOffset + radialY * outerRadius, radialZ * outerRadius);
      normals.setXYZ(vertex, 0, normalY, normalZ);
      normals.setXYZ(vertex + 1, 0, normalY, normalZ);
      colors.setXYZ(vertex, 0.84 + wallPressure * 0.08, 0.12, 0.19);
      colors.setXYZ(vertex + 1, 0.38 + wallPressure * 0.18, 0.045, 0.095);
    }
  }

  positions.needsUpdate = true;
  normals.needsUpdate = true;
  colors.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function updateNarrowingOverlay(geometry: THREE.BufferGeometry, engine: HemoEngine) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
  for (let ring = 0; ring < RINGS; ring += 1) {
    const unitX = ring / (RINGS - 1);
    const gx = clamp(Math.round(unitX * (engine.nx - 1)), 0, engine.nx - 1);
    const center = (engine.top[gx] + engine.bottom[gx]) / 2;
    const centerOffset = ((center - engine.center) / engine.baseRadius) * 0.34;
    const radiusRatio = (engine.bottom[gx] - engine.top[gx]) / (engine.baseRadius * 2);
    const narrowing = clamp((1 - radiusRatio) / 0.4, 0, 1);
    const radius = radiusRatio * 0.92 + 0.018 + narrowing * 0.035;
    const x = -4.75 + unitX * 9.5;
    for (let side = 0; side < SIDES; side += 1) {
      const angle = (side / SIDES) * Math.PI * 2;
      const radialY = Math.cos(angle);
      const radialZ = Math.sin(angle);
      const vertex = ring * SIDES + side;
      positions.setXYZ(vertex, x, centerOffset + radialY * radius, radialZ * radius);
      normals.setXYZ(vertex, 0, radialY, radialZ);
      colors.setXYZ(vertex, narrowing, narrowing * 0.46, narrowing * 0.055);
    }
  }
  positions.needsUpdate = true;
  normals.needsUpdate = true;
  colors.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function createRbcGeometry() {
  const geometry = new THREE.BufferGeometry();
  const rings = 6;
  const sides = 20;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const face of [-1, 1]) {
    for (let ring = 0; ring <= rings; ring += 1) {
      const radius = (ring / rings) * 0.13;
      const thickness = 0.018 + 0.052 * Math.sin((ring / rings) * Math.PI * 0.72);
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * Math.PI * 2;
        positions.push(face * thickness, Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
    }
  }

  const faceStride = (rings + 1) * sides;
  for (let faceIndex = 0; faceIndex < 2; faceIndex += 1) {
    const offset = faceIndex * faceStride;
    const reverse = faceIndex === 0;
    for (let ring = 0; ring < rings; ring += 1) {
      for (let side = 0; side < sides; side += 1) {
        const next = (side + 1) % sides;
        const a = offset + ring * sides + side;
        const b = offset + (ring + 1) * sides + side;
        const c = offset + (ring + 1) * sides + next;
        const d = offset + ring * sides + next;
        if (reverse) indices.push(a, d, b, b, d, c);
        else indices.push(a, b, d, b, c, d);
      }
    }
  }

  const topRim = rings * sides;
  const bottomRim = faceStride + rings * sides;
  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides;
    indices.push(topRim + side, bottomRim + side, topRim + next);
    indices.push(topRim + next, bottomRim + side, bottomRim + next);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function resetTracer(tracer: Tracer, engine: HemoEngine, fromInlet = false) {
  tracer.x = fromInlet ? 1 + Math.random() * 4 : 1 + Math.random() * (engine.nx - 3);
  const gx = clamp(Math.round(tracer.x), 1, engine.nx - 2);
  const top = Math.ceil(engine.top[gx]) + 2;
  const bottom = Math.floor(engine.bottom[gx]) - 2;
  tracer.y = top + Math.random() * Math.max(1, bottom - top);
  tracer.spin = Math.random() * Math.PI * 2;
}

export function VesselTheatre3D({
  engineRef,
  controlRef,
  scenario,
  layer,
  pressure,
  paused,
  stentProgress,
  onShowSlice,
}: VesselTheatreProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ layer, pressure, paused, stentProgress });
  const rotationRef = useRef({ x: -0.12, y: -0.18, targetX: -0.12, targetY: -0.18 });
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    stateRef.current = { layer, pressure, paused, stentProgress };
  }, [layer, pressure, paused, stentProgress]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      window.setTimeout(() => setWebglError(true), 0);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x02060d, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-hidden", "true");
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02060d, 0.055);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0.2, 1.15, 11.2);
    camera.lookAt(0, 0, 0);

    const vessel = new THREE.Group();
    scene.add(vessel);

    const wallGeometry = createTubeGeometry(true);
    const liningGeometry = createTubeGeometry(true);
    const wallSectionGeometry = createWallSectionGeometry();
    const fieldGeometry = createTubeGeometry(true);
    const controlGeometry = createTubeGeometry(true);
    const narrowingGeometry = createTubeGeometry(true);
    const wallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.46,
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.36,
      clearcoatRoughness: 0.42,
      sheen: 0.72,
      sheenColor: new THREE.Color(0x8f2740),
      sheenRoughness: 0.64,
      emissive: new THREE.Color(0x1a0208),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const liningMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.24,
      clearcoatRoughness: 0.3,
      sheen: 0.9,
      sheenColor: new THREE.Color(0xff6b83),
      sheenRoughness: 0.5,
      emissive: new THREE.Color(0x31050d),
      emissiveIntensity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wallSectionMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      roughness: 0.72,
      metalness: 0,
      emissive: new THREE.Color(0x1b0308),
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      emissive: 0x120811,
      emissiveIntensity: 0.72,
      roughness: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    const liningMesh = new THREE.Mesh(liningGeometry, liningMaterial);
    const wallSectionMesh = new THREE.Mesh(wallSectionGeometry, wallSectionMaterial);
    const fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
    const controlMesh = new THREE.Mesh(
      controlGeometry,
      new THREE.MeshBasicMaterial({ color: 0x8be9dc, transparent: true, opacity: 0.1, wireframe: true, depthWrite: false }),
    );
    const narrowingMesh = new THREE.Mesh(
      narrowingGeometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.76,
        roughness: 0.62,
        metalness: 0,
        emissive: new THREE.Color(0x4b1700),
        emissiveIntensity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    controlMesh.renderOrder = 0;
    fieldMesh.renderOrder = 1;
    liningMesh.renderOrder = 3;
    wallSectionMesh.renderOrder = 4;
    wallMesh.renderOrder = 5;
    narrowingMesh.renderOrder = 6;
    vessel.add(controlMesh, fieldMesh, liningMesh, wallSectionMesh, wallMesh, narrowingMesh);

    const slicePixels = new Uint8Array(160 * 70 * 4);
    const sliceTexture = new THREE.DataTexture(slicePixels, 160, 70, THREE.RGBAFormat);
    sliceTexture.colorSpace = THREE.SRGBColorSpace;
    sliceTexture.minFilter = THREE.LinearFilter;
    sliceTexture.magFilter = THREE.LinearFilter;
    sliceTexture.flipY = true;
    const sliceMaterial = new THREE.MeshBasicMaterial({
      map: sliceTexture,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sliceMesh = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 3.22), sliceMaterial);
    sliceMesh.position.z = 0;
    sliceMesh.renderOrder = 2;
    vessel.add(sliceMesh);

    const rbcGeometry = createRbcGeometry();
    const rbcMaterial = new THREE.MeshStandardMaterial({
      color: 0xff365d,
      emissive: 0x78071e,
      emissiveIntensity: 1.02,
      roughness: 0.28,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const rbcMesh = new THREE.InstancedMesh(rbcGeometry, rbcMaterial, RBC_COUNT);
    rbcMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < RBC_COUNT; index += 1) {
      const lightness = 0.5 + (index % 7) * 0.012;
      rbcMesh.setColorAt(index, new THREE.Color().setHSL(0.972, 0.88, lightness));
    }
    if (rbcMesh.instanceColor) rbcMesh.instanceColor.needsUpdate = true;
    rbcMesh.renderOrder = 7;
    vessel.add(rbcMesh);

    const stentGeometry = new THREE.TorusGeometry(1, 0.012, 6, 42);
    const stentMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc56c,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const stentRingCount = 13;
    const stentMesh = new THREE.InstancedMesh(stentGeometry, stentMaterial, stentRingCount);
    stentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    vessel.add(stentMesh);

    const starsGeometry = new THREE.BufferGeometry();
    const stars = new Float32Array(120 * 3);
    for (let index = 0; index < stars.length; index += 3) {
      stars[index] = (Math.random() - 0.5) * 16;
      stars[index + 1] = (Math.random() - 0.5) * 8;
      stars[index + 2] = -2 - Math.random() * 8;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    const starPoints = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0x5bd7cf, size: 0.018, transparent: true, opacity: 0.34 }),
    );
    scene.add(starPoints);

    scene.add(new THREE.HemisphereLight(0xffd9df, 0x14050c, 1.18));
    const key = new THREE.PointLight(0xff5678, 27, 16, 2);
    key.position.set(1.4, 3.2, 4.8);
    scene.add(key);
    const rim = new THREE.PointLight(0x69f0dc, 16, 14, 2);
    rim.position.set(-3.4, -2.2, 3.5);
    scene.add(rim);
    const tissueFill = new THREE.DirectionalLight(0xff9fac, 1.45);
    tissueFill.position.set(-2.5, 1.2, 5.5);
    scene.add(tissueFill);

    const tracers: Tracer[] = Array.from({ length: RBC_COUNT }, () => ({ x: 0, y: 0, spin: 0 }));
    const dummy = new THREE.Object3D();
    let activeEngine = engineRef.current;
    const initialEngine = activeEngine;
    if (initialEngine) {
      for (const tracer of tracers) resetTracer(tracer, initialEngine);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let frame = 0;
    let animation = 0;
    let visible = true;
    let userYaw = rotationRef.current.targetY;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      mount.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - previousX;
      const dy = event.clientY - previousY;
      userYaw += dx * 0.006;
      rotationRef.current.targetY = userYaw;
      rotationRef.current.targetX = clamp(rotationRef.current.targetX + dy * 0.004, -0.55, 0.42);
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (mount.hasPointerCapture(event.pointerId)) mount.releasePointerCapture(event.pointerId);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") userYaw -= 0.14;
      else if (event.key === "ArrowRight") userYaw += 0.14;
      else if (event.key === "ArrowUp") rotationRef.current.targetX = clamp(rotationRef.current.targetX - 0.1, -0.55, 0.42);
      else if (event.key === "ArrowDown") rotationRef.current.targetX = clamp(rotationRef.current.targetX + 0.1, -0.55, 0.42);
      else return;
      rotationRef.current.targetY = userYaw;
      event.preventDefault();
    };

    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup", onPointerUp);
    mount.addEventListener("pointercancel", onPointerUp);
    mount.addEventListener("keydown", onKeyDown);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { rootMargin: "120px" });
    visibilityObserver.observe(mount);

    const animate = (time: number) => {
      animation = requestAnimationFrame(animate);
      if (!visible) return;
      activeEngine = engineRef.current;
      if (!activeEngine) {
        renderer.render(scene, camera);
        return;
      }

      frame += 1;
      fieldMaterial.opacity = stateRef.current.layer === "velocity" || stateRef.current.layer === "vorticity" ? 0.2 : 0.5;
      if (frame % 3 === 0) {
        updateTube(wallGeometry, activeEngine, stateRef.current.layer, stateRef.current.pressure, "wall");
        updateTube(liningGeometry, activeEngine, stateRef.current.layer, stateRef.current.pressure, "lining");
        updateWallSection(wallSectionGeometry, activeEngine, stateRef.current.pressure);
        updateTube(fieldGeometry, activeEngine, stateRef.current.layer, stateRef.current.pressure, "field");
        updateNarrowingOverlay(narrowingGeometry, activeEngine);
        const control = controlRef.current;
        if (control) updateTube(controlGeometry, control, "velocity", 120, "control");
        for (let gy = 0; gy < activeEngine.ny; gy += 1) {
          for (let gx = 0; gx < activeEngine.nx; gx += 1) {
            const cell = activeEngine.index(gx, gy);
            const pixel = (gx + gy * activeEngine.nx) * 4;
            if (activeEngine.solid[cell]) {
              slicePixels[pixel] = 4;
              slicePixels[pixel + 1] = 8;
              slicePixels[pixel + 2] = 14;
              slicePixels[pixel + 3] = 18;
              continue;
            }
            let value = 0;
            if (stateRef.current.layer === "velocity") {
              value = Math.hypot(activeEngine.ux[cell], activeEngine.uy[cell]) / 0.058;
            } else if (stateRef.current.layer === "vorticity") {
              value = 0.5 + clamp(activeEngine.vorticity[cell] / 0.012, -1, 1) * 0.5;
            } else if (stateRef.current.layer === "shear") {
              const wallDistance = Math.min(gy - activeEngine.top[gx], activeEngine.bottom[gx] - gy);
              value = sampleField(activeEngine, gx, "shear", stateRef.current.pressure) * Math.exp(-wallDistance * 0.45);
            } else {
              value = sampleField(activeEngine, gx, "wallLoad", stateRef.current.pressure) * 0.72;
            }
            const color = paletteColor(stateRef.current.layer, clamp(value, 0, 1));
            slicePixels[pixel] = Math.round(color[0] * 255);
            slicePixels[pixel + 1] = Math.round(color[1] * 255);
            slicePixels[pixel + 2] = Math.round(color[2] * 255);
            slicePixels[pixel + 3] = 205;
          }
        }
        sliceTexture.needsUpdate = true;
      }

      const target = rotationRef.current;
      target.targetY = userYaw + (!dragging && !reducedMotion ? Math.sin(time * 0.00016) * 0.085 : 0);
      target.x += (target.targetX - target.x) * 0.08;
      target.y += (target.targetY - target.y) * 0.08;
      vessel.rotation.x = target.x;
      vessel.rotation.y = target.y;
      vessel.rotation.z = -0.055;

      for (let index = 0; index < tracers.length; index += 1) {
        const tracer = tracers[index];
        if (!Number.isFinite(tracer.x) || !Number.isFinite(tracer.y) || tracer.x <= 0 || tracer.x >= activeEngine.nx - 1) {
          resetTracer(tracer, activeEngine, true);
        }
        const gx = clamp(Math.round(tracer.x), 1, activeEngine.nx - 2);
        const gy = clamp(Math.round(tracer.y), 1, activeEngine.ny - 2);
        const cell = activeEngine.index(gx, gy);
        if (activeEngine.solid[cell]) {
          resetTracer(tracer, activeEngine, true);
          continue;
        }
        if (!stateRef.current.paused && !reducedMotion) {
          tracer.x += activeEngine.ux[cell] * 44;
          tracer.y += activeEngine.uy[cell] * 44;
          tracer.spin += 0.006 + Math.hypot(activeEngine.ux[cell], activeEngine.uy[cell]) * 0.8;
        }

        const center = (activeEngine.top[gx] + activeEngine.bottom[gx]) / 2;
        const radius = Math.max(2, (activeEngine.bottom[gx] - activeEngine.top[gx]) / 2);
        const radial = clamp((tracer.y - center) / radius, -0.92, 0.92);
        const unitX = tracer.x / (activeEngine.nx - 1);
        const worldX = -4.75 + unitX * 9.5;
        const radiusWorld = ((activeEngine.bottom[gx] - activeEngine.top[gx]) / (activeEngine.baseRadius * 2)) * 0.88;
        const centerOffset = ((center - activeEngine.center) / activeEngine.baseRadius) * 0.34;
        dummy.position.set(
          worldX,
          centerOffset + radial * radiusWorld,
          0,
        );
        const tilt = Math.atan2(activeEngine.uy[cell], Math.max(0.0001, activeEngine.ux[cell]));
        dummy.rotation.set(
          tracer.spin,
          tilt * 0.7 + Math.sin(tracer.spin * 0.7 + index) * 0.12,
          Math.cos(tracer.spin * 0.5 + index * 0.37) * 0.1,
        );
        dummy.scale.setScalar(0.9 + radiusWorld * 0.09 + (index % 5) * 0.012);
        dummy.updateMatrix();
        rbcMesh.setMatrixAt(index, dummy.matrix);
      }
      rbcMesh.instanceMatrix.needsUpdate = true;

      const stent = stateRef.current.stentProgress;
      stentMesh.visible = stent > 0.005;
      stentMaterial.opacity = stent * 0.86;
      for (let index = 0; index < stentRingCount; index += 1) {
        const unitX = 0.40 + (index / (stentRingCount - 1)) * 0.24;
        const gx = clamp(Math.round(unitX * (activeEngine.nx - 1)), 0, activeEngine.nx - 1);
        const radius = ((activeEngine.bottom[gx] - activeEngine.top[gx]) / (activeEngine.baseRadius * 2)) * 0.91;
        const center = (activeEngine.top[gx] + activeEngine.bottom[gx]) / 2;
        dummy.position.set(
          -4.75 + unitX * 9.5,
          ((center - activeEngine.center) / activeEngine.baseRadius) * 0.34,
          0,
        );
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.scale.setScalar(radius * (0.72 + stent * 0.28));
        dummy.updateMatrix();
        stentMesh.setMatrixAt(index, dummy.matrix);
      }
      stentMesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animation = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup", onPointerUp);
      mount.removeEventListener("pointercancel", onPointerUp);
      mount.removeEventListener("keydown", onKeyDown);
      wallGeometry.dispose();
      liningGeometry.dispose();
      wallSectionGeometry.dispose();
      fieldGeometry.dispose();
      controlGeometry.dispose();
      narrowingGeometry.dispose();
      rbcGeometry.dispose();
      starsGeometry.dispose();
      wallMaterial.dispose();
      liningMaterial.dispose();
      wallSectionMaterial.dispose();
      fieldMaterial.dispose();
      (controlMesh.material as THREE.Material).dispose();
      (narrowingMesh.material as THREE.Material).dispose();
      rbcMaterial.dispose();
      stentGeometry.dispose();
      stentMaterial.dispose();
      sliceTexture.dispose();
      sliceMaterial.dispose();
      (sliceMesh.geometry as THREE.BufferGeometry).dispose();
      (starPoints.material as THREE.Material).dispose();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.forceContextLoss();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [controlRef, engineRef]);

  return (
    <section className="vessel-theatre" aria-label="Interactive three-dimensional view of the vessel experiment">
      <div
        ref={mountRef}
        className="vessel-theatre-mount"
        role="group"
        tabIndex={0}
        aria-label="Three-dimensional view built from the live two-dimensional flow model. Drag or use arrow keys to rotate."
      />
      {scenario === "hypertension" ? (
        <div className="pressure-force-cue" aria-hidden="true">
          <b />
          <i /><i /><i /><i /><i /><i />
          <span>PRESSURE PUSHES OUTWARD · FLOW SETTING UNCHANGED</span>
        </div>
      ) : null}
      <div className="theatre-receipt">
        <span><i /> 3D CUTAWAY · LIVE 2D SOURCE</span>
        <strong>Layered vessel shell around the running flow slice</strong>
        <small>The outer wall, inner lining, and cut edges show the vessel layers. Their shape comes from the live 2D boundary; they do not simulate tissue or 3D flow. Red-cell shapes follow the live flow as visual tracers.{scenario === "stenosis" ? " Gold marks the narrowing shape, not plaque growth." : ""}{scenario === "aneurysm" ? " The wider shell follows the simple bulge case, not a person’s anatomy." : ""}{scenario === "hypertension" ? " Outward pulses show pressure direction; they do not change the flow model." : ""}{stentProgress > 0.005 ? " Gold rings show an illustrative stent; only the widened passage enters the flow model." : ""}</small>
        <div className="theatre-material-key" aria-label="Visual material key">
          <b><i className="outer" /> outer wall</b>
          <b><i className="lining" /> inner lining</b>
          <b><i className="cells" /> visual tracers</b>
        </div>
      </div>
      {scenario !== "hypertension" ? <div className="theatre-interaction-cue" aria-hidden="true">DRAG TO ROTATE · ARROW KEYS</div> : null}
      <div className="theatre-axis" aria-hidden="true"><span>FLOW IN</span><i /><span>FLOW OUT</span></div>
      <button type="button" className="slice-jump" onClick={onShowSlice}>Draw your own vessel</button>
      {webglError ? (
        <div className="theatre-fallback">
          <strong>3D unavailable in this browser.</strong>
          <span>The live flow slice is still available.</span>
          <button type="button" onClick={onShowSlice}>Open live flow slice</button>
        </div>
      ) : null}
    </section>
  );
}
