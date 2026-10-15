import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['firebase', '@firebase'],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;