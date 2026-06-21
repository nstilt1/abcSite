// src/app/api/checkout/create-session/route.ts
//
// Creates a Stripe Checkout session server-side so that the Stripe secret key
// is NEVER exposed to the browser.  The client receives only a session URL.
//
// Required env vars:
//   STRIPE_SECRET_KEY        – sk_live_… or sk_test_…
//   NEXT_PUBLIC_SITE_URL     – e.g. https://alteredbrainchemistry.com (no trailing slash)

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// ── Types ────────────────────────────────────────────────────────────────────

interface CartItemPayload {
  productId: string
  slug: string
  name: string
  priceId: string
  priceCents: number
  licenseType: string
}

interface CreateSessionBody {
  items: CartItemPayload[]
  customerEmail?: string
}

// ── Stripe initialisation (server-only) ──────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(key)
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Require authentication — read idToken from Authorization header.
  //    API Gateway's Cognito authorizer already validated this token for all
  //    other dispatcher calls; here we just decode it to get sub/email and
  //    store it in Stripe metadata so the webhook can use it later.
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const idToken = authHeader.slice(7)

  let userSub: string | undefined
  let userEmail: string | undefined
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString())
    userSub = payload.sub as string
    userEmail = payload.email as string
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  if (!userSub) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // 2. Parse + validate body
  let body: CreateSessionBody
  try {
    body = (await req.json()) as CreateSessionBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { items, customerEmail } = body
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (!siteUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL not configured" }, { status: 500 })
  }

  // 3. Build Stripe line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => ({ price: item.priceId, quantity: 1 })
  )

  // 4. Encode license requests as metadata
  const licenseRequestsMeta = JSON.stringify(
    items.map((item) => ({
      productId: item.productId,
      licenseType: item.licenseType.toLowerCase(),
      name: item.name,
      slug: item.slug,
    }))
  )

  // 5. Split the idToken across two metadata keys to stay under Stripe's
  //    500-char-per-value limit. The webhook reassembles them before use.
  //    Cognito idTokens are typically ~1200 chars; two 500-char chunks covers that.
  //    If the token is longer we store what fits — the webhook will fail to
  //    parse and fall back gracefully rather than crash.
  const tokenPart1 = idToken.slice(0, 500)
  const tokenPart2 = idToken.slice(500, 1000)
  const tokenPart3 = idToken.slice(1000, 1500)

  // 6. Handle free items — skip Stripe entirely
  const totalCents = items.reduce((sum, i) => sum + (i.priceCents ?? 0), 0)
  const hasPriceIds = items.some((i) => i.priceId?.trim())

  if (totalCents === 0 || !hasPriceIds) {
    const freeSessionId = `free_${Date.now()}_${userSub}`
    return NextResponse.json({ url: `${siteUrl}/checkout/success?session_id=${freeSessionId}&free=1` })
  }

  // 7. Create the Stripe Checkout session
  const stripe = getStripe()

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail ?? userEmail,
      metadata: {
        user_sub: userSub,
        license_requests: licenseRequestsMeta,
        // idToken split across parts so the webhook can call the dispatcher
        // using the user's own Cognito token (passes the Cognito authorizer)
        id_token_1: tokenPart1,
        id_token_2: tokenPart2,
        id_token_3: tokenPart3,
      },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      billing_address_collection: "auto",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("[create-session] Stripe error:", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ url: session.url })
}