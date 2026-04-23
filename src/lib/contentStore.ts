import productsJson from "@/content/products.json";
import projectsJson from "@/content/projects.json";
import servicesJson from "@/content/services.json";
import type { CollectionName, ContentItem } from "@/lib/content-types";

const services = servicesJson as ContentItem[];
const projects = projectsJson as ContentItem[];
const products = productsJson as ContentItem[];

export const COLLECTIONS: CollectionName[] = ["services", "projects", "products"];

const store: Record<CollectionName, ContentItem[]> = {
  services,
  projects,
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
    services: getCollection("services"),
    projects: getCollection("projects"),
    products: getCollection("products"),
  };
}