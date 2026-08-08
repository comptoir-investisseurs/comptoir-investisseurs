import type { Metadata } from "next";
import { EB_Garamond, Jost } from "next/font/google";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasClerk, siteUrl } from "@/lib/env";

import "./globals.css";

/**
 * Typographie du site.
 *
 * La charte impose Caladea et Carlito pour les manuels, où la compatibilité
 * métrique avec Cambria et Calibri garantit une mise en page stable en
 * circulation bureautique. Un site web ne circule pas en bureautique : on y
 * retient donc un couple choisi pour la tenue à l'écran, en gardant la même
 * intention — sobriété, contraste franc, peu de graisses.
 *
 * EB Garamond au titrage : garalde du XVIᵉ siècle, chaude et sans effet, qui
 * donne le grain d'un ouvrage plutôt que d'une plaquette. Jost à l'interface :
 * grotesque géométrique de lignée Futura, contemporaine des mouvements
 * documentés. DejaVu Sans Mono reste la police technique de la charte.
 */
const titre = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--eb-garamond",
});

const texte = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  variable: "--jost",
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
