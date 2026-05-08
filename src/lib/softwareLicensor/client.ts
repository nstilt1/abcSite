"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import type { ApiRequest } from "./types";

export async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();

  if (!accessToken) {
    throw new Error("No access token available. User is not signed in.");
  }

  return accessToken;
}

export async function dispatchSoftwareLicensor<T>(body: ApiRequest): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch("/api/software-licensor-dispatch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}${
        text ? ` - ${text}` : ""
      }`,
    );
  }

  return JSON.parse(text) as T;
}