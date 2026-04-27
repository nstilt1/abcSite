import { getAllProducts, getAllBlogs, getAllDownloads, getAllWebapps } from "@/lib/content";
import type { CollectionName, ContentRegistryEntry } from "@/lib/content-types";

export const CONTENT: Record<CollectionName, ContentRegistryEntry> = {
  products: {
    label: "Products",
    basePath: "/products",
    getAll: getAllProducts,
  },
  blogs: {
    label: "Blogs",
    basePath: "/blog",
    getAll: getAllBlogs,
  },
  downloads: {
    label: "Downloads",
    basePath: "/downloads",
    getAll: getAllDownloads,
  },
  webapps: {
    label: "Web Apps",
    basePath: "/webapps",
    getAll: getAllWebapps,
  }
};