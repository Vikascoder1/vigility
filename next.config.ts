import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["react", "react-dom"],
  },
};

export default nextConfig;
