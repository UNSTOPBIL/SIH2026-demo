/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.6", "localhost", "127.0.0.1", "0.0.0.0"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

