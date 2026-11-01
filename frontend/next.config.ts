import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser automation separate from a developer's running Next.js instance.
  distDir: process.env.ECOTRACK_BROWSER_TEST === "1" ? ".next-browser-tests" : ".next",
  async redirects() {
    return [{ source: "/admin/attention", destination: "/dashboard#attention", permanent: false }];
  },
};

export default nextConfig;
