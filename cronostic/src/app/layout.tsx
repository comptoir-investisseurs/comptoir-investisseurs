import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasClerk, siteUrl } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "CRONOSTIC — La documentation technique de l'horloger",
    template: "%s · CRONOSTIC",
  },
  description:
    "Guides d'atelier et pièces détachées pour mouvements horlogers vintage. Fiches calibres Omega, nomenclatures, huiles et consommables.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "CRONOSTIC",
    title: "CRONOSTIC — La documentation technique de l'horloger",
    description:
      "Guides d'atelier et pièces détachées pour mouvements horlogers vintage.",
  },
  robots: { index: true, follow: true },
};

async function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
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
