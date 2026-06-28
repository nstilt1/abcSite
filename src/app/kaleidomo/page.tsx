import type { Metadata } from "next";
import KaleidoPageClient from "@/components/kaleidomo/KaleidomoPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Kaleidomo – Live Visualizer",
  description:
    "Real-time music-reactive kaleidoscope visualizer powered by WebAssembly. " +
    "Choose a preset, upload your own music, and go fullscreen.",
};

export default function KaleidoPage() {
  return <KaleidoPageClient />;
}