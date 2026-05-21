import GalleryList from "@/components/content/GalleryList"
import FilterBar from "@/components/content/FilterBar"
import { ContentItem } from "@/lib/content-types"

interface GalleryPageProps {
  title: string;
  subtitle?: string;
  collection: string;
  items: ContentItem[];
}

export default function GalleryPage({ title, subtitle, collection, items }: GalleryPageProps) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}

      <FilterBar itemsForOptions={items} />
      <GalleryList collection={collection} items={items} />
    </main>
  )
}
