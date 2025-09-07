import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Adopt PPR incrementally per-route via experimental_ppr flag
    ppr: 'incremental',
  },
  // Pin the Turbopack root to this project to avoid
  // accidentally inferring a parent directory with another lockfile.
  turbopack: {
    root: __dirname,
  },
  // Enable statically typed routes for safer navigation/linking
  typedRoutes: true,
};

export default nextConfig;
