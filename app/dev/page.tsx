import type { Metadata } from "next";
import DevTravelClient from "./client";

export const metadata: Metadata = {
  title: "Lieux de test · Yautja : La Longue Chasse",
  description: "Accès direct aux lieux jouables dans une session de développement temporaire.",
  robots: { index: false, follow: false, nocache: true },
};

/** Deliberately unlisted: this route owns a disposable local scene, never a campaign. */
export default async function DevTravelPage({ searchParams }: {
  searchParams: Promise<{ lieu?: string | string[] }>;
}) {
  const query = await searchParams;
  return <DevTravelClient initialDestinationId={typeof query.lieu === "string" ? query.lieu : null} />;
}
