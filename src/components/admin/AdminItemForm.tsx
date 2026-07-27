"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { AdminSection } from "@/types/content"
import type { JSONContent } from "@tiptap/react"
import dynamic from "next/dynamic"

// Dynamically imported to avoid SSR issues with Tiptap DOM dependencies
const TiptapEditor = dynamic(() => import("@/components/admin/TiptapEditor"), { ssr: false })
const TiptapPreview = dynamic(() => import("@/components/admin/TiptapPreview"), { ssr: false })

interface AdminItemFormProps {
  section: AdminSection
  /** The raw JSON item being edited (or null when creating new) */
  item: Record<string, unknown> | null
  onSave: (updated: Record<string, unknown>) => void
  onDelete?: (slug: string) => void
  onCancel: () => void
}

/** Simple key-value editor rows for fields we render explicitly */
function FieldRow({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <Label className="text-right text-sm font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
    </div>
  )
}

function BooleanRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <Label className="text-right text-sm font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            value ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-muted-foreground">{value ? "Yes" : "No"}</span>
      </div>
    </div>
  )
}

function TiptapField({
  value,
  onChange,
}: {
  value: unknown
  onChange: (v: unknown) => void
}) {
  const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] }
  const doc = (value && typeof value === "object" ? value : EMPTY_DOC) as JSONContent

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">Content</Label>
      <div className="grid grid-cols-2 gap-4 min-h-[300px]">
        <div className="rounded-md border bg-background overflow-auto">
          <div className="px-3 py-1.5 border-b text-xs font-medium text-muted-foreground bg-muted/40">
            Editor
          </div>
          <div className="p-2">
            <TiptapEditor value={doc} onChange={(d) => onChange(d)} />
          </div>
        </div>
        <div className="rounded-md border bg-background overflow-auto">
          <div className="px-3 py-1.5 border-b text-xs font-medium text-muted-foreground bg-muted/40">
            Preview
          </div>
          <div className="p-4">
            <TiptapPreview value={doc} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LicensePriceEntry (mirrors types/content.ts) ─────────────────────────────

interface LicensePriceEntry {
  priceId: string
  priceCents: number
}

type LicenseTypesValue = Record<string, LicensePriceEntry | string>

/** Coerce whatever shape is stored to a LicensePriceEntry */
function coerceEntry(raw: LicensePriceEntry | string): LicensePriceEntry {
  if (typeof raw === "string") return { priceId: raw, priceCents: 0 }
  return { priceId: raw.priceId ?? "", priceCents: raw.priceCents ?? 0 }
}

// Key-value editor for license type → { priceId, priceCents } pairs
// Also accepts the legacy string format and upgrades on first edit.
function LicenseTypesField({
  value,
  onChange,
}: {
  value: LicenseTypesValue
  onChange: (v: LicenseTypesValue) => void
}) {
  const entries = Object.entries(value)

  function setEntry(
    oldKey: string,
    newKey: string,
    newEntry: LicensePriceEntry
  ) {
    const updated: LicenseTypesValue = {}
    for (const [k, v] of Object.entries(value)) {
      updated[k === oldKey ? newKey : k] =
        k === oldKey ? newEntry : coerceEntry(v)
    }
    onChange(updated)
  }

  function addEntry() {
    onChange({ ...value, "": { priceId: "", priceCents: 0 } })
  }

  function removeEntry(key: string) {
    const updated = { ...value }
    delete updated[key]
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        License Types
      </Label>
      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No license types yet.</p>
        )}
        {entries.map(([key, rawVal], i) => {
          const entry = coerceEntry(rawVal)
          return (
            <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/10">
              {/* Label row */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Label (e.g. Perpetual)"
                  value={key}
                  onChange={(e) => setEntry(key, e.target.value, entry)}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(key)}
                >
                  ×
                </Button>
              </div>
              {/* Stripe price ID */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">
                  Stripe Price ID
                </Label>
                <Input
                  placeholder="price_xxx"
                  value={entry.priceId}
                  onChange={(e) =>
                    setEntry(key, key, { ...entry, priceId: e.target.value })
                  }
                  className="h-8 text-sm font-mono flex-1"
                />
              </div>
              {/* Dollar amount */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">
                  Price (USD)
                </Label>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={entry.priceCents > 0 ? (entry.priceCents / 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const dollars = parseFloat(e.target.value)
                      const cents = isNaN(dollars) ? 0 : Math.round(dollars * 100)
                      setEntry(key, key, { ...entry, priceCents: cents })
                    }}
                    className="h-8 text-sm pl-6"
                  />
                </div>
                {entry.priceCents === 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">Free</span>
                )}
              </div>
            </div>
          )
        })}
        <Button variant="outline" size="sm" onClick={addEntry}>
          + Add License Type
        </Button>
      </div>
    </div>
  )
}

