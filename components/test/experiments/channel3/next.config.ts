import type { NextConfig } from "next";

const config: NextConfig = {
  // Product images come from arbitrary merchant CDNs; allow any HTTPS host
  // so <img> tags don't need per-domain configuration.
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};

export default config;
