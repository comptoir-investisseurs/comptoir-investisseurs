import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
      { protocol: "https", hostname: "i.ebayimg.com" },
    ],
  },
  serverExternalPackages: ["pg"],
  // Lus au runtime par la route de téléchargement : sans cette déclaration,
  // ils ne seraient pas embarqués dans la fonction déployée.
  outputFileTracingIncludes: {
    "/api/guides/**": ["./guides-pdf/**"],
  },
};

export default nextConfig;
