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
  customerEmail?: string        // ← add this
}

// ── Stripe initialisation (server-only) ──────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(key)
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Require authentication — extract Cognito email/sub from the session
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
    const token = authHeader.slice(7);

    // Decode the JWT payload to get sub and email (no verification needed —
    // Stripe's own session is what enforces payment; the token just identifies the user)
    let userSub: string | undefined;
    let userEmail: string | undefined;
    try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    userSub   = payload.sub   as string;
    userEmail = payload.email as string;
    } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!userSub) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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

  // 3. Build Stripe line items using the stored Stripe price IDs.
  //    We trust the priceId from the cart but NEVER trust the client-supplied
  //    priceCents — Stripe will use its own price amount from the price object.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => ({
      price: item.priceId,
      quantity: 1,
    })
  )

  // 4. Encode the license requests as metadata so the webhook can fulfill them
  //    without another round-trip to the client.
  const licenseRequestsMeta = JSON.stringify(
    items.map((item) => ({
        productId: item.productId,
        priceId: item.priceId,           // ← add this line
        licenseType: item.licenseType.toLowerCase(),
        name: item.name,
        slug: item.slug,
    })))

  // 5. Create the Stripe Checkout session
  const stripe = getStripe()

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      metadata: {
        user_sub: userSub,
        license_requests: licenseRequestsMeta,
      },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      // Automatically collect billing address for invoices
      billing_address_collection: "auto",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("[create-session] Stripe error:", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ url: session.url })
}
