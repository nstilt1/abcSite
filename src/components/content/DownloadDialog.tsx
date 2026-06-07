"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Download, DownloadInfo } from "@/types/content"
import { isAllPlatforms } from "@/types/content"

interface DownloadDialogProps {
  download: Download
}

function HashLine({ hash }: { hash?: string }) {
  if (!hash) return null
  return (
    <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">
      SHA-256: {hash}
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
        <a href={href} download>
          <Button size="sm">Download</Button>
        </a>
      </div>
      <HashLine hash={sha256} />
    </div>
  )
}

function AllPlatformsSection({ info }: { info: DownloadInfo }) {
  if (!isAllPlatforms(info)) return null
  if (!info.allPlatformsDownloadLink) return null
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Universal build – works on all platforms.
      </p>
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-sm">All Platforms</span>
          <a href={info.allPlatformsDownloadLink} download>
            <Button size="sm">Download</Button>
          </a>
        </div>
        <HashLine hash={info.allPlatformsDownloadSha256} />
      </div>
    </div>
  )
}

function PerPlatformSection({ info }: { info: DownloadInfo }) {
  if (isAllPlatforms(info)) return null

  const platforms: { key: "windows" | "macos" | "linux"; label: string }[] = [
    { key: "windows", label: "Windows" },
    { key: "macos", label: "macOS" },
    { key: "linux", label: "Linux" },
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
            sha256={sha256 && sha256.trim() !== "" ? sha256 : undefined}
          />
        )
      })}
    </div>
  )
}

/**
 * DownloadDialog – shows ONLY the download links (installer files).
 * The licensing / Add-to-Cart flow lives on the page itself.
 */
export default function DownloadDialog({ download }: DownloadDialogProps) {
  const [open, setOpen] = useState(false)

  const hasLinks = (() => {
    const info = download.downloadInfo
    if (isAllPlatforms(info)) return !!info.allPlatformsDownloadLink
    return !!(
      info.windowsDownloadLink ||
      info.macosDownloadLink ||
      info.linuxDownloadLink
    )
  })()

  if (!hasLinks) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          Download
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
              {download.dateAdded && (
                <span className="text-xs text-muted-foreground">
                  {download.dateAdded}
                </span>
              )}
            </div>
          )}

          {isAllPlatforms(download.downloadInfo) ? (
            <AllPlatformsSection info={download.downloadInfo} />
          ) : (
            <PerPlatformSection info={download.downloadInfo} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
