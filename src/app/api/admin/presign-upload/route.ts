// src/app/api/admin/presign-upload/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type PresignRequest = {
  folder: string;
  filename: string;
  contentType: string;
  ext?: string;
};

export async function POST(request: NextRequest) {
  const presignUrl = process.env.PRESIGN_URL;

  if (!presignUrl) {
    return NextResponse.json(
      { error: "Missing PRESIGN_URL" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization bearer token" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as PresignRequest;

  const upstreamResponse = await fetch(presignUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  console.log("Upstream presign response status:", upstreamResponse.status);
  const responseText = await upstreamResponse.text();
  console.log("Upstream presign response body:", responseText);

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type":
        upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}