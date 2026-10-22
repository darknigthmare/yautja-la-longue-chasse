import type { Metadata } from "next";
import PlanetGeneratorReviewV103 from "./review";

export const metadata: Metadata = {
  title: "Générateur de mondes — Yautja",
  description: "Composez des planètes de 18 à 96 territoires, leurs régions, leurs sols, leurs mers et leurs atmosphères.",
  robots: { index: false, follow: false },
};

export default function PlanetGeneratorPageV103() {
  return <PlanetGeneratorReviewV103/>;
}
