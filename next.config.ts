import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Two root layouts (the site and the app), so unmatched addresses need their own 404 page.
  // Server Actions take 1 MB by default; a timetable PDF can be up to 2 MB (batch 22).
  experimental: { globalNotFound: true, serverActions: { bodySizeLimit: "4mb" } },
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
