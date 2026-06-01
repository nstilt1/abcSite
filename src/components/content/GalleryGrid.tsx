import Link from "next/link"
import Image from "next/image"

export interface GalleryItem {
  slug: string
  name: string
  shortDescription?: string
  thumbnailUrl?: string
}

interface GalleryGridProps {
  items: GalleryItem[]
  basePath: string // e.g. "/downloads"
}

export default function GalleryGrid({ items, basePath }: GalleryGridProps) {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.slug}
          href={`${basePath}/${item.slug}`}
          className="group rounded-xl border overflow-hidden hover:bg-muted/30 transition-colors"
        >
          {/* Thumbnail */}
          <div className="relative aspect-[16/9] w-full bg-muted">
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="h-full w-full bg-muted/50" />
            )}
          </div>

          {/* Text */}
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
      ))}
    </div>
  )
}