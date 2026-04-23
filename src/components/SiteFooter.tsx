import Link from "next/link";
import Image from "next/image";

function DiscordIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 127.14 96.36"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.24 8.07C2.79 32.65-1.71 56.6.54 80.21h.01A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.84-11.14 68.42 68.42 0 0 1-10.78-5.18c.91-.67 1.8-1.36 2.66-2.08a75.57 75.57 0 0 0 64.27 0c.87.72 1.76 1.41 2.66 2.08a68.68 68.68 0 0 1-10.8 5.19 77 77 0 0 0 6.84 11.13A105.25 105.25 0 0 0 126.56 80.2c2.64-27.35-4.5-51.08-18.87-72.13ZM42.45 65.69c-6.27 0-11.42-5.73-11.42-12.78s5.05-12.78 11.42-12.78c6.41 0 11.52 5.78 11.42 12.78 0 7.05-5.06 12.78-11.42 12.78Zm42.24 0c-6.27 0-11.42-5.73-11.42-12.78s5.05-12.78 11.42-12.78c6.41 0 11.52 5.78 11.42 12.78 0 7.05-5.01 12.78-11.42 12.78Z" />
    </svg>
  );
}

const currentYear = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="site-footer-fixed border-t border-white/10 bg-zinc-950 text-zinc-100">
      <div className="mx-auto h-full w-full max-w-4xl px-6 py-6 md:py-8">
        <div className="flex h-full flex-col gap-8 md:grid md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-10">
          {/* MOBILE — TOP ROW */}
          <div className="grid grid-cols-2 gap-8 md:hidden">
            {/* MOBILE — NAVIGATION */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-200">
                Navigation
              </div>

              <nav className="flex flex-col gap-2 text-sm text-zinc-400">
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
                <Link href="/shop" className="transition-colors hover:text-white">
                  Shop
                </Link>
                <Link href="/blog" className="transition-colors hover:text-white">
                  Blog
                </Link>
                <Link
                  href="/downloads"
                  className="transition-colors hover:text-white"
                >
                  Downloads
                </Link>
                <Link href="/about" className="transition-colors hover:text-white">
                  About Us
                </Link>
                <Link
                  href="/support-us"
                  className="transition-colors hover:text-white"
                >
                  Support Us
                </Link>
                <Link
                  href="/privacy-policy"
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </nav>
            </div>

            {/* MOBILE — COMMUNITY */}
            <div className="flex flex-col items-end gap-3 text-right">
              <div className="text-sm font-medium text-zinc-200">
                Community
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="https://discord.gg/92CCYacXXV"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Discord"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:bg-blue-500/10"
                >
                  <DiscordIcon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-blue-500" />
                </Link>
              </div>
            </div>
          </div>

          {/* MOBILE — LOGO */}
          <div className="flex justify-center md:hidden">
            <div className="relative aspect-[3/1] w-[260px]">
              <Image
                src="/altered-brain-chemistry-logo.png"
                alt="Altered Brain Chemistry logo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* MOBILE — COPYRIGHT */}
          <div className="text-center text-sm text-zinc-500 md:hidden">
            © 2022-{currentYear} Hyperformance Solutions
          </div>

          {/* DESKTOP — LEFT */}
          <div className="hidden space-y-3 md:block">
            <div className="text-sm font-medium text-zinc-200">Navigation</div>

            <nav className="flex flex-col gap-2 text-sm text-zinc-400">
              <Link href="/" className="transition-colors hover:text-white">
                Home
              </Link>
              <Link href="/shop" className="transition-colors hover:text-white">
                Shop
              </Link>
              <Link href="/blog" className="transition-colors hover:text-white">
                Blog
              </Link>
              <Link
                href="/downloads"
                className="transition-colors hover:text-white"
              >
                Downloads
              </Link>
              <Link href="/about" className="transition-colors hover:text-white">
                About Us
              </Link>
              <Link
                href="/support-us"
                className="transition-colors hover:text-white"
              >
                Support Us
              </Link>
              <Link
                href="/privacy-policy"
                className="transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* DESKTOP — CENTER */}
          <div className="hidden md:flex md:h-full md:flex-col md:items-center md:justify-between md:text-center">
            <div className="relative aspect-[3/1] w-[260px] md:w-[340px] abc-logo-cycle-2">
              <Image
                src="/altered-brain-chemistry-logo.png"
                alt="Altered Brain Chemistry logo"
                fill
                className="object-contain"
              />
            </div>

            <div className="text-sm text-zinc-500">
              © 2022-{currentYear} Hyperformance Solutions
            </div>
          </div>

          {/* DESKTOP — RIGHT */}
          <div className="hidden md:flex md:flex-col md:items-end md:gap-3 md:text-right">
            <div className="text-sm font-medium text-zinc-200">Community</div>

            <div className="flex items-center gap-3">
              <Link
                href="https://discord.gg/92CCYacXXV"
                target="_blank"
                rel="noreferrer"
                aria-label="Discord"
                className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:bg-blue-500/10"
              >
                <DiscordIcon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-blue-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}