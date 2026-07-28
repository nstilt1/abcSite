// src/app/api/wasm-image-proxy/route.ts
//
// The WASM kaleidoscope engine fetches its source image at runtime. Bundled
// site images are proxied via static rewrites in next.config.ts (see the
// comment there — this keeps the request same-origin so local dev, which
// doesn't get CORS headers from the CDN, still works).
//
// Physical-product source images are admin-configured arbitrary CDN URLs, so
// a fixed rewrite entry per image isn't possible. This route re-proxies any
// URL on the configured CDN host the same way, same-origin, on demand.
//
// Only same-origin GETs of https://<NEXT_PUBLIC_CDN_URL host>/... are allowed
// — this is a read-through image proxy, not a general fetch proxy, so we
// restrict the target host to avoid this becoming an open relay.

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

function allowedHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_CDN_URL ?? ""
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url")
  if (!target) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: "Invalid url param" }, { status: 400 })
  }

  const allowedHost = allowedHostname()
  if (!allowedHost || parsed.hostname !== allowedHost) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
  }
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only https URLs are allowed" }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString(), { cache: "no-store" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status })
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  })
}