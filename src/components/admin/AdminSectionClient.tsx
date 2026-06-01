"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import AdminItemForm from "@/components/admin/AdminItemForm"
import type { AdminSection } from "@/types/content"

// ─── Local-storage persistence ────────────────────────────────────────────────

function lsKey(section: AdminSection) {
  return `admin_draft_${section}`
}

function loadDraft(section: AdminSection): Record<string, unknown>[] | null {
  try {
    const raw = localStorage.getItem(lsKey(section))
    return raw ? (JSON.parse(raw) as Record<string, unknown>[]) : null
  } catch {
    return null
  }
}

function saveDraft(section: AdminSection, items: Record<string, unknown>[]) {
  try {
    localStorage.setItem(lsKey(section), JSON.stringify(items))
  } catch {
    /* storage full – silent fail */
  }
}

function clearDraft(section: AdminSection) {
  try {
    localStorage.removeItem(lsKey(section))
  } catch { /* noop */ }
}

// ─── Column defs per section ──────────────────────────────────────────────────

type ColDef = {
  header: string
  cell: (item: Record<string, unknown>) => React.ReactNode
}

function getColumns(section: AdminSection): ColDef[] {
  const base: ColDef[] = [
    { header: "Slug", cell: (i) => <code className="text-xs">{i.slug as string}</code> },
    { header: "Name", cell: (i) => (i.name as string) ?? "—" },
    {
      header: "Description",
      cell: (i) => (
        <span className="line-clamp-1 max-w-[300px] text-muted-foreground text-xs">
          {(i.shortDescription as string) ?? ""}
        </span>
      ),
    },
  ]

  switch (section) {
    case "downloads":
      return [
        ...base,
        {
          header: "Version",
          cell: (i) => <span className="text-xs">{(i.version as string) ?? "—"}</span>,
        },
        {
          header: "Visible",
          cell: (i) => (
            <Badge variant={(i.visible as boolean) ? "default" : "secondary"}>
              {(i.visible as boolean) ? "Yes" : "No"}
            </Badge>
          ),
        },
        {
          header: "Licensor",
          cell: (i) => (
            <Badge variant={i.software_licensor ? "default" : "outline"}>
              {i.software_licensor ? "Licensed" : "Free"}
            </Badge>
          ),
        },
        {
          header: "Download Type",
          cell: (i) => {
            const info = i.downloadInfo as Record<string, unknown> | undefined
            return (
              <Badge variant="outline" className="text-xs">
                {info && "allPlatformsDownloadLink" in info ? "Universal" : "Per Platform"}
              </Badge>
            )
          },
        },
      ]

    case "products":
      return [
        ...base,
        {
          header: "Type",
          cell: (i) => <Badge variant="outline">{(i.type as string) ?? "—"}</Badge>,
        },
        {
          header: "Stock",
          cell: (i) => {
            if ((i.type as string) !== "inventoried") return <span className="text-muted-foreground text-xs">N/A</span>
            const stock = i.stock as number
            return (
              <Badge variant={stock > 0 ? "default" : "destructive"}>
                {stock > 0 ? stock : "Out of Stock"}
              </Badge>
            )
          },
        },
      ]

    case "blogs":
      return [
        ...base,
        { header: "Date", cell: (i) => <span className="text-xs">{(i.date as string) ?? "—"}</span> },
        {
          header: "Keywords",
          cell: (i) => (
            <span className="text-xs text-muted-foreground">
              {((i.keywords as string[]) ?? []).slice(0, 3).join(", ")}
              {((i.keywords as string[]) ?? []).length > 3 ? "…" : ""}
            </span>
          ),
        },
      ]

    case "webapps":
      return [
        ...base,
        {
          header: "URLs",
          cell: (i) => (
            <span className="text-xs text-muted-foreground">
              {((i.urls as string[]) ?? []).length} link(s)
            </span>
          ),
        },
      ]
  }
}

// ─── Main client component ────────────────────────────────────────────────────

interface AdminSectionClientProps {
  section: AdminSection
  serverItems: unknown[]
  sectionLabel: string
}

