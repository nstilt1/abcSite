/**
 * KaleidoHeroStatic
 *
 * Renders the Kaleidomo WASM hero on detail pages (e.g. /downloads/kaleidomo-*).
 * All parameters are hardcoded here — edit the PARAMS object to tune the look.
 * The same format as the homepage HeroKaleidoControls is used so values are
 * directly comparable.
 *
 * Layout: fills its parent container (position: relative + overflow: hidden).
 * Wrap it in a sized div before using it, e.g.:
 *
 *   <div className="relative w-full aspect-video overflow-hidden rounded-2xl">
 *     <KaleidoHeroStatic />
 *   </div>
 */

import { HeroVideo } from "@/components/HeroVideo"
import type { HeroKaleidoControls } from "@/app/page"

// ─── Hardcoded parameters ────────────────────────────────────────────────────
//
// Tweak these to change how the kaleidoscope looks on product pages.
// Same units as the homepage sliders — see page.tsx for the conversion fns.
//
const PARAMS: HeroKaleidoControls = {
  /** Total animation cycle length in seconds. Lower = faster. */
  animationDuration: 100,

  /** Hue rotation offset in degrees (0–360). 308 matches the homepage default. */
  hueRotation: 308,

  /** Triangle mirror centre X in canvas-space pixels (0–1920). */
  triangleCenterX: 515.1039592844847,

  /** Triangle mirror centre Y in canvas-space pixels (0–1080). */
  triangleCenterY: 755.3734001945962,

  /** Triangle rotation in radians. */
  triangleRotationRad: 6.22,

  /**
   * How long one full reorientation cycle takes, in seconds.
   * Set to 0 to disable reorientation (static mirror position).
   * 64 * Math.PI ≈ 201s matches the homepage default.
   */
  reorientationDuration: 64 * Math.PI,

  /**
   * Easing function for the reorientation sweep.
   * Options: "linear" | "triangle" | "saw" | "sin" | "sin2" | "-cos"
   */
  reorientationFn: "sin",
}
// ─────────────────────────────────────────────────────────────────────────────

export default function KaleidoHeroStatic() {
  return <HeroVideo controls={PARAMS} />
}