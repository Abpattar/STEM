import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/*": ["./data/ncert-index.json"],
    "/api/videos": ["./scripts/yt_niche_search.py", "./data/youtube-video-cache.json"],
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/main/index.html",
      },
      {
        source: "/assets/:path*",
        destination: "/main/assets/:path*",
      },
      {
        source: "/scratchpad",
        destination: "/scratchpad/index.html",
      },
      {
        source: "/digitallab",
        destination: "/digitallab/index.html",
      },
    ];
  },
};

export default nextConfig;
