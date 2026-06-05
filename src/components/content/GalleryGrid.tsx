"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { mediaURL } from "@/lib/mediaURL"

export interface GalleryItem {
  slug: string
  name: string
  shortDescription?: string
  thumbnailUrl?: string
  /** ISO date string used for date-based sorting (dateAdded or date) */
  dateAdded?: string
}

interface GalleryGridProps {
  items: GalleryItem[]
  basePath: string
}

type SortKey = "newest" | "oldest" | "az" | "za"

export default function GalleryGrid({ items, basePath }: GalleryGridProps) {
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")

  const displayed = useMemo(() => {
    const query = q.trim().toLowerCase()

    const filtered = query
      ? items.filter((item) =>
          `${item.slug} ${item.name} ${item.shortDescription ?? ""}`
            .toLowerCase()
            .includes(query)
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
    <div>
      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
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

      {/* Result count */}
      <div className="mt-3 text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{displayed.length}</span>{" "}
        of{" "}
        <span className="font-medium text-foreground">{items.length}</span>
      </div>

      {/* Grid */}
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((item) => {
          const thumbSrc = mediaURL(item.thumbnailUrl)
          return (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}`}
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
                <div className="font-medium group-hover:underline underline-offset-4">
                  {item.name}
                </div>
                {item.shortDescription ? (
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {item.shortDescription}
                  </div>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>

      {displayed.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No items match your search.
        </p>
      )}
    </div>
  )
}