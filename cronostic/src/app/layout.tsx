import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasClerk, siteUrl } from "@/lib/env";

import "./globals.css";

/**
 * Typographie.
 *
 * Fraunces pour les titres : serif à contraste bas, formes chaudes et
 * légèrement irrégulières, qui tient sur fond sombre là où un didone se
 * casse. IBM Plex pour le texte et les références : dessiné pour la
 * documentation technique, avec le monospace assorti pour les numéros de
 * nomenclature. Le logotype, lui, est un tracé vectoriel (public/logo.svg).
 */
const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--fraunces",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--plex-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Cronostic — La documentation technique de l'horloger",
    template: "%s · Cronostic",
  },
  description:
    "Guides d'atelier et pièces détachées pour mouvements horlogers vintage. Fiches calibres Omega, nomenclatures, huiles et consommables.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Cronostic",
    title: "Cronostic — La documentation technique de l'horloger",
    description: "Guides d'atelier et pièces détachées pour mouvements horlogers vintage.",
  },
  robots: { index: true, follow: true },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (!hasClerk) return <Shell>{children}</Shell>;

  const { ClerkProvider } = await import("@clerk/nextjs");
  return (
    <ClerkProvider>
      <Shell>{children}</Shell>
    </ClerkProvider>
  );
}
