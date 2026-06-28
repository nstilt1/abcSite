"use client";

/**
 * KaleidoPageClient
 * -----------------
 * Live, music-reactive kaleidoscope visualizer for /kaleidomo.
 *
 * Architecture:
 *  - WASM engine (LiveKaleidoscopeEngine) renders to a <canvas>
 *  - Audio is decoded via Web Audio API; per-frame peaks are fed to the engine
 *    via set_audio_peaks() so beat-pumping is 100 % frame-accurate
 *  - Circle motion (heroCircleLeft/Right/Y + desiredLeftRotation) is
 *    HARDCODED per preset; the X/Y/triangleRotation sliders are hidden
 *  - Controls panel mirrors the Kaleidomo desktop app grouping
 *  - Fullscreen: clicking or pressing any key while fullscreen exits it
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  LiveKaleidoscopeEngine,
  WasmVideoSettings,
} from "@/wasm/kaleidomo_core";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

// ─── WASM singleton ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModPromise: Promise<any> | null = null;

const KALEIDO_TYPE_IDX: number = 4;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWasmMod(): Promise<any> {
  if (!wasmModPromise) {
    wasmModPromise = (async () => {
      const wasmJsUrl = "/wasm/kaleidomo_core.js";
      const wasmBinUrl = new URL(
        "/wasm/kaleidomo_core_bg.wasm",
        window.location.origin,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import(/* webpackIgnore: true */ wasmJsUrl);
      await (mod.default as typeof import("@/wasm/kaleidomo_core").default)(
        wasmBinUrl,
      );
      return mod;
    })().catch((e) => {
      wasmModPromise = null;
      throw e;
    });
  }
  return wasmModPromise;
}

let lifecycleTail: Promise<void> = Promise.resolve();
function serialise(fn: () => Promise<void>): Promise<void> {
  const next = lifecycleTail.then(fn).catch(() => {});
  lifecycleTail = next;
  return next;
}

// ─── Source images (CloudFront / proxied) ────────────────────────────────────

const SOURCE_IMAGES: string[] = [
  // Proxied via next.config.ts rewrite → hephaestus.alteredbrainchemistry.com
  "/wasm-assets/og-pink-flower-comp-3.jpg",
  // TODO: add your other CloudFront URLs here
  "/wasm-assets/white-flower-1.jpg",
  "/wasm-assets/pink-flower-2.jpg",
];

// ─── Songs ───────────────────────────────────────────────────────────────────

interface Song {
  title: string;
  url: string;
}

const BUNDLED_SONGS: Song[] = [
  { title: "Taking Off", url: "/wasm-assets/audio-1.wav" },
  { title: "Airborne", url: "/wasm-assets/audio-2.wav" },
  { title: "Suborbital Trajectory", url: "/wasm-assets/audio-3.wav" },
  { title: "Black Hole", url: "/wasm-assets/audio-4.wav" },
  { title: "Time Travel", url: "/wasm-assets/audio-5.wav" },
  { title: "Reflection", url: "/wasm-assets/audio-6.wav" },
  { title: "Breaking the Cycle", url: "/wasm-assets/audio-7.wav" },
  { title: "Overcome", url: "/wasm-assets/audio-8.wav" },
  { title: "Rose-Tinted Kaleidomo", url: "/wasm-assets/audio-9.wav" }
];

// ─── Preset definitions ───────────────────────────────────────────────────────

interface CircleConfig {
  heroCircleLeftX: number;
  heroCircleRightX: number;
  heroCircleY: number;
  heroDesiredLeftRotation: number;
}

