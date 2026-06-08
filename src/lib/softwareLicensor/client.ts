"use client";

import { postToApi } from "@/lib/post";
import type { ApiRequest } from "./types";

export async function dispatchSoftwareLicensor<T>(body: ApiRequest): Promise<T> {
  return postToApi<T>("/api/admin/software-licensor-dispatch", body);
}