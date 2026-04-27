import downloadsJson from "@/content/downloads.json";
import webappsJson from "@/content/webapps.json";
import blogsJson from "@/content/blogs.json";
import productsJson from "@/content/products.json";
import type { ContentItem } from "@/lib/content-types";

const products = productsJson as ContentItem[];
const downloads = downloadsJson as ContentItem[];
const webapps = webappsJson as ContentItem[];
const blogs = blogsJson as ContentItem[];

export function getAllProducts(): ContentItem[] {
  return products;
}

export function getAllDownloads(): ContentItem[] {
  return downloads;
}

export function getAllWebapps(): ContentItem[] {
  return webapps;
}

export function getAllBlogs(): ContentItem[] {
  return blogs;
}

export function findBySlug<T extends ContentItem>(items: T[], slug: string): T | null {
  return items.find((item) => item.slug === slug) || null;
}