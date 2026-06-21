// src/app/api/checkout/webhook/route.ts

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    // Log everything we have so we can see exactly what's in the session
    console.log("[webhook] checkout.session.completed", session.id, {
      hasLicenseRequests: !!session.metadata?.license_requests,
      hasIdToken1: !!session.metadata?.id_token_1,
      hasIdToken2: !!session.metadata?.id_token_2,
      hasIdToken3: !!session.metadata?.id_token_3,
      metadataKeys: Object.keys(session.metadata ?? {}),
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
    })

    const licenseRequestsRaw = session.metadata?.license_requests
    const customerEmail = session.customer_email ?? ""
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? ""

    const idToken = [
      session.metadata?.id_token_1 ?? "",
      session.metadata?.id_token_2 ?? "",
      session.metadata?.id_token_3 ?? "",
    ].join("")

    if (!licenseRequestsRaw) {
      console.error("[webhook] Missing license_requests metadata on session", session.id)
      return NextResponse.json({ received: true })
    }

    if (!idToken) {
      console.error("[webhook] Missing idToken metadata on session", session.id,
        "— was create-session deployed with the id_token_* fields?")
      return NextResponse.json({ received: true })
    }

    if (idToken.split(".").length !== 3) {
      console.error("[webhook] Reassembled idToken is malformed", {
        sessionId: session.id,
        tokenLength: idToken.length,
        segments: idToken.split(".").length,
      })
      return NextResponse.json({ received: true })
    }

    let licenseRequestsMeta: LicenseRequestMeta[]
    try {
      licenseRequestsMeta = JSON.parse(licenseRequestsRaw) as LicenseRequestMeta[]
    } catch {
      console.error("[webhook] Could not parse license_requests metadata:", licenseRequestsRaw)
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

    console.log("[webhook] Calling dispatchCreateLicense", {
      sessionId: session.id,
      licenseRequests,
      customerEmail,
    })

    const result = await dispatchCreateLicense({
      idToken,
      orderId: session.id,
      customerEmail,
      licenseRequests,
    })

    if (!result.ok) {
      console.error("[webhook] CreateLicense failed", { sessionId: session.id, error: result.error })

      if (paymentIntentId && session.amount_total && session.amount_total > 0) {
        try {
          await refundItems(stripe, paymentIntentId, session.amount_total,
            `License provisioning failed: ${result.error ?? "unknown"}`)
          console.log("[webhook] Refund issued", { sessionId: session.id, cents: session.amount_total })
        } catch (refundErr) {
          console.error("[webhook] Refund failed:", refundErr)
        }
      }
    } else {
      console.log("[webhook] License created successfully", { sessionId: session.id })
    }
  }

  return NextResponse.json({ received: true })
}