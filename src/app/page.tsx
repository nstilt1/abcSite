"use client"

import { HeroVideo } from "@/components/HeroVideo";
import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import useLocalStorage from "@/hooks/useLocalStorage";

type ShowcaseSectionProps = {
  title: string;
  description: string;
  linkHref: string;
  linkLabel: string;
  mediaPosition?: "left" | "right";
  mobileMediaPosition?: "top" | "bottom";
  children: React.ReactNode;
};

function ShowcaseSection({
  title,
  description,
  linkHref,
  linkLabel,
  mediaPosition = "left",
  mobileMediaPosition = "top",
  children,
}: ShowcaseSectionProps) {
  const mediaFirstDesktop = mediaPosition === "left";
  const mediaFirstMobile = mobileMediaPosition === "top";

  return (
    <section className="border-t border-white/10 bg-[var(--page-bg)] px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        <div
          className={[
            mediaFirstMobile ? "order-1" : "order-2",
            mediaFirstDesktop ? "md:order-1" : "md:order-2",
          ].join(" ")}
        >
          {children}
        </div>

        <div
          className={[
            mediaFirstMobile ? "order-2" : "order-1",
            mediaFirstDesktop ? "md:order-2" : "md:order-1",
          ].join(" ")}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300 md:text-lg">
            {description}
          </p>
          <div className="mt-6">
            <Link
              href={linkHref}
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/8 px-5 py-3 font-medium text-white transition hover:bg-white/14"
            >
              {linkLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export type ReorientationFn =
  | "linear"
  | "triangle"
  | "saw"
  | "sin"
  | "sin2"
  | "-cos";

export type HeroKaleidoControls = {
  animationDuration: number;
  hueRotation: number;
  triangleCenterX: number;
  triangleCenterY: number;
  triangleRotationRad: number;
  reorientationDuration: number;
  reorientationFn: ReorientationFn;
};

function orientationToHeroParams(value: number) {
  const leftX = 515.1039592844847;
  const rightX = 1547;
  const centerY = 755.3734001945962;

  const centerX = (leftX + rightX) / 2;
  const radius = (rightX - leftX) / 2;

  const angleShift = 0;
  const circleAngle = Math.PI + value * Math.PI * 2 + angleShift;

  const triangleCenterX = centerX + Math.cos(circleAngle) * radius;
  const triangleCenterY = centerY + Math.sin(circleAngle) * radius;

  const leftSideAngle = Math.PI;
  const desiredLeftRotation = 6.22;

  const rawTriangleRotationRad =
    desiredLeftRotation + (circleAngle - leftSideAngle);

  const triangleRotationRad =
    ((rawTriangleRotationRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  return {
    triangleCenterX,
    triangleCenterY,
    triangleRotationRad,
  };
}

const DEFAULT_HERO_SETTINGS = {
  speed: durationToSpeedSlider(100),
  colorShift: 308,
  reorientationSpeed: durationToSpeedSlider(100),
  reorientationFn: "linear" as ReorientationFn,
};

function speedSliderToDuration(value: number) {
  const minSlider = 1;
  const maxSlider = 5;
  const maxDuration = 160;
  const minDuration = 5;

  const t = (value - minSlider) / (maxSlider - minSlider);

  return maxDuration * Math.pow(minDuration / maxDuration, t);
}

function durationToSpeedSlider(duration: number) {
  const minSlider = 1;
  const maxSlider = 5;
  const maxDuration = 160;
  const minDuration = 5;

  const t = Math.log(duration / maxDuration) / Math.log(minDuration / maxDuration);

  return minSlider + t * (maxSlider - minSlider);
}

export default function Home() {
  const DEFAULT_HERO_SPEED = durationToSpeedSlider(100);
  const DEFAULT_HERO_COLOR = 308;
  const DEFAULT_REORIENTATION_SPEED = 1.49;
  const DEFAULT_REORIENTATION_FN: ReorientationFn = "linear";

  const [speed, setSpeed, heroSpeedLoaded] = useLocalStorage("heroSpeed", DEFAULT_HERO_SPEED);
  const [colorShift, setColorShift, heroColorLoaded] = useLocalStorage("heroColor", DEFAULT_HERO_COLOR);
  const [reorientationSpeed, setReorientationSpeed, heroReorientationSpeedLoaded] =
    useLocalStorage("heroReorientationSpeed", DEFAULT_REORIENTATION_SPEED);
  const [reorientationFn, setReorientationFn, heroReorientationFnLoaded] =
    useLocalStorage<ReorientationFn>("heroReorientationFn", DEFAULT_REORIENTATION_FN);

  const heroSettingsLoaded =
    heroSpeedLoaded &&
    heroColorLoaded &&
    heroReorientationSpeedLoaded &&
    heroReorientationFnLoaded;

  function resetHeroSettings() {
    setSpeed(DEFAULT_HERO_SETTINGS.speed);
    setColorShift(DEFAULT_HERO_SETTINGS.colorShift);
    setReorientationSpeed(DEFAULT_HERO_SETTINGS.reorientationSpeed);
    setReorientationFn(DEFAULT_HERO_SETTINGS.reorientationFn);
  }

  const heroControls = useMemo<HeroKaleidoControls>(() => {
    const orientationParams = orientationToHeroParams(0);

    return {
      animationDuration: speedSliderToDuration(speed),
      hueRotation: colorShift,
      reorientationDuration: speedSliderToDuration(reorientationSpeed),
      reorientationFn,
      ...orientationParams,
    };
  }, [speed, colorShift, reorientationSpeed, reorientationFn]);
  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[560px] w-full items-center overflow-hidden md:min-h-[720px]">
        <div className="absolute inset-0">
          {heroSettingsLoaded && <HeroVideo controls={heroControls} />}

          <div className="absolute left-4 top-4 z-20">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Open hero settings</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-[320px] border-white/10 bg-black/90 text-white">
                <div className="space-y-8 pt-8">
                  <div>
                    <div className="mb-3 flex justify-between text-sm">
                      <span>Speed</span>
                      <span>{speedSliderToDuration(speed).toFixed(1)}s</span>
                    </div>
                    <Slider value={[speed]} min={1} max={5} step={0.01} onValueChange={([v]) => setSpeed(v)} />
                  </div>

                  <div>
                    <div className="mb-3 flex justify-between text-sm">
                      <span>Color shift</span>
                      <span>{colorShift}°</span>
                    </div>
                    <Slider value={[colorShift]} min={0} max={360} step={1} onValueChange={([v]) => setColorShift(v)} />
                  </div>

                  <div>
                    <div className="mb-3 flex justify-between text-sm">
                      <span>Reorientation speed</span>
                      <span>{speedSliderToDuration(reorientationSpeed).toFixed(1)}s / loop</span>
                    </div>
                    <Slider
                      value={[reorientationSpeed]}
                      min={1}
                      max={5}
                      step={0.01}
                      onValueChange={([v]) => setReorientationSpeed(v)}
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm">Reorientation function</label>
                    <select
                      value={reorientationFn}
                      onChange={(e) => setReorientationFn(e.target.value as ReorientationFn)}
                      className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white"
                    >
                      <option value="linear">Linear</option>
                      <option value="triangle">Triangle</option>
                      <option value="saw">Saw</option>
                      <option value="sin">Sin</option>
                      <option value="sin2">Sin²</option>
                      <option value="-cos">-Cos</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={resetHeroSettings}
                  >
                    Reset defaults
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/80 md:bg-gradient-to-r md:from-black/75 md:via-black/45 md:to-black/25" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl px-6 py-20 md:grid-cols-2 md:px-8">          
          <div className="flex flex-col items-center text-center md:max-w-[90%] lg:max-w-none md:items-start md:justify-center md:text-left">
              <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white text-balance">
                Products that complement your altered brain chemistry
              </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-200 md:text-xl">
              From dope audio effects, to dope visual effects, to MIDI file
              generation, we can help you cultivate the ultimate vibe.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200"
              >
                Shop
              </Link>
              <Link
                href="/downloads"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-medium text-white transition hover:bg-white/20"
              >
                Downloads
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ShowcaseSection
        title="Kaleidomo"
        description="Generate kaleidoscope art and looping kaleidoscope videos with Kaleidomo."
        linkHref="/kaleidomo"
        linkLabel="Explore Kaleidomo"
        mediaPosition="left"
        mobileMediaPosition="top"
      >
        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative aspect-square overflow-hidden">
            <Image
              src="/kaleidomo-icon-cropped.png"
              alt="Kaleidomo icon"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Reconnect with the past with the Mofo's Mojo"
        description="The Mofo's Mojo is an audio plugin that will take you back to the good ole days, when guitars would quack."
        linkHref="/mofos-mojo"
        linkLabel="See the Mofo's Mojo"
        mediaPosition="right"
        mobileMediaPosition="bottom"
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/Qtg8O64Mcb8"
              title="The Mofo's Mojo video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Dream with the Daydream Filter"
        description="A Chrome/Edge extension that changes all of the colors of every website, image, and video viewed in a web browser. Also implemented for singleplayer games using ReShade."
        linkHref="/daydream-filter"
        linkLabel="View Daydream Filter"
        mediaPosition="left"
        mobileMediaPosition="bottom"
      >
        <div className="mx-auto flex w-full max-w-[380px] justify-center">
          <div className="relative aspect-square w-full">
            <Image
              src="/abc_brain_s.png"
              alt="Altered Brain Chemistry brain"
              fill
              sizes="(max-width: 768px) 160px, 220px"
              className="object-contain abc-brain-rotate"
            />
          </div>
        </div>
      </ShowcaseSection>

      <section className="border-t border-white/10 bg-[var(--page-bg)] px-6 py-16 md:py-24">
  <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
        Generate unlimited MIDI files for free with the MIDI Machine
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300 md:text-lg">
        It may be presented as AI, but it is actually not AI. MIDI file generation
        takes place in the browser using a couple of algorithms and a PRNG. This 
        MIDI generator can generate polyphonic melodies as well as chord progressions.
      </p>
      <div className="mt-6">
        <a
          href="https://midi.alteredbrainchemistry.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-xl border border-white/15 bg-white/8 px-5 py-3 font-medium text-white transition hover:bg-white/14"
        >
          Open MIDI Machine
        </a>
      </div>
    </div>

    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl">
      <div className="relative aspect-[4/3] w-full">
        <iframe
          src="https://midi.alteredbrainchemistry.com?embed=1"
          title="MIDI Machine"
          className="absolute inset-0 h-full w-full"
          loading="lazy"
        />
      </div>
    </div>
  </div>
</section>
    </div>
  );
}