interface Preset {
  name: string;
  imageIndex: number; // index into SOURCE_IMAGES
  circle: CircleConfig;
  // Base reorientation speed (orientation cycles/sec independent of audio)
  orientationBaseSpeed: number;
  // Beat pumping: how much audio peak affects orientation
  audioOrientationAmount: number;
  // Beat pumping: how much audio peak triggers reorientation jump
  audioReorientationAmount: number;
  // Animation loop duration (seconds)
  animationDuration: number;
  // Zoom range
  zoomMax: number;
  zoomMin: number;
  numZoomLoops: number;
  // Rotation sweep
  rotationRange: number;
  rotationCycles: number;
  rotationFn: string;
  // Hue sweep
  hueRange: number;
  hueCycles: number;
  hueFn: string;
  // Tile count (kaleido_type_idx)
  hueRotation: number;
  tileCount: number;
  // Source image crop offset
  offsetX: number;
  offsetY: number;
}

const PRESETS: Preset[] = [
  {
    name: "Pink Bloom",
    imageIndex: 0,
    circle: {
      heroCircleLeftX: 515.1,
      heroCircleRightX: 1547.0,
      heroCircleY: 755.4,
      heroDesiredLeftRotation: 6.22,
    },
    orientationBaseSpeed: 0.04,
    audioOrientationAmount: 0.18,
    audioReorientationAmount: 0.06,
    animationDuration: 10,
    zoomMax: 0.909,
    zoomMin: 0.85,
    numZoomLoops: 4,
    rotationRange: 45,
    rotationCycles: 1,
    rotationFn: "sin2",
    hueRange: 0,
    hueCycles: 0,
    hueFn: "-cos",
    hueRotation: 0,
    tileCount: 3,
    offsetX: 354,
    offsetY: 0,
  },
  {
    name: "Ivory Bloom",
    imageIndex: 1,
    circle: {
      heroCircleLeftX: 186.0,
      heroCircleRightX: 3024.0,
      heroCircleY: 1850.0,
      heroDesiredLeftRotation: 6.22,
    },
    orientationBaseSpeed: 0.08,
    audioOrientationAmount: 0.25,
    audioReorientationAmount: 0.1,
    animationDuration: 40,
    zoomMax: 0.95,
    zoomMin: 0.78,
    numZoomLoops: 2,
    rotationRange: 30,
    rotationCycles: 1,
    rotationFn: "sin",
    hueRange: 0,
    hueCycles: 0,
    hueFn: "sin",
    hueRotation: 0,
    tileCount: 3,
    offsetX: 200,
    offsetY: 0,
  },
  {
    name: "Profound Blue",
    imageIndex: 2,
    circle: {
      heroCircleLeftX: 330.0,
      heroCircleRightX: 2616.0,
      heroCircleY: 2265.0,
      heroDesiredLeftRotation: 6.22,
    },
    orientationBaseSpeed: 0.015,
    audioOrientationAmount: 0.1,
    audioReorientationAmount: 0.03,
    animationDuration: 40,
    zoomMax: 0.7,
    zoomMin: 0.6,
    numZoomLoops: 6,
    rotationRange: 20,
    rotationCycles: 1,
    rotationFn: "sin2",
    hueRange: 0,
    hueCycles: 0,
    hueFn: "linear",
    hueRotation: 240,
    tileCount: 3,
    offsetX: 500,
    offsetY: 100,
  },
];

// ─── Audio helpers (ported from Kaleidomo.tsx) ────────────────────────────────

function applyLowpassFilter(
  data: Float32Array,
  sampleRate: number,
  cutoffHz: number,
  poles: number,
): Float32Array {
  if (cutoffHz <= 0 || cutoffHz >= sampleRate / 2) return data;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  let buf = new Float32Array(data);
  for (let p = 0; p < poles; p++) {
    let prev = 0;
    for (let i = 0; i < buf.length; i++) {
      prev = prev + alpha * (buf[i]! - prev);
      buf[i] = prev;
    }
  }
  return buf;
}

function slopeToPoles(slope: number): number {
  return Math.max(1, Math.round(slope / 6));
}

