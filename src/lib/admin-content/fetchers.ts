// src/lib/admin-content/fetchers.ts
import { sectionConfig } from "./config";
import type { AdminSectionKey } from "./types";

function getSectionUrl(section: AdminSectionKey): string {
  switch (section) {
    case "downloads":
      return process.env.URL_DOWNLOADS ?? process.env.NEXT_PUBLIC_CDN_URL + "/content/downloads.json";
    case "blogs":
      return process.env.URL_BLOGS ?? process.env.NEXT_PUBLIC_CDN_URL + "/content/blogs.json";;
    case "products":
      return process.env.URL_PRODUCTS ?? process.env.NEXT_PUBLIC_CDN_URL + "/content/products.json";;
    case "web-apps":
      return process.env.URL_WEB_APPS ?? process.env.NEXT_PUBLIC_CDN_URL + "/content/webapps.json";;
  }
}

export async function fetchSectionItems<T>(section: AdminSectionKey): Promise<T[]> {
  const url = getSectionUrl(section);

  if (!url) {
    throw new Error(`Missing environment URL for section "${section}"`);
  }

  const queryURL = `${url}?t=${Date.now()}`;
  const res = await fetch(queryURL, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${sectionConfig[section].fileName}: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T[];
}

export function getUpdateUrl(): string {
    return process.env.UPDATE_FN_URL ?? "";
}

export function getRebuildUrl(): string {
    return process.env.REBUILD_URL ?? "";
}