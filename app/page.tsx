import type { Metadata } from "next";
import { VesselDeltaLab } from "./vessel-delta-lab";

export const metadata: Metadata = {
  title: "VesselDelta — Live blood-flow instrument",
  description:
    "Shape an idealized vessel and watch a real lattice-Boltzmann fluid solve respond with velocity, vorticity, wall shear, and pressure-load lessons.",
};

export default function Home() {
  return <VesselDeltaLab />;
}
