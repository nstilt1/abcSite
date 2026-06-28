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
  async rewrites() {
    return [
      {
        // Proxy the kaleidoscope source image so the WASM fetch stays same-origin.
        // On localhost the remote server doesn't send CORS headers, so a direct
        // fetch from the WASM runtime fails. In production (Amplify) the request
        // goes to the same domain and this rewrite is a no-op passthrough.
        source: "/wasm-assets/og-pink-flower-comp-3.jpg",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/images/og-pink-flower-comp-3.jpg",
      },
      {
        source: "/wasm-assets/white-flower-1.jpg",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/images/IMG_20260627_190000.jpg",
      },
      {
        source: "/wasm-assets/pink-flower-2.jpg",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/images/IMG_20260627_185912.jpg",
      },
      {
        source: "/wasm-assets/audio-1.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/1-taking-off-pc56.wav",
      },
      {
        source: "/wasm-assets/audio-2.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/2-airborne-c16.wav",
      },
      {
        source: "/wasm-assets/audio-3.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/3-suborbital-trajectory-c3.wav",
      },
      {
        source: "/wasm-assets/audio-4.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/4-black-hole-pc40.wav",
      },
      {
        source: "/wasm-assets/audio-5.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/5-time-travel-pc39.wav",
      },
      {
        source: "/wasm-assets/audio-6.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/6-reflection-c9.wav",
      },
      {
        source: "/wasm-assets/audio-7.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/7-breaking-the-cycle-pc43.wav",
      },
      {
        source: "/wasm-assets/audio-8.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/8-overcome-c4.wav",
      },
      {
        source: "/wasm-assets/audio-9.wav",
        destination:
          "https://hephaestus.alteredbrainchemistry.com/media/uploads/9-rose-tinted-kaleidomo-pwp.wav",
      },
    ];
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
