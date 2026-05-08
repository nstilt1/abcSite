// src/lib/admin-content/local-drafts.ts
import type { AdminSectionKey, DraftState } from "./types";

const PREFIX = "abc-admin-drafts";

export function getDraftStorageKey(section: AdminSectionKey): string {
  return `${PREFIX}:${section}`;
}

export function loadDraftState<T>(section: AdminSectionKey): DraftState<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(section));
    return raw ? (JSON.parse(raw) as DraftState<T>) : null;
  } catch {
    return null;
  }
}

export function saveDraftState<T>(section: AdminSectionKey, state: DraftState<T>): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getDraftStorageKey(section), JSON.stringify(state));
}

export function clearDraftState(section: AdminSectionKey): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getDraftStorageKey(section));
}