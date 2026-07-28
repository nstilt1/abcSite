// src/app/api/admin/sync/route.ts
// Server-side proxy for fetching live content from the CDN.
// The client can't fetch hephaestus directly on localhost due to CORS, so this
// route does the fetch server-side (no CORS restrictions) and forwards the JSON.
// CloudFront's /content/* behavior has caching disabled (TTL=0) so this always
// returns the latest data written to S3 by update_content_abc.
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const CONTENT_FILES: Record<string, string> = {
  downloads: "downloads.json",
  blogs:     "blogs.json",
  products:  "products.json",
  webapps:   "webapps.json",
}

export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section")

  if (!section || !CONTENT_FILES[section]) {
    return NextResponse.json(
      { error: `Unknown section "${section}". Valid: ${Object.keys(CONTENT_FILES).join(", ")}` },
      { status: 400 },
    )
  }

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/+$/, "")
  if (!cdnUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_CDN_URL environment variable" },
      { status: 500 },
    )
  }

  const url = `${cdnUrl}/content/${CONTENT_FILES[section]}`

  const upstream = await fetch(url, { cache: "no-store" })
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Content fetch failed: ${upstream.status} ${upstream.statusText}` },
      { status: upstream.status },
    )
  }

  const data = await upstream.json()
  return NextResponse.json(data)
}