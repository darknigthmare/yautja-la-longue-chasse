import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const socialImage = new URL("/og.png", origin).toString();

  return {
    title: "Yautja : La Longue Chasse",
    description:
      "Un jeu d’action 2D complet de chasse interstellaire, d’honneur et de trophées.",
    icons: {
      icon: "/game/sprites/hunter.webp",
      shortcut: "/game/sprites/hunter.webp",
    },
    openGraph: {
      title: "Yautja : La Longue Chasse",
      description:
        "Choisissez votre mission, votre arsenal et rapportez un trophée digne du clan.",
      type: "website",
      images: [{ url: socialImage, width: 1732, height: 908 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Yautja : La Longue Chasse",
      description:
        "Un jeu 2D de chasse interstellaire, d’honneur et de trophées.",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#080a09",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
