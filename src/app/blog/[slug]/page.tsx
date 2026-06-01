import { notFound } from "next/navigation"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import { Badge } from "@/components/ui/badge"
import type { Blog } from "@/types/content"
import type { Metadata } from "next"

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

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Published", value: item.date ?? null },
    item.keywords?.length
      ? {
          label: "Keywords",
          value: (
            <div className="flex flex-wrap gap-1">
              {item.keywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
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
        <MetadataTable rows={rows} />
      </header>

      <article
        className="prose mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </main>
  )
}