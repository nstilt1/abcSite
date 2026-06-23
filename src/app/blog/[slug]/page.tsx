import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import { Badge } from "@/components/ui/badge"
import type { Blog } from "@/types/content"
import type { Metadata } from "next"
import PublishedMeta from "./PublishedMeta"

export const dynamic = "force-static"

export function generateStaticParams() {
  return (getCollection("blogs") as Blog[]).map((b) => ({ slug: b.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getItem("blogs", params.slug) as Blog | null
  if (!item) return {}
  return {
    title: item.name,
    description: item.shortDescription ?? "",
    keywords: item.keywords,
  }
}

export default function BlogSlugPage({ params }: { params: { slug: string } }) {
  const item = getItem("blogs", params.slug) as Blog | null
  if (!item) notFound()

  const bodyHtml = tiptapDocToHtml(item.tiptap as object)

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        {/* Title */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight">{item.name}</h1>

        {/* By [author] · [date in user timezone] — rendered client-side for TZ */}
        {(item.author || item.date) && (
          <PublishedMeta isoDate={item.date} author={item.author} />
        )}

        {/* Short description */}
        {item.shortDescription && (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {item.shortDescription}
          </p>
        )}

        {/* Keywords */}
        {item.keywords?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.keywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {/* Hero image */}
      {item.heroImageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <Image
            src={item.heroImageUrl}
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