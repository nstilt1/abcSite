import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import { Button } from "@/components/ui/button"
import type { WebApp } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-static"

export function generateStaticParams() {
  return (getCollection("webapps") as WebApp[]).map((w) => ({ slug: w.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getItem("webapps", params.slug) as WebApp | null
  if (!item) return {}
  return {
    title: item.name,
    description: item.shortDescription ?? "",
  }
}

export default function WebAppSlugPage({ params }: { params: { slug: string } }) {
  const item = getItem("webapps", params.slug) as WebApp | null
  if (!item) notFound()

  const bodyHtml = tiptapDocToHtml(item.tiptap as object)

  const rows: { label: string; value: React.ReactNode }[] = [
    item.urls?.length
      ? {
          label: "Launch",
          value: (
            <div className="flex flex-col gap-1">
              {item.urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:opacity-80 text-sm"
                >
                  {url}
                </a>
              ))}
            </div>
          ),
        }
      : null,
    item.sourceCodeLink
      ? {
          label: "Source Code",
          value: (
            <a
              href={item.sourceCodeLink}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
            >
              {item.sourceCodeLink}
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

        {/* Primary launch button */}
        {item.urls?.[0] && (
          <div className="mt-5">
            <a href={item.urls[0]} target="_blank" rel="noreferrer">
              <Button size="lg">Open App</Button>
            </a>
          </div>
        )}

        <MetadataTable rows={rows} />

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