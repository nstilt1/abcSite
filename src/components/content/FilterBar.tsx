"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContentItem } from "@/lib/content-types"

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
}

interface FilterBarProps {
  itemsForOptions: ContentItem[]
}

export default function FilterBar({ itemsForOptions }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const q = searchParams.get("q") || ""
  const sort = searchParams.get("sort") || "newest"

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString())
    if (!value) sp.delete(key)
    else sp.set(key, value)
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false })
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Search</div>
          <Input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search slug/title/description"
          />
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Sort</div>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Search and sort through items.
        </div>
        <Button variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    </div>
  )
}
