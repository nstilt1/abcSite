"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Lock, Unlock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Download } from "@/types/content"
import { parseLicenseEntry } from "@/types/content"
import { useCart } from "@/hooks/useCart"
import { toast } from "sonner"

interface LicenseSectionProps {
  download: Download
  /** "page" (default) renders with top separator and margin, for use at the bottom of a page.
   *  "inline" strips those so the component can sit inside a card or grid cell. */
  variant?: "page" | "inline"
}

function formatCents(cents: number): string {
  if (cents === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export default function LicenseSection({ download, variant = "page" }: LicenseSectionProps) {
  const { addItem, items } = useCart()
  const router = useRouter()
  const licensor = download.software_licensor
  if (!licensor) return null

  const licenseMode = licensor.license_mode ?? "free"
  const entries = Object.entries(licensor.software_licensor_license_types ?? {})

  const [selectedType, setSelectedType] = useState<string | null>(
    entries.length > 0 ? entries[0][0] : null
  )

  const alreadyInCart = (priceId: string) =>
    items.some((i) => i.productId === licensor.software_licensor_product_id && i.priceId === priceId)

  function handleAddToCart(licenseLabel: string, rawEntry: (typeof entries)[0][1]) {
    const entry = parseLicenseEntry(rawEntry)
    if (alreadyInCart(entry.priceId)) {
      toast.info("Already in cart", {
        description: `${download.name} — ${licenseLabel} is already in your cart.`,
      })
      return
    }

    addItem({
      productId: licensor!.software_licensor_product_id,
      slug: download.slug,
      name: `${download.name} — ${licenseLabel}`,
      priceId: entry.priceId,
      priceCents: entry.priceCents,
      quantity: 1,
      licenseType: licenseLabel,
    })

    toast.success("Added to cart", {
      description: `${download.name} — ${licenseLabel}`,
      action: {
        label: "View cart",
        onClick: () => router.push("/cart"),
      },
    })
  }

  const modeIcon = licenseMode === "required"
    ? <Lock className="size-4 text-destructive" />
    : <Unlock className="size-4 text-muted-foreground" />

  const modeLabel =
    licenseMode === "required"
      ? "A license is required to use this software."
      : licenseMode === "optional"
      ? "Free to use with restrictions. A license unlocks all features."
      : "A license is available for additional features or commercial use."

  const modeBadge =
    licenseMode === "required" ? (
      <Badge variant="destructive">License Required</Badge>
    ) : licenseMode === "optional" ? (
      <Badge variant="secondary">Free with Restrictions</Badge>
    ) : (
      <Badge variant="outline">Optional License</Badge>
    )

  return (
    <section className={variant === "page" ? "mt-10" : undefined}>
      {variant === "page" && <Separator className="mb-8" />}

      <div className="space-y-6">
        {/* Section heading */}
        <div className="flex items-center gap-3">
          {modeIcon}
          <h2 className="text-xl font-semibold">Licensing</h2>
          {modeBadge}
        </div>

        <p className="text-sm text-muted-foreground">{modeLabel}</p>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No license types have been configured yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map(([label, rawEntry]) => {
              const entry = parseLicenseEntry(rawEntry)
              const inCart = alreadyInCart(entry.priceId)
              const isSelected = selectedType === label

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedType(label)}
                  className={`rounded-xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="mt-1 text-lg font-bold tabular-nums">
                        {formatCents(entry.priceCents)}
                      </div>
                    </div>
                    {inCart && (
                      <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                    )}
                  </div>
                  {entry.priceId && (
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground truncate">
                      {entry.priceId}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Add to cart CTA */}
        {selectedType && entries.length > 0 && (() => {
          const rawEntry = licensor.software_licensor_license_types[selectedType]
          const entry = parseLicenseEntry(rawEntry)
          const inCart = alreadyInCart(entry.priceId)

          return (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                disabled={inCart}
                onClick={() => handleAddToCart(selectedType, rawEntry)}
              >
                <ShoppingCart className="mr-2 size-4" />
                {inCart ? "In Cart" : `Add ${selectedType} License to Cart`}
              </Button>

              {inCart && (
                <Button variant="outline" size="lg" onClick={() => router.push("/cart")}>
                  View Cart
                </Button>
              )}

              {entry.priceCents > 0 && (
                <span className="text-sm text-muted-foreground">
                  {formatCents(entry.priceCents)}
                </span>
              )}
            </div>
          )
        })()}
      </div>
    </section>
  )
}