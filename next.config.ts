import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: [],
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
export default config;
