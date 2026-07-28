"use client"

/**
 * KaleidomoProductCustomizer — /shop/[slug] customizer for physical_kaleidomo products.
 *
 * Reuses the WASM engine lifecycle pattern from HeroVideo.tsx / KaleidomoPageClient.tsx
 * (module-level cached init, serialised mount/teardown so Strict Mode's double-mount
 * doesn't double-free WASM memory — see the `serialise` comment in those files for why).
 *
 * Unlike those components this renders a single STILL frame, not a looping animation —
 * the printed product is a static image. WasmVideoSettings is still the correct type to
 * construct (it's the WASM binding's name for the whole render-config struct, used for
 * one frame or many), but its oscillator fields (animation_duration, num_zoom_loops,
 * rotation_cycles, orientation_*) are meaningless for a still and are collapsed to fixed
 * values below rather than left cycling.
 *
 * A preset (name + sourceImageUrl + hero-circle geometry + hue shift + zoom) is picked
 * from a dropdown. Sliders on top of the selected preset control rotation angle / tile
 * count / crop offset live. The rendered canvas is composited onto a product mockup image
 * (hoodie / t-shirt / tapestry) via absolute positioning over a fixed print-area rectangle
 * per mockup type — this is a visual preview only, not what gets sent to Printify (Printify
 * receives the flat design PNG plus its own print-area config on their end).
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  LiveKaleidoscopeEngine,
  WasmVideoSettings,
} from "@/wasm/kaleidomo_core"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { KaleidomoPreset, MockupType } from "@/types/content"

const KALEIDO_TYPE_IDX = 4

// ─── WASM singleton (module-level, shared with other Kaleidomo components) ───
// Deliberately named/scoped the same way as KaleidomoPageClient.tsx's copy —
// each file keeps its own cache since they're never mounted at the same time
// in practice, but the pattern (cache the init promise, never re-run it
// concurrently) is identical and load-bearing for WASM memory safety.

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
    })().catch((e) => { wasmModPromise = null; throw e; });
  }
  return wasmModPromise;
}

let lifecycleTail: Promise<void> = Promise.resolve();
function serialise(fn: () => Promise<void>): Promise<void> {
  const next = lifecycleTail.then(fn).catch(() => {});
  lifecycleTail = next;
  return next;
}

// Proxy admin-configured source images through a same-origin route so the
// WASM engine's fetch doesn't hit CORS issues (see api/wasm-image-proxy).
function proxiedImageUrl(sourceImageUrl: string): string {
  return `/api/wasm-image-proxy?url=${encodeURIComponent(sourceImageUrl)}`
}

// ─── Slider-controlled state (everything NOT stored in the preset) ──────────
// Zoom comes from the active preset (see KaleidomoPreset.zoom). These are the
// remaining knobs that matter for a single still frame.

interface SliderState {
  /** Fixed rotation angle in degrees for this one frame (not a cycling range). */
  rotationAngle: number
  tileCount: number
  offsetX: number
  offsetY: number
}

const DEFAULT_SLIDERS: SliderState = {
  rotationAngle: 0,
  tileCount: 3,
  offsetX: 0,
  offsetY: 0,
}

// ─── Mockup print-area geometry ──────────────────────────────────────────────
// Fixed rectangle (percentage of the mockup image) that the rendered canvas is
// clipped/positioned into per product type. Tuned for common flat-lay mockup
// photography conventions; adjust if the actual mockup photos differ.

const MOCKUP_CONFIG: Record<MockupType, { imageUrl: string; printArea: { top: string; left: string; width: string; height: string } }> = {
  tshirt: {
    imageUrl: "/mockups/tshirt-blank.png",
    printArea: { top: "22%", left: "32%", width: "36%", height: "46%" },
  },
  hoodie: {
    imageUrl: "/mockups/hoodie-blank.png",
    printArea: { top: "28%", left: "30%", width: "40%", height: "42%" },
  },
  tapestry: {
    imageUrl: "/mockups/tapestry-blank.png",
    printArea: { top: "8%", left: "10%", width: "80%", height: "84%" },
  },
}

interface KaleidomoProductCustomizerProps {
  mockupType: MockupType
  presets: KaleidomoPreset[]
  /** Called whenever the shopper picks a different preset, for display purposes (e.g. cart label). */
  onPresetChange?: (preset: KaleidomoPreset) => void
}

