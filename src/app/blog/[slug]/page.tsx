import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import { Badge } from "@/components/ui/badge"
import { mediaURL } from "@/lib/mediaURL"
import type { Metadata } from "next"
import PublishedMeta from "./PublishedMeta"

export const dynamic = "force-static"

// The JSON injected at build time uses these field names
interface BlogRecord {
  slug: string
  name: string
  shortDescription?: string
  /** ISO date string, e.g. "2026-06-23" or full ISO datetime */
  date?: string
  /** Author display name */
  author?: string
  keywords?: string[]
  /** Hero / full-width image */
  heroImageUrl?: string
  /** Thumbnail (also used as hero fallback) */
  thumbnailUrl?: string
  tiptap: object
}

export function generateStaticParams() {
  return (getCollection("blogs") as BlogRecord[]).map((b) => ({ slug: b.slug }))
}

export function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Metadata {
  const item = getItem("blogs", params.slug) as BlogRecord | null
  if (!item) return {}
  return {
    title: item.name,
    description: item.shortDescription ?? "",
    keywords: item.keywords ?? [],
  }
}

export default function BlogSlugPage({ params }: { params: { slug: string } }) {
  const item = getItem("blogs", params.slug) as BlogRecord | null
  if (!item) notFound()

  const bodyHtml = tiptapDocToHtml(item.tiptap)
  // Hero: prefer explicit heroImageUrl, fall back to thumbnailUrl
  const heroSrc = mediaURL(item.heroImageUrl ?? item.thumbnailUrl ?? "")
  const keywords = item.keywords ?? []

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        {/* Title */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          {item.name}
        </h1>

        {/* By [author] · [date in user's local timezone] */}
        {(item.author || item.date) && (
          <PublishedMeta isoDate={item.date ?? ""} author={item.author} />
        )}

        {/* Short description */}
        {item.shortDescription && (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {item.shortDescription}
          </p>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {/* Hero image */}
      {heroSrc && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <Image
            src={heroSrc}
            alt={item.name}
            width={900}
            height={500}
            className="w-full object-cover"
            priority
          />
        </div>
      )}

      {/* Body content */}
      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </main>
  )
}