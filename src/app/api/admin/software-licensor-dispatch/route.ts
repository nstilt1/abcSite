import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const dispatchUrl = process.env.SOFTWARE_LICENSOR_DISPATCH_API;

  if (!dispatchUrl) {
    return NextResponse.json(
      { error: "Missing SOFTWARE_LICENSOR_DISPATCH_API" },
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

  const body = await request.text();

  const upstream = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}