import type { Download, Product, WebApp, Blog } from "@/types/content"

export type ContentKey = "downloads" | "products" | "blogs" | "webapps"

// Read JSON content files. Uses require() so the read happens at call time
// (not at module parse time), which avoids Turbopack's Performance.measure
// instrumentation running before the Node.js performance timeline is ready.
function readJson<T>(filename: string): T[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../content/${filename}`) as T[]
  } catch {
    return []
  }
}

let _store: Record<ContentKey, unknown[]> | null = null

function getStore(): Record<ContentKey, unknown[]> {
  if (_store) return _store
  _store = {
    downloads: readJson<Download>("downloads.json"),
    products:  readJson<Product>("products.json"),
    blogs:     readJson<Blog>("blogs.json"),
    webapps:   readJson<WebApp>("webapps.json"),
  }
  return _store
}

export function getCollection(key: ContentKey): unknown[] {
  return getStore()[key] ?? []
}

export function getItem(key: ContentKey, slug: string): unknown | null {
  const items = getStore()[key] as Array<{ slug: string }>
  return items.find((x) => x.slug === slug) ?? null
}

export function getSoftwareDownloads(): Download[] {
  return (getStore().downloads as Download[]).filter(
    (d) => d.software_licensor != null
  )
}