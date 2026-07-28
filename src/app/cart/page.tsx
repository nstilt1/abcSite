"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useCart, getCartItemKey } from "@/hooks/useCart"

function formatCents(cents: number): string {
  if (cents === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export default function CartPage() {
  const { items, cartTotalCents, removeItem, updateQuantity, clearCart } = useCart()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <ShoppingCart className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our software and add a license to get started.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/downloads">Browse Downloads</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={clearCart}
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const key = getCartItemKey(item)
          const isPhysical = item.kind === "physical" && item.physical

          return (
            <div
              key={key}
              className="flex items-start gap-4 rounded-xl border p-4"
            >
              {isPhysical && item.physical && (
                <img
                  src={item.physical.designImageUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-lg border object-cover"
                />
              )}

              <div className="flex-1 min-w-0">
                <Link
                  href={isPhysical ? `/shop/${item.slug}` : `/downloads/${item.slug}`}
                  className="font-medium text-sm hover:underline"
                >
                  {item.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {isPhysical && item.physical ? (
                    <>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.physical.mockupType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.physical.presetName}
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {item.licenseType}
                    </Badge>
                  )}
                </div>
                {isPhysical && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateQuantity(key, item.quantity - 1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateQuantity(key, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-semibold tabular-nums">
                  {formatCents(item.priceCents * item.quantity)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(key)}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Separator className="my-6" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCents(cartTotalCents)}
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => router.push("/checkout")}
          className="gap-2"
        >
          Checkout
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        You&rsquo;ll be asked to sign in before completing your purchase. Licenses
        are provisioned immediately after payment.
      </p>
    </main>
  )
}