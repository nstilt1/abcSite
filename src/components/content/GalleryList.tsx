"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo } from "react"
import { useGalleryFilters } from "@/components/content/useGalleryFilters"
import { mediaURL } from "@/lib/mediaURL"
import { ContentItem } from "@/lib/content-types"

function getCardImage(item: ContentItem) {
  const path = item.imagePath || (item as any).thumbnailUrl || (item as any).thumbPath || "";
  return mediaURL(path);
}

interface GalleryListProps {
  collection: string;
  items: ContentItem[];
  basePath?: string;
}

export default function GalleryList({ collection, items, basePath = "" }: GalleryListProps) {
  const { q, sort } = useGalleryFilters()
  const prefix = basePath ? `/${basePath.replace(/^\/+|\/+$/g, "")}` : ""

  const filteredAndSorted = useMemo(() => {
    const qLower = q.trim().toLowerCase()

    // 1. Filter (Search only)
    const filtered = (items || []).filter((item) => {
      const matchQ = qLower
        ? `${item.slug} ${item.title || ""} ${item.shortDescription || ""}`
            .toLowerCase()
            .includes(qLower)
        : true
      return matchQ
    })

    // 2. Sort
    return [...filtered].sort((a, b) => {
      const titleA = (a.title || a.slug).toLowerCase();
      const titleB = (b.title || b.slug).toLowerCase();
      
      const dateA = new Date((a as any).dateAdded || (a as any).date || 0).getTime();
      const dateB = new Date((b as any).dateAdded || (b as any).date || 0).getTime();

      switch (sort) {
        case "az": return titleA.localeCompare(titleB);
        case "za": return titleB.localeCompare(titleA);
        case "oldest": return dateA - dateB;
        case "newest": 
        default: return dateB - dateA;
      }
    })
  }, [items, q, sort])

  return (
    <div className="mt-4">
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filteredAndSorted.length}</span>{" "}
        of <span className="font-medium text-foreground">{(items || []).length}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSorted.map((item) => {
          const img = getCardImage(item)

          return (
            <Link
              key={`${collection}:${item.slug}`}
              href={`${prefix}/${collection}/${item.slug}`}
              className="group rounded-xl border overflow-hidden hover:bg-muted/30 transition"
            >
              <div className="relative w-full bg-muted">
                <div className="aspect-[16/9] w-full">
                  {img ? (
                    <Image
                      src={img}
                      alt={item.title || item.slug}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={false}
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="font-medium group-hover:underline underline-offset-4">
                  {item.title || item.slug}
                </div>

                {item.shortDescription ? (
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {item.shortDescription}
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {(item.languages || []).length ? (
                    <div className="line-clamp-1">
                      Languages: {(item.languages || []).join(", ")}
                    </div>
                  ) : null}
                  {(item.frameworks || []).length ? (
                    <div className="line-clamp-1">
                      Frameworks: {(item.frameworks || []).join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