function buildFramePeaks(
  audioBuffer: AudioBuffer,
  fps: number,
  lowpassHz = 0,
  lowpassSlope = 24,
): Float32Array {
  const sampleRate = audioBuffer.sampleRate;
  const samplesPerFrame = Math.max(1, Math.floor(sampleRate / fps));
  const frameCount = Math.ceil(audioBuffer.length / samplesPerFrame);
  const peaks = new Float32Array(frameCount);
  const poles = slopeToPoles(lowpassSlope);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    let data: Float32Array = audioBuffer.getChannelData(ch);
    if (lowpassHz > 0 && lowpassHz < sampleRate / 2) {
      data = applyLowpassFilter(data, sampleRate, lowpassHz, poles);
    }
    for (let frame = 0; frame < frameCount; frame++) {
      const start = frame * samplesPerFrame;
      const end = Math.min(audioBuffer.length, start + samplesPerFrame);
      for (let i = start; i < end; i++) {
        const v = Math.abs(data[i] ?? 0);
        if (v > peaks[frame]!) peaks[frame] = v;
      }
    }
  }
  return peaks;
}

function normalizePeaks(
  rawPeaks: Float32Array,
  floor: number,
  ceiling: number,
): Float32Array {
  const safeCeiling = Math.max(ceiling, floor + 0.0001);
  const out = new Float32Array(rawPeaks.length);
  for (let i = 0; i < rawPeaks.length; i++) {
    const raw = rawPeaks[i] ?? 0;
    out[i] = Math.min(1, Math.max(0, (raw - floor) / (safeCeiling - floor)));
  }
  return out;
}

// ─── Control state ────────────────────────────────────────────────────────────

interface ControlState {
  hueRotation: number;
  // Animation
  animationDuration: number;
  slices: number;
  fps: number;
  // Zoom
  zoomMax: number;
  zoomMin: number;
  zoomFn: string;
  zoomStartOffset: number;
  numZoomLoops: number;
  // Rotation
  rotationRange: number;
  rotationCycles: number;
  rotationStartOffset: number;
  rotationFn: string;
  // Hue
  hueRange: number;
  hueCycles: number;
  hueStartOffset: number;
  hueFn: string;
  // Orientation (circle motion — base values; circle params are preset-locked)
  orientationBaseSpeed: number;
  orientationPeakMultiplier: number;
  orientationPhase: number;
  // Audio reactive
  audioReactiveEnabled: boolean;
  audioOrientationAmount: number;
  audioReorientationAmount: number;
  audioPeakSmoothing: number;
  audioPeakFloor: number;
  audioPeakCeiling: number;
  audioLowpassFreq: number;
  audioLowpassSlope: 6 | 12 | 24 | 48;
  // Image
  tileCount: number;
  offsetX: number;
  offsetY: number;
}

function presetToControls(p: Preset): ControlState {
  return {
    animationDuration: 400,
    fps: 30,
    slices: 24,
    zoomMax: p.zoomMax,
    zoomMin: p.zoomMin,
    zoomFn: "sin",
    zoomStartOffset: 0,
    numZoomLoops: p.numZoomLoops,
    rotationRange: p.rotationRange,
    rotationCycles: 10,
    rotationStartOffset: 0,
    rotationFn: p.rotationFn,
    hueRange: p.hueRange,
    hueCycles: p.hueCycles,
    hueStartOffset: 0,
    hueFn: p.hueFn,
    hueRotation: p.hueRotation,
    orientationBaseSpeed: p.orientationBaseSpeed,
    orientationPeakMultiplier: 0.25,
    orientationPhase: 0.0,
    audioReactiveEnabled: true,
    audioOrientationAmount: p.audioOrientationAmount,
    audioReorientationAmount: p.audioReorientationAmount,
    audioPeakSmoothing: 0.75,
    audioPeakFloor: 0.02,
    audioPeakCeiling: 0.7,
    audioLowpassFreq: 169,
    audioLowpassSlope: 24,
    tileCount: p.tileCount,
    offsetX: p.offsetX,
    offsetY: p.offsetY,
  };
}

type ControlAction = { type: "SET"; key: keyof ControlState; value: ControlState[keyof ControlState] }
  | { type: "RESET"; preset: Preset };

