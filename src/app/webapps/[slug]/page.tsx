import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import { Button } from "@/components/ui/button"
import type { WebApp } from "@/types/content"
import { mediaURL, resolveSourceCodeUrl } from "@/lib/mediaURL"
import type { Metadata } from "next"

export const dynamic = "force-static"

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return (getCollection("webapps") as WebApp[]).map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getItem("webapps", slug) as WebApp | null
  if (!item) return {}
  return {
    title: item.name,
    description: item.shortDescription ?? "",
  }
}

export default async function WebAppSlugPage({ params }: PageProps) {
  const { slug } = await params
  const item = getItem("webapps", slug) as WebApp | null
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
    resolveSourceCodeUrl(item.sourceCodeLink)
      ? {
          label: "Source Code",
          value: (
            <a
              href={resolveSourceCodeUrl(item.sourceCodeLink)!}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
            >
              {resolveSourceCodeUrl(item.sourceCodeLink)}
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

        {/* Embed the app in an iframe at the hero position, passing embed=1 so the
            app can detect it's running embedded and adjust its UI accordingly.
            Falls back to the static hero image if no URL is configured. */}
        {item.urls?.[0] ? (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-muted">
            <iframe
              src={`${item.urls[0]}${item.urls[0].includes("?") ? "&" : "?"}embed=1`}
              title={item.name}
              className="w-full h-[600px]"
              allow="autoplay; fullscreen"
            />
          </div>
        ) : mediaURL(item.heroImageUrl) ? (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-muted flex justify-center">
            <Image
              src={mediaURL(item.heroImageUrl)!}
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