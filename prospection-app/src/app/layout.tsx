import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospection Locale — CRM",
  description: "Trouver, qualifier et contacter des commerces locaux pour la vente de sites internet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
