import type { Metadata } from "next";
import PlanetGeneratorReviewV102 from "./review";

export const metadata: Metadata = {
  title: "Exploration des mondes — Yautja",
  description: "Composez des planètes, explorez leurs régions et ouvrez leurs fronts de guerre territoriale.",
  robots: { index: false, follow: false },
};

export default function PlanetGeneratorPageV102() {
  return <PlanetGeneratorReviewV102/>;
}
