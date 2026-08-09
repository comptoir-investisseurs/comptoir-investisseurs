import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";
import { listCalibers, listCalibresEncyclopedie } from "@/lib/repo";
import { MARQUES } from "@/data/encyclopedie";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [calibers, encyclopedie] = await Promise.all([
    listCalibers(),
    listCalibresEncyclopedie(),
  ]);

  const statiques = [
    "",
    "/calibres",
    "/guides",
    "/pieces",
    "/huiles",
    "/pro",
    "/marques",
    "/conditions",
    "/confidentialite",
    "/mentions-legales",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  return [
    ...statiques,
    ...calibers.map((c) => ({
      url: `${base}/calibres/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...MARQUES.map((m) => ({
      url: `${base}/marques/${m.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...encyclopedie.map((c) => ({
      url: `${base}/calibres/${c.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
