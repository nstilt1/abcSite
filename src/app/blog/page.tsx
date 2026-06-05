import { getCollection } from "@/lib/contentStore"
import GalleryGrid from "@/components/content/GalleryGrid"
import type { Blog } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles and posts.",
}

export default function BlogsPage() {
  const blogs = getCollection("blogs") as Blog[]

  const items = blogs.map((b) => ({
    slug: b.slug,
    name: b.name,
    shortDescription: b.shortDescription,
    thumbnailUrl: b.thumbnailUrl,
    dateAdded: b.date,
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Blog</h1>
      <p className="mt-2 text-muted-foreground">
        Articles, updates, and guides.
      </p>
      <GalleryGrid items={items} basePath="/blogs" />
    </main>
  )
}