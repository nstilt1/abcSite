import { notFound } from "next/navigation"
import { getCollection, type ContentKey } from "@/lib/contentStore"
import { isValidSection, ADMIN_SECTIONS } from "@/lib/adminSections"
import AdminSectionClient from "@/components/admin/AdminSectionClient"
import type { AdminSection } from "@/types/content"
import type { Metadata } from "next"

// force-dynamic: serve this page at request time in both dev and prod.
// Without this, Next.js treats generateStaticParams as the only valid slugs
// and returns 404 for everything else (including in Turbopack dev mode).
export const dynamic = "force-dynamic"

interface Params {
  section: string
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  if (!isValidSection(params.section)) return {}
  const cfg = ADMIN_SECTIONS.find((s) => s.section === params.section)!
  return { title: `Admin – ${cfg.label}` }
}

export default async function AdminSectionPage({ params }: { params: Params }) {
  const { section } = await params;

  if (!isValidSection(section)) {
    console.log("section = " + section);
    notFound()
  }

  const cfg = ADMIN_SECTIONS.find((s) => s.section === section)!

  // JSON round-trip strips any non-serializable values before passing to the
  // client component boundary.
  const raw = getCollection(section as ContentKey)
  const items = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>[]

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