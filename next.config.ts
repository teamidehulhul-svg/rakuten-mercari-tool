import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
      },
      {
        protocol: "https",
        hostname: "thumbnail.image.rakuten.co.jp",
      },
      {
        protocol: "https",
        hostname: "tshop.r10s.jp",
      },
      {
        protocol: "https",
        hostname: "image.rakuten.co.jp",
      },
    ],
  },
};

export default nextConfig;
