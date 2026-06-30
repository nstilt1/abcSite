"use client";

/**
 * KaleidoPageClient — /kaleidomo interactive visualizer
 *
 * Three bugs fixed vs the previous version:
 *
 * 1. AUDIO / VISUAL SYNC
 *    The WASM engine indexes audio peaks by frame_index % peaks.len().
 *    frame_index starts counting from the moment start_animation() is called
 *    and never stops — so if the page has been running for 30 s before the
 *    user hits Play, frame_index is already ~900 frames ahead of peak[0].
 *    Fix: record engineStartMsRef (performance.now() at start_animation)
 *    and when beginning playback rotate the peaks array so that peak[0]
 *    corresponds to the current engine frame, not the beginning of the song.
 *    On pause/resume we account for the accumulated audio offset the same way.
 *
 * 2. QUEUE / SHUFFLE / REPEAT-ONE
 *    Replaced the bare <select> + loop checkbox with a proper play-queue
 *    system:  Sequential → plays tracks in order then stops;
 *             Shuffle → randomises order each time;
 *             Repeat-one → loops the current track indefinitely.
 *    onended advances the queue or wraps depending on mode.
 *    The current track title is shown in the HUD.
 *
 * 3. ANIMATION GLITCH — WRONG animation_duration VALUE
 *    animation_duration is NOT a loop timer; it is the shared period over which
 *    rotation_cycles sweeps of the rotation angle, num_zoom_loops zoom cycles,
 *    and hue_cycles hue cycles all complete.  The WASM derives cycles-per-second
 *    for rotation as  rotation_cycles / animation_duration  and for zoom as
 *    num_zoom_loops / animation_duration.  All modulate_*_time functions then
 *    compute  phase = elapsed * (cycles / animation_duration)  and call
 *    rem_euclid(1.0) — so they loop continuously without any hard reset.
 *
 *    The glitch was caused by presetToControls hardcoding animationDuration: 400
 *    instead of reading p.animationDuration from the preset.  At t=400 s the hue
 *    phase (which uses the frame-based modulate()) completed exactly one full cycle
 *    and visually snapped, because the wrong period made every oscillator run at
 *    1/40th the intended speed.  Fix: read p.animationDuration from the preset and
 *    pass it straight through to vs.animation_duration.  The value is preset-locked
 *    and not exposed in the controls panel.
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

// ─── WASM singleton ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModPromise: Promise<any> | null = null;

const KALEIDO_TYPE_IDX: number = 4;

// ─── Mobile layout constants ──────────────────────────────────────────────────

// Matches Tailwind's `md` breakpoint — below this width we render the
// YouTube-style mobile layout (mini-player + sticky settings sheet) instead
// of the desktop left-panel layout.
const MOBILE_BREAKPOINT_PX = 768;

// Height (px) of the collapsed "mini player" canvas region on mobile when the
// settings sheet is open — i.e. the strip the canvas shrinks into, beneath
// which the sticky Settings header + scrollable settings list live.
const MOBILE_MINI_PLAYER_HEIGHT_PX = 220;

// Vertical swipe distance (px) required to toggle between the mobile
// fullscreen canvas view and the settings sheet view.
const MOBILE_SWIPE_THRESHOLD_PX = 50;

/**
 * Direction the canvas rotates on mobile while in the fullscreen view, so the
 * tileCount — which normally counts tiles fitting horizontally — instead
 * counts tiles fitting vertically (matching a portrait phone's aspect ratio).
 * 1 = rotate right (clockwise) 90deg, -1 = rotate left (counter-clockwise) 90deg.
 * Not certain which reads correctly against the WASM render — flip this
 * constant if the rotation direction looks wrong. The rotation is only ever
 * applied in the mobile fullscreen view; it is automatically un-applied
 * (reverted to 0deg) when swiping down into the settings sheet view, and
 * re-applied when swiping back up into fullscreen — see `mobileRotated` below.
 */
const MOBILE_ROTATE_DIRECTION: 1 | -1 = -1;

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

// ─── Source images ────────────────────────────────────────────────────────────

const SOURCE_IMAGES: string[] = [
  // Proxied via next.config.ts rewrite → hephaestus.alteredbrainchemistry.com
  "/wasm-assets/og-pink-flower-comp-3.jpg",
  "/wasm-assets/white-flower-1.jpg",
  "/wasm-assets/pink-flower-2.jpg",
];

// ─── Songs ────────────────────────────────────────────────────────────────────

interface Song { title: string; url: string; }

const BUNDLED_SONGS: Song[] = [
  { title: "Taking Off",            url: "/wasm-assets/audio-1.mp3" },
  { title: "Airborne",              url: "/wasm-assets/audio-2.mp3" },
  { title: "Suborbital Trajectory", url: "/wasm-assets/audio-3.mp3" },
  { title: "Black Hole",            url: "/wasm-assets/audio-4.mp3" },
  { title: "Time Travel",           url: "/wasm-assets/audio-5.mp3" },
  { title: "Reflection",            url: "/wasm-assets/audio-6.mp3" },
  { title: "Breaking the Cycle",    url: "/wasm-assets/audio-7.mp3" },
  { title: "Overcome",              url: "/wasm-assets/audio-8.mp3" },
  { title: "Rose-Tinted Kaleidomo", url: "/wasm-assets/audio-9.mp3" },
];

// ─── Playback mode ────────────────────────────────────────────────────────────

type PlayMode = "sequential" | "shuffle" | "repeat-one";

// ─── Presets ─────────────────────────────────────────────────────────────────

interface CircleConfig {
  heroCircleLeftX: number;
  heroCircleRightX: number;
  heroCircleY: number;
  heroDesiredLeftRotation: number;
}