function controlReducer(state: ControlState, action: ControlAction): ControlState {
  switch (action.type) {
    case "SET":
      return { ...state, [action.key]: action.value };
    case "RESET":
      return presetToControls(action.preset);
  }
}

// ─── Slider helper ────────────────────────────────────────────────────────────

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  decimals = 2,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  decimals?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {Number.isInteger(value) ? value : value.toFixed(decimals)}
          {unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v!)}
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 first:mt-0">
      {children}
    </p>
  );
}

const FN_OPTIONS = ["linear", "sin", "sin2", "saw", "triangle", "-cos"] as const;

function FnSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {FN_OPTIONS.map((fn) => (
          <button
            key={fn}
            type="button"
            onClick={() => onChange(fn)}
            className={`rounded px-2 py-0.5 text-xs border transition-colors ${
              value === fn
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            {fn}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KaleidoPageClient() {
  const [presetIdx, setPresetIdx] = useState(0);
  const activePreset = PRESETS[presetIdx]!;

  const [controls, dispatch] = useReducer(
    controlReducer,
    activePreset,
    presetToControls,
  );

  // Audio state
  const [songs] = useState<Song[]>(BUNDLED_SONGS);
  const [songIdx, setSongIdx] = useState(0);
  const [uploadedSong, setUploadedSong] = useState<Song | null>(null);
  const activeSong = uploadedSong ?? songs[songIdx] ?? null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Refs for audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioStartTimeRef = useRef<number>(0); // AudioContext.currentTime when play() was last called
  const audioOffsetRef = useRef<number>(0); // seconds into buffer we last started from

  // WASM engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LiveKaleidoscopeEngine | null>(null);
  const vsRef = useRef<WasmVideoSettings | null>(null);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const [wasmReady, setWasmReady] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── Preset switch ────────────────────────────────────────────────────────
  function switchPreset(idx: number) {
    setPresetIdx(idx);
    dispatch({ type: "RESET", preset: PRESETS[idx]! });
  }

  // ── set helper ───────────────────────────────────────────────────────────
  function set<K extends keyof ControlState>(key: K, value: ControlState[K]) {
    dispatch({ type: "SET", key, value });
  }

  // ── Apply WasmVideoSettings from current controls + active preset circle ─
  const applyVs = useCallback(
    (vs: WasmVideoSettings, c: ControlState, preset: Preset) => {
      vs.animation_duration = Math.max(0.001, c.animationDuration);
      vs.fps = c.fps;

      vs.zoom_max = c.zoomMax;
      vs.zoom_min = c.zoomMin;
      vs.set_zoom_fn(c.zoomFn);
      vs.zoom_start_offset = c.zoomStartOffset;
      vs.num_zoom_loops = c.numZoomLoops;

      vs.rotation_range = c.rotationRange;
      vs.rotation_cycles = c.rotationCycles;
      vs.rotation_start_offset = c.rotationStartOffset;
      vs.set_rotation_fn(c.rotationFn);

      vs.hue_range = c.hueRange;
      vs.hue_cycles = c.hueCycles;
      vs.hue_start_offset = c.hueStartOffset;
      vs.set_hue_fn(c.hueFn);

      vs.orientation_base_speed = c.orientationBaseSpeed;
      vs.orientation_start_offset = c.orientationPhase;

      vs.audio_reactive_enabled = c.audioReactiveEnabled;
      vs.audio_orientation_amount = c.audioOrientationAmount;
      vs.audio_reorientation_amount = c.audioReorientationAmount;
      vs.audio_peak_smoothing = c.audioPeakSmoothing;
      vs.orientation_peak_multiplier = c.orientationPeakMultiplier;

      // Hardcoded circle per preset
      vs.hero_circle_left_x = preset.circle.heroCircleLeftX;
      vs.hero_circle_right_x = preset.circle.heroCircleRightX;
      vs.hero_circle_y = preset.circle.heroCircleY;
      vs.hero_desired_left_rotation = preset.circle.heroDesiredLeftRotation;
    },
    [],
  );

  // ── Compute orientation params from circle at phase 0 ────────────────────
  function circleAtPhase(preset: Preset, phase: number) {
    const { heroCircleLeftX: lx, heroCircleRightX: rx, heroCircleY: cy, heroDesiredLeftRotation: dlr } =
      preset.circle;
    const cx = (lx + rx) / 2;
    const radius = (rx - lx) / 2;
    const angle = Math.PI + phase * Math.PI * 2;
    return {
      triangleCenterX: cx + Math.cos(angle) * radius,
      triangleCenterY: cy + Math.sin(angle) * radius,
      triangleRotationRad: dlr + (angle - Math.PI),
    };
  }

  // ── WASM init ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    function teardown() {
      const eng = engineRef.current;
      const vs = vsRef.current;
      engineRef.current = null;
      vsRef.current = null;
      try { eng?.stop_animation(); } catch { /* */ }
      try { eng?.free(); } catch { /* */ }
      try { vs?.free(); } catch { /* */ }
    }

    serialise(async () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;
      try {
        mod = await getWasmMod();
      } catch (e) {
        if (!cancelled) setWasmError(String(e));
        return;
      }
      if (cancelled) return;

      try {
        const engine = await new (
          mod.LiveKaleidoscopeEngine as typeof LiveKaleidoscopeEngine
        )(canvas);
        engineRef.current = engine;
      } catch (e) {
        if (!cancelled) setWasmError(String(e));
        return;
      }
      if (cancelled) { teardown(); return; }

      const preset = PRESETS[presetIdx]!;
      try {
        await engineRef.current!.load_image_from_url(
          SOURCE_IMAGES[preset.imageIndex]!,
        );
      } catch (e) {
        teardown();
        if (!cancelled) setWasmError(String(e));
        return;
      }
      if (cancelled) { teardown(); return; }

      const vs = new (mod.WasmVideoSettings as typeof WasmVideoSettings)();
      vsRef.current = vs;
      applyVs(vs, controls, preset);

      const { triangleCenterX, triangleCenterY, triangleRotationRad } =
        circleAtPhase(preset, 0);

      try {
        engineRef.current!.start_animation(
          controls.slices,
          controls.offsetX,
          controls.offsetY,
          0.069,
          controls.tileCount,
          triangleCenterX,
          triangleCenterY,
          triangleRotationRad,
          KALEIDO_TYPE_IDX, // kaleido_type_idx
          controls.hueRotation, // hue_rotation
          vs,
        );
      } catch (e) {
        teardown();
        if (!cancelled) setWasmError(String(e));
        return;
      }
      if (!cancelled) setWasmReady(true);
    });

    return () => {
      cancelled = true;
      setWasmReady(false);
      serialise(async () => teardown());
    };
    // Intentionally run only on mount / preset image change — control updates
    // go through the update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx]);

  // ── Update engine when controls change ───────────────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    const vs = vsRef.current;
    if (!engine || !vs || !wasmReady) return;

    applyVs(vs, controls, activePreset);
    const { triangleCenterX, triangleCenterY, triangleRotationRad } =
      circleAtPhase(activePreset, controls.orientationPhase);

    try {
      engine.update_animation_settings(
        controls.slices,
        controls.offsetX,
        controls.offsetY,
        0.069,
        controls.tileCount,
        triangleCenterX,
        triangleCenterY,
        triangleRotationRad,
        KALEIDO_TYPE_IDX,
        controls.hueRotation,
        vs,
      );
    } catch {
      /* engine may not be started yet */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, wasmReady]);

  // ── Canvas resize (fullscreen) ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      if (isFullscreen) {
        canvas.width = window.screen.width;
        canvas.height = window.screen.height;
      } else {
        canvas.width = 1920;
        canvas.height = 1080;
      }
    }
    resize();

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isFullscreen]);

  // ── Fullscreen toggle ─────────────────────────────────────────────────────
  function enterFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    el.requestFullscreen?.().catch(() => {});
    setIsFullscreen(true);
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }

  // Exit fullscreen on any click or keypress inside fullscreen
  useEffect(() => {
    function onKey() { if (isFullscreen) exitFullscreen(); }
    function onClick() { if (isFullscreen) exitFullscreen(); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [isFullscreen]);

  // Sync isFullscreen with native fullscreen changes (e.g. Escape key)
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Audio helpers ─────────────────────────────────────────────────────────

  async function ensureAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function stopAudioSource() {
    try { audioSourceRef.current?.stop(); } catch { /* */ }
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
  }

  async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const ctx = await ensureAudioCtx();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ${url}`);
    const arrayBuf = await resp.arrayBuffer();
    return ctx.decodeAudioData(arrayBuf);
  }

  async function sendPeaksToEngine(buffer: AudioBuffer) {
    const engine = engineRef.current;
    if (!engine) return;
    const rawPeaks = buildFramePeaks(
      buffer,
      controls.fps,
      controls.audioLowpassFreq,
      controls.audioLowpassSlope,
    );
    const peaks = normalizePeaks(
      rawPeaks,
      controls.audioPeakFloor,
      controls.audioPeakCeiling,
    );
    engine.set_audio_peaks(peaks);
  }

  async function startPlayback(offsetSecs = 0) {
    if (!activeSong) return;
    const ctx = await ensureAudioCtx();
    stopAudioSource();

    let buffer = audioBufferRef.current;
    if (!buffer) {
      try {
        buffer = await loadAudioBuffer(activeSong.url);
        audioBufferRef.current = buffer;
        await sendPeaksToEngine(buffer);
      } catch (e) {
        setAudioError(`Could not load audio: ${String(e)}`);
        return;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = isLooping;
    source.connect(ctx.destination);
    source.start(0, offsetSecs);
    audioSourceRef.current = source;
    audioStartTimeRef.current = ctx.currentTime;
    audioOffsetRef.current = offsetSecs;

    source.onended = () => {
      if (!isLooping) setIsPlaying(false);
    };
    setIsPlaying(true);
    setAudioError(null);
  }

  function pausePlayback() {
    const ctx = audioCtxRef.current;
    if (ctx && audioSourceRef.current) {
      // Record how far we are in the buffer before stopping
      audioOffsetRef.current += ctx.currentTime - audioStartTimeRef.current;
    }
    stopAudioSource();
    setIsPlaying(false);
  }

  async function restartPlayback() {
    // Reset WASM animation frame counter
    const engine = engineRef.current;
    if (engine) engine.clear_audio_peaks();
    if (audioBufferRef.current && engineRef.current) {
      await sendPeaksToEngine(audioBufferRef.current);
    }
    audioOffsetRef.current = 0;
    stopAudioSource();
    setIsPlaying(false);
    await startPlayback(0);
  }

  async function handlePlay() {
    if (isPlaying) return;
    await startPlayback(audioOffsetRef.current);
  }

  // Re-send peaks whenever relevant audio controls change
  useEffect(() => {
    if (!audioBufferRef.current) return;
    sendPeaksToEngine(audioBufferRef.current).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.fps, controls.audioLowpassFreq, controls.audioLowpassSlope, controls.audioPeakFloor, controls.audioPeakCeiling]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedSong({ title: file.name, url });
    audioBufferRef.current = null; // force reload
    stopAudioSource();
    setIsPlaying(false);
  }

  // ── Memoised control panel ────────────────────────────────────────────────
  const controlPanel = useMemo(
    () => (
      <div className="flex flex-col gap-2 px-3 py-3 text-sm">
        {/* ── Presets ── */}
        <SectionHeader>Preset</SectionHeader>
        <div className="flex flex-col gap-1">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => switchPreset(i)}
              className={`rounded px-2 py-1.5 text-left text-xs border transition-colors ${
                i === presetIdx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* ── Animation ── */}
        <SectionHeader>Animation</SectionHeader>
        <LabeledSlider
          label="Slices"
          value={controls.slices}
          min={3}
          max={128}
          step={1}
          unit="slices"
          onChange={(v) => set("slices", v)}
        />
        <LabeledSlider
          label="FPS"
          value={controls.fps}
          min={10}
          max={60}
          step={1}
          decimals={0}
          onChange={(v) => set("fps", v)}
        />
        <LabeledSlider
          label="Color Shift"
          value={controls.hueRotation}
          min={0}
          max={360}
          step={1}
          decimals={0}
          onChange={(v) => set("hueRotation", v)}
        />

        {/* ── Rotation ── */}
        <SectionHeader>Rotation around moving point</SectionHeader>
        <LabeledSlider label="Range (°)" value={controls.rotationRange} min={0} max={360} step={1} decimals={0} onChange={(v) => set("rotationRange", v)} />
        <LabeledSlider label="Cycles" value={controls.rotationCycles} min={0} max={8} step={0.25} onChange={(v) => set("rotationCycles", v)} />
        <LabeledSlider label="Start Offset" value={controls.rotationStartOffset} min={0} max={1} step={0.01} onChange={(v) => set("rotationStartOffset", v)} />
        <FnSelect label="Rotation Fn" value={controls.rotationFn} onChange={(v) => set("rotationFn", v)} />

        {/* ── Hue ── */}
        <SectionHeader>Hue / Daydream Effect</SectionHeader>
        <LabeledSlider label="Range (°)" value={controls.hueRange} min={0} max={360} step={1} decimals={0} onChange={(v) => set("hueRange", v)} />
        <LabeledSlider label="Cycles" value={controls.hueCycles} min={0} max={32} step={1} onChange={(v) => set("hueCycles", v)} />
        <LabeledSlider label="Start Offset" value={controls.hueStartOffset} min={0} max={1} step={0.01} onChange={(v) => set("hueStartOffset", v)} />
        <FnSelect label="Hue Fn" value={controls.hueFn} onChange={(v) => set("hueFn", v)} />

        {/* ── Orientation (circle motion speed) ── */}
        <SectionHeader>Orientation</SectionHeader>
        <LabeledSlider
          label="Base Speed"
          value={controls.orientationBaseSpeed}
          min={0}
          max={25}
          step={0.001}
          onChange={(v) => set("orientationBaseSpeed", v)}
        />
        <LabeledSlider
          label="Peak Multiplier"
          value={controls.orientationPeakMultiplier}
          min={0}
          max={5}
          step={0.05}
          onChange={(v) => set("orientationPeakMultiplier", v)}
        />
        <LabeledSlider
          label="Phase"
          value={controls.orientationPhase}
          min={0}
          max={1}
          step={0.001}
          onChange={(v) => set("orientationPhase", v)}
        />

        {/* ── Source ── */}
        <SectionHeader>Source Crop</SectionHeader>
        <LabeledSlider label="Offset X" value={controls.offsetX} min={0} max={2000} step={1} decimals={0} onChange={(v) => set("offsetX", v)} />
        <LabeledSlider label="Offset Y" value={controls.offsetY} min={0} max={2000} step={1} decimals={0} onChange={(v) => set("offsetY", v)} />
        <LabeledSlider
          label="Tile Count"
          value={controls.tileCount}
          min={1}
          max={12}
          step={0.1}
          decimals={0}
          onChange={(v) => set("tileCount", v)}
        />

        {/* ── Audio reactive ── */}
        <SectionHeader>Audio Reactive</SectionHeader>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={controls.audioReactiveEnabled}
            onCheckedChange={(c) => set("audioReactiveEnabled", !!c)}
          />
          Enable audio reactivity
        </label>
        <LabeledSlider label="Orientation Amt" value={controls.audioOrientationAmount} min={0} max={1} step={0.01} onChange={(v) => set("audioOrientationAmount", v)} />
        <LabeledSlider label="Reorientation Amt" value={controls.audioReorientationAmount} min={0} max={1} step={0.01} onChange={(v) => set("audioReorientationAmount", v)} />
        <LabeledSlider label="Peak Smoothing" value={controls.audioPeakSmoothing} min={0} max={0.999} step={0.01} onChange={(v) => set("audioPeakSmoothing", v)} />
        <LabeledSlider label="Noise Gate" value={controls.audioPeakFloor} min={0} max={0.5} step={0.001} onChange={(v) => set("audioPeakFloor", v)} />
        <LabeledSlider label="Peak Clip" value={controls.audioPeakCeiling} min={0.05} max={1} step={0.001} onChange={(v) => set("audioPeakCeiling", v)} />
        <LabeledSlider label="LP Cutoff" value={controls.audioLowpassFreq} min={40} max={800} step={1} decimals={0} unit=" Hz" onChange={(v) => set("audioLowpassFreq", v)} />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">LP Slope</p>
          <div className="flex gap-1">
            {([6, 12, 24, 48] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("audioLowpassSlope", s)}
                className={`rounded px-2 py-0.5 text-xs border transition-colors ${
                  controls.audioLowpassSlope === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controls, presetIdx],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-white">
      {/* Left controls panel (hidden while fullscreen) */}
      {!isFullscreen && (
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-zinc-950">
          {controlPanel}
        </aside>
      )}

      {/* Main canvas + overlay */}
      <div
        ref={containerRef}
        className="relative flex flex-1 flex-col items-center justify-center bg-black"
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="h-full w-full object-contain"
          style={{ display: "block" }}
        />

        {/* WASM error overlay */}
        {wasmError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="max-w-sm text-center text-sm text-red-400">
              WASM failed to load: {wasmError}
            </p>
          </div>
        )}

        {/* Bottom HUD (audio + fullscreen) — hidden while fullscreen */}
        {!isFullscreen && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center gap-2 bg-black/60 px-4 py-2 backdrop-blur-sm">
            {/* Song selector */}
            {songs.length > 0 && !uploadedSong && (
              <select
                className="rounded border border-white/20 bg-zinc-900 px-2 py-1 text-xs text-white"
                value={songIdx}
                onChange={(e) => {
                  setSongIdx(Number(e.target.value));
                  audioBufferRef.current = null;
                  stopAudioSource();
                  setIsPlaying(false);
                }}
              >
                {songs.map((s, i) => (
                  <option key={i} value={i}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}

            {uploadedSong && (
              <span className="max-w-[160px] truncate text-xs text-white/70">
                {uploadedSong.title}
              </span>
            )}

            {/* Upload */}
            <label className="cursor-pointer rounded border border-white/20 bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800">
              Upload music
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={handleUpload}
              />
            </label>

            {/* Playback controls */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlay}
              disabled={!activeSong || isPlaying}
              className="h-7 px-2 text-xs"
            >
              ▶ Play
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={pausePlayback}
              disabled={!isPlaying}
              className="h-7 px-2 text-xs"
            >
              ⏸ Pause
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={restartPlayback}
              disabled={!activeSong}
              className="h-7 px-2 text-xs"
            >
              ⏮ Restart
            </Button>

            {/* Loop toggle */}
            <label className="flex items-center gap-1 cursor-pointer text-xs">
              <Checkbox
                checked={isLooping}
                onCheckedChange={(c) => {
                  setIsLooping(!!c);
                  if (audioSourceRef.current)
                    audioSourceRef.current.loop = !!c;
                }}
              />
              Loop
            </label>

            {audioError && (
              <span className="text-xs text-red-400">{audioError}</span>
            )}

            <div className="ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={enterFullscreen}
                className="h-7 px-2 text-xs"
              >
                ⛶ Fullscreen
              </Button>
            </div>
          </div>
        )}

        {/* Fullscreen exit hint */}
        {isFullscreen && (
          <div className="pointer-events-none absolute top-4 right-4 rounded bg-black/50 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm">
            Press any key or click to exit fullscreen
          </div>
        )}
      </div>
    </div>
  );
}