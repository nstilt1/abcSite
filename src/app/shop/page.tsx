"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import { getCollection } from "@/lib/contentStore"
import type { Product, InventoriedProduct, Download } from "@/types/content"
import { isWebExtension } from "@/types/content"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { mediaURL } from "@/lib/mediaURL"
import { HeroVideo } from "@/components/HeroVideo"
import type { HeroKaleidoControls } from "@/app/page"

// Shop page metadata is set in a separate layout / via generateMetadata on the
// server version if needed; this page is client-rendered for filtering.

// ── Kaleidomo card dimensions ─────────────────────────────────────────────
// Grid: max-w-5xl (1024px) − px-6×2 (48px) = 976px usable.
// 3-col with gap-5 (20px): card width = (976 − 40) / 3 ≈ 312px.
// Card thumbnail is aspect-[16/9]: height = 312 × 9/16 ≈ 176px.
// These become the WASM canvas resolution. The parent div's aspect-[16/9] +
// HeroVideo's absolute-fill layout handles every breakpoint automatically
// (1-col mobile, 2-col sm, 3-col lg) via CSS — no JS resize needed.
const KALEIDO_CANVAS_W = 312
const KALEIDO_CANVAS_H = 176

const KALEIDO_CONTROLS: HeroKaleidoControls = {
  animationDuration:     100,
  hueRotation:           308,
  triangleCenterX:       515.1039592844847,
  triangleCenterY:       755.3734001945962,
  triangleRotationRad:   6.22,
  reorientationDuration: 64 * Math.PI,
  reorientationFn:       "sin",
}

type SortKey = "newest" | "oldest" | "az" | "za"

interface ShopItem {
  slug: string
  name: string
  shortDescription?: string
  thumbnailUrl?: string
  href: string
  badge?: React.ReactNode
  dateAdded?: string
}

// Replaces the static thumbnail for the kaleidomo card with the live WASM
// canvas, matching the pattern used on downloads/[slug]/page.tsx.
function KaleidoShopCard({ item }: { item: ShopItem }) {
  return (
    <Link
      href={item.href}
      className="group rounded-xl border overflow-hidden hover:bg-muted/30 transition-colors"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
        <HeroVideo
          controls={KALEIDO_CONTROLS}
          width={KALEIDO_CANVAS_W}
          height={KALEIDO_CANVAS_H}
          offset_x={80}
          zoom_max={0.3}
          zoom_min={0.2}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium group-hover:underline underline-offset-4">{item.name}</div>
          {item.badge}
        </div>
        {item.shortDescription && (
          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {item.shortDescription}
          </div>
        )}
      </div>
    </Link>
  )
}

function ShopCard({ item }: { item: ShopItem }) {
  if (item.slug === "kaleidomo") return <KaleidoShopCard item={item} />

  const thumbSrc = mediaURL(item.thumbnailUrl)
  return (
    <Link
      href={item.href}
      className="group rounded-xl border overflow-hidden hover:bg-muted/30 transition-colors"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {thumbSrc ? (
          <Image
            src={thumbSrc}
            alt={item.name}
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
          <div className="font-medium group-hover:underline underline-offset-4">{item.name}</div>
          {item.badge}
        </div>
        {item.shortDescription && (
          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {item.shortDescription}
          </div>
        )}
      </div>
    </Link>
  )
}

function SectionGrid({ title, subtitle, items }: { title: string; subtitle: string; items: ShopItem[] }) {
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")

  const displayed = useMemo(() => {
    const query = q.trim().toLowerCase()
    const filtered = query
      ? items.filter((item) =>
          `${item.slug} ${item.name} ${item.shortDescription ?? ""}`.toLowerCase().includes(query)
        )
      : items

    return [...filtered].sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()
      const dateA = new Date(a.dateAdded ?? 0).getTime()
      const dateB = new Date(b.dateAdded ?? 0).getTime()
      switch (sort) {
        case "az":     return nameA.localeCompare(nameB)
        case "za":     return nameB.localeCompare(nameA)
        case "oldest": return dateA - dateB
        case "newest":
        default:       return dateB - dateA
      }
    })
  }, [items, q, sort])

  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="mb-1 text-xs text-muted-foreground">Search</div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or description…"
          />
        </div>
        <div className="sm:w-48">
          <div className="mb-1 text-xs text-muted-foreground">Sort</div>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{displayed.length}</span>{" "}
        of <span className="font-medium text-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-muted-foreground italic">No items listed yet.</p>
      ) : displayed.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No items match your search.</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((item) => (
            <ShopCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ShopPage() {
  // All visible downloads appear on the shop page regardless of whether they're
  // purchasable through the site — web extensions link out to browser stores instead.
  const allDownloads = (getCollection("downloads") as Download[]).filter((d) => d.visible !== false)
  const allProducts = getCollection("products") as Product[]
  const physicalGoods = allProducts.filter((p) => p.type === "inventoried") as InventoriedProduct[]

  const softwareItems: ShopItem[] = allDownloads.map((d) => ({
    slug: d.slug,
    name: d.name,
    shortDescription: d.shortDescription,
    thumbnailUrl: d.thumbnailUrl,
    href: `/downloads/${d.slug}`,
    badge: isWebExtension(d.downloadInfo) ? (
      <Badge variant="outline">Browser Extension</Badge>
    ) : d.software_licensor ? (
      <Badge variant="secondary">Software</Badge>
    ) : (
      <Badge variant="outline">Free</Badge>
    ),
    dateAdded: d.dateAdded,
  }))

  const physicalItems: ShopItem[] = physicalGoods.map((p) => ({
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    thumbnailUrl: p.thumbnailUrl,
    href: `/products/${p.slug}`,
    badge:
      p.stock > 0 ? (
        <Badge variant="default">In Stock</Badge>
      ) : (
        <Badge variant="destructive">Out of Stock</Badge>
      ),
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-14">
      <SectionGrid
        title="Software"
        subtitle="Licenses and downloadable applications."
        items={softwareItems}
      />
      <SectionGrid
        title="Physical Goods"
        subtitle="Inventoried items available for purchase."
        items={physicalItems}
      />
    </main>
  )
}