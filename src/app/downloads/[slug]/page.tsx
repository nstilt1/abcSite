import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import DownloadDialog from "@/components/content/DownloadDialog"
import LicenseSection from "@/components/content/LicenseSection"
import KaleidoHeroStatic from "@/components/KaleidoHeroStatic"
import type { Download } from "@/types/content"
import { isAllPlatforms } from "@/types/content"
import { mediaURL, resolveSourceCodeUrl } from "@/lib/mediaURL"
import type { Metadata } from "next"

export const dynamic = "force-static"

export function generateStaticParams() {
  return (getCollection("downloads") as Download[]).map((d) => ({ slug: d.slug }))
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getItem("downloads", slug) as Download | null
  if (!item) return {}
  return {
    title: item.name,
    description: item.shortDescription ?? "",
  }
}

function detectPlatforms(d: Download): string {
  const info = d.downloadInfo
  if (isAllPlatforms(info)) return "All platforms"
  const plats: string[] = []
  if (info.windowsDownloadLink) plats.push("Windows")
  if (info.macosDownloadLink) plats.push("macOS")
  if (info.linuxDownloadLink) plats.push("Linux")
  return plats.join(", ") || "—"
}

export default async function DownloadSlugPage({ params }: PageProps) {
  const { slug } = await params
  const item = getItem("downloads", slug) as Download | null
  if (!item) notFound()

  const bodyHtml = tiptapDocToHtml(item.tiptap as object)
  const heroSrc = mediaURL(item.heroImageUrl)
  const sourceUrl = resolveSourceCodeUrl(item.sourceCodeUrl)
  const isKaleidomo = slug.includes("kaleidomo")

  const licenseMode = item.software_licensor?.license_mode ?? "free"
  const hasLicensor = !!item.software_licensor

  // License row in metadata
  const licenseLabel = !hasLicensor
    ? "Free"
    : licenseMode === "free"
    ? "Free (optional license available)"
    : licenseMode === "optional"
    ? "Free with restrictions — license unlocks full features"
    : "License required to use this software"

  // Only include the Download row if there's at least one valid download link.
  // NOTE: isAllPlatforms checks key *existence*, not value — a record can have
  // allPlatformsDownloadLink: "" alongside per-platform links, so we must check
  // all non-empty link fields regardless of which shape the object appears to be.
  const hasDownloadLinks = (() => {
    const info = item.downloadInfo as Record<string, unknown>
    return !!(
      (typeof info.allPlatformsDownloadLink === "string" && info.allPlatformsDownloadLink.trim()) ||
      (typeof info.windowsDownloadLink === "string" && info.windowsDownloadLink.trim()) ||
      (typeof info.macosDownloadLink === "string" && info.macosDownloadLink.trim()) ||
      (typeof info.linuxDownloadLink === "string" && info.linuxDownloadLink.trim())
    )
  })()

  const rows = [
    { label: "Version",    value: item.version ?? null },
    { label: "Date Added", value: item.dateAdded ?? null },
    { label: "Platforms",  value: detectPlatforms(item) },
    { label: "License",    value: licenseLabel },
    hasDownloadLinks
      ? { label: "Download", value: <DownloadDialog download={item} /> }
      : null,
    sourceUrl
      ? {
          label: "Source Code",
          value: (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={sourceUrl}
              className="block truncate underline underline-offset-4 hover:opacity-80"
            >
              {sourceUrl}
            </a>
          ),
        }
      : null,
  ].filter(Boolean) as { label: string; value: React.ReactNode }[]

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold">{item.name}</h1>
      {item.shortDescription && (
        <p className="mt-3 text-muted-foreground">{item.shortDescription}</p>
      )}

      <div className={`mt-6 gap-6 items-start ${hasLicensor ? "grid lg:grid-cols-[1fr_minmax(0,420px)]" : ""}`}>
        <div className="[&>*]:mt-0">
          <MetadataTable rows={rows} />
        </div>

        {hasLicensor && (
          <div className="rounded-xl border p-5">
            <LicenseSection download={item} variant="inline" />
          </div>
        )}
      </div>

      {isKaleidomo ? (
        <div className="relative mt-6 w-full overflow-hidden rounded-2xl border bg-black aspect-video">
          <KaleidoHeroStatic />
        </div>
      ) : heroSrc ? (
        <div className="mt-6 overflow-hidden rounded-2xl border bg-muted flex justify-center">
          <Image
            src={heroSrc}
            alt={item.name}
            width={0}
            height={0}
            className="h-auto w-auto max-w-full"
            sizes="100vw"
            priority
          />
        </div>
      ) : null}

      <article
        className="prose mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {hasLicensor && <LicenseSection download={item} />}
    </main>
  )
}