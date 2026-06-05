import type { NextConfig } from "next";

// Parse hostname from NEXT_PUBLIC_CDN_URL for Next.js Image optimization.
// Falls back to a wildcard-safe pattern so the build doesn't fail locally.
function cdnHostname(): string {
  const raw = process.env.NEXT_PUBLIC_CDN_URL ?? "";
  try {
    return new URL(raw).hostname;
  } catch {
    return "**"; // allows any hostname in local dev when var is unset
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: cdnHostname(),
      },
    ],
  },
  async headers() {
    return [
      {
        // Normal WASM file
        source: "/wasm/:path*.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
      {
        // Brotli-compressed WASM file
        source: "/wasm/:path*.wasm.br",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Content-Encoding", value: "br" },
        ],
      },
      {
        source: "/wasm/:path*.wasm.gz",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Content-Encoding", value: "gzip" },
        ],
      },
    ];
  },
};

export default nextConfig;
