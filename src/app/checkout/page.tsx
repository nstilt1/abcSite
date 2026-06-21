"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle, Loader2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCart, type CartItem } from "@/hooks/useCart"
import { dispatchSoftwareLicensor } from "@/lib/softwareLicensor/client"
import type { LicenseResponse, CreateLicenseRequestJson } from "@/lib/softwareLicensor/types"
import { RequireAuth } from "@/components/RequireAuth"
import { fetchAuthSession } from "aws-amplify/auth"
import { useAuthState } from "@/hooks/useAuthState"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  if (cents === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

// ── Validation ────────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: CartItem[]
  alreadyOwned: CartItem[]
  error: string | null
}

async function validateCart(items: CartItem[]): Promise<ValidationResult> {
  // Only need to check existing licenses when there are trial items in the cart
  const trialItems = items.filter((i) => i.licenseType.toLowerCase() === "trial")
  if (trialItems.length === 0) {
    return { valid: items, alreadyOwned: [], error: null }
  }

  let license: LicenseResponse | null = null
  try {
    license = await dispatchSoftwareLicensor<LicenseResponse>({ action: "GetLicense" })
  } catch {
    // 404 = user has no license yet, or network error — proceed either way
    return { valid: items, alreadyOwned: [], error: null }
  }

  if (!license) return { valid: items, alreadyOwned: [], error: null }

  const owned = new Set(Object.keys(license.licensed_products))
  const alreadyOwned: CartItem[] = []
  const valid: CartItem[] = []

  for (const item of items) {
    if (item.licenseType.toLowerCase() === "trial" && owned.has(item.productId)) {
      alreadyOwned.push(item)
    } else {
      valid.push(item)
    }
  }

  return { valid, alreadyOwned, error: null }
}

// ── Inner checkout component ──────────────────────────────────────────────────

function InnerCheckoutPage() {
  const { items, clearCart } = useCart()
  const router = useRouter()

  const [validating, setValidating] = useState(true)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { account } = useAuthState()

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart")
      return
    }
    validateCart(items).then((result) => {
      setValidation(result)
      setValidating(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCheckout() {
    if (!validation || validation.valid.length === 0) return
    setSubmitting(true)
    setSubmitError(null)

    const validItems = validation.valid
    const totalCents = validItems.reduce((s, i) => s + i.priceCents, 0)
    const hasPriceIds = validItems.some((i) => i.priceId?.trim())

    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (!token) throw new Error("Not signed in")

      // ── Free items: call CreateLicense directly, no Stripe needed ────────
      if (totalCents === 0 || !hasPriceIds) {
        const licenseRequests: CreateLicenseRequestJson[] = validItems.map((item) => ({
          product_id: item.productId,
          license_type: item.licenseType.toLowerCase() as "perpetual" | "trial" | "subscription",
          quantity: 1,
        }))

        await dispatchSoftwareLicensor({
          action: "CreateLicense",
          data: {
            customer_first_name: "",
            customer_last_name: "",
            customer_email: account?.email ?? "",
            order_id: `free_${Date.now()}`,
            custom_success_message: "Thank you!",
            license_requests: licenseRequests,
          },
        })

        clearCart()
        router.push("/checkout/success")
        return
      }

      // ── Paid items: go through Stripe, webhook handles CreateLicense ─────
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: validItems,
          customerEmail: account?.email ?? "",
        }),
      })

      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(error ?? `Server error ${res.status}`)
      }

      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Checkout failed")
      setSubmitting(false)
    }
  }

  if (validating) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Validating your cart…</p>
      </main>
    )
  }

  const { valid, alreadyOwned } = validation!
  const validTotal = valid.reduce((s, i) => s + i.priceCents, 0)

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold mb-8">Checkout</h1>

      {alreadyOwned.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertTitle>Some items were removed</AlertTitle>
          <AlertDescription className="space-y-1 mt-1">
            <p>
              You already have a trial license for the following product
              {alreadyOwned.length > 1 ? "s" : ""}:
            </p>
            <ul className="list-disc pl-4 text-sm">
              {alreadyOwned.map((item) => (
                <li key={item.productId}>{item.name}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {valid.length === 0 ? (
        <div className="text-center py-10">
          <ShoppingCart className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-muted-foreground">No items left to purchase.</p>
          <Button className="mt-4" asChild>
            <Link href="/cart">Back to Cart</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border divide-y">
            {valid.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between px-4 py-3 gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-xs">
                    {item.licenseType}
                  </Badge>
                </div>
                <span className="font-semibold tabular-nums shrink-0">
                  {formatCents(item.priceCents)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold tabular-nums">{formatCents(validTotal)}</p>
          </div>

          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" /> {validTotal === 0 ? "Processing…" : "Redirecting to Stripe…"}</>
              ) : validTotal === 0 ? (
                <><CheckCircle className="size-4" /> Get License</>
              ) : (
                <><CheckCircle className="size-4" /> Pay with Stripe</>
              )}
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/cart">Back to Cart</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {validTotal === 0
              ? "No payment required. Your license will be created immediately."
              : "You will be redirected to Stripe to complete payment. Licenses are provisioned automatically once payment succeeds. If license creation fails, a full refund is issued automatically."}
          </p>
        </>
      )}
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <InnerCheckoutPage />
    </RequireAuth>
  )
}