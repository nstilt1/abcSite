"use client";

import { useEffect, useRef, useState } from "react";

import type {
  LiveKaleidoscopeEngine,
  WasmVideoSettings,
} from "@/wasm/kaleidomo_core";

const SOURCE_IMAGE_URL =
  "https://hephaestus.alteredbrainchemistry.com/images/og-pink-flower-comp-3.jpg";

const FALLBACK_VIDEO_URL =
  "https://hephaestus.alteredbrainchemistry.com/media/uploads/output-wv1-720-8.mp4";

const DEBUG = true;

function debugLog(...args: unknown[]) {
  if (DEBUG) console.log("[HeroKaleido]", ...args);
}

export function HeroVideo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);

  useEffect(() => {
    if (!useVideoFallback) return;

    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise.catch((e: unknown) => {
        debugLog("Fallback video autoplay failed:", e);
      });
    }
  }, [useVideoFallback]);

  useEffect(() => {
    if (useVideoFallback) return;

    let engine: LiveKaleidoscopeEngine | null = null;
    let vs: WasmVideoSettings | null = null;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    function activateVideoFallback(reason: unknown) {
      debugLog("activating video fallback:", reason);

      if (!cancelled) {
        setUseVideoFallback(true);
      }
    }

    async function init() {
      debugLog("init() called");

      const canvas = canvasRef.current;
      if (!canvas) {
        activateVideoFallback("canvas ref is null");
        return;
      }

      function fitCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        const maxWidth = 1920;
        const maxHeight = 1080;

        const rawWidth = Math.max(1, Math.round(rect.width * dpr));
        const rawHeight = Math.max(1, Math.round(rect.height * dpr));

        const scale = Math.min(maxWidth / rawWidth, maxHeight / rawHeight, 1);

        canvas.width = Math.max(1, Math.round(rawWidth * scale));
        canvas.height = Math.max(1, Math.round(rawHeight * scale));
      }

      fitCanvas();

      const wasmJsUrl = "/wasm/kaleidomo_core.js";
      const wasmBinUrl = new URL(
        "/wasm/kaleidomo_core_bg.wasm",
        window.location.origin,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;

      try {
        mod = await import(/* webpackIgnore: true */ wasmJsUrl);
      } catch (e) {
        activateVideoFallback(e);
        return;
      }

      try {
        await (mod.default as typeof import("@/wasm/kaleidomo_core").default)(
          wasmBinUrl,
        );
      } catch (e) {
        activateVideoFallback(e);
        return;
      }

      if (cancelled) return;

      try {
        engine = await new (mod.LiveKaleidoscopeEngine as typeof LiveKaleidoscopeEngine)(
          canvas,
        );
      } catch (e) {
        activateVideoFallback(e);
        return;
      }

      if (cancelled) {
        engine.free();
        engine = null;
        return;
      }

      try {
        await engine.load_image_from_url(SOURCE_IMAGE_URL);
      } catch (e) {
        engine.free();
        engine = null;
        activateVideoFallback(e);
        return;
      }

      if (cancelled) {
        engine.free();
        engine = null;
        return;
      }

      vs = new (mod.WasmVideoSettings as typeof WasmVideoSettings)();

      vs.animation_duration = 100;
      vs.fps = 24;
      vs.rotation_range = 45;
      vs.rotation_cycles = 1;
      vs.rotation_start_offset = 0;
      vs.set_rotation_fn("sin2");

      vs.hue_range = 0;
      vs.hue_cycles = 0;
      vs.hue_start_offset = 0;
      vs.set_hue_fn("-cos");

      vs.zoom_max = 0.79090958991783823;
      vs.zoom_min = 0.69;
      vs.zoom_start_offset = 0;
      vs.num_zoom_loops = 4;
      vs.set_zoom_fn("sin");

      try {
        engine.start_animation(
          24,
          354,
          0,
          0.069,
          1.1,
          515.1039592844847,
          755.3734001945962,
          6.22,
          3,
          308,
          vs,
        );
      } catch (e) {
        engine.stop_animation();
        engine.free();
        engine = null;
        vs.free();
        vs = null;
        activateVideoFallback(e);
        return;
      }

      debugLog("animation started ✓");

      ro = new ResizeObserver(() => fitCanvas());
      ro.observe(canvas.parentElement ?? canvas);
    }

    void init().catch((e: unknown) => activateVideoFallback(e));

    return () => {
      cancelled = true;
      ro?.disconnect();
      engine?.stop_animation();
      engine?.free();
      vs?.free();
    };
  }, [useVideoFallback]);

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

  return (
    <canvas
      ref={canvasRef}
      aria-label="Abstract Altered Brain Chemistry hero background"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
      className="
        absolute left-1/2 top-1/2
        aspect-video
        h-full min-h-full min-w-full w-auto
        -translate-x-1/2 -translate-y-1/2
        object-cover
        max-md:h-screen max-md:w-auto max-md:rotate-90
      "
    />
  );
}