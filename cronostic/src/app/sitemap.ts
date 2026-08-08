import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";
import { listCalibers } from "@/lib/repo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const calibers = await listCalibers();

  const statiques = ["", "/calibres", "/guides", "/pieces", "/huiles", "/pro"].map((path) => ({
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
  ];
}
