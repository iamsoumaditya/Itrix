import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/webhooks/clerk/",
        destination: "/api/webhooks/clerk",
      },
    ];
  },
};

export default nextConfig;
