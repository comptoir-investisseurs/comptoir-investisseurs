/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Le lint est exécuté séparément via `npm run lint`.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
