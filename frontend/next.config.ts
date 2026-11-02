import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser automation separate from a developer's running Next.js instance.
  distDir: process.env.ECOTRACK_AUDIT === "1" ? ".next-audit" : process.env.ECOTRACK_BROWSER_TEST === "1" ? ".next-browser-tests" : ".next",
  ...(process.env.ECOTRACK_AUDIT === "1" ? { typescript: { tsconfigPath: "tsconfig.audit.json" } } : {}),
  async redirects() {
    return [{ source: "/admin/attention", destination: "/emissions?all=1", permanent: false }];
  },
};

export default nextConfig;
