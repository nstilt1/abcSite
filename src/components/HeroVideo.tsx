"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroKaleidoControls } from "@/app/page";

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

function applyVideoSettings(vs: WasmVideoSettings, controls: HeroKaleidoControls) {
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

  vs.zoom_max = 0.79090958991783823;
  vs.zoom_min = 0.69;
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
};

export function HeroVideo({ controls }: HeroVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<LiveKaleidoscopeEngine | null>(null);
  const vsRef = useRef<WasmVideoSettings | null>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const [debugNow, setDebugNow] = useState(0);
  const debugStartedAtRef = useRef<number | null>(null);

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
        canvas!.width = 1920;
        canvas!.height = 1080;
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
        engineRef.current = engine;
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

      vsRef.current = vs;

      applyVideoSettings(vs, controls);

      try {
        engine.start_animation(
          24,
          354,
          0,
          0.069,
          1.1,
          controls.triangleCenterX,
          controls.triangleCenterY,
          controls.triangleRotationRad,
          3,
          controls.hueRotation,
          vs,
        );
      } catch (e) {
        engineRef.current = null;
        vsRef.current = null;

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

      const currentEngine = engineRef.current;
      const currentVs = vsRef.current;

      engineRef.current = null;
      vsRef.current = null;

      currentEngine?.stop_animation();
      currentEngine?.free();
      currentVs?.free();

      engine = null;
      vs = null;
    };
  }, [useVideoFallback]);

  useEffect(() => {
    const engine = engineRef.current;
    const vs = vsRef.current;

    if (!engine || !vs || useVideoFallback) return;

    applyVideoSettings(vs, controls);

    try {
      engine.update_animation_settings(
        24,
        354,
        0,
        0.069,
        1.1,
        controls.triangleCenterX,
        controls.triangleCenterY,
        controls.triangleRotationRad,
        3,
        controls.hueRotation,
        vs,
      );
    } catch (e) {
      debugLog("Failed to update hero controls:", e);
    }
  }, [controls, useVideoFallback]);

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

  return (
    <>
      <img
        src="https://hephaestus.alteredbrainchemistry.com/images/kaleidomo-first-frame.jpg"
        alt=""
        aria-hidden="true"
        className="
          absolute left-1/2 top-1/2
          aspect-video h-full min-h-full min-w-full w-auto
          -translate-x-1/2 -translate-y-1/2
          object-cover
          max-md:h-screen max-md:w-auto max-md:rotate-90
        "
      />
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
        </div>
      )}
    </>
  );
}