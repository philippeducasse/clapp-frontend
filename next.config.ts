import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path(.*)",
        destination: `${backendUrl}/api/:path/`,
      },
    ];
  },
};

const isProduction = process.env.NODE_ENV === "production";

const config = isProduction
  ? withSentryConfig(nextConfig, {
      org: "philippe-ducasse",
      project: "clapp_frontend",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      webpack: {
        automaticVercelMonitors: true,
        treeshake: {
          removeDebugLogging: true,
        },
      },
    })
  : nextConfig;

export default config;