// License mode selector
type LicenseMode = "free" | "optional" | "required"

function LicenseModeField({
  value,
  onChange,
}: {
  value: LicenseMode
  onChange: (v: LicenseMode) => void
}) {
  const options: { value: LicenseMode; label: string; description: string }[] = [
    {
      value: "free",
      label: "Free",
      description: "No license required. Download links shown freely.",
    },
    {
      value: "optional",
      label: "Optional",
      description:
        "Works without a license but with restrictions. License unlocks full features.",
    },
    {
      value: "required",
      label: "Required",
      description:
        "Must have a valid license to use. Download links (installer) still shown.",
    },
  ]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        License Mode
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border p-3 text-left text-xs transition-colors focus:outline-none ${
              value === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="font-semibold">{opt.label}</div>
            <div className="text-muted-foreground mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Per-section field schemas ────────────────────────────────────────────────

function DownloadFields({
  data,
  set,
}: {
  data: Record<string, unknown>
  set: (k: string, v: unknown) => void
}) {
  const info = (data.downloadInfo as Record<string, unknown>) ?? {}
  const isAllPlatformsType = "allPlatformsDownloadLink" in info
  const isWebExtensionType = "webExtensionLinks" in info
  const downloadType: "universal" | "per_platform" | "web_extension" = isAllPlatformsType
    ? "universal"
    : isWebExtensionType
    ? "web_extension"
    : "per_platform"
  const licensor = (data.software_licensor as Record<string, unknown> | null) ?? null
  const webExtLinks = (info.webExtensionLinks as { label: string; url: string }[]) ?? []

  return (
    <>
      <FieldRow label="Name" value={(data.name as string) ?? ""} onChange={(v) => set("name", v)} placeholder="My Software" />
      <FieldRow label="Slug" value={(data.slug as string) ?? ""} onChange={(v) => set("slug", v)} placeholder="my-software" />
      <FieldRow label="Short Description" value={(data.shortDescription as string) ?? ""} onChange={(v) => set("shortDescription", v)} />
      <FieldRow label="Version" value={(data.version as string) ?? ""} onChange={(v) => set("version", v)} placeholder="1.0.0" />
      <FieldRow label="Date Added" value={(data.dateAdded as string) ?? ""} onChange={(v) => set("dateAdded", v)} type="date" />
      <FieldRow label="Thumbnail URL" value={(data.thumbnailUrl as string) ?? ""} onChange={(v) => set("thumbnailUrl", v)} />
      <FieldRow label="Hero Image URL" value={(data.heroImageUrl as string) ?? ""} onChange={(v) => set("heroImageUrl", v)} />
      <FieldRow label="Source Code URL" value={(data.sourceCodeUrl as string) ?? ""} onChange={(v) => set("sourceCodeUrl", v)} />
      <BooleanRow label="Visible" value={(data.visible as boolean) ?? true} onChange={(v) => set("visible", v)} />

      <Separator />

      {/* Download type selector */}
      <div className="space-y-3">
        <span className="text-sm font-medium">Download Type</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "universal",     label: "Universal",      description: "One link for all platforms." },
              { value: "per_platform",  label: "Per Platform",   description: "Separate links for Windows / macOS / Linux." },
              { value: "web_extension", label: "Web Extension",  description: "Links to browser extension stores (Chrome, Edge, etc)." },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (opt.value === "universal") {
                  set("downloadInfo", { allPlatformsDownloadLink: "", allPlatformsDownloadSha256: "" })
                } else if (opt.value === "per_platform") {
                  set("downloadInfo", {})
                } else {
                  set("downloadInfo", { webExtensionLinks: [] })
                }
              }}
              className={`rounded-lg border p-3 text-left text-xs transition-colors focus:outline-none ${
                downloadType === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="text-muted-foreground mt-0.5">{opt.description}</div>
            </button>
          ))}
        </div>

        {downloadType === "universal" && (
          <div className="space-y-3 pl-4 border-l">
            <FieldRow
              label="Download Link"
              value={(info.allPlatformsDownloadLink as string) ?? ""}
              onChange={(v) => set("downloadInfo", { ...info, allPlatformsDownloadLink: v })}
              placeholder="https://..."
            />
            <FieldRow
              label="SHA-256"
              value={(info.allPlatformsDownloadSha256 as string) ?? ""}
              onChange={(v) => set("downloadInfo", { ...info, allPlatformsDownloadSha256: v })}
            />
          </div>
        )}

        {downloadType === "per_platform" && (
          <div className="space-y-3 pl-4 border-l">
            {(["windows", "macos", "linux"] as const).map((platform) => (
              <div key={platform} className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{platform}</p>
                <FieldRow
                  label="Download Link"
                  value={(info[`${platform}DownloadLink`] as string) ?? ""}
                  onChange={(v) => set("downloadInfo", { ...info, [`${platform}DownloadLink`]: v })}
                />
                <FieldRow
                  label="SHA-256"
                  value={(info[`${platform}DownloadSha256`] as string) ?? ""}
                  onChange={(v) => set("downloadInfo", { ...info, [`${platform}DownloadSha256`]: v })}
                />
              </div>
            ))}
          </div>
        )}

        {downloadType === "web_extension" && (
          <div className="space-y-2 pl-4 border-l">
            {webExtLinks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No store links yet.</p>
            )}
            {webExtLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Label (e.g. Google Chrome)"
                  value={link.label}
                  onChange={(e) => {
                    const updated = [...webExtLinks]
                    updated[i] = { ...updated[i], label: e.target.value }
                    set("downloadInfo", { ...info, webExtensionLinks: updated })
                  }}
                  className="h-9 w-48 shrink-0"
                />
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...webExtLinks]
                    updated[i] = { ...updated[i], url: e.target.value }
                    set("downloadInfo", { ...info, webExtensionLinks: updated })
                  }}
                  className="h-9 flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    set("downloadInfo", {
                      ...info,
                      webExtensionLinks: webExtLinks.filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                set("downloadInfo", { ...info, webExtensionLinks: [...webExtLinks, { label: "", url: "" }] })
              }
            >
              + Add Store Link
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Software licensor */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Software Licensor</span>
          <BooleanRow
            label="Enabled"
            value={licensor !== null}
            onChange={(v) => {
              set(
                "software_licensor",
                v
                  ? { software_licensor_product_id: "", software_licensor_license_types: {} }
                  : null
              )
            }}
          />
        </div>
        {licensor !== null && (
          <div className="space-y-4 pl-4 border-l">
            <FieldRow
              label="Product ID"
              value={(licensor.software_licensor_product_id as string) ?? ""}
              onChange={(v) =>
                set("software_licensor", { ...licensor, software_licensor_product_id: v })
              }
            />
            <LicenseModeField
              value={((licensor.license_mode as LicenseMode) ?? "free")}
              onChange={(v) =>
                set("software_licensor", { ...licensor, license_mode: v })
              }
            />
            <LicenseTypesField
              value={(licensor.software_licensor_license_types as LicenseTypesValue) ?? {}}
              onChange={(v) =>
                set("software_licensor", { ...licensor, software_licensor_license_types: v })
              }
            />
          </div>
        )}
      </div>

      <Separator />
      <TiptapField value={data.tiptap} onChange={(v) => set("tiptap", v)} />
    </>
  )
}

function ProductFields({
  data,
  set,
}: {
  data: Record<string, unknown>
  set: (k: string, v: unknown) => void
}) {
  const type = (data.type as string) ?? "inventoried"

  return (
    <>
      <div className="grid grid-cols-[180px_1fr] items-center gap-4">
        <Label className="text-right text-sm font-medium text-muted-foreground">Type</Label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="inventoried">Inventoried</option>
          <option value="api_driven">API Driven</option>
        </select>
      </div>
      <FieldRow label="Name" value={(data.name as string) ?? ""} onChange={(v) => set("name", v)} />
      <FieldRow label="Slug" value={(data.slug as string) ?? ""} onChange={(v) => set("slug", v)} />
      <FieldRow label="Short Description" value={(data.shortDescription as string) ?? ""} onChange={(v) => set("shortDescription", v)} />
      <FieldRow label="Thumbnail URL" value={(data.thumbnailUrl as string) ?? ""} onChange={(v) => set("thumbnailUrl", v)} />
      <FieldRow label="Hero Image URL" value={(data.heroImageUrl as string) ?? ""} onChange={(v) => set("heroImageUrl", v)} />

      {type === "inventoried" && (
        <FieldRow
          label="Stock"
          value={String(data.stock ?? 0)}
          onChange={(v) => set("stock", parseInt(v, 10) || 0)}
          type="number"
        />
      )}

      {type === "api_driven" && (
        <>
          <FieldRow label="Endpoint URL" value={(data.endpointURL as string) ?? ""} onChange={(v) => set("endpointURL", v)} />
          <FieldRow label="Source Image" value={(data.sourceImage as string) ?? ""} onChange={(v) => set("sourceImage", v)} />
        </>
      )}

      <Separator />
      <TiptapField value={data.tiptap} onChange={(v) => set("tiptap", v)} />
    </>
  )
}

function BlogFields({
  data,
  set,
}: {
  data: Record<string, unknown>
  set: (k: string, v: unknown) => void
}) {
  const keywords = (data.keywords as string[]) ?? []

  // Convert stored UTC ISO string → datetime-local value (local time)
  const storedDate = (data.date as string) ?? ""
  const localDatetimeValue = storedDate
    ? (() => {
        const d = new Date(storedDate)
        // Format as YYYY-MM-DDTHH:mm in local time for the datetime-local input
        const pad = (n: number) => String(n).padStart(2, "0")
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      })()
    : ""

  function handleDatetimeChange(localValue: string) {
    if (!localValue) { set("date", ""); return }
    // new Date(datetime-local string) interprets as local time → UTC ISO
    set("date", new Date(localValue).toISOString())
  }

  return (
    <>
      <FieldRow label="Name" value={(data.name as string) ?? ""} onChange={(v) => set("name", v)} />
      <FieldRow label="Slug" value={(data.slug as string) ?? ""} onChange={(v) => set("slug", v)} />
      <FieldRow label="Author" value={(data.author as string) ?? ""} onChange={(v) => set("author", v)} placeholder="Display name shown on the post" />
      <FieldRow label="Short Description" value={(data.shortDescription as string) ?? ""} onChange={(v) => set("shortDescription", v)} />

      {/* Published datetime with "Set to now" button */}
      <div className="grid grid-cols-[180px_1fr] items-center gap-4">
        <Label className="text-right text-sm font-medium text-muted-foreground">Published At</Label>
        <div className="flex items-center gap-2">
          <Input
            type="datetime-local"
            value={localDatetimeValue}
            onChange={(e) => handleDatetimeChange(e.target.value)}
            className="h-9 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("date", new Date().toISOString())}
            className="shrink-0 whitespace-nowrap"
          >
            Set to now
          </Button>
        </div>
      </div>

      <FieldRow label="Thumbnail URL" value={(data.thumbnailUrl as string) ?? ""} onChange={(v) => set("thumbnailUrl", v)} />
      <FieldRow label="Hero Image URL" value={(data.heroImageUrl as string) ?? ""} onChange={(v) => set("heroImageUrl", v)} />

      <div className="grid grid-cols-[180px_1fr] items-start gap-4">
        <Label className="text-right pt-2 text-sm font-medium text-muted-foreground">Keywords</Label>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {keywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => {
                const updated = keywords.filter((_, j) => j !== i)
                set("keywords", updated)
              }}>
                {kw} ×
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Add keyword and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) {
                  set("keywords", [...keywords, val]);
                  (e.target as HTMLInputElement).value = ""
                }
              }
            }}
          />
        </div>
      </div>
      <Separator />
      <TiptapField value={data.tiptap} onChange={(v) => set("tiptap", v)} />
    </>
  )
}

function WebAppFields({
  data,
  set,
}: {
  data: Record<string, unknown>
  set: (k: string, v: unknown) => void
}) {
  const urls = (data.urls as string[]) ?? []

  return (
    <>
      <FieldRow label="Name" value={(data.name as string) ?? ""} onChange={(v) => set("name", v)} />
      <FieldRow label="Slug" value={(data.slug as string) ?? ""} onChange={(v) => set("slug", v)} />
      <FieldRow label="Short Description" value={(data.shortDescription as string) ?? ""} onChange={(v) => set("shortDescription", v)} />
      <FieldRow label="Thumbnail URL" value={(data.thumbnailUrl as string) ?? ""} onChange={(v) => set("thumbnailUrl", v)} />
      <FieldRow label="Hero Image URL" value={(data.heroImageUrl as string) ?? ""} onChange={(v) => set("heroImageUrl", v)} />
      <FieldRow label="Source Code Link" value={(data.sourceCodeLink as string) ?? ""} onChange={(v) => set("sourceCodeLink", v)} />

      <div className="grid grid-cols-[180px_1fr] items-start gap-4">
        <Label className="text-right pt-2 text-sm font-medium text-muted-foreground">URLs</Label>
        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  const updated = [...urls]
                  updated[i] = e.target.value
                  set("urls", updated)
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => set("urls", urls.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("urls", [...urls, ""])}>
            + Add URL
          </Button>
        </div>
      </div>

      <Separator />
      <TiptapField value={data.tiptap} onChange={(v) => set("tiptap", v)} />
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminItemForm({
  section,
  item,
  onSave,
  onDelete,
  onCancel,
}: AdminItemFormProps) {
  const isNew = item === null
  const [data, setData] = useState<Record<string, unknown>>(
    item ?? getDefaultItem(section)
  )

  const set = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  function renderFields() {
    switch (section) {
      case "downloads":
        return <DownloadFields data={data} set={set} />
      case "products":
        return <ProductFields data={data} set={set} />
      case "blogs":
        return <BlogFields data={data} set={set} />
      case "webapps":
        return <WebAppFields data={data} set={set} />
    }
  }

  return (
    <div className="space-y-5">
      {renderFields()}

      <Separator />

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Button onClick={() => onSave(data)}>
            {isNew ? "Create" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        {!isNew && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove <strong>{(data.slug as string) ?? (data.name as string)}</strong> from
                  the {section} list. This action is saved to Local Storage until you deploy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(data.slug as string)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

// ─── Default empty items per section ─────────────────────────────────────────

function getDefaultItem(section: AdminSection): Record<string, unknown> {
  switch (section) {
    case "downloads":
      return {
        name: "",
        slug: "",
        tiptap: null,
        thumbnailUrl: "",
        heroImageUrl: "",
        shortDescription: "",
        dateAdded: "",
        version: "",
        visible: true,
        sourceCodeUrl: "",
        downloadInfo: { allPlatformsDownloadLink: "", allPlatformsDownloadSha256: "" },
        software_licensor: null,
      }
    case "products":
      return {
        type: "inventoried",
        name: "",
        slug: "",
        tiptap: null,
        thumbnailUrl: "",
        heroImageUrl: "",
        shortDescription: "",
        stock: 0,
      }
    case "blogs":
      return {
        name: "",
        slug: "",
        tiptap: null,
        thumbnailUrl: "",
        heroImageUrl: "",
        shortDescription: "",
        author: "",
        keywords: [],
        date: "",
      }
    case "webapps":
      return {
        name: "",
        slug: "",
        tiptap: null,
        thumbnailUrl: "",
        heroImageUrl: "",
        shortDescription: "",
        urls: [],
        sourceCodeLink: "",
      }
  }
}