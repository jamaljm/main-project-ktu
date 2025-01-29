/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
  },
  experimental: {
    fontLoaders: [
      { loader: "@next/font/google", options: { subsets: ["latin"] } },
    ],
  },
};

module.exports = nextConfig;
