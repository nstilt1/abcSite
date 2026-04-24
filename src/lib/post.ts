"use client";

import { fetchAuthSession } from "aws-amplify/auth";

function decodeJwt(jwt: string) {
  const [, payload] = jwt.split(".");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

export async function postToApi<T = unknown>(
  url: string,
  payload: unknown
): Promise<T> {
  const session = await fetchAuthSession();

  const accessToken = session.tokens?.accessToken?.toString();

  if (!accessToken) {
    throw new Error("No access token available (user not signed in?)");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Request failed: ${res.status} ${res.statusText}${
        text ? ` - ${text}` : ""
      }`
    );
  }

  return (await res.json().catch(() => ({}))) as T;
}