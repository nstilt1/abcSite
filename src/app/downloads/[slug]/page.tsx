import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import DownloadDialog from "@/components/content/DownloadDialog"
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

  const rows = [
    { label: "Version",    value: item.version ?? null },
    { label: "Date Added", value: item.dateAdded ?? null },
    { label: "Platforms",  value: detectPlatforms(item) },
    {
      label: "License",
      value: item.software_licensor
        ? `Licensed (ID: ${item.software_licensor.software_licensor_product_id})`
        : "Free",
    },
    sourceUrl
      ? {
          label: "Source Code",
          value: (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
            >
              {sourceUrl}
            </a>
          ),
        }
      : null,
  ].filter(Boolean) as { label: string; value: React.ReactNode }[]

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold">{item.name}</h1>
        {item.shortDescription && (
          <p className="mt-3 text-muted-foreground">{item.shortDescription}</p>
        )}

        <div className="mt-5">
          <DownloadDialog download={item} />
        </div>

        <MetadataTable rows={rows} />

        {/* Hero: WASM kaleidoscope for kaleidomo slugs, static image otherwise */}
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
      </header>

      <article
        className="prose mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </main>
  )
}