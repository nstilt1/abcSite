"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Download as DownloadItem, DownloadInfo } from "@/types/content"
import { isAllPlatforms, isWebExtension } from "@/types/content"
import { ExternalLink } from "lucide-react"

interface DownloadDialogProps {
  download: DownloadItem
}

/** Renders the SHA-256 hash in an accessible way. */
function HashLine({ hash }: { hash?: string }) {
  if (!hash) return null
  return (
    <p
      className="mt-1.5 font-mono text-[10px] text-muted-foreground break-all leading-relaxed"
      aria-label={`SHA-256 checksum: ${hash}`}
    >
      <span aria-hidden="true">SHA-256:&nbsp;</span>
      <code className="select-all">{hash}</code>
    </p>
  )
}

function PlatformButton({
  label,
  href,
  sha256,
}: {
  label: string
  href: string
  sha256?: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-sm">{label}</span>
        <a href={href} download aria-label={`Download for ${label}`}>
          <Button size="sm" className="gap-1.5">
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </Button>
        </a>
      </div>
      <HashLine hash={sha256} />
    </div>
  )
}

function AllPlatformsSection({ info }: { info: DownloadInfo }) {
  if (!isAllPlatforms(info)) return null
  if (!info.allPlatformsDownloadLink?.trim()) return null
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Universal build – works on all platforms.
      </p>
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-sm">All Platforms</span>
          <a
            href={info.allPlatformsDownloadLink}
            download
            aria-label="Download for all platforms"
          >
            <Button size="sm" className="gap-1.5">
              <Download className="size-3.5" aria-hidden="true" />
              Download
            </Button>
          </a>
        </div>
        <HashLine hash={info.allPlatformsDownloadSha256} />
      </div>
    </div>
  )
}

function PerPlatformSection({ info }: { info: DownloadInfo }) {
  // Don't skip if allPlatformsDownloadLink key exists but is empty — fall through to per-platform.
  if (isAllPlatforms(info) && info.allPlatformsDownloadLink?.trim()) return null

  const platforms: { key: "windows" | "macos" | "linux"; label: string }[] = [
    { key: "windows", label: "Windows" },
    { key: "macos",   label: "macOS"   },
    { key: "linux",   label: "Linux"   },
  ]

  const available = platforms.filter(({ key }) => {
    const link = (info as Record<string, unknown>)[`${key}DownloadLink`]
    return typeof link === "string" && link.trim() !== ""
  })

  if (available.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Choose your platform:</p>
      {available.map(({ key, label }) => {
        const href = (info as Record<string, unknown>)[`${key}DownloadLink`] as string
        const sha256 = (info as Record<string, unknown>)[`${key}DownloadSha256`] as
          | string
          | undefined
        return (
          <PlatformButton
            key={key}
            label={label}
            href={href}
            sha256={sha256?.trim() ? sha256 : undefined}
          />
        )
      })}
    </div>
  )
}

function WebExtensionSection({ info }: { info: DownloadInfo }) {
  if (!isWebExtension(info)) return null
  const links = info.webExtensionLinks.filter((l) => l.url?.trim())
  if (links.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Available as a browser extension:</p>
      {links.map((link, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-sm">{link.label}</span>
            <a href={link.url} target="_blank" rel="noreferrer" aria-label={`Get extension for ${link.label}`}>
              <Button size="sm" className="gap-1.5">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Get
              </Button>
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * DownloadDialog – triggered by a single "Download" button that opens a modal
 * showing per-platform download buttons (only those with a valid URL) and
 * their SHA-256 checksums in an accessible format.
 */
export default function DownloadDialog({ download }: DownloadDialogProps) {
  const [open, setOpen] = useState(false)

  // isAllPlatforms checks key existence only — a record can have
  // allPlatformsDownloadLink: "" alongside per-platform links, so check all.
  const hasLinks = (() => {
    const info = download.downloadInfo as Record<string, unknown>
    const webExtLinks = info.webExtensionLinks as { url?: string }[] | undefined
    return !!(
      (typeof info.allPlatformsDownloadLink === "string" && info.allPlatformsDownloadLink.trim()) ||
      (typeof info.windowsDownloadLink === "string" && info.windowsDownloadLink.trim()) ||
      (typeof info.macosDownloadLink === "string" && info.macosDownloadLink.trim()) ||
      (typeof info.linuxDownloadLink === "string" && info.linuxDownloadLink.trim()) ||
      (Array.isArray(webExtLinks) && webExtLinks.some((l) => l.url?.trim()))
    )
  })()

  if (!hasLinks) return null

  const isWebExt = isWebExtension(download.downloadInfo)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          {isWebExt ? (
            <ExternalLink className="size-4" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {isWebExt ? "Get Extension" : "Download"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{download.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {download.version && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">v{download.version}</Badge>
              {(download.releaseDate ?? download.dateAdded) && (
                <span className="text-xs text-muted-foreground">
                  Released {download.releaseDate ?? download.dateAdded}
                </span>
              )}
            </div>
          )}

          <AllPlatformsSection info={download.downloadInfo} />
          <PerPlatformSection info={download.downloadInfo} />
          <WebExtensionSection info={download.downloadInfo} />
        </div>
      </DialogContent>
    </Dialog>
  )
}