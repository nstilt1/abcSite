import { getAllProducts, getAllProjects, getAllServices } from "@/lib/content";
import type { CollectionName, ContentRegistryEntry } from "@/lib/content-types";

export const CONTENT: Record<CollectionName, ContentRegistryEntry> = {
  products: {
    label: "Products",
    basePath: "/portfolio/products",
    getAll: getAllProducts,
  },
  services: {
    label: "Services",
    basePath: "/portfolio/services",
    getAll: getAllServices,
  },
  projects: {
    label: "Projects",
    basePath: "/portfolio/projects",
    getAll: getAllProjects,
  },
};