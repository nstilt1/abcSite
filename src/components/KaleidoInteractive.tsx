"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Drop-in component for `/downloads/[slug]/page.tsx` when the slug contains
 * "kaleidomo".  Renders a call-to-action button beneath the hero area that
 * navigates to the live interactive visualizer page at `/kaleidomo`.
 */
export default function KaleidoInteractive() {
  return (
    <div className="mt-4 flex justify-center">
      <Link href="/kaleidomo">
        <Button size="lg" className="gap-2">
          {/* simple waveform icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12h3l3-8 4 16 3-8 3 4h4" />
          </svg>
          Go to Interactive Page with visualizer
        </Button>
      </Link>
    </div>
  );
}