"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroKaleidoControls } from "@/app/page";

import type {
  LiveKaleidoscopeEngine,
  WasmVideoSettings,
} from "@/wasm/kaleidomo_core";

// Served via a Next.js rewrite (see next.config.ts → rewrites) so the WASM
// runtime's fetch stays same-origin on all environments. The rewrite proxies
// through to hephaestus.alteredbrainchemistry.com in production.
const SOURCE_IMAGE_URL = "/wasm-assets/og-pink-flower-comp-3.jpg";

const FALLBACK_VIDEO_URL =
  "https://hephaestus.alteredbrainchemistry.com/media/uploads/output-wv1-720-8.mp4";

const DEBUG = true;

// ── Module-level WASM initialisation cache ────────────────────────────────
// The JS module + wasm binary init is done once and cached. This is safe
// because wasm-bindgen's init() is idempotent after the first call, but
// running it concurrently (Strict Mode double-mount) corrupts internal state.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWasmMod(): Promise<any> {
  if (!wasmModPromise) {
    wasmModPromise = (async () => {
      const wasmJsUrl  = "/wasm/kaleidomo_core.js";
      const wasmBinUrl = new URL("/wasm/kaleidomo_core_bg.wasm", window.location.origin);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import(/* webpackIgnore: true */ wasmJsUrl);
      await (mod.default as typeof import("@/wasm/kaleidomo_core").default)(wasmBinUrl);
      return mod;
    })().catch((e) => {
      wasmModPromise = null; // allow retry on next mount
      throw e;
    });
  }
  return wasmModPromise;
}

// ── Serialisation mutex ───────────────────────────────────────────────────
// React Strict Mode fires: mount → (sync) cleanup → mount.
// The second init() must not start until the first teardown() has finished
// freeing WASM objects, otherwise two engine instances share the same linear
// memory simultaneously and wasm-bindgen's internal buffer views go stale
// ("memory access out of bounds").
//
// This is a simple promise chain: each lifecycle slot appends to the tail and
// awaits the previous slot before proceeding.
let lifecycleTail: Promise<void> = Promise.resolve();

function serialise(fn: () => Promise<void>): Promise<void> {
  // Append fn to the tail; swallow errors so the chain never breaks.
  const next = lifecycleTail.then(fn).catch(() => {});
  lifecycleTail = next;
  return next;
}

// ─────────────────────────────────────────────────────────────────────────

function debugLog(...args: unknown[]) {
  if (DEBUG) console.log("[HeroKaleido]", ...args);
}

