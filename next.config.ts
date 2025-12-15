import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds (warnings don't need to block deployment)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail build on type errors (handled separately)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
