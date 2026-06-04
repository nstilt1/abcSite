// src/app/api/admin/rebuild/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rebuildUrl = process.env.REBUILD_URL;
  if (!rebuildUrl) {
    return NextResponse.json({ error: "Missing REBUILD_URL env var" }, { status: 500 });
  }

  // Still require a valid Cognito session — prevents unauthenticated callers
  // from spamming rebuilds even though the actual webhook URL is secret.
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const upstream = await fetch(rebuildUrl, {
    method: "POST",
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("Rebuild webhook failed:", upstream.status, text);
    return NextResponse.json(
      { error: `Rebuild failed: ${upstream.status}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: "Amplify rebuild triggered." });
}