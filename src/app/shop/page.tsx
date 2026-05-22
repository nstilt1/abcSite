import GalleryList from "@/components/content/GalleryList"
import FilterBar from "@/components/content/FilterBar"
import { getAllProducts, getAllDownloads } from "@/lib/content"
import { ContentItem } from "@/lib/content-types"
import { Suspense } from "react";

export default function ShopPage() {
  const products = getAllProducts();
  const downloads = getAllDownloads();
  
  // "Software" section should be items from downloads.json where software_licensor != null
  const softwareItems = downloads.filter(item => (item as any).software_licensor !== null);
  const physicalItems = products;

  const allShopItems = [...softwareItems, ...physicalItems];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Shop</h1>
      <p className="mt-2 text-muted-foreground">
        Explore our software licenses and physical products.
      </p>

      <Suspense>
        <FilterBar itemsForOptions={allShopItems} />

        <div className="mt-12 space-y-12">
          <section>
            <h2 className="text-2xl font-medium mb-4">Software</h2>
            <GalleryList collection="downloads" items={softwareItems} />
          </section>

          <section>
            <h2 className="text-2xl font-medium mb-4">Products</h2>
            <GalleryList collection="products" items={physicalItems} />
          </section>
        </div>
      </Suspense>
    </main>
  )
}
