import type { Metadata } from "next";
import { Caladea, Carlito } from "next/font/google";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasClerk, siteUrl } from "@/lib/env";

import "./globals.css";

/**
 * Typographie imposée par la charte : Caladea au titrage, Carlito au texte,
 * DejaVu Sans Mono pour les références et les valeurs. Les deux premières
 * sont métriquement compatibles avec Cambria et Calibri, ce qui garantit une
 * mise en page stable quand un document circule en bureautique.
 */
const titre = Caladea({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--caladea",
});

const texte = Carlito({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--carlito",
});

const technique = localFont({
  src: [
    { path: "../fonts/DejaVuSansMono.woff2", weight: "400", style: "normal" },
    { path: "../fonts/DejaVuSansMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--dejavu-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Cronostic — Documentation technique horlogère",
    template: "%s · Cronostic",
  },
  description:
    "Guides d'atelier et pièces détachées pour mouvements horlogers vintage. Fiches calibres Omega, nomenclatures, huiles et consommables.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Cronostic",
    title: "Cronostic — Documentation technique horlogère",
    description: "Guides d'atelier et pièces détachées pour mouvements horlogers vintage.",
  },
  robots: { index: true, follow: true },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${titre.variable} ${texte.variable} ${technique.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen flex-col">
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
