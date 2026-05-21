import { notFound } from "next/navigation";
import { ContentItem, CollectionName, ExtendedItem } from "@/lib/content-types";
import ItemPage from "@/components/content/ItemPage";
import { getItem, getCollection } from "@/lib/contentStore";

export default async function ItemPageWrapper({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  
  // Try to find the item in each collection
  const item = [
    ...getCollection("downloads"),
    ...getCollection("products"),
    ...getCollection("blogs"),
    ...getCollection("webapps")
  ].find(item => item.slug === slug);

  if (!item) {
    notFound();
  }

  // Determine the type of item
  let type: CollectionName = "downloads";
  if (getCollection("downloads").some(d => d.slug === slug)) type = "downloads";
  if (getCollection("products").some(p => p.slug === slug)) type = "products";
  if (getCollection("blogs").some(b => b.slug === slug)) type = "blogs";
  if (getCollection("webapps").some(w => w.slug === slug)) type = "webapps";

  // Add the type to the item
  (item as any).type = type;

  return (
    <ItemPage item={item as ExtendedItem} />
  );
}