import { notFound } from "next/navigation"
import { getCollection, type ContentKey } from "@/lib/contentStore"
import { isValidSection, ADMIN_SECTIONS } from "@/lib/adminSections"
import AdminSectionClient from "@/components/admin/AdminSectionClient"
import type { AdminSection } from "@/types/content"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

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

  const raw = getCollection(section as ContentKey)
  const items = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>[]

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <AdminSectionClient
        section={section as AdminSection}
        serverItems={items}
        sectionLabel={cfg.label}
      />
    </main>
  )
}