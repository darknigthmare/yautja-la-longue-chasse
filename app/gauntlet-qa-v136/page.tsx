import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GauntletVisualQaV136 from "./client";

export const metadata: Metadata = {
  title: "Atelier gauntlets V136 — QA locale",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Never expose internal art QA through a deployed website, request query,
 * user cookie or browser preference. Only an explicit LOCAL server setting
 * enables inspection, consistent with other private QA routes. */
export default function LocalGauntletQaPage() {
  if (process.env.YAUTJA_LOCAL_VISUAL_QA_V90 !== "1" || process.env.VERCEL === "1") {
    notFound();
  }
  return <GauntletVisualQaV136/>;
}
