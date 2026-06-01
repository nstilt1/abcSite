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
import { Separator } from "@/components/ui/separator"
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
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Universal build – works on all platforms.</p>
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

  type PlatformKey = "windows" | "macos" | "linux"
  const platforms: { key: PlatformKey; label: string }[] = [
    { key: "windows", label: "Windows" },
    { key: "macos", label: "macOS" },
    { key: "linux", label: "Linux" },
  ]

  const available = platforms.filter(
    ({ key }) => !!(info as Record<string, unknown>)[`${key}DownloadLink`]
  )

  if (available.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Choose your platform:</p>
      {available.map(({ key, label }) => {
        const href = (info as Record<string, unknown>)[`${key}DownloadLink`] as string
        const sha256 = (info as Record<string, unknown>)[`${key}DownloadSha256`] as string | undefined
        return <PlatformButton key={key} label={label} href={href} sha256={sha256} />
      })}
    </div>
  )
}

function LicensedSection({ download }: { download: Download }) {
  // Shows license options if software_licensor is present.
  // Auth/cart logic lives outside this dialog; here we just show the purchase paths.
  const licensor = download.software_licensor
  if (!licensor) return null

  const licenseEntries = Object.entries(
    licensor.software_licensor_license_types ?? {}
  )

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">License Required</span>
          <Badge variant="secondary">Licensed Software</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          A license is required to activate this software. Choose a license type below.
        </p>
        {licenseEntries.length > 0 ? (
          <div className="space-y-2">
            {licenseEntries.map(([type, priceId]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <span className="font-medium text-sm">{type}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Cart add logic – dispatches a custom event the cart context can listen to.
                    window.dispatchEvent(
                      new CustomEvent("add-to-cart", {
                        detail: {
                          productId: licensor.software_licensor_product_id,
                          priceId,
                          licenseType: type,
                          name: download.name,
                          slug: download.slug,
                        },
                      })
                    )
                  }}
                >
                  Add to Cart
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No license types configured.</p>
        )}
      </div>
    </>
  )
}

export default function DownloadDialog({ download }: DownloadDialogProps) {
  const [open, setOpen] = useState(false)
  const isLicensed = !!download.software_licensor

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">{isLicensed ? "Download / Buy License" : "Download"}</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{download.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Version badge */}
          {download.version && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">v{download.version}</Badge>
              {download.dateAdded && (
                <span className="text-xs text-muted-foreground">{download.dateAdded}</span>
              )}
            </div>
          )}

          {/* Download section – Type A or Type B */}
          {isAllPlatforms(download.downloadInfo) ? (
            <AllPlatformsSection info={download.downloadInfo} />
          ) : (
            <PerPlatformSection info={download.downloadInfo} />
          )}

          {/* License purchase section (only for licensed software) */}
          <LicensedSection download={download} />
        </div>
      </DialogContent>
    </Dialog>
  )
}