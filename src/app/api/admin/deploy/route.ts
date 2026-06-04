// src/app/api/admin/deploy/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Maps frontend section key → field name the update-content Lambda expects
const SECTION_TO_FIELD: Record<string, string> = {
  downloads:  "downloads",
  blogs:      "blogs",
  products:   "products",
  "web-apps": "webapps",
};

export async function POST(request: NextRequest) {
  const updateUrl = process.env.UPDATE_FN_URL;
  if (!updateUrl) {
    return NextResponse.json({ error: "Missing UPDATE_FN_URL env var" }, { status: 500 });
  }

  // Forward the caller's Cognito token — the Lambda requires admin group membership
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  let body: { section: string; items: unknown[] };
  try {
    body = (await request.json()) as { section: string; items: unknown[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { section, items } = body;
  const field = SECTION_TO_FIELD[section];
  if (!field) {
    return NextResponse.json(
      { error: `Unknown section "${section}". Valid: ${Object.keys(SECTION_TO_FIELD).join(", ")}` },
      { status: 400 },
    );
  }

  // Lambda accepts { blogs?, downloads?, products?, webapps? } — only pass the field being updated
  const upstream = await fetch(updateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({ [field]: items }),
    cache: "no-store",
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    console.error("update-content Lambda error:", upstream.status, text);
    return new NextResponse(text, { status: upstream.status });
  }

  return NextResponse.json({ ok: true, message: "Deployed successfully." });
}