import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Offline detection for the "Jste bez připojení" notice in the report form (next/offline)
  experimental: { useOffline: true },

  async redirects() {
    return [
      {
        // www → apex (both domains are mapped to Cloud Run)
        source: "/:path*",
        has: [{ type: "host", value: "www.jasitadyjenom.cz" }],
        destination: "https://jasitadyjenom.cz/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Browsers check for a new service worker on every visit; never let a cache answer for it
      { source: "/serwist/:path*", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

// Serwist bundles the service worker with esbuild at build time (see app/serwist/[path]/route.ts)
export default withSerwist(nextConfig);
