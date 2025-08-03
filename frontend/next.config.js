/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BACKEND_URL: process.env.BACKEND_URL || "http://localhost:8082",
  },
  images: {
    // Configure image optimization
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;
