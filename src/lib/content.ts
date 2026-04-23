import productsJson from "@/content/products.json";
import projectsJson from "@/content/projects.json";
import servicesJson from "@/content/services.json";
import type { ContentItem } from "@/lib/content-types";

const products = productsJson as ContentItem[];
const projects = projectsJson as ContentItem[];
const services = servicesJson as ContentItem[];

export function getAllProducts(): ContentItem[] {
  return products;
}

export function getAllServices(): ContentItem[] {
  return services;
}

export function getAllProjects(): ContentItem[] {
  return projects;
}

export function findBySlug<T extends ContentItem>(items: T[], slug: string): T | null {
  return items.find((item) => item.slug === slug) || null;
}