import type { JSONContent } from "@tiptap/react";
import type { ChangedSummary } from "./types";

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseCsvList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function stringifyCsvList(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

export function getEmptyDoc(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export function countChangedItems<T extends { slug: string }>(
  original: T[],
  draft: T[],
): ChangedSummary {
  const originalMap = new Map(original.map((item) => [item.slug, item]));
  const draftMap = new Map(draft.map((item) => [item.slug, item]));

  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const [slug, draftItem] of draftMap) {
    const originalItem = originalMap.get(slug);
    if (!originalItem) {
      added += 1;
      continue;
    }
    if (!deepEqual(originalItem, draftItem)) {
      modified += 1;
    }
  }

  for (const slug of originalMap.keys()) {
    if (!draftMap.has(slug)) {
      removed += 1;
    }
  }

  return {
    added,
    removed,
    modified,
    totalChanged: added + removed + modified,
  };
}