function isReorientationFn(value: unknown): value is HeroKaleidoControls["reorientationFn"] {
  return (
    value === "linear" ||
    value === "triangle" ||
    value === "saw" ||
    value === "sin" ||
    value === "sin2" ||
    value === "-cos"
  );
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

// Zoom and offset defaults — extracted as constants so callers can import
// them as a baseline when they only want to override one value.
export const HERO_VIDEO_DEFAULTS = {
  zoom_max: 0.9090958991783823,
  zoom_min: 0.85,
  offset_x: 354,
  offset_y: 0,
} as const;

function applyVideoSettings(
  vs: WasmVideoSettings,
  controls: HeroKaleidoControls,
  zoom_max: number,
  zoom_min: number,
) {
  const animationDuration = Math.max(
    0.001,
    finiteOr(controls.animationDuration, 100),
  );

  const reorientationDuration = finiteOr(controls.reorientationDuration, 64 * Math.PI);
  vs.animation_duration = animationDuration;

  vs.hue_range = 0;
  vs.hue_cycles = 0;
  vs.hue_start_offset = 0;
  vs.set_hue_fn("-cos");

  vs.rotation_range = 45;
  vs.rotation_cycles = 1;
  vs.rotation_start_offset = 0;
  vs.set_rotation_fn("sin2");

  vs.zoom_max = zoom_max;
  vs.zoom_min = zoom_min;
  vs.zoom_start_offset = 0;
  vs.num_zoom_loops = 4;
  vs.set_zoom_fn("sin");

  vs.orientation_range = 1;
  vs.orientation_cycles =
    reorientationDuration <= 0 ? 0 : 1 / reorientationDuration;

  vs.orientation_duration = reorientationDuration;
  vs.orientation_start_offset = 0;
  vs.set_orientation_fn(
    isReorientationFn(controls.reorientationFn)
      ? controls.reorientationFn
      : "linear",
  );
}

type HeroVideoProps = {
  controls: HeroKaleidoControls;
  /** Logical render width in pixels (sets canvas resolution & aspect ratio). Defaults to 1920. */
  width?: number;
  /** Logical render height in pixels (sets canvas resolution & aspect ratio). Defaults to 1080. */
  height?: number;
  /** Number of kaleidoscope tiles. Passed to start_animation / update_animation_settings. Defaults to 3. */
  tile_count?: number;
  /**
   * Maximum zoom level for the zoom oscillation cycle.
   * Must be >= zoom_min. Defaults to 0.9090958991783823.
   */
  zoom_max?: number;
  /**
   * Minimum zoom level for the zoom oscillation cycle.
   * Must be <= zoom_max. Defaults to 0.85.
   */
  zoom_min?: number;
  /**
   * Horizontal pixel offset into the source image.
   * Shifts the crop window left/right. Defaults to 354.
   */
  offset_x?: number;
  /**
   * Vertical pixel offset into the source image.
   * Shifts the crop window up/down. Defaults to 0.
   */
  offset_y?: number;
};

export function HeroVideo({
  controls,
  width = 1920,
  height = 1080,
  tile_count = 3,
  zoom_max = HERO_VIDEO_DEFAULTS.zoom_max,
  zoom_min = HERO_VIDEO_DEFAULTS.zoom_min,
  offset_x = HERO_VIDEO_DEFAULTS.offset_x,
  offset_y = HERO_VIDEO_DEFAULTS.offset_y,
}: HeroVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<LiveKaleidoscopeEngine | null>(null);
  const vsRef     = useRef<WasmVideoSettings | null>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const [debugNow, setDebugNow] = useState(0);
  const debugStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!useVideoFallback) return;

    const video = videoRef.current;
    if (!video) return;

    video.muted        = true;
    video.defaultMuted = true;
    video.playsInline  = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((e: unknown) => {
        debugLog("Fallback video autoplay failed:", e);
      });
    }
  }, [useVideoFallback]);

  useEffect(() => {
    if (useVideoFallback) return;

    let ro: ResizeObserver | null = null;
    let cancelled = false;

    function activateVideoFallback(reason: unknown) {
      debugLog("activating video fallback:", reason);
      if (!cancelled) setUseVideoFallback(true);
    }

    // Single owner of all WASM objects. Nulls refs before freeing so calling
    // twice is always safe (second call reads null and skips).
    function teardown() {
      const eng = engineRef.current;
      const vs  = vsRef.current;
      engineRef.current = null;
      vsRef.current     = null;
      try { eng?.stop_animation(); } catch { /* never started or already freed */ }
      try { eng?.free();           } catch { /* already freed */ }
      try { vs?.free();            } catch { /* already freed */ }
    }

    // Both init and teardown run through the serialise() chain so they never
    // overlap with a concurrent mount's lifecycle even under Strict Mode.
    serialise(async () => {
      // By the time this slot runs, any previous teardown has completed, so WASM
      // memory is quiescent and it is safe to create a new engine and load images.

      if (cancelled) return; // cleanup fired before we got the lock

      debugLog("init() called");

      const canvas = canvasRef.current;
      if (!canvas) {
        activateVideoFallback("canvas ref is null");
        return;
      }

      function fitCanvas() {
        canvas!.width  = width;
        canvas!.height = height;
      }
      fitCanvas();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;
      try {
        mod = await getWasmMod();
      } catch (e) {
        activateVideoFallback(e);
        return;
      }

      if (cancelled) return;

      try {
        const engine = await new (mod.LiveKaleidoscopeEngine as typeof LiveKaleidoscopeEngine)(canvas);
        engineRef.current = engine;
      } catch (e) {
        activateVideoFallback(e);
        return;
      }

      if (cancelled) { teardown(); return; }

      try {
        await engineRef.current!.load_image_from_url(SOURCE_IMAGE_URL);
      } catch (e) {
        teardown();
        activateVideoFallback(e);
        return;
      }

      if (cancelled) { teardown(); return; }

      const vs = new (mod.WasmVideoSettings as typeof WasmVideoSettings)();
      vsRef.current = vs;
      applyVideoSettings(vs, controls, zoom_max, zoom_min);

      try {
        engineRef.current!.start_animation(
          24,
          offset_x,
          offset_y,
          0.069, // zoom
          1.1,
          controls.triangleCenterX,
          controls.triangleCenterY,
          controls.triangleRotationRad,
          tile_count,
          controls.hueRotation,
          vs,
        );
      } catch (e) {
        teardown();
        activateVideoFallback(e);
        return;
      }

      if (cancelled) { teardown(); return; }

      debugLog("animation started ✓");

      ro = new ResizeObserver(() => fitCanvas());
      ro.observe(canvas.parentElement ?? canvas);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      // Queue teardown in the same chain — it will run after init() finishes
      // (or immediately if init() was cancelled before it acquired the lock).
      serialise(async () => teardown());
    };
  }, [useVideoFallback, width, height, tile_count, zoom_max, zoom_min, offset_x, offset_y]);

  useEffect(() => {
    const engine = engineRef.current;
    const vs     = vsRef.current;

    if (!engine || !vs || useVideoFallback) return;

    applyVideoSettings(vs, controls, zoom_max, zoom_min);

    try {
      engine.update_animation_settings(
        24,
        offset_x,
        offset_y,
        0.069, // zoom
        1.1,
        controls.triangleCenterX,
        controls.triangleCenterY,
        controls.triangleRotationRad,
        tile_count,
        controls.hueRotation,
        vs,
      );
    } catch (e) {
      debugLog("Failed to update hero controls:", e);
    }
  }, [controls, useVideoFallback, zoom_max, zoom_min, offset_x, offset_y]);

  useEffect(() => {
    if (!DEBUG) return;

    let raf = 0;

    function tick(now: number) {
      if (debugStartedAtRef.current === null) {
        debugStartedAtRef.current = now;
      }
      setDebugNow(now);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (useVideoFallback) {
    return (
      <video
        ref={videoRef}
        aria-label="Abstract Altered Brain Chemistry hero background"
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-full object-cover"
        style={{ pointerEvents: "none" }}
        src={FALLBACK_VIDEO_URL}
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
      />
    );
  }

  const aspectStyle = { aspectRatio: `${width} / ${height}` };

  return (
    <>
      <img
        src="https://hephaestus.alteredbrainchemistry.com/images/kaleidomo-first-frame.jpg"
        alt=""
        aria-hidden="true"
        style={{ ...aspectStyle, pointerEvents: "none" }}
        className="
          absolute left-1/2 top-1/2
          h-full min-h-full min-w-full w-auto
          -translate-x-1/2 -translate-y-1/2
          object-cover
          max-md:h-screen max-md:w-auto max-md:rotate-90
        "
      />
      <canvas
        ref={canvasRef}
        aria-label="Abstract Altered Brain Chemistry hero background"
        aria-hidden="true"
        style={{ ...aspectStyle, pointerEvents: "none" }}
        className="
          absolute left-1/2 top-1/2
          h-full min-h-full min-w-full w-auto
          -translate-x-1/2 -translate-y-1/2
          object-cover
          max-md:h-screen max-md:w-auto max-md:rotate-90
        "
      />
      {process.env.NODE_ENV !== "production" && debugStartedAtRef.current !== null && (
        <div className="absolute bottom-4 left-4 z-50 rounded-lg bg-black/70 px-3 py-2 font-mono text-xs text-white">
          <div>
            elapsed: {((debugNow - debugStartedAtRef.current) / 1000).toFixed(2)}s
          </div>
          <div>
            animation: {controls.animationDuration.toFixed(2)}s
          </div>
          <div>
            reorientation: {controls.reorientationDuration <= 0
              ? "off"
              : `${controls.reorientationDuration.toFixed(2)}s`}
          </div>
          <div>
            source phase: {(
              (((debugNow - debugStartedAtRef.current) / 1000) %
                controls.animationDuration) /
              controls.animationDuration
            ).toFixed(4)}
          </div>
          <div>
            reorient phase: {controls.reorientationDuration <= 0
              ? "off"
              : (
                  (((debugNow - debugStartedAtRef.current) / 1000) %
                    controls.reorientationDuration) /
                  controls.reorientationDuration
                ).toFixed(4)}
          </div>
          <div>zoom: {zoom_min.toFixed(4)} – {zoom_max.toFixed(4)}</div>
          <div>offset: ({offset_x}, {offset_y})</div>
        </div>
      )}
    </>
  );
}