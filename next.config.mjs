import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "resources.premierleague.com",
        pathname: "/premierleague25/photos/players/**",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  webpack: (config) => {
    config.resolve.alias["openmls_wasm_bg.wasm"] = path.join(
      projectDirectory,
      "node_modules/@ermis-network/ermis-chat-sdk/public/openmls_wasm_bg.wasm",
    );

    return config;
  },
};

export default nextConfig;
