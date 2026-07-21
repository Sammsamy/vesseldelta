"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { WALL_FAILURE_PRESETS, wallFailureState } from "./wall-failure-model.js";

type WallPreset = {
  id: string;
  label: string;
  pressureMmHg: number;
  radiusMm: number;
  wallThicknessMm: number;
  strengthKpa: number;
  note: string;
};

const PRESETS: WallPreset[] = [
  { ...WALL_FAILURE_PRESETS.literatureReference, id: "reference", label: "Published large-AAA construction" },
  { ...WALL_FAILURE_PRESETS.higherPressureSensitivity, id: "pressure", label: "Raise pressure only" },
  { ...WALL_FAILURE_PRESETS.thinnerWallSensitivity, id: "thin", label: "Make the wall thinner" },
  { ...WALL_FAILURE_PRESETS.illustrativeThresholdCrossing, id: "crossing" },
];

function formatKpa(value: number) {
  return `${Math.round(value).toLocaleString()} kPa`;
}

export function WallStressLab() {
  const [pressureMmHg, setPressureMmHg] = useState<number>(WALL_FAILURE_PRESETS.literatureReference.pressureMmHg);
  const [radiusMm, setRadiusMm] = useState<number>(WALL_FAILURE_PRESETS.literatureReference.radiusMm);
  const [wallThicknessMm, setWallThicknessMm] = useState<number>(WALL_FAILURE_PRESETS.literatureReference.wallThicknessMm);
  const [strengthKpa, setStrengthKpa] = useState<number>(WALL_FAILURE_PRESETS.literatureReference.strengthKpa);
  const [activePreset, setActivePreset] = useState("reference");

  const result = useMemo(
    () => wallFailureState({ pressureMmHg, radiusMm, wallThicknessMm, strengthKpa }),
    [pressureMmHg, radiusMm, wallThicknessMm, strengthKpa],
  );
  const activePresetReceipt = PRESETS.find((preset) => preset.id === activePreset)?.note;

  const applyPreset = (preset: WallPreset) => {
    setActivePreset(preset.id);
    setPressureMmHg(preset.pressureMmHg);
    setRadiusMm(preset.radiusMm);
    setWallThicknessMm(preset.wallThicknessMm);
    setStrengthKpa(preset.strengthKpa);
  };

  const status = result.crossedThreshold
    ? "Arithmetic crossing — not a rupture simulation"
    : result.utilization >= 0.75
      ? "Near the selected comparison value"
      : "Below the selected comparison value";

  const visualStyle = {
    "--wall-scale": Math.max(0.45, Math.min(1.35, wallThicknessMm / 1.5)),
    "--lumen-scale": Math.max(0.72, Math.min(1.5, radiusMm / 15)),
    "--stress-level": Math.min(1.4, result.utilization),
  } as CSSProperties;

  return (
    <div className="wall-lab" aria-label="Thin-wall stress teaching experiment">
      <p className="modal-kicker">PRESSURE × SIZE ÷ WALL THICKNESS</p>
      <h2>Change the inputs.<br /><em>Compare wall stress with a selected value.</em></h2>
      <p className="modal-deck wall-lab-deck">
        Change one thing at a time. Higher pressure, a wider vessel, or a thinner wall raises this simple wall-stress estimate.
      </p>

      <div className="wall-lab-presets" role="group" aria-label="Wall stress examples">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={activePreset === preset.id ? "active" : ""}
            aria-pressed={activePreset === preset.id}
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="wall-lab-boundary" role="note">
        {activePresetReceipt ?? "Custom sensitivity values. They do not describe a patient or establish a clinical threshold."}
      </p>

      <div className="wall-lab-grid">
        <section className="wall-lab-controls" aria-label="Wall stress inputs">
          <label>
            <span><b>Pressure across the wall</b><small>inside minus outside; selected teaching input, not a cuff target</small></span>
            <output>{pressureMmHg} mm Hg</output>
            <input type="range" min="80" max="220" step="5" value={pressureMmHg} aria-valuetext={`${pressureMmHg} millimeters of mercury`} onInput={(event) => { setActivePreset(""); setPressureMmHg(Number(event.currentTarget.value)); }} />
          </label>
          <label>
            <span><b>Idealized cylinder radius</b><small>a larger uniform cylinder carries more circumferential stress</small></span>
            <output>{radiusMm.toFixed(0)} mm</output>
            <input type="range" min="10" max="35" step="1" value={radiusMm} aria-valuetext={`${radiusMm} millimeters`} onInput={(event) => { setActivePreset(""); setRadiusMm(Number(event.currentTarget.value)); }} />
          </label>
          <label>
            <span><b>Wall thickness</b><small>a thinner wall has less material to carry the load</small></span>
            <output>{wallThicknessMm.toFixed(2)} mm</output>
            <input type="range" min="0.5" max="3" step="0.01" value={wallThicknessMm} aria-valuetext={`${wallThicknessMm.toFixed(2)} millimeters`} onInput={(event) => { setActivePreset(""); setWallThicknessMm(Number(event.currentTarget.value)); }} />
          </label>
          <label>
            <span><b>Selected tissue-strength comparison</b><small>680 kPa default is a derived midpoint—not a measured cutoff</small></span>
            <output>{formatKpa(strengthKpa)}</output>
            <input type="range" min="400" max="2000" step="10" value={strengthKpa} aria-valuetext={`${strengthKpa} kilopascals`} onInput={(event) => { setActivePreset(""); setStrengthKpa(Number(event.currentTarget.value)); }} />
          </label>
        </section>

        <section className={`wall-lab-result ${result.crossedThreshold ? "failed" : result.utilization >= 0.75 ? "warning" : "stable"}`}>
          <div className="wall-lab-visual" style={visualStyle} aria-hidden="true">
            <div className="pressure-pulse p1" /><div className="pressure-pulse p2" /><div className="pressure-pulse p3" />
            <div className="wall wall-top"><i /><i /></div>
            <div className="wall-lumen"><span>PRESSURE</span><b>↑</b><b>↓</b></div>
            <div className="wall wall-bottom"><i /><i /></div>
            <div className="tear"><i /><i /><i /></div>
          </div>

          <div
            className="wall-lab-meter"
            role="meter"
            aria-label="Modeled circumferential stress as a fraction of the selected ex-vivo comparison value"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Math.min(1, result.utilization)}
            aria-valuetext={`${Math.round(result.utilization * 100)} percent of the selected ex-vivo comparison value`}
          >
            <span><i style={{ width: `${Math.min(100, result.utilization * 100)}%` }} /></span>
            <small>{Math.round(result.utilization * 100)}% of selected comparison value</small>
          </div>
          <strong className="wall-lab-status" role="status" aria-live="polite" aria-atomic="true">{status}</strong>
          <div className="wall-lab-numbers">
            <article><span>ESTIMATED CIRCUMFERENTIAL STRESS</span><strong>{formatKpa(result.stressKpa)}</strong></article>
            <article><span>SELECTED EX-VIVO COMPARISON</span><strong>{formatKpa(result.strengthKpa)}</strong></article>
          </div>
        </section>
      </div>

      <div className="wall-lab-equation">
        <strong>uniform thin-walled cylinder: circumferential stress = pressure × radius ÷ wall thickness</strong>
        <span>σ = P · r / t · mmHg → Pa · result in kPa</span>
      </div>

      <p className="wall-lab-boundary">
        The arithmetic uses real units; the cylinder geometry and tissue comparison are simplified. The visible split appears only when the arithmetic stress meets or exceeds the value you selected. It is an illustrative crossing animation—not a simulated rupture, a safety finding, or a personal prediction. Real tissue is irregular, anisotropic, layered, moving, and patient-specific.
        {result.assumptions.thinWallThicknessToRadius > 0.1
          ? ` Here t/r = ${result.assumptions.thinWallThicknessToRadius.toFixed(2)}, so even the thin-wall approximation is strained.`
          : ""}
      </p>
      <div className="wall-lab-sources">
        <a href="https://pubmed.ncbi.nlm.nih.gov/16520175/" target="_blank" rel="noreferrer">Circumferential ex-vivo AAA strength group means ↗</a>
        <a href="https://pubmed.ncbi.nlm.nih.gov/16337949/" target="_blank" rel="noreferrer">Regional human AAA wall-thickness measurements ↗</a>
      </div>
    </div>
  );
}
