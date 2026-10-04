import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The Guide's voice input posts a recorded clip (capped at 2 MB in transcribe.ts); the
      // default 1 MB limit could reject a full minute recorded by Safari.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
