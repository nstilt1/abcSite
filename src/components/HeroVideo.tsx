"use client";

import { useEffect, useRef } from "react";

// Type-only import — resolved at build time by TypeScript, never bundled.
import type {
  LiveKaleidoscopeEngine,
  WasmVideoSettings,
} from "@/wasm/kaleidomo_core";

// ─── Config ──────────────────────────────────────────────────────────────────

// Must be a still image (JPEG / PNG / WebP). The Rust wasm decoder does not
// accept video files.
const SOURCE_IMAGE_URL =
  "https://hephaestus.alteredbrainchemistry.com/images/og-pink-flower-comp-3.jpg";

// Flip to false to silence all debug output before shipping.
const DEBUG = true;
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log("[HeroKaleido]", ...args);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeroVideo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let engine: LiveKaleidoscopeEngine | null = null;
    let vs: WasmVideoSettings | null = null;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    async function init() {
      debugLog("init() called");

      const canvas = canvasRef.current;
      if (!canvas) {
        debugLog("canvas ref is null — bailing");
        return;
      }
      debugLog("canvas found:", canvas);

      function fitCanvas() {
        const dpr = window.devicePixelRatio ?? 1;
        const rect = canvas!.getBoundingClientRect();
        canvas!.width  = Math.min(Math.round(rect.width  * dpr), 1920);
        canvas!.height = Math.min(Math.round(rect.height * dpr), 1080);
        debugLog(`fitCanvas → ${canvas!.width}×${canvas!.height} (dpr=${dpr})`);
      }
      fitCanvas();

      // ── Load the wasm glue ─────────────────────────────────────────────────
      // webpackIgnore means webpack won't touch this import at all, so the
      // @/ alias would NOT be substituted — use an absolute public URL instead.
      // Both the .js glue and the .wasm binary must be in public/wasm/.
      const wasmJsUrl = "/wasm/kaleidomo_core.js";
      const wasmBinUrl = new URL("/wasm/kaleidomo_core_bg.wasm", window.location.origin);

      debugLog("importing wasm glue from", wasmJsUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        mod = await import(/* webpackIgnore: true */ wasmJsUrl);
      } catch (e) {
        debugLog("ERROR importing wasm glue:", e);
        return;
      }
      debugLog("wasm glue imported, exports:", Object.keys(mod as object));

      debugLog("initialising wasm binary from", wasmBinUrl.href);
      try {
        await (mod.default as typeof import("@/wasm/kaleidomo_core").default)(wasmBinUrl);
      } catch (e) {
        debugLog("ERROR initialising wasm binary:", e);
        return;
      }
      debugLog("wasm binary ready");

      if (cancelled) { debugLog("cancelled after wasm init"); return; }

      // ── Create engine ──────────────────────────────────────────────────────
      debugLog("constructing LiveKaleidoscopeEngine…");
      try {
        engine = await new (mod.LiveKaleidoscopeEngine as typeof LiveKaleidoscopeEngine)(canvas);
      } catch (e) {
        debugLog("ERROR constructing engine:", e);
        return;
      }
      debugLog("engine ready:", engine);

      if (cancelled) { engine!.free(); engine = null; debugLog("cancelled after engine"); return; }

      // ── Load source image ──────────────────────────────────────────────────
      debugLog("loading source image:", SOURCE_IMAGE_URL);
      try {
        await engine.load_image_from_url(SOURCE_IMAGE_URL);
      } catch (e) {
        debugLog("ERROR loading source image:", e);
        engine.free(); engine = null;
        return;
      }
      debugLog("source image loaded");

      if (cancelled) { engine!.free(); engine = null; debugLog("cancelled after image load"); return; }

      // ── Build video / animation settings ──────────────────────────────────
      vs = new (mod.WasmVideoSettings as typeof WasmVideoSettings)();
      vs.animation_duration    = 50;
      vs.fps                   = 30;
      vs.rotation_range        = 45;
      vs.rotation_cycles       = 1;
      vs.rotation_start_offset = 0;
      vs.set_rotation_fn("sin2");

      vs.hue_range             = 0;
      vs.hue_cycles            = 0;
      vs.hue_start_offset      = 0;
      vs.set_hue_fn("-cos");

      vs.zoom_max              = 0.79090958991783823;
      vs.zoom_min              = 0.69;
      vs.zoom_start_offset     = 0;
      vs.num_zoom_loops        = 4;
      vs.set_zoom_fn("sin");

      debugLog("starting animation");
      engine.start_animation(
        /* count                */ 24,
        /* offset_x             */ 354,
        /* offset_y             */ 0,
        /* zoom                 */ 0.069,
        /* tile_count           */ 1.1,
        /* triangle_center_x    */ 515.1039592844847,
        /* triangle_center_y    */ 755.3734001945962,
        /* triangle_rotation_rad*/ 6.22,
        /* kaleido_type_idx     */ 3,
        /* hue_rotation         */ 308,
        vs,
      );
      debugLog("animation started ✓");

      ro = new ResizeObserver(() => fitCanvas());
      ro.observe(canvas.parentElement ?? canvas);
    }

    void init().catch((e: unknown) => debugLog("unhandled error in init():", e));

    return () => {
      debugLog("cleanup: stopping animation");
      cancelled = true;
      ro?.disconnect();
      engine?.stop_animation();
      engine?.free();
      vs?.free();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Abstract Altered Brain Chemistry hero background"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
      className="absolute left-0 top-0 h-full w-full"
    />
  );
}