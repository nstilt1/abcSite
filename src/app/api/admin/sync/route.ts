// src/app/api/admin/sync/route.ts
// Server-side proxy for fetching live content.
// On production: fetches directly from S3 origin to bypass CloudFront's cache,
// ensuring the admin always sees the latest deployed data.
// On localhost: falls back to the CDN URL (CORS isn't an issue server-side).
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const CONTENT_FILES: Record<string, string> = {
  downloads: "downloads.json",
  blogs:     "blogs.json",
  products:  "products.json",
  webapps:   "webapps.json",
}

function getContentUrl(filename: string): string | null {
  // Prefer direct S3 origin to bypass CloudFront cache
  const bucket = process.env.S3_BUCKET_NAME?.trim()
  const region = process.env.REGION?.trim()
  if (bucket && region) {
    return `https://${bucket}.s3.${region}.amazonaws.com/content/${filename}`
  }

  // Localhost fallback: use CDN URL (server-side fetch has no CORS restriction)
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/+$/, "")
  if (cdnUrl) {
    return `${cdnUrl}/content/${filename}`
  }

  return null
}

export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section")

  if (!section || !CONTENT_FILES[section]) {
    return NextResponse.json(
      { error: `Unknown section "${section}". Valid: ${Object.keys(CONTENT_FILES).join(", ")}` },
      { status: 400 },
    )
  }

  const url = getContentUrl(CONTENT_FILES[section])
  if (!url) {
    return NextResponse.json(
      { error: "Missing S3_BUCKET_NAME/REGION and NEXT_PUBLIC_CDN_URL environment variables" },
      { status: 500 },
    )
  }

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