"use client";

import { fetchAuthSession } from "aws-amplify/auth";

export async function postToApi<T = unknown>(
  url: string,
  payload: unknown
): Promise<T> {
  const session = await fetchAuthSession();

  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    throw new Error("No ID token available (user not signed in?)");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
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