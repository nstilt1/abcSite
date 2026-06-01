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

// Key-value editor for license type → Stripe price ID pairs
function LicenseTypesField({
  value,
  onChange,
}: {
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const entries = Object.entries(value)

  function setEntry(oldKey: string, newKey: string, newVal: string) {
    const updated: Record<string, string> = {}
    for (const [k, v] of Object.entries(value)) {
      updated[k === oldKey ? newKey : k] = k === oldKey ? newVal : v
    }
    onChange(updated)
  }

  function addEntry() {
    onChange({ ...value, "": "" })
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
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No license types yet.</p>
        )}
        {entries.map(([key, val], i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Label (e.g. Perpetual)"
              value={key}
              onChange={(e) => setEntry(key, e.target.value, val)}
              className="h-8 text-sm"
            />
            <span className="text-muted-foreground text-xs shrink-0">→</span>
            <Input
              placeholder="Stripe price ID"
              value={val}
              onChange={(e) => setEntry(key, key, e.target.value)}
              className="h-8 text-sm font-mono"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => removeEntry(key)}
            >
              ×
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addEntry}>
          + Add License Type
        </Button>
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
  const isAllPlatforms = "allPlatformsDownloadLink" in info
  const licensor = (data.software_licensor as Record<string, unknown> | null) ?? null

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

      {/* Download type toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Download Type</span>
          <Badge variant="outline">{isAllPlatforms ? "Universal (All Platforms)" : "Per Platform"}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isAllPlatforms) {
                set("downloadInfo", {})
              } else {
                set("downloadInfo", {
                  allPlatformsDownloadLink: "",
                  allPlatformsDownloadSha256: "",
                })
              }
            }}
          >
            Switch to {isAllPlatforms ? "Per-Platform" : "Universal"}
          </Button>
        </div>

        {isAllPlatforms ? (
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
        ) : (
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
          <div className="space-y-3 pl-4 border-l">
            <FieldRow
              label="Product ID"
              value={(licensor.software_licensor_product_id as string) ?? ""}
              onChange={(v) =>
                set("software_licensor", { ...licensor, software_licensor_product_id: v })
              }
            />
            <LicenseTypesField
              value={(licensor.software_licensor_license_types as Record<string, string>) ?? {}}
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

  return (
    <>
      <FieldRow label="Name" value={(data.name as string) ?? ""} onChange={(v) => set("name", v)} />
      <FieldRow label="Slug" value={(data.slug as string) ?? ""} onChange={(v) => set("slug", v)} />
      <FieldRow label="Short Description" value={(data.shortDescription as string) ?? ""} onChange={(v) => set("shortDescription", v)} />
      <FieldRow label="Date" value={(data.date as string) ?? ""} onChange={(v) => set("date", v)} type="date" />
      <FieldRow label="Thumbnail URL" value={(data.thumbnailUrl as string) ?? ""} onChange={(v) => set("thumbnailUrl", v)} />
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
        shortDescription: "",
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