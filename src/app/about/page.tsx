import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="bg-[var(--page-bg)] px-6 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
            About Us
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Hyperformance Solutions by day. Altered Brain Chemistry by night.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-zinc-300">
            Classy in the front, party in the back.
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur">
          <CardContent className="space-y-6 p-6 md:p-8">
            <p className="text-base leading-8 text-zinc-300">
              Hyperformance Solutions was founded by Noah Stiltner while he was
              in college studying Computer Science. What started as a practical
              audio plugin project eventually turned into something much bigger.
              One of the earliest products was inspired in part by the
              Moogerfooger MF-101. The Mofo&apos;s Mojo was created as a way to 
              replicate the effect of the hardware while also having a way to 
              save presets that can be reloaded at a later time. Additionally, 
              the audio plugin serves as a replacement for the pedal in the 
              event that the pedal had to be sold.
            </p>

            <p className="text-base leading-8 text-zinc-300">
              After finishing that plugin, another problem became impossible to
              ignore: software licensing services were frustrating, restrictive,
              and often expensive. Some platforms took a cut of sales. Some
              required developers to list products on their marketplace. Others
              charged per license, locked useful features behind monthly tiers,
              or expected developers to justify their business before being
              approved. We looked at what was out there and decided it was not
              the path we wanted to take.
            </p>

            <p className="text-base leading-8 text-zinc-300">
              We did not want to spend large monthly fees on licensing when
              there were no users, and we did not want those fees scaling into
              yet another recurring cost once users arrived. There were already
              unavoidable expenses like code-signing certificates for Apple and
              Windows software, website hosting, and the domain itself. Rather
              than pour money into someone else’s licensing platform, we chose
              to spend the time building our own.
            </p>

            <p className="text-base leading-8 text-zinc-300">
              That decision gave birth to 
              <span className="font-semibold text-white">Software Licensor</span>.
              It was built in Rust for speed, portability, and long-term
              maintainability. Rust made it possible to target multiple
              environments cleanly, compile to a static library when needed, or
              use the licensing system directly from Rust applications. It also
              brought one of our favorite developer experiences: strong
              IntelliSense, clear method discovery, and (usually) rich 
              documentation.
            </p>

            <p className="text-base leading-8 text-zinc-300">
              Once the licensing platform was in place, we started experimenting
              with other kinds of Rust applications. Because Rust can compile to
              WebAssembly, it opened the door to fast browser-based tools. That
              led to projects like the{" "}
              <Link
                href="https://midi.alteredbrainchemistry.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                MIDI Machine
              </Link>
              , the{" "}
              <Link
                href="https://krk-ro.alteredbrainchemistry.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                KSP Rocket Kalculator for Realism Overhaul
              </Link>
              , and the{" "}
              <Link
                href="https://kcd2-dice.alteredbrainchemistry.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                Kingdom Come Deliverance 2 Dice Simulator
              </Link>
              . The MIDI Machine in particular began as Python code that could
              take more than ten minutes to run. In Rust and WebAssembly, it now
              runs in under a second. Some of the other web apps are also fast
              enough to take advantage of multithreading.
            </p>

            <p className="text-base leading-8 text-zinc-300">
              From there, we wanted to push into image and video generation.
              Generating structured data from configuration values and random
              number generators is one thing. Working with image and video data
              is something else entirely. A 720p image is already around a
              million pixels, and every pixel carries multiple bytes of data.
              That challenge led to the creation of Kaleidomo.
            </p>

            <p className="text-base leading-8 text-zinc-300">
              Kaleidomo started with SIMD in mind. Instead of relying only on
              standard 64-bit operations that work on one pair of numbers at a
              time, SIMD allows multiple 32-bit operations to be performed in a
              single instruction. In practical terms, that means the CPU can do
              far more work per step. Combine that with multithreading, and the
              CPU gets a real chance to compete with integrated graphics in some
              workloads. If you do not have an ARM GPU or a discrete GPU,
              Kaleidomo lets you compare performance and see just how close the
              CPU can get.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4 pt-4">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            The future of Altered Brain Chemistry
          </h2>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur md:p-8">
            <p className="text-base leading-8 text-zinc-300">
              We are looking for collaborators, creative partners,
              and companies interested in building unusual things
              together. 
            </p>
            <p className="text-base leading-8 text-zinc-300">
                If you give us time, we will deliver more products that 
                explore the possibilities of computing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}