import { notFound } from "next/navigation"
import { isValidSection, ADMIN_SECTIONS } from "@/lib/adminSections"
import AdminSectionClient from "@/components/admin/AdminSectionClient"
import type { AdminSection } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

type ContentFileName =
  | "downloads.json"
  | "blogs.json"
  | "products.json"
  | "webapps.json"

const CONTENT_FILE_BY_SECTION: Record<AdminSection, ContentFileName> = {
  downloads: "downloads.json",
  blogs: "blogs.json",
  products: "products.json",
  webapps: "webapps.json",
}

function getCdnContentUrl(section: AdminSection): string {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.trim()

  if (!cdnUrl) {
    throw new Error("Missing NEXT_PUBLIC_CDN_URL environment variable")
  }

  const baseUrl = cdnUrl.replace(/\/+$/, "")
  const filename = CONTENT_FILE_BY_SECTION[section]
  const url = new URL(`${baseUrl}/content/${filename}`)

  url.searchParams.set("t", Date.now().toString())

  return url.toString()
}

async function fetchAdminSectionItems(section: AdminSection): Promise<Record<string, unknown>[]> {
  const url = getCdnContentUrl(section)
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${CONTENT_FILE_BY_SECTION[section]}: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as Record<string, unknown>[]
}

// Typing params as Promise<...> is the correct Next.js 15+ signature for async
// server components — it eliminates the "'await' has no effect" TS warning while
// keeping the await that's needed at runtime with Turbopack.
interface Params {
  params: Promise<{ section: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params
  if (!isValidSection(section)) return {}
  const cfg = ADMIN_SECTIONS.find((s) => s.section === section)!
  return { title: `Admin – ${cfg.label}` }
}

export default async function AdminSectionPage({ params }: Params) {
  const { section } = await params

  if (!isValidSection(section)) notFound()

  const cfg = ADMIN_SECTIONS.find((s) => s.section === section)!
  const items = await fetchAdminSectionItems(section)

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <AdminSectionClient
        section={section}
        serverItems={items}
        sectionLabel={cfg.label}
      />
    </main>
  )
}
