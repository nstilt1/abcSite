import { notFound } from "next/navigation"
import Image from "next/image"
import { getCollection, getItem } from "@/lib/contentStore"
import { tiptapDocToHtml } from "@/lib/tiptapToHtml"
import MetadataTable from "@/components/content/MetadataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import KaleidoHeroStatic from "@/components/KaleidoHeroStatic"
import type { Product, InventoriedProduct, ApiDrivenProduct } from "@/types/content"
import { mediaURL } from "@/lib/mediaURL"
import type { Metadata } from "next"

export const dynamic = "force-static"

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return (getCollection("products") as Product[])
    .filter((p) => p.type !== "software")
    .map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getItem("products", slug) as Product | null
  if (!item) return {}
  return {
    title: item.name,
    description: item.shortDescription ?? "",
  }
}

export default async function ProductSlugPage({ params }: PageProps) {
  const { slug } = await params
  const item = getItem("products", slug) as Product | null
  if (!item) notFound()

  const bodyHtml = tiptapDocToHtml(item.tiptap as object)
  const heroSrc = mediaURL(item.heroImageUrl)
  const isKaleidomo = slug.includes("kaleidomo")

  const rows: { label: string; value: React.ReactNode }[] = []

  if (item.type === "inventoried") {
    const inv = item as InventoriedProduct
    rows.push({
      label: "Availability",
      value:
        inv.stock > 0 ? (
          <Badge variant="default">In Stock ({inv.stock})</Badge>
        ) : (
          <Badge variant="destructive">Out of Stock</Badge>
        ),
    })
  }

  if (item.type === "api_driven") {
    const api = item as ApiDrivenProduct
    rows.push({ label: "Type", value: "API Driven" })
    rows.push({ label: "Endpoint", value: api.endpointURL })
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold">{item.name}</h1>

        {item.shortDescription ? (
          <p className="mt-3 text-muted-foreground">{item.shortDescription}</p>
        ) : null}

        {item.type === "inventoried" && (item as InventoriedProduct).stock > 0 ? (
          <div className="mt-5">
            <Button size="lg">Add to Cart</Button>
          </div>
        ) : null}

        {item.type === "inventoried" && (item as InventoriedProduct).stock === 0 ? (
          <div className="mt-5">
            <Button size="lg" disabled>Out of Stock</Button>
          </div>
        ) : null}

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