import { getCollection } from "@/lib/contentStore"
import GalleryGrid from "@/components/content/GalleryGrid"
import type { Download } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Downloads",
  description: "Software downloads and releases.",
}

export default function DownloadsPage() {
  const downloads = getCollection("downloads") as Download[]
  const visible = downloads.filter((d) => d.visible !== false)

  const items = visible.map((d) => ({
    slug: d.slug,
    name: d.name,
    shortDescription: d.shortDescription,
    thumbnailUrl: d.thumbnailUrl,
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Downloads</h1>
      <p className="mt-2 text-muted-foreground">
        Browse available software releases.
      </p>
      <GalleryGrid items={items} basePath="/downloads" />
    </main>
  )
}