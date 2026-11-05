import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,

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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
