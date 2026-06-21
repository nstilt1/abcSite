// src/app/api/checkout/webhook/route.ts
//
// Receives Stripe webhook events.  On `checkout.session.completed`:
//   1. Reassembles the user's Cognito idToken from Stripe session metadata
//   2. Calls abc_software_licensor_dispatcher → CreateLicense using that token
//   3. If CreateLicense fails for a non-free item, issues a Stripe refund
//
// Required env vars:
//   STRIPE_SECRET_KEY               – sk_live_… / sk_test_…
//   STRIPE_WEBHOOK_SECRET           – whsec_… (from Stripe dashboard)
//   SOFTWARE_LICENSOR_DISPATCH_API  – URL of the licensor lambda via API Gateway

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LicenseRequestMeta {
  productId: string
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

async function dispatchCreateLicense(params: {
  idToken: string
  orderId: string
  customerEmail: string
  licenseRequests: CreateLicenseRequestJson[]
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.SOFTWARE_LICENSOR_DISPATCH_API
  if (!url) return { ok: false, error: "SOFTWARE_LICENSOR_DISPATCH_API not set" }

  const body = {
    action: "CreateLicense",
    data: {
      customer_first_name: "",
      customer_last_name: "",
      customer_email: params.customerEmail,
      order_id: params.orderId,
      custom_success_message: "Thank you for your purchase!",
      license_requests: params.licenseRequests,
    },
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use the user's own Cognito idToken — this passes the Cognito
        // authorizer on API Gateway, same as a browser request would.
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: `Licensor ${res.status}: ${text}` }
  }

  return { ok: true }
}

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

    const licenseRequestsRaw = session.metadata?.license_requests
    const customerEmail = session.customer_email ?? ""
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? ""

    // Reassemble the idToken from the three metadata parts stored at checkout
    const idToken = [
      session.metadata?.id_token_1 ?? "",
      session.metadata?.id_token_2 ?? "",
      session.metadata?.id_token_3 ?? "",
    ].join("")

    if (!idToken || !licenseRequestsRaw) {
      console.warn("[webhook] Missing metadata on session", session.id)
      return NextResponse.json({ received: true })
    }

    // Sanity-check the token has the right shape (3 base64url segments)
    if (idToken.split(".").length !== 3) {
      console.error("[webhook] Reassembled idToken is malformed for session", session.id)
      return NextResponse.json({ received: true })
    }

    let licenseRequestsMeta: LicenseRequestMeta[]
    try {
      licenseRequestsMeta = JSON.parse(licenseRequestsRaw) as LicenseRequestMeta[]
    } catch {
      console.error("[webhook] Could not parse license_requests metadata")
      return NextResponse.json({ received: true })
    }

    const validTypes = new Set(["perpetual", "trial", "subscription"])
    const licenseRequests: CreateLicenseRequestJson[] = licenseRequestsMeta.map((m) => ({
      product_id: m.productId,
      license_type: (validTypes.has(m.licenseType) ? m.licenseType : "perpetual") as
        | "perpetual"
        | "trial"
        | "subscription",
      quantity: 1,
    }))

    const result = await dispatchCreateLicense({
      idToken,
      orderId: session.id,
      customerEmail,
      licenseRequests,
    })

    if (!result.ok) {
      console.error("[webhook] CreateLicense failed for session", session.id, result.error)

      if (paymentIntentId && session.amount_total && session.amount_total > 0) {
        try {
          await refundItems(
            stripe,
            paymentIntentId,
            session.amount_total,
            `License provisioning failed: ${result.error ?? "unknown"}`
          )
          console.log("[webhook] Issued refund for", session.amount_total, "cents on session", session.id)
        } catch (refundErr) {
          console.error("[webhook] Refund failed:", refundErr)
        }
      }
    } else {
      console.log("[webhook] License created for session", session.id)
    }
  }

  return NextResponse.json({ received: true })
}