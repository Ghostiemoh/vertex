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
};

export default nextConfig;
