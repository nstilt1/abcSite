"use client"

import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/useCart"
import { useEffect } from "react"

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart()

  useEffect(() => {
    // Clear via the cart hook (updates React state + localStorage via the provider)
    clearCart()
    // Belt-and-suspenders: also wipe localStorage directly in case the provider
    // hasn't resolved the correct cartKey yet (async Cognito sub lookup race)
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("abc.cart."))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // localStorage may be unavailable in some environments — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <CheckCircle className="mx-auto mb-4 size-12 text-green-500" />
      <h1 className="text-2xl font-semibold">Payment successful!</h1>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Your license has been created. Head to your Licenses page to retrieve
        your license key.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/licenses">View My Licenses</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/downloads">Back to Downloads</Link>
        </Button>
      </div>
    </main>
  )
}