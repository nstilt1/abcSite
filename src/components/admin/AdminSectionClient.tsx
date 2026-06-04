"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAuthSession } from "aws-amplify/auth"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  } catch { /* storage full */ }
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
            if ((i.type as string) !== "inventoried")
              return <span className="text-muted-foreground text-xs">N/A</span>
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
  const [items, setItems] = useState<Record<string, unknown>[]>(
    serverItems as Record<string, unknown>[]
  )
  const [hasDraft, setHasDraft] = useState(false)
  const [q, setQ] = useState("")

  // Inline creation panel (below table)
  const [creating, setCreating] = useState(false)

  // Edit dialog (existing items) — replaces the Sheet
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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

  const persistItems = useCallback(
    (next: Record<string, unknown>[]) => {
      setItems(next)
      saveDraft(section, next)
      setHasDraft(true)
    },
    [section]
  )

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function handleCreate(created: Record<string, unknown>) {
    persistItems([...items, created])
    setCreating(false)
  }

  function handleUpdate(updated: Record<string, unknown>) {
    persistItems(items.map((it) => (it.slug === updated.slug ? updated : it)))
    setIsDialogOpen(false)
    setEditingItem(null)
  }

  function handleDelete(slug: string) {
    persistItems(items.filter((it) => it.slug !== slug))
    setIsDialogOpen(false)
    setEditingItem(null)
  }

  function openEdit(item: Record<string, unknown>) {
    setEditingItem(item)
    setIsDialogOpen(true)
    setCreating(false) // close inline form if open
  }

  // ── Deploy ─────────────────────────────────────────────────────────────────

  async function handleDeploy() {
    setDeploying(true)
    setDeployMsg(null)
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (!token) throw new Error("Not signed in")

      const res = await fetch("/api/admin/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  function handleRevert() {
    clearDraft(section)
    setItems(serverItems as Record<string, unknown>[])
    setHasDraft(false)
    setDeployMsg(null)
    setCreating(false)
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
          <Button
            onClick={() => {
              setCreating((v) => !v)
              setIsDialogOpen(false)
              setEditingItem(null)
            }}
            variant={creating ? "secondary" : "default"}
          >
            {creating ? "Cancel New" : "+ New Item"}
          </Button>

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

      {/* ── Inline creation form ── */}
      {creating && (
        <div className="rounded-xl border bg-muted/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">New {sectionLabel} Item</h2>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              ✕
            </Button>
          </div>
          <Separator />
          <AdminItemForm
            section={section}
            item={null}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
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
                <TableRow
                  key={(item.slug as string) ?? idx}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => openEdit(item)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.header}>{col.cell(item)}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(item)
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit Dialog (full-screen on large viewports) ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingItem(null)
        }}
      >
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Item
              {editingItem?.slug ? (
                <code className="ml-2 text-sm font-normal text-muted-foreground">
                  {editingItem.slug as string}
                </code>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 pb-4">
            {isDialogOpen && editingItem && (
              <AdminItemForm
                section={section}
                item={editingItem}
                onSave={handleUpdate}
                onDelete={handleDelete}
                onCancel={() => setIsDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}