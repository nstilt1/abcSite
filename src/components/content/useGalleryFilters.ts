"use client"

import { useSearchParams } from "next/navigation"

export function useGalleryFilters() {
  const sp = useSearchParams()
  return {
    q: sp.get("q") || "",
    sort: sp.get("sort") || "newest",
  }
}
