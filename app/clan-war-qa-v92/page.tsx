import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClanWarQaV92 from "./client";

export const metadata: Metadata = { title: "QA locale atelier de guerre V92", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Server-only opt-in. Query, cookies and browser storage cannot enable this
 * route; Vercel is always denied, even when its private opt-in is present. */
export default function LocalClanWarQaV92Page() {
  if (process.env.YAUTJA_LOCAL_VISUAL_QA_V90 !== "1" || process.env.VERCEL === "1") notFound();
  return <ClanWarQaV92/>;
}
