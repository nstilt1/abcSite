import downloadsJson from "@/content/downloads.json";
import webappsJson from "@/content/webapps.json";
import blogsJson from "@/content/blogs.json";
import productsJson from "@/content/products.json";
import type { CollectionName, ContentItem } from "@/lib/content-types";

const downloads = downloadsJson as ContentItem[];
const webapps = webappsJson as ContentItem[];
const products = productsJson as ContentItem[];
const blogs = blogsJson as ContentItem[];

export const COLLECTIONS: CollectionName[] = ["blogs", "downloads", "products", "webapps"];

const store: Record<CollectionName, ContentItem[]> = {
  downloads,
  blogs,
  webapps,
  products,
};

export function getCollection(collection: string): ContentItem[] {
  if (!COLLECTIONS.includes(collection as CollectionName)) {
    return [];
  }

  return store[collection as CollectionName] || [];
}

export function getItem(collection: string, slug: string): ContentItem | null {
  const items = getCollection(collection);
  return items.find((item) => item.slug === slug) || null;
}

export function getAllItems(): Record<CollectionName, ContentItem[]> {
  return {
    blogs: getCollection("blogs"),
    downloads: getCollection("downloads"),
    webapps: getCollection("webapps"),
    products: getCollection("products"),
  };
}