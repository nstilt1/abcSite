// src/app/api/checkout/webhook/route.ts
//
// Receives Stripe webhook events.  On `checkout.session.completed`:
//   1. Calls abc_software_licensor_dispatcher → CreateLicense
//   2. If CreateLicense fails for a non-free item, issues a Stripe refund
//      for that line item and records the issue.
//
// Required env vars:
//   STRIPE_SECRET_KEY          – sk_live_… / sk_test_…
//   STRIPE_WEBHOOK_SECRET      – whsec_… (from Stripe dashboard)
//   SOFTWARE_LICENSOR_DISPATCH_API  – URL of the licensor lambda (same as admin dispatch)
//   NEXT_PUBLIC_SITE_URL       – used for logging only

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LicenseRequestMeta {
  productId: string
  priceId: string          // ← add this line
  licenseType: string
  name: string
  slug: string
}

interface CreateLicenseRequestJson {
  product_id: string
  license_type: "perpetual" | "trial" | "subscription"
  quantity: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(key)
}

async function getLineItemAmounts(
  stripe: Stripe,
  sessionId: string
): Promise<Map<string, number>> {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    expand: ["data.price"],
  })
  const map = new Map<string, number>()
  for (const li of lineItems.data) {
    if (li.price?.id) {
      map.set(li.price.id, li.amount_total ?? 0)
    }
  }
  return map
}

async function dispatchCreateLicense(params: {
  userSub: string
  orderId: string
  customerEmail: string
  licenseRequests: CreateLicenseRequestJson[]
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.SOFTWARE_LICENSOR_DISPATCH_API
  if (!url) return { ok: false, error: "SOFTWARE_LICENSOR_DISPATCH_API not set" }

  // The licensor dispatcher requires a bearer token.  From the webhook context
  // we don't have a Cognito session, so we call the internal Next.js proxy
  // which forwards to the Lambda.  We use a service-level token derived from
  // an env var set in Amplify.
  const serviceToken = process.env.LICENSOR_SERVICE_TOKEN ?? ""

  const body = {
    action: "CreateLicense",
    data: {
      customer_first_name: "",
      customer_last_name: "",
      customerEmail: params.customerEmail ?? "",
      order_id: params.orderId,
      custom_success_message: "Thank you for your purchase!",
      license_requests: params.licenseRequests,
    },
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify(body),
    // Webhooks have a 30s budget; give the licensor 20s
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: `Licensor ${res.status}: ${text}` }
  }

  return { ok: true }
}

// Pull the Stripe payment intent from the session and refund specific line
// item amounts for failed license provisioning.
async function refundItems(
  stripe: Stripe,
  paymentIntentId: string,
  amountCents: number,
  reason: string
): Promise<void> {
  if (amountCents <= 0) return

  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
    metadata: { internal_reason: reason.slice(0, 500) },
  })
}

// ── Webhook raw body ──────────────────────────────────────────────────────────

// Next.js App Router: we must read the raw body to verify the Stripe signature.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  // Read raw body for signature verification
  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature mismatch"
    console.error("[webhook] Signature verification failed:", msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // ── Handle checkout.session.completed ─────────────────────────────────────

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    const userSub = session.metadata?.user_sub
    const licenseRequestsRaw = session.metadata?.license_requests
    const customerEmail = session.customer_email ?? ""
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? ""

    if (!userSub || !licenseRequestsRaw) {
      console.warn("[webhook] Missing metadata on session", session.id)
      return NextResponse.json({ received: true })
    }

    let licenseRequestsMeta: LicenseRequestMeta[]
    try {
      licenseRequestsMeta = JSON.parse(licenseRequestsRaw) as LicenseRequestMeta[]
    } catch {
      console.error("[webhook] Could not parse license_requests metadata")
      return NextResponse.json({ received: true })
    }

    // Get the Stripe price→amount map for potential refunds
    const priceAmounts = await getLineItemAmounts(stripe, session.id).catch(() => new Map<string, number>())

    // Build CreateLicense requests.  Only include valid license_type values.
    const validTypes = new Set(["perpetual", "trial", "subscription"])
    const licenseRequests: CreateLicenseRequestJson[] = licenseRequestsMeta
      .map((m) => ({
        product_id: m.productId,
        license_type: (validTypes.has(m.licenseType) ? m.licenseType : "perpetual") as
          | "perpetual"
          | "trial"
          | "subscription",
        quantity: 1,
      }))

    // Call the licensor
    const result = await dispatchCreateLicense({
      userSub,
      orderId: session.id,
      customerEmail,
      licenseRequests,
    })

    if (!result.ok) {
      console.error("[webhook] CreateLicense failed for session", session.id, result.error)

      if (paymentIntentId) {
        const amountToRefund = licenseRequestsMeta.reduce((sum, meta) => {
          const itemAmount = priceAmounts.get(meta.priceId) ?? 0
          return sum + itemAmount
        }, 0)

        if (amountToRefund > 0) {
          try {
            await refundItems(
              stripe,
              paymentIntentId,
              amountToRefund,
              `License provisioning failed: ${result.error ?? "unknown"}`
            )
            console.log("[webhook] Issued refund of", amountToRefund, "cents on session", session.id)
          } catch (refundErr) {
            console.error("[webhook] Refund failed:", refundErr)
          }
        } else {
          console.log("[webhook] License failed but all items were free — no refund issued for session", session.id)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