interface Preset {
  name: string;
  imageIndex: number;
  circle: CircleConfig;
  // Base reorientation speed in pixels/second of arc along the hero circle.
  // Converted to cycles/sec inside WASM as: base_speed_cycles = px_s / (2π * hero_radius)
  orientationBaseSpeed: number;
  /**
   * Shared oscillator period in seconds.
   * rotation_cycles sweeps complete in this time, as do num_zoom_loops zoom
   * cycles and hue_cycles hue cycles.  The WASM derives cycles-per-second as
   * e.g.  rotation_cycles / animationDuration  — so this controls how fast the
   * rotation angle moves, NOT when the animation resets (it never resets;
   * all modulate_by_time functions use rem_euclid so they loop continuously).
   */
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
    circle: { heroCircleLeftX: 515.1, heroCircleRightX: 1547.0, heroCircleY: 755.4, heroDesiredLeftRotation: 6.22 },
    orientationBaseSpeed: 19,
    animationDuration: 10,
    zoomMax: 0.909, zoomMin: 0.85, numZoomLoops: 4,
    rotationRange: 45, rotationCycles: 1, rotationFn: "sin2",
    hueRange: 0, hueCycles: 0, hueFn: "-cos",
    hueRotation: 0, tileCount: 3, offsetX: 354, offsetY: 0,
  },
  {
    name: "Ivory Bloom",
    imageIndex: 1,
    circle: { heroCircleLeftX: 186.0, heroCircleRightX: 3024.0, heroCircleY: 1850.0, heroDesiredLeftRotation: 6.22 },
    orientationBaseSpeed: 38,
    animationDuration: 40,
    zoomMax: 0.95, zoomMin: 0.78, numZoomLoops: 2,
    rotationRange: 30, rotationCycles: 1, rotationFn: "sin",
    hueRange: 0, hueCycles: 0, hueFn: "sin",
    hueRotation: 0, tileCount: 3, offsetX: 200, offsetY: 0,
  },
  {
    name: "Profound Blue",
    imageIndex: 2,
    circle: { heroCircleLeftX: 330.0, heroCircleRightX: 2616.0, heroCircleY: 2265.0, heroDesiredLeftRotation: 6.22 },
    orientationBaseSpeed: 7,
    animationDuration: 40,
    zoomMax: 0.7, zoomMin: 0.6, numZoomLoops: 6,
    rotationRange: 20, rotationCycles: 1, rotationFn: "sin2",
    hueRange: 0, hueCycles: 0, hueFn: "linear",
    hueRotation: 240, tileCount: 3, offsetX: 500, offsetY: 100,
  },
];

// ─── Audio helpers ────────────────────────────────────────────────────────────

function applyLowpassFilter(data: Float32Array, sampleRate: number, cutoffHz: number, poles: number): Float32Array {
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

function slopeToPoles(slope: number): number { return Math.max(1, Math.round(slope / 6)); }

function buildFramePeaks(audioBuffer: AudioBuffer, fps: number, lowpassHz = 0, lowpassSlope = 24): Float32Array {
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

function normalizePeaks(rawPeaks: Float32Array, floor: number, ceiling: number): Float32Array {
  const safeCeiling = Math.max(ceiling, floor + 0.0001);
  const out = new Float32Array(rawPeaks.length);
  for (let i = 0; i < rawPeaks.length; i++) {
    const raw = rawPeaks[i] ?? 0;
    out[i] = Math.min(1, Math.max(0, (raw - floor) / (safeCeiling - floor)));
  }
  return out;
}

/**
 * FIX 1: Align audio peaks with the WASM engine's elapsed-time frame counter.
 *
 * The Rust engine indexes peaks as:
 *   frame_index = floor(elapsed_seconds * fps) % peaks.len()
 * where elapsed_seconds = (rAF_timestamp - started_at_ms) / 1000
 * and started_at_ms is set on the *first rAF tick* after start_animation(),
 * and is never reset by set_audio_peaks().
 *
 * So if we call set_audio_peaks() when the engine is at elapsed frame E,
 * and the audio is playing from position audioOffsetSecs (frame A = audioOffsetSecs * fps),
 * the engine will read peaks[E % len] but we want it to read audioPeaks[A].
 *
 * Fix: prepend (E - A) silence frames so that peaks[E] == audioPeaks[A].
 * We use performance.now() - engineStartMs to estimate E, captured immediately
 * after source.start() so the audio epoch and this estimate are as close as possible.
 *
 * On resume: E is the engine's current frame, A is the resume offset in frames.
 * The prepended silence correctly offsets so the beat hits on the right visual frame.
 */
function offsetPeaksForSync(
  audioPeaks: Float32Array,
  engineStartMs: number,
  audioOffsetSecs: number,
  fps: number,
): Float32Array {
  const len = audioPeaks.length;
  if (len === 0) return audioPeaks;
  const elapsedSecs  = (performance.now() - engineStartMs) / 1000;
  const engineFrame  = Math.floor(elapsedSecs * fps);
  const audioFrame   = Math.floor(audioOffsetSecs * fps);
  const silenceFrames = Math.max(0, engineFrame - audioFrame);
  if (silenceFrames === 0) return audioPeaks;
  // Prepend silenceFrames zeros so that peaks[engineFrame] == audioPeaks[audioFrame]
  const out = new Float32Array(len + silenceFrames);
  out.set(audioPeaks, silenceFrames);
  return out;
}

// ─── Control state ────────────────────────────────────────────────────────────

interface ControlState {
  hueRotation: number;
  // Preset-locked period: time over which rotation_cycles / num_zoom_loops / hue_cycles complete.
  // Drives cycles-per-second for all oscillators. Not shown in UI — taken from preset.
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
    slices: 24, 
    fps: 30,
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
    orientationBaseSpeed: 2, 
    orientationPeakMultiplier: 0.05, 
    orientationPhase: 0.0,
    audioReactiveEnabled: true,
    audioPeakSmoothing: 0.0, 
    audioPeakFloor: 0.00, 
    audioPeakCeiling: 0.2,
    audioLowpassFreq: 222, 
    audioLowpassSlope: 6,
    tileCount: p.tileCount, 
    offsetX: p.offsetX, 
    offsetY: p.offsetY,
  };
}

type ControlAction =
  | { type: "SET"; key: keyof ControlState; value: ControlState[keyof ControlState] }
  | { type: "RESET"; preset: Preset };

function controlReducer(state: ControlState, action: ControlAction): ControlState {
  switch (action.type) {
    case "SET":   return { ...state, [action.key]: action.value };
    case "RESET": return presetToControls(action.preset);
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function LabeledSlider({ label, value, min, max, step, unit, onChange, decimals = 2 }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void; decimals?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Number.isInteger(value) ? value : value.toFixed(decimals)}{unit}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v!)} />
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

function FnSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {FN_OPTIONS.map((fn) => (
          <button key={fn} type="button" onClick={() => onChange(fn)}
            className={`rounded px-2 py-0.5 text-xs border transition-colors ${value === fn ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-accent"}`}>
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

  const [controls, dispatch] = useReducer(controlReducer, activePreset, presetToControls);

  // ── Queue / playback mode ─────────────────────────────────────────────────

  const [uploadedSong,  setUploadedSong]  = useState<Song | null>(null);
  const [playMode,      setPlayMode]      = useState<PlayMode>("sequential");
  const [queueOrder,    setQueueOrder]    = useState<number[]>(() => BUNDLED_SONGS.map((_, i) => i));
  const [queuePos,      setQueuePos]      = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [audioError,    setAudioError]    = useState<string | null>(null);

  const activeSongIndex = uploadedSong ? -1 : (queueOrder[queuePos] ?? 0);
  const activeSong: Song = uploadedSong ?? BUNDLED_SONGS[activeSongIndex] ?? { title: "", url: "" };

  // ── Audio refs ────────────────────────────────────────────────────────────

  const audioCtxRef              = useRef<AudioContext | null>(null);
  const audioSourceRef           = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef           = useRef<AudioBuffer | null>(null);
  const playbackStartCtxTimeRef  = useRef<number>(0);   // AudioContext.currentTime at source.start()
  const playbackOffsetRef        = useRef<number>(0);   // seconds into buffer at which we started
  const playbackStartedAtMsRef   = useRef<number>(0);   // performance.now() at source.start()
  const pendingNextSongRef       = useRef<Song | null>(null); // set by advanceQueue; consumed by useEffect

  // ── WASM refs ─────────────────────────────────────────────────────────────

  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const engineRef        = useRef<LiveKaleidoscopeEngine | null>(null);
  const vsRef            = useRef<WasmVideoSettings | null>(null);
  const engineStartMsRef = useRef<number>(0); // performance.now() at start_animation()
  const [wasmError,  setWasmError]  = useState<string | null>(null);
  const [wasmReady,  setWasmReady]  = useState(false);

  // ── Fullscreen ────────────────────────────────────────────────────────────

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── Mobile layout ─────────────────────────────────────────────────────────
  // Below MOBILE_BREAKPOINT_PX we swap to the YouTube-style mobile layout:
  // a "fullscreen" view (canvas fills the viewport) and a "settings" view
  // (canvas shrinks to a mini-player strip, settings sheet slides up from
  // the bottom). The two views are toggled by vertical swipe gestures.

  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"fullscreen" | "settings">("fullscreen");
  // Tracks actual viewport pixels so the rotated mobile canvas can swap its
  // width/height to match (CSS rotate() doesn't reflow layout on its own).
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    function updateIsMobile() { setIsMobile(mq.matches); }
    updateIsMobile();
    mq.addEventListener("change", updateIsMobile);
    return () => mq.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    function updateViewport() { setViewport({ w: window.innerWidth, h: window.innerHeight }); }
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  // True only in the mobile fullscreen view — drives both the CSS rotation
  // of the canvas and the WASM backing-resolution swap below.
  const mobileRotated = isMobile && mobileView === "fullscreen";

  // ── Mobile swipe gestures ─────────────────────────────────────────────────
  // Simple commit-on-release swipe detection (not a live drag-follow) — the
  // CSS transitions on the canvas wrapper / settings sheet below provide the
  // slide animation once mobileView flips.

  const touchStartYRef = useRef<number | null>(null);
  const settingsContentRef = useRef<HTMLDivElement | null>(null);

  function handleMobileTouchStart(e: React.TouchEvent) {
    if (!isMobile) return;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  }

  function handleMobileTouchEnd(e: React.TouchEvent) {
    if (!isMobile || touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = endY - touchStartYRef.current; // negative = swiped up, positive = swiped down
    touchStartYRef.current = null;

    if (mobileView === "fullscreen" && deltaY < -MOBILE_SWIPE_THRESHOLD_PX) {
      // Swiped up away from the fullscreen canvas -> reveal the settings sheet
      setMobileView("settings");
    } else if (mobileView === "settings" && deltaY > MOBILE_SWIPE_THRESHOLD_PX) {
      // Only collapse back to fullscreen once the settings list itself is
      // already scrolled to the top — mirrors the YouTube app, where a
      // downward swipe inside a scrolled list scrolls the list first.
      const scrollTop = settingsContentRef.current?.scrollTop ?? 0;
      if (scrollTop <= 0) setMobileView("fullscreen");
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function set<K extends keyof ControlState>(key: K, value: ControlState[K]) {
    dispatch({ type: "SET", key, value });
  }

  function switchPreset(idx: number) {
    setPresetIdx(idx);
    dispatch({ type: "RESET", preset: PRESETS[idx]! });
  }

  const applyVs = useCallback((vs: WasmVideoSettings, c: ControlState, preset: Preset) => {
    // animation_duration is the shared oscillator period: the time over which
    // rotation_cycles sweeps and num_zoom_loops zoom cycles complete.
    // It is NOT a loop timer — all modulate_by_time functions use rem_euclid
    // so they loop continuously. Value comes from the preset, not the UI.
    //
    // HARDCODED VALUE. We could use a preset-specific value, but I would 
    // prefer to keep this at 400 seconds for simplicity.
    vs.animation_duration = 400;
    vs.fps = c.fps;

    vs.zoom_max = c.zoomMax; vs.zoom_min = c.zoomMin;
    vs.set_zoom_fn(c.zoomFn); vs.zoom_start_offset = c.zoomStartOffset; vs.num_zoom_loops = c.numZoomLoops;

    vs.rotation_range = c.rotationRange; vs.rotation_cycles = c.rotationCycles;
    vs.rotation_start_offset = c.rotationStartOffset; vs.set_rotation_fn(c.rotationFn);

    vs.hue_range = c.hueRange; vs.hue_cycles = c.hueCycles;
    vs.hue_start_offset = c.hueStartOffset; vs.set_hue_fn(c.hueFn);

    vs.orientation_base_speed = c.orientationBaseSpeed;
    vs.orientation_start_offset = c.orientationPhase;
    // Disable the built-in orientation oscillator. WasmVideoSettings defaults
    // orientation_duration to 201s with fn="none" (sawtooth), which wraps
    // discontinuously every 201s from engine start and causes a visible position
    // jump. KaleidoPageClient drives orientation purely via orientation_base_speed
    // (continuous drift) + accumulated_orientation_offset (beat accumulator), so
    // the built-in oscillator must be off. The WASM render loop skips it when <= 0.
    vs.orientation_duration = 0.0;

    vs.audio_reactive_enabled      = c.audioReactiveEnabled;
    vs.audio_peak_smoothing        = c.audioPeakSmoothing;
    vs.orientation_peak_multiplier = c.orientationPeakMultiplier;

    vs.hero_circle_left_x         = preset.circle.heroCircleLeftX;
    vs.hero_circle_right_x        = preset.circle.heroCircleRightX;
    vs.hero_circle_y              = preset.circle.heroCircleY;
    vs.hero_desired_left_rotation = preset.circle.heroDesiredLeftRotation;
  }, []);

  function circleAtPhase(preset: Preset, phase: number) {
    const { heroCircleLeftX: lx, heroCircleRightX: rx, heroCircleY: cy, heroDesiredLeftRotation: dlr } = preset.circle;
    const cx = (lx + rx) / 2, r = (rx - lx) / 2, angle = Math.PI + phase * Math.PI * 2;
    return {
      triangleCenterX:    cx + Math.cos(angle) * r,
      triangleCenterY:    cy + Math.sin(angle) * r,
      triangleRotationRad: dlr + (angle - Math.PI),
    };
  }

  // ── WASM lifecycle ────────────────────────────────────────────────────────
  // Engine is created once on mount and destroyed on unmount.
  // Preset changes are handled separately below via load_image_from_url +
  // update_animation_settings so started_at_ms never resets and the visuals
  // remain continuous across preset and song switches.

  useEffect(() => {
    let cancelled = false;

    function teardown() {
      const eng = engineRef.current, vs = vsRef.current;
      engineRef.current = null; vsRef.current = null;
      try { eng?.stop_animation(); } catch { /* */ }
      try { eng?.free();           } catch { /* */ }
      try { vs?.free();            } catch { /* */ }
    }

    serialise(async () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;
      try { mod = await getWasmMod(); }
      catch (e) { if (!cancelled) setWasmError(String(e)); return; }
      if (cancelled) return;

      try {
        engineRef.current = await new (mod.LiveKaleidoscopeEngine as typeof LiveKaleidoscopeEngine)(canvas);
      } catch (e) { if (!cancelled) setWasmError(String(e)); return; }
      if (cancelled) { teardown(); return; }

      const preset = PRESETS[presetIdx]!;
      try { await engineRef.current!.load_image_from_url(SOURCE_IMAGES[preset.imageIndex]!); }
      catch (e) { teardown(); if (!cancelled) setWasmError(String(e)); return; }
      if (cancelled) { teardown(); return; }

      const vs = new (mod.WasmVideoSettings as typeof WasmVideoSettings)();
      vsRef.current = vs;
      applyVs(vs, controls, preset);

      const { triangleCenterX, triangleCenterY, triangleRotationRad } = circleAtPhase(preset, 0);
      try {
        engineStartMsRef.current = performance.now();
        engineRef.current!.start_animation(
          controls.slices, controls.offsetX, controls.offsetY, 0.069, controls.tileCount,
          triangleCenterX, triangleCenterY, triangleRotationRad,
          KALEIDO_TYPE_IDX, controls.hueRotation, vs,
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
  }, []); // mount/unmount only — preset changes go through the effect below

  // ── Preset switch: hot-swap image + settings without restarting engine ────
  // Runs when presetIdx changes (skips the initial mount because the lifecycle
  // effect above handles the first load). wasmReady gates it so we don't race
  // against the initial start_animation call.

  const prevPresetIdxRef = useRef(presetIdx);

  useEffect(() => {
    if (!wasmReady) return;
    if (prevPresetIdxRef.current === presetIdx) return; // skip initial run
    prevPresetIdxRef.current = presetIdx;

    const engine = engineRef.current;
    const vs = vsRef.current;
    if (!engine || !vs) return;

    const preset = PRESETS[presetIdx]!;

    // Load the new image into the running engine — does NOT reset started_at_ms
    engine.load_image_from_url(SOURCE_IMAGES[preset.imageIndex]!).then(() => {
      if (engineRef.current !== engine) return; // engine was torn down during fetch
      applyVs(vs, controls, preset);
      const { triangleCenterX, triangleCenterY, triangleRotationRad } = circleAtPhase(preset, 0);
      try {
        engine.update_animation_settings(
          controls.slices, controls.offsetX, controls.offsetY, 0.069, controls.tileCount,
          triangleCenterX, triangleCenterY, triangleRotationRad,
          KALEIDO_TYPE_IDX, controls.hueRotation, vs,
        );
      } catch { /* engine stopped */ }
    }).catch((e) => { setWasmError(String(e)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx, wasmReady]);

  useEffect(() => {
    const engine = engineRef.current, vs = vsRef.current;
    if (!engine || !vs || !wasmReady) return;
    applyVs(vs, controls, activePreset);
    const { triangleCenterX, triangleCenterY, triangleRotationRad } = circleAtPhase(activePreset, controls.orientationPhase);
    try {
      engine.update_animation_settings(
        controls.slices, controls.offsetX, controls.offsetY, 0.069, controls.tileCount,
        triangleCenterX, triangleCenterY, triangleRotationRad,
        KALEIDO_TYPE_IDX, controls.hueRotation, vs,
      );
    } catch { /* not started yet */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, wasmReady]);

  // ── Canvas resize ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      if (mobileRotated) {
        // Mobile fullscreen view: canvas is visually rotated 90deg via CSS
        // (see render below), so swap the backing resolution to match —
        // width becomes the viewport height and vice versa — otherwise the
        // rendered image is stretched/blurry after rotation.
        canvas.width  = window.innerHeight;
        canvas.height = window.innerWidth;
      } else {
        canvas.width  = isFullscreen ? window.screen.width  : 1920;
        canvas.height = isFullscreen ? window.screen.height : 1080;
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isFullscreen, mobileRotated]);

  // ── Fullscreen ────────────────────────────────────────────────────────────

  function enterFullscreen() { containerRef.current?.requestFullscreen?.().catch(() => {}); setIsFullscreen(true); }
  function exitFullscreen()  { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setIsFullscreen(false); }

  useEffect(() => {
    function onKey()   { if (isFullscreen) exitFullscreen(); }
    function onClick() { if (isFullscreen) exitFullscreen(); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("click",   onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("click", onClick); };
  }, [isFullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onFsChange() { if (!document.fullscreenElement) setIsFullscreen(false); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Audio ─────────────────────────────────────────────────────────────────

  // Preload all bundled songs in the background after mount so that playback
  // starts instantly without a network fetch delay. The decoded AudioBuffers
  // are stored in a module-level cache keyed by URL so they survive component
  // re-mounts. We intentionally do NOT store them in React state to avoid
  // triggering re-renders. Errors during preload are silently swallowed —
  // the normal loadAudioBuffer path will retry on user-initiated play.
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Create a temporary AudioContext just for decoding; we close it after
      // all songs are decoded so it doesn't block the real playback context.
      let decodeCtx: AudioContext | null = null;
      try {
        decodeCtx = new AudioContext();
        for (const song of BUNDLED_SONGS) {
          if (cancelled) break;
          if (audioBufferCacheRef.current.has(song.url)) continue;
          try {
            const resp = await fetch(song.url);
            if (!resp.ok || cancelled) continue;
            const arrayBuf = await resp.arrayBuffer();
            if (cancelled) break;
            const audioBuf = await decodeCtx.decodeAudioData(arrayBuf);
            if (!cancelled) audioBufferCacheRef.current.set(song.url, audioBuf);
          } catch {
            // Swallow individual song errors — real playback will retry
          }
        }
      } catch {
        // Swallow AudioContext creation error
      } finally {
        try { await decodeCtx?.close(); } catch { /* */ }
      }
    })();
    return () => { cancelled = true; };
  }, []); // runs once on mount

  async function ensureAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
    return audioCtxRef.current;
  }

  function stopAudioSource() {
    const node = audioSourceRef.current;
    audioSourceRef.current = null; // null first so onended knows this was an explicit stop
    try { node?.stop(); } catch { /* */ }
    node?.disconnect();
  }

  async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
    // Use the preloaded buffer if available so playback starts without a fetch delay
    const cached = audioBufferCacheRef.current.get(url);
    if (cached) return cached;
    const ctx = await ensureAudioCtx();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} loading audio`);
    return ctx.decodeAudioData(await resp.arrayBuffer());
  }

  /**
   * Build peaks, rotate for sync, and send to WASM.
   * audioOffsetSecs  = how many seconds into the audio buffer we are starting from.
   * startedAtMs      = performance.now() captured immediately after source.start() so
   *                    that rotation accounts for any time spent fetching/decoding/filtering
   *                    rather than snapshotting performance.now() inside rotatePeaksForSync
   *                    (which would be too early — the audio hadn't started yet).
   */
  async function buildAndSendPeaks(buffer: AudioBuffer, audioOffsetSecs: number, startedAtMs?: number) {
    const engine = engineRef.current;
    if (!engine) return;
    const raw    = buildFramePeaks(buffer, controls.fps, controls.audioLowpassFreq, controls.audioLowpassSlope);
    const normed = normalizePeaks(raw, controls.audioPeakFloor, controls.audioPeakCeiling);
    // FIX 1: prepend silence so that peaks[engineElapsedFrame] == audioPeaks[audioOffsetFrame].
    // Use startedAtMs if provided (playback already started), otherwise fall back to
    // engineStartMsRef so mid-playback settings changes still resync correctly.
    const synced = offsetPeaksForSync(normed, startedAtMs ?? engineStartMsRef.current, audioOffsetSecs, controls.fps);
    engine.set_audio_peaks(synced);
  }

  async function startPlayback(song: Song, offsetSecs = 0) {
    const ctx = await ensureAudioCtx();
    stopAudioSource();

    // Load buffer if needed (clears when song changes or on restart)
    if (!audioBufferRef.current) {
      try   { audioBufferRef.current = await loadAudioBuffer(song.url); }
      catch (e) { setAudioError(`Could not load audio: ${String(e)}`); return; }
    }

    const buffer = audioBufferRef.current!;

    // Set offset before the async peaks build so pausePlayback can't race and
    // accumulate against a stale value if the user pauses during decoding.
    playbackOffsetRef.current = offsetSecs;

    // Build peaks from the decoded buffer (CPU-only, no async after this point).
    const raw    = buildFramePeaks(buffer, controls.fps, controls.audioLowpassFreq, controls.audioLowpassSlope);
    const normed = normalizePeaks(raw, controls.audioPeakFloor, controls.audioPeakCeiling);

    const source   = ctx.createBufferSource();
    source.buffer  = buffer;
    source.loop    = playMode === "repeat-one";
    source.connect(ctx.destination);
    source.start(0, offsetSecs);
    // Capture timestamp immediately after start() — this is the true audio epoch.
    // Rotating peaks against this (rather than inside buildAndSendPeaks before start)
    // means fetch + decode + filter time no longer shifts visuals ahead of the audio.
    const startedAtMs = performance.now();
    playbackStartedAtMsRef.current = startedAtMs;

    // Offset peaks now that we know exactly when audio began and send to WASM.
    const synced = offsetPeaksForSync(normed, startedAtMs, offsetSecs, controls.fps);
    engineRef.current?.set_audio_peaks(synced);

    audioSourceRef.current           = source;
    playbackStartCtxTimeRef.current  = ctx.currentTime;

    source.onended = () => {
      if (audioSourceRef.current !== source) return; // explicit stop() nulled the ref — not a natural end
      if (playMode === "repeat-one") return; // loop flag handles it natively
      advanceQueue();
    };

    setIsPlaying(true);
    setAudioError(null);
  }

  // Called when a track finishes — move to the next one in the queue.
  // startPlayback is NOT called here directly because this runs inside an onended
  // handler which may be called from within a React state updater context.
  // Instead we write to pendingNextSongRef and let the useEffect below trigger playback.
  function advanceQueue() {
    setQueuePos((prev) => {
      const nextPos = prev + 1;
      if (nextPos >= queueOrder.length) {
        setIsPlaying(false);
        return 0; // wrap to start but don't auto-play
      }
      const nextSong = BUNDLED_SONGS[queueOrder[nextPos]!]!;
      audioBufferRef.current = null; // force reload for next track
      pendingNextSongRef.current = nextSong;
      return nextPos;
    });
  }

  // Consume pendingNextSongRef after queue advances — triggers startPlayback
  // outside of any state updater or onended callback.
  useEffect(() => {
    const next = pendingNextSongRef.current;
    if (!next) return;
    pendingNextSongRef.current = null;
    void startPlayback(next, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuePos]);

  function pausePlayback() {
    const ctx = audioCtxRef.current;
    if (ctx && audioSourceRef.current) {
      // Accumulate the played duration so resume picks up from here
      playbackOffsetRef.current += ctx.currentTime - playbackStartCtxTimeRef.current;
    }
    stopAudioSource();
    setIsPlaying(false);
  }

  async function restartPlayback() {
    playbackOffsetRef.current  = 0;
    audioBufferRef.current     = null; // force peak rebuild with offset=0
    stopAudioSource();
    setIsPlaying(false);
    if (activeSong.url) await startPlayback(activeSong, 0);
  }

  async function handlePlay() {
    if (isPlaying) return;
    await startPlayback(activeSong, playbackOffsetRef.current);
  }

  // Resend synced peaks when analysis settings change mid-playback
  useEffect(() => {
    if (!audioBufferRef.current || !isPlaying) return;
    const ctx = audioCtxRef.current;
    const currentOffset = ctx
      ? playbackOffsetRef.current + (ctx.currentTime - playbackStartCtxTimeRef.current)
      : playbackOffsetRef.current;
    buildAndSendPeaks(audioBufferRef.current, currentOffset, playbackStartedAtMsRef.current).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.fps, controls.audioLowpassFreq, controls.audioLowpassSlope, controls.audioPeakFloor, controls.audioPeakCeiling]);

  // ── Play-mode ─────────────────────────────────────────────────────────────

  function cyclePlayMode() {
    const modes: PlayMode[] = ["sequential", "shuffle", "repeat-one"];
    const next = modes[(modes.indexOf(playMode) + 1) % modes.length]!;
    setPlayMode(next);
    if (next === "shuffle") {
      // Fisher-Yates shuffle
      const arr = BUNDLED_SONGS.map((_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
      }
      setQueueOrder(arr);
      setQueuePos(0);
    } else {
      setQueueOrder(BUNDLED_SONGS.map((_, i) => i));
      setQueuePos(0);
    }
    // Update loop flag on the currently playing source
    if (audioSourceRef.current) {
      audioSourceRef.current.loop = next === "repeat-one";
    }
  }

  // ── Song selection ────────────────────────────────────────────────────────

  function selectSongByIndex(idx: number) {
    const pos = queueOrder.indexOf(idx);
    setQueuePos(pos >= 0 ? pos : 0);
    audioBufferRef.current = null;
    stopAudioSource();
    setIsPlaying(false);
    playbackOffsetRef.current = 0;
  }

  // ── File upload ───────────────────────────────────────────────────────────

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedSong({ title: file.name, url });
    audioBufferRef.current = null;
    stopAudioSource();
    setIsPlaying(false);
    playbackOffsetRef.current = 0;
  }

  // ── Control panel ─────────────────────────────────────────────────────────

  const controlPanel = useMemo(() => (
    <div className="flex flex-col gap-2 px-3 py-3 text-sm">
      <SectionHeader>Preset</SectionHeader>
      <div className="flex flex-col gap-1">
        {PRESETS.map((p, i) => (
          <button key={i} type="button" onClick={() => switchPreset(i)}
            className={`rounded px-2 py-1.5 text-left text-xs border transition-colors ${i === presetIdx ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-accent"}`}>
            {p.name}
          </button>
        ))}
      </div>

      <SectionHeader>Animation</SectionHeader>
      <LabeledSlider label="Slices" value={controls.slices} min={3} max={128} step={1} unit=" slices" onChange={(v) => set("slices", v)} />
      <LabeledSlider label="FPS" value={controls.fps} min={10} max={60} step={1} decimals={0} onChange={(v) => set("fps", v)} />
      <LabeledSlider label="Color Shift" value={controls.hueRotation} min={0} max={360} step={1} decimals={0} onChange={(v) => set("hueRotation", v)} />

      <SectionHeader>Rotation around moving point</SectionHeader>
      <LabeledSlider label="Range (°)" value={controls.rotationRange} min={0} max={360} step={1} decimals={0} onChange={(v) => set("rotationRange", v)} />
      <LabeledSlider label="Cycles" value={controls.rotationCycles} min={0} max={8} step={0.25} onChange={(v) => set("rotationCycles", v)} />
      <LabeledSlider label="Start Offset" value={controls.rotationStartOffset} min={0} max={1} step={0.01} onChange={(v) => set("rotationStartOffset", v)} />
      <FnSelect label="Rotation Fn" value={controls.rotationFn} onChange={(v) => set("rotationFn", v)} />

      <SectionHeader>Hue / Daydream Effect</SectionHeader>
      <LabeledSlider label="Range (°)" value={controls.hueRange} min={0} max={360} step={1} decimals={0} onChange={(v) => set("hueRange", v)} />
      <LabeledSlider label="Cycles" value={controls.hueCycles} min={0} max={32} step={1} onChange={(v) => set("hueCycles", v)} />
      <LabeledSlider label="Start Offset" value={controls.hueStartOffset} min={0} max={1} step={0.01} onChange={(v) => set("hueStartOffset", v)} />
      <FnSelect label="Hue Fn" value={controls.hueFn} onChange={(v) => set("hueFn", v)} />

      <SectionHeader>Orientation</SectionHeader>
      <LabeledSlider label="Base Speed (px/s)" value={controls.orientationBaseSpeed} min={0} max={500} step={1} decimals={0} onChange={(v) => set("orientationBaseSpeed", v)} />
      <LabeledSlider label="Peak Multiplier" value={controls.orientationPeakMultiplier} min={0} max={5} step={0.01} onChange={(v) => set("orientationPeakMultiplier", v)} />
      <LabeledSlider label="Phase" value={controls.orientationPhase} min={0} max={1} step={0.001} onChange={(v) => set("orientationPhase", v)} />

      <SectionHeader>Source Crop</SectionHeader>
      <LabeledSlider label="Offset X" value={controls.offsetX} min={0} max={2000} step={1} decimals={0} onChange={(v) => set("offsetX", v)} />
      <LabeledSlider label="Offset Y" value={controls.offsetY} min={0} max={2000} step={1} decimals={0} onChange={(v) => set("offsetY", v)} />
      <LabeledSlider label="Tile Count" value={controls.tileCount} min={1} max={12} step={0.1} decimals={0} onChange={(v) => set("tileCount", v)} />

      <SectionHeader>Audio Reactive</SectionHeader>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <Checkbox checked={controls.audioReactiveEnabled} onCheckedChange={(c) => set("audioReactiveEnabled", !!c)} />
        Enable audio reactivity
      </label>
      <LabeledSlider label="Peak Smoothing" value={controls.audioPeakSmoothing} min={0} max={0.999} step={0.01} onChange={(v) => set("audioPeakSmoothing", v)} />
      <LabeledSlider label="Noise Gate" value={controls.audioPeakFloor} min={0} max={0.5} step={0.001} onChange={(v) => set("audioPeakFloor", v)} />
      <LabeledSlider label="Peak Clip" value={controls.audioPeakCeiling} min={0.05} max={1} step={0.001} onChange={(v) => set("audioPeakCeiling", v)} />
      <LabeledSlider label="LP Cutoff" value={controls.audioLowpassFreq} min={40} max={800} step={1} decimals={0} unit=" Hz" onChange={(v) => set("audioLowpassFreq", v)} />
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">LP Slope</p>
        <div className="flex gap-1">
          {([6, 12, 24, 48] as const).map((s) => (
            <button key={s} type="button" onClick={() => set("audioLowpassSlope", s)}
              className={`rounded px-2 py-0.5 text-xs border transition-colors ${controls.audioLowpassSlope === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-accent"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [controls, presetIdx]);

  // ── Render ────────────────────────────────────────────────────────────────

  const playModeLabel: Record<PlayMode, string> = {
    sequential:  "▶▶ Sequential",
    shuffle:     "🔀 Shuffle",
    "repeat-one":"🔂 Repeat One",
  };

  return (
    // Mobile-first: stacked column (video on top, settings sheet below) by
    // default; md: switches to the original desktop two-column layout.
    // h-screen + overflow-hidden on the root means the only scrollable areas
    // anywhere on the page are the mobile settings list (below) and the
    // desktop aside — matching the "no page scroll" requirement.
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-black text-white md:flex-row"
      onTouchStart={handleMobileTouchStart}
      onTouchEnd={handleMobileTouchEnd}
    >
      {/* Settings panel:
          - Desktop (md+): original static left-hand column, hidden while fullscreen.
          - Mobile: a bottom sheet, fixed to the viewport, slid fully off-screen
            (translate-y-full) in the "fullscreen" view and slid into place
            (translate-y-0) in the "settings" view — this is the swipe-up-from-
            video transition. Always mounted on mobile (never unmounted) so the
            slide is an animation, not a re-render. */}
      {!isFullscreen && (
        <aside
          className={`z-20 flex flex-col bg-zinc-950 transition-transform duration-300 ease-out
            fixed inset-x-0 bottom-0 border-t border-white/10
            ${mobileView === "settings" ? "translate-y-0" : "translate-y-full"}
            md:static md:inset-auto md:z-auto md:h-screen md:w-64 md:shrink-0
            md:translate-y-0 md:border-t-0 md:border-r md:border-white/10`}
          style={{ height: isMobile ? `calc(100dvh - ${MOBILE_MINI_PLAYER_HEIGHT_PX}px)` : undefined }}
        >
          {/* Sticky "Settings" header — mobile only. Stays pinned to the top of
              the sheet (never scrolls away) while the content below it scrolls,
              until the user swipes back down to the fullscreen view. */}
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm md:hidden">
            <h2 className="text-sm font-semibold tracking-wide">Settings</h2>
            <div className="flex items-center gap-4 text-white/70">
              <button type="button" title="Info" aria-label="Info" className="text-base leading-none hover:text-white">Φ</button>
              <button type="button" title="Close" aria-label="Close settings"
                onClick={() => setMobileView("fullscreen")}
                className="text-lg leading-none hover:text-white">
                ×
              </button>
            </div>
          </div>

          {/* Scrollable settings content — independently scrollable from the
              video above; on mobile its scrollTop also gates the swipe-down
              gesture (see handleMobileTouchEnd) so it must reach the top
              before swiping down collapses the sheet, like YouTube comments. */}
          <div ref={settingsContentRef} className="flex-1 overflow-y-auto">
            {controlPanel}
          </div>
        </aside>
      )}

      {/* Main canvas + overlay.
          On mobile this wrapper IS the "video player": full viewport height
          in the fullscreen view, collapsing to a thin mini-player strip
          (MOBILE_MINI_PLAYER_HEIGHT_PX) when the settings sheet is open —
          same pinned-to-top behavior as the YouTube app. */}
      <div
        ref={containerRef}
        className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden bg-black transition-[height] duration-300 ease-out"
        style={{ height: isMobile ? (mobileView === "fullscreen" ? "100dvh" : `${MOBILE_MINI_PLAYER_HEIGHT_PX}px`) : undefined }}
        onClick={() => {
          // Tap the mini-player to re-expand, like tapping a YouTube mini-player.
          if (isMobile && mobileView === "settings") setMobileView("fullscreen");
        }}
      >
        {/* Canvas — on mobile, while in the fullscreen view, it's rotated
            MOBILE_ROTATE_DIRECTION * 90deg so the tileCount (normally counted
            horizontally) is counted vertically instead, matching a portrait
            phone. Centered via absolute positioning + transform since CSS
            rotate() doesn't reflow the box itself. Reverts to the normal
            (unrotated) h-full/w-full layout in the mini-player/settings view
            and on desktop. */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className={mobileRotated ? undefined : "h-full w-full object-contain"}
          style={
            mobileRotated
              ? {
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: viewport.h ? `${viewport.h}px` : "100vh",
                  height: viewport.w ? `${viewport.w}px` : "100vw",
                  transform: `translate(-50%, -50%) rotate(${MOBILE_ROTATE_DIRECTION * 90}deg)`,
                  display: "block",
                }
              : { display: "block" }
          }
        />

        {/* GPU / WebGPU unavailable overlay */}
        {wasmError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="mx-4 max-w-sm rounded-2xl border border-white/10 bg-zinc-900/90 px-8 py-7 text-center shadow-2xl">
              {/* Circle with exclamation */}
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400/80 text-amber-400">
                <span className="text-2xl font-bold leading-none">!</span>
              </div>
              <h2 className="mb-3 text-base font-semibold text-white">
                Graphics Acceleration Unavailable
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                We have a sick animation here, but your browser&apos;s Graphics Acceleration appears to be disabled. If you&apos;re on Windows, outdated graphics drivers can also cause this — try updating them and refreshing.
              </p>
            </div>
          </div>
        )}

        {/* Bottom HUD (audio + fullscreen) — desktop only, hidden while fullscreen */}
        {!isFullscreen && (
          <div className="absolute bottom-0 left-0 right-0 hidden flex-wrap items-center gap-2 bg-black/60 px-4 py-2 backdrop-blur-sm md:flex">

            {/* Now playing label */}
            <span className="max-w-[180px] truncate text-xs font-medium text-white/80">
              {activeSong.title || "—"}
            </span>

            {/* Play-mode cycle */}
            <button type="button" onClick={cyclePlayMode}
              className="rounded border border-white/20 bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800"
              title="Cycle play mode">
              {playModeLabel[playMode]}
            </button>

            {/* Song list (bundled) */}
            {!uploadedSong && (
              <select
                className="max-w-[150px] rounded border border-white/20 bg-zinc-900 px-2 py-1 text-xs text-white"
                value={activeSongIndex}
                onChange={(e) => selectSongByIndex(Number(e.target.value))}
              >
                {BUNDLED_SONGS.map((s, i) => (
                  <option key={i} value={i}>{s.title}</option>
                ))}
              </select>
            )}

            {uploadedSong && (
              <span className="max-w-[130px] truncate text-xs text-white/60">{uploadedSong.title}</span>
            )}

            {/* Upload */}
            <label className="cursor-pointer rounded border border-white/20 bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800">
              Upload
              <input type="file" accept="audio/*" className="sr-only" onChange={handleUpload} />
            </label>

            {/* Transport */}
            <Button size="sm" variant="ghost" onClick={handlePlay}      disabled={!activeSong.url || isPlaying} className="h-7 px-2 text-xs">▶ Play</Button>
            <Button size="sm" variant="ghost" onClick={pausePlayback}   disabled={!isPlaying}                   className="h-7 px-2 text-xs">⏸ Pause</Button>
            <Button size="sm" variant="ghost" onClick={restartPlayback} disabled={!activeSong.url}              className="h-7 px-2 text-xs">⏮ Restart</Button>

            {audioError && <span className="text-xs text-red-400">{audioError}</span>}

            <div className="ml-auto">
              <Button size="sm" variant="outline" onClick={enterFullscreen} className="h-7 px-2 text-xs">⛶ Fullscreen</Button>
            </div>
          </div>
        )}

        {/* Mobile HUD — compact transport/song-select bar overlayed on (or, in
            the mini-player state, sitting at the bottom of) the video section,
            mirroring a standard mobile video player layout. stopPropagation
            keeps taps on these controls from also triggering the mini-player
            tap-to-expand handler on the wrapping div above. */}
        {isMobile && !isFullscreen && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 overflow-x-auto bg-black/70 px-2 py-2 backdrop-blur-sm md:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="max-w-[88px] shrink-0 truncate text-[11px] font-medium text-white/80">
              {activeSong.title || "—"}
            </span>

            <Button size="sm" variant="ghost" onClick={handlePlay}      disabled={!activeSong.url || isPlaying} className="h-7 shrink-0 px-2 text-xs">▶</Button>
            <Button size="sm" variant="ghost" onClick={pausePlayback}   disabled={!isPlaying}                   className="h-7 shrink-0 px-2 text-xs">⏸</Button>
            <Button size="sm" variant="ghost" onClick={restartPlayback} disabled={!activeSong.url}              className="h-7 shrink-0 px-2 text-xs">⏮</Button>

            {!uploadedSong && (
              <select
                className="max-w-[90px] shrink-0 rounded border border-white/20 bg-zinc-900 px-1 py-1 text-[11px] text-white"
                value={activeSongIndex}
                onChange={(e) => selectSongByIndex(Number(e.target.value))}
              >
                {BUNDLED_SONGS.map((s, i) => (
                  <option key={i} value={i}>{s.title}</option>
                ))}
              </select>
            )}

            {uploadedSong && (
              <span className="max-w-[80px] shrink-0 truncate text-[11px] text-white/60">{uploadedSong.title}</span>
            )}

            {/* Upload */}
            <label className="shrink-0 cursor-pointer rounded border border-white/20 bg-zinc-900 px-2 py-1 text-[11px] text-white">
              Upload
              <input type="file" accept="audio/*" className="sr-only" onChange={handleUpload} />
            </label>

            {audioError && <span className="shrink-0 truncate text-[10px] text-red-400">{audioError}</span>}

            {/* Tap affordance equivalent to the swipe gesture */}
            <button
              type="button"
              onClick={() => setMobileView(mobileView === "fullscreen" ? "settings" : "fullscreen")}
              className="ml-auto shrink-0 rounded border border-white/20 bg-zinc-900 px-2 py-1 text-xs text-white"
              title={mobileView === "fullscreen" ? "Open settings" : "Collapse settings"}
            >
              {mobileView === "fullscreen" ? "▲" : "▼"}
            </button>
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