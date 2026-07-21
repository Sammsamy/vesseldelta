import type { Metadata } from "next";
import { VesselDeltaLab } from "./vessel-delta-lab";

export const metadata: Metadata = {
  title: "VesselDelta — Change a vessel. See what pressure and flow do.",
  description:
    "A live browser experiment showing how narrowing, bulging, pressure, wall thickness, and tissue-strength assumptions change flow and wall stress.",
};

export default function Home() {
  return <VesselDeltaLab />;
}