export default function KaleidomoProductCustomizer({
  mockupType,
  presets,
  onPresetChange,
}: KaleidomoProductCustomizerProps) {
  const [presetIdx, setPresetIdx] = useState(0)
  const activePreset = presets[presetIdx]

  const [sliders, setSliders] = useState<SliderState>(DEFAULT_SLIDERS)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<LiveKaleidoscopeEngine | null>(null)
  const frameConfigRef = useRef<WasmVideoSettings | null>(null)
  const [wasmReady, setWasmReady] = useState(false)
  const [wasmError, setWasmError] = useState<string | null>(null)

  function set<K extends keyof SliderState>(key: K, value: SliderState[K]) {
    setSliders((prev) => ({ ...prev, [key]: value }))
  }

  function switchPreset(idx: number) {
    setPresetIdx(idx)
    if (presets[idx] && onPresetChange) onPresetChange(presets[idx])
  }

  // Fills in the render-config struct for a single still frame. All oscillator
  // fields are collapsed to fixed values (max === min, one "cycle" covering the
  // whole duration) rather than left animating, since only one frame is ever drawn.
  const applyFrameConfig = useCallback((frameConfig: WasmVideoSettings, s: SliderState, preset: KaleidomoPreset) => {
    frameConfig.animation_duration = 1;
    frameConfig.fps = 30;

    // Single fixed zoom level — not a range, since there's no animation to
    // oscillate across.
    frameConfig.zoom_max = preset.zoom; frameConfig.zoom_min = preset.zoom;
    frameConfig.set_zoom_fn("sin"); frameConfig.zoom_start_offset = 0; frameConfig.num_zoom_loops = 0;

    // Fixed rotation angle for this frame, not a sweeping range.
    frameConfig.rotation_range = 0; frameConfig.rotation_cycles = 0;
    frameConfig.rotation_start_offset = s.rotationAngle / 360; frameConfig.set_rotation_fn("sin2");

    frameConfig.hue_range = 0; frameConfig.hue_cycles = 0;
    frameConfig.hue_start_offset = 0; frameConfig.set_hue_fn("sin");

    frameConfig.orientation_base_speed = 0;
    frameConfig.orientation_start_offset = 0;
    // Disabled — see the same field in KaleidomoPageClient.tsx for why a
    // nonzero orientation_duration causes a periodic position jump (moot for
    // a still frame anyway, but keeping it off avoids any startup transient).
    frameConfig.orientation_duration = 0.0;

    frameConfig.audio_reactive_enabled = false;

    frameConfig.hero_circle_left_x = preset.heroCircleLeftX;
    frameConfig.hero_circle_right_x = preset.heroCircleRightX;
    frameConfig.hero_circle_y = preset.heroCircleY;
    frameConfig.hero_desired_left_rotation = 0;
  }, []);

  // ── WASM lifecycle: mount once, teardown on unmount ──────────────────────
  useEffect(() => {
    let cancelled = false;

    function teardown() {
      const eng = engineRef.current, frameConfig = frameConfigRef.current;
      engineRef.current = null; frameConfigRef.current = null;
      try { eng?.stop_animation(); } catch { /* */ }
      try { eng?.free();           } catch { /* */ }
      try { frameConfig?.free();   } catch { /* */ }
    }

    serialise(async () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas || !activePreset) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;
      try { mod = await getWasmMod(); }
      catch (e) { if (!cancelled) setWasmError(String(e)); return; }
      if (cancelled) return;

      try {
        engineRef.current = await new (mod.LiveKaleidoscopeEngine as typeof LiveKaleidoscopeEngine)(canvas);
      } catch (e) { if (!cancelled) setWasmError(String(e)); return; }
      if (cancelled) { teardown(); return; }

      try { await engineRef.current!.load_image_from_url(proxiedImageUrl(activePreset.sourceImageUrl)); }
      catch (e) { teardown(); if (!cancelled) setWasmError(String(e)); return; }
      if (cancelled) { teardown(); return; }

      const frameConfig = new (mod.WasmVideoSettings as typeof WasmVideoSettings)();
      frameConfigRef.current = frameConfig;
      applyFrameConfig(frameConfig, sliders, activePreset);

      const cx = (activePreset.heroCircleLeftX + activePreset.heroCircleRightX) / 2;
      const cy = activePreset.heroCircleY;

      try {
        engineRef.current!.start_animation(
          24, sliders.offsetX, sliders.offsetY, 0.069, sliders.tileCount,
          cx, cy, 0,
          KALEIDO_TYPE_IDX, activePreset.hueRotation, frameConfig,
        );
      } catch (e) { teardown(); if (!cancelled) setWasmError(String(e)); return; }

      if (!cancelled) setWasmReady(true);
    });

    return () => {
      cancelled = true;
      setWasmReady(false);
      serialise(async () => teardown());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount/unmount only — preset/slider changes handled below

  // ── Preset switch: hot-swap image without restarting the engine ─────────
  const prevPresetIdxRef = useRef(presetIdx);
  useEffect(() => {
    if (!wasmReady) return;
    if (prevPresetIdxRef.current === presetIdx) return;
    prevPresetIdxRef.current = presetIdx;

    const engine = engineRef.current;
    const frameConfig = frameConfigRef.current;
    const preset = presets[presetIdx];
    if (!engine || !frameConfig || !preset) return;

    engine.load_image_from_url(proxiedImageUrl(preset.sourceImageUrl)).then(() => {
      if (engineRef.current !== engine) return;
      applyFrameConfig(frameConfig, sliders, preset);
      const cx = (preset.heroCircleLeftX + preset.heroCircleRightX) / 2;
      const cy = preset.heroCircleY;
      try {
        engine.update_animation_settings(
          24, sliders.offsetX, sliders.offsetY, 0.069, sliders.tileCount,
          cx, cy, 0,
          KALEIDO_TYPE_IDX, preset.hueRotation, frameConfig,
        );
      } catch { /* engine stopped */ }
    }).catch((e: unknown) => setWasmError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx, wasmReady]);

  // ── Slider changes: update the running engine without reloading the image ─
  useEffect(() => {
    const engine = engineRef.current, frameConfig = frameConfigRef.current;
    if (!engine || !frameConfig || !wasmReady || !activePreset) return;
    applyFrameConfig(frameConfig, sliders, activePreset);
    const cx = (activePreset.heroCircleLeftX + activePreset.heroCircleRightX) / 2;
    const cy = activePreset.heroCircleY;
    try {
      engine.update_animation_settings(
        24, sliders.offsetX, sliders.offsetY, 0.069, sliders.tileCount,
        cx, cy, 0,
        KALEIDO_TYPE_IDX, activePreset.hueRotation, frameConfig,
      );
    } catch { /* not started yet */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliders, wasmReady]);

  const mockup = MOCKUP_CONFIG[mockupType];

  if (presets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No presets configured for this product yet.
      </p>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── Mockup preview ── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted">
        <img
          src={mockup.imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <div
          className="absolute overflow-hidden"
          style={{
            top: mockup.printArea.top,
            left: mockup.printArea.left,
            width: mockup.printArea.width,
            height: mockup.printArea.height,
          }}
        >
          {wasmError ? (
            <div className="flex h-full w-full items-center justify-center bg-black/5 p-2 text-center text-xs text-muted-foreground">
              Preview unavailable on this device/browser (no WebGPU).
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Design</label>
          <Select
            value={String(presetIdx)}
            onValueChange={(v) => switchPreset(parseInt(v, 10))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a design" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p, i) => (
                <SelectItem key={i} value={String(i)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activePreset && (
          <p className="text-xs text-muted-foreground">
            Zoom: {activePreset.zoom.toFixed(2)} (set per-design in admin)
          </p>
        )}

        <SliderRow label="Rotation Angle" value={[sliders.rotationAngle]}
          onChange={([v]) => set("rotationAngle", v)} min={0} max={360} step={1} />

        <SliderRow label="Tile Count" value={[sliders.tileCount]}
          onChange={([v]) => set("tileCount", v)} min={1} max={12} step={0.1} />

        <SliderRow label="Crop Offset X" value={[sliders.offsetX]}
          onChange={([v]) => set("offsetX", v)} min={-500} max={500} step={1} />

        <SliderRow label="Crop Offset Y" value={[sliders.offsetY]}
          onChange={([v]) => set("offsetY", v)} min={-500} max={500} step={1} />

        {!wasmReady && !wasmError && (
          <p className="text-xs text-muted-foreground">Loading preview…</p>
        )}
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number[]
  onChange: (v: number[]) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value.map((v) => v.toFixed(2)).join(" – ")}
        </span>
      </div>
      <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} />
    </div>
  )
}