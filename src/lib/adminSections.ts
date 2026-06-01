import type { AdminSection, AdminSectionConfig } from "@/types/content"

export const ADMIN_SECTIONS: AdminSectionConfig[] = [
  {
    section: "downloads",
    label: "Downloads",
    description: "Software downloads with platform-specific or universal links.",
  },
  {
    section: "products",
    label: "Products",
    description: "Software, inventoried goods, and API-driven products.",
  },
  {
    section: "blogs",
    label: "Blogs",
    description: "Blog posts with rich text content.",
  },
  {
    section: "webapps",
    label: "Web Apps",
    description: "Hosted web applications.",
  },
]

export const VALID_SECTIONS = ADMIN_SECTIONS.map((s) => s.section) as AdminSection[]

export function isValidSection(s: string): s is AdminSection {
  return VALID_SECTIONS.includes(s as AdminSection)
}   