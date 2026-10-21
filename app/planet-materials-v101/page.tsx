import type { Metadata } from "next";
import PlanetMaterialsReviewV101 from "./review";

export const metadata: Metadata = { title: "Atlas des matières planétaires — Yautja", robots: { index: false, follow: false } };

export default function PlanetMaterialsPageV101() {
  return <PlanetMaterialsReviewV101/>;
}
