import Link from "next/link"
import Image from "next/image"
import { getCollection, getSoftwareDownloads } from "@/lib/contentStore"
import type { Product, InventoriedProduct } from "@/types/content"
import { Badge } from "@/components/ui/badge"
import type { Metadata } from "next"

export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Shop",
  description: "Software licenses and physical goods.",
}

function ProductCard({
  slug,
  name,
  shortDescription,
  thumbnailUrl,
  href,
  badge,
}: {
  slug: string
  name: string
  shortDescription?: string
  thumbnailUrl?: string
  href: string
  badge?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border overflow-hidden hover:bg-muted/30 transition-colors"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-muted/50" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium group-hover:underline underline-offset-4">{name}</div>
          {badge}
        </div>
        {shortDescription && (
          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {shortDescription}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function ShopPage() {
  // Software section – licensor downloads
  const softwareDownloads = getSoftwareDownloads()

  // Physical goods – inventoried products from products.json
  const allProducts = getCollection("products") as Product[]
  const physicalGoods = allProducts.filter(
    (p) => p.type === "inventoried"
  ) as InventoriedProduct[]

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-14">
      {/* ── Software ── */}
      <section>
        <h2 className="text-2xl font-semibold">Software</h2>
        <p className="mt-1 text-muted-foreground">Licenses and downloadable applications.</p>

        {softwareDownloads.length === 0 ? (
          <p className="mt-6 text-muted-foreground italic">No software listed yet.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {softwareDownloads.map((d) => (
              <ProductCard
                key={d.slug}
                slug={d.slug}
                name={d.name}
                shortDescription={d.shortDescription}
                thumbnailUrl={d.thumbnailUrl}
                href={`/downloads/${d.slug}`}
                badge={<Badge variant="secondary">Software</Badge>}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Physical Goods ── */}
      <section>
        <h2 className="text-2xl font-semibold">Physical Goods</h2>
        <p className="mt-1 text-muted-foreground">Inventoried items available for purchase.</p>

        {physicalGoods.length === 0 ? (
          <p className="mt-6 text-muted-foreground italic">No physical goods listed yet.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {physicalGoods.map((p) => (
              <ProductCard
                key={p.slug}
                slug={p.slug}
                name={p.name}
                shortDescription={p.shortDescription}
                thumbnailUrl={p.thumbnailUrl}
                href={`/products/${p.slug}`}
                badge={
                  p.stock > 0 ? (
                    <Badge variant="default">In Stock</Badge>
                  ) : (
                    <Badge variant="destructive">Out of Stock</Badge>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}