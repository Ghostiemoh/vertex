import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: '/invoices',
        destination: '/invoice',
        permanent: true,
      },
      {
        source: '/contracts',
        destination: '/contract',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/pitch-deck',
        destination: '/pitch-deck.html',
      },
      {
        source: '/pitch',
        destination: '/pitch-deck.html',
      },
    ];
  },
};

export default nextConfig;