export default function AdminSectionClient({
  section,
  serverItems,
  sectionLabel,
}: AdminSectionClientProps) {
  // Items state – starts with server items, overridden by local draft if present
  const [items, setItems] = useState<Record<string, unknown>[]>(serverItems as Record<string, unknown>[])
  const [hasDraft, setHasDraft] = useState(false)
  const [q, setQ] = useState("")

  // Editing state
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null | "new">(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Deploy state
  const [deploying, setDeploying] = useState(false)
  const [deployMsg, setDeployMsg] = useState<string | null>(null)

  // Load draft from LS on mount
  useEffect(() => {
    const draft = loadDraft(section)
    if (draft) {
      setItems(draft)
      setHasDraft(true)
    }
  }, [section])

  // Persist whenever items change
  const persistItems = useCallback(
    (next: Record<string, unknown>[]) => {
      setItems(next)
      saveDraft(section, next)
      setHasDraft(true)
    },
    [section]
  )

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function handleSave(updated: Record<string, unknown>) {
    if (editingItem === "new") {
      persistItems([...items, updated])
    } else {
      persistItems(
        items.map((it) => (it.slug === updated.slug ? updated : it))
      )
    }
    setIsSheetOpen(false)
    setEditingItem(null)
  }

  function handleDelete(slug: string) {
    persistItems(items.filter((it) => it.slug !== slug))
    setIsSheetOpen(false)
    setEditingItem(null)
  }

  function openEdit(item: Record<string, unknown>) {
    setEditingItem(item)
    setIsSheetOpen(true)
  }

  function openNew() {
    setEditingItem("new")
    setIsSheetOpen(true)
  }

  // ── Deploy ─────────────────────────────────────────────────────────────────

  async function handleDeploy() {
    setDeploying(true)
    setDeployMsg(null)
    try {
      // POST modified JSON to S3 then trigger Amplify rebuild
      const res = await fetch("/api/admin/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, items }),
      })
      if (!res.ok) throw new Error(await res.text())
      clearDraft(section)
      setHasDraft(false)
      setDeployMsg("Deployed successfully. Amplify rebuild triggered.")
    } catch (e: unknown) {
      setDeployMsg(`Deploy failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDeploying(false)
    }
  }

  // ── Revert ─────────────────────────────────────────────────────────────────

  function handleRevert() {
    clearDraft(section)
    setItems(serverItems as Record<string, unknown>[])
    setHasDraft(false)
    setDeployMsg(null)
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = items.filter((it) => {
    if (!q.trim()) return true
    const lower = q.toLowerCase()
    return (
      ((it.slug as string) ?? "").toLowerCase().includes(lower) ||
      ((it.name as string) ?? "").toLowerCase().includes(lower) ||
      ((it.shortDescription as string) ?? "").toLowerCase().includes(lower)
    )
  })

  const columns = getColumns(section)

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{sectionLabel}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""}
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Unsaved draft
              </Badge>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={openNew}>+ New Item</Button>

          {hasDraft && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Revert</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revert to server data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All unsaved local changes to <strong>{sectionLabel}</strong> will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep editing</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevert}>Revert</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleDeploy} disabled={deploying}>
                {deploying ? "Deploying…" : "Deploy to S3"}
              </Button>
            </>
          )}
        </div>
      </div>

      {deployMsg && (
        <p
          className={`text-sm rounded-md px-3 py-2 ${
            deployMsg.startsWith("Deploy failed")
              ? "bg-destructive/10 text-destructive"
              : "bg-green-500/10 text-green-700 dark:text-green-400"
          }`}
        >
          {deployMsg}
        </p>
      )}

      <Separator />

      {/* ── Search ── */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search slug / name / description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} / {items.length}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center text-muted-foreground py-10"
                >
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, idx) => (
                <TableRow key={(item.slug as string) ?? idx} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <TableCell key={col.header}>{col.cell(item)}</TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit / Create Sheet ── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingItem === "new" ? `New ${sectionLabel} Item` : `Edit Item`}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 pb-10">
            {isSheetOpen && (
              <AdminItemForm
                section={section}
                item={editingItem === "new" ? null : (editingItem as Record<string, unknown>)}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={() => setIsSheetOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}