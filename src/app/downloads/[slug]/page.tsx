import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import DownloadDialog from "@/components/content/DownloadDialog"
import type { Download } from "@/types/content"
import { isAllPlatforms } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-static"

export function generateStaticParams() {
  return (getCollection("downloads") as Download[]).map((d) => ({ slug: d.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getItem("downloads", params.slug) as Download | null
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

export default function DownloadSlugPage({ params }: { params: { slug: string } }) {
  const item = getItem("downloads", params.slug) as Download | null
  if (!item) notFound()

  const bodyHtml = tiptapDocToHtml(item.tiptap as object)

  const rows = [
    { label: "Version", value: item.version ?? null },
    { label: "Date Added", value: item.dateAdded ?? null },
    { label: "Platforms", value: detectPlatforms(item) },
    {
      label: "License",
      value: item.software_licensor
        ? `Licensed (ID: ${item.software_licensor.software_licensor_product_id})`
        : "Free",
    },
    item.sourceCodeUrl
      ? {
          label: "Source Code",
          value: (
            <a
              href={item.sourceCodeUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
            >
              {item.sourceCodeUrl}
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

        {/* Action button */}
        <div className="mt-5">
          <DownloadDialog download={item} />
        </div>

        {/* At a glance table */}
        <MetadataTable rows={rows} />

        {/* Hero image */}
        {item.heroImageUrl && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-muted flex justify-center">
            <Image
              src={item.heroImageUrl}
              alt={item.name}
              width={0}
              height={0}
              className="h-auto w-auto max-w-full"
              sizes="100vw"
              priority
            />
          </div>
        )}
      </header>

      <article
        className="prose mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </main>
  )
}