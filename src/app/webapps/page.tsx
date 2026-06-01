import { getCollection } from "@/lib/contentStore"
import GalleryGrid from "@/components/content/GalleryGrid"
import type { WebApp } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Web Apps",
  description: "Hosted web applications.",
}

export default function WebAppsPage() {
  const webapps = getCollection("webapps") as WebApp[]

  const items = webapps.map((w) => ({
    slug: w.slug,
    name: w.name,
    shortDescription: w.shortDescription,
    thumbnailUrl: w.thumbnailUrl,
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Web Apps</h1>
      <p className="mt-2 text-muted-foreground">
        Hosted tools and interactive applications.
      </p>
      <GalleryGrid items={items} basePath="/webapps" />
    </main>
  )
}