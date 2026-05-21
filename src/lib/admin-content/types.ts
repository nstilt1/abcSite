// src/lib/admin-content/types.ts
import type { JSONContent } from "@tiptap/react";

export type AdminSectionKey = "downloads" | "blogs" | "products" | "web-apps";

export type FieldKind =
  | "text"
  | "textarea"
  | "date"
  | "slug"
  | "string-array-csv"
  | "image"
  | "thumbnail"
  | "select"
  | "union";

export type FieldCategory = "metadata" | "image" | "thumbnail";

export type BaseRequiredFields = {
  slug: string;
  title: string;
  tiptap: JSONContent;
};

export type FieldDefinition<TEntry> = {
  key: Extract<keyof TEntry, string>;
  label: string;
  kind: FieldKind;
  category: FieldCategory;
  placeholder?: string;
  description?: string;
  required?: boolean;
  rows?: number;
  options?: string[];
  unionOptions?: Record<string, FieldDefinition<TEntry>[]>;
};

export type CollectionSchema<TEntry extends BaseRequiredFields> = {
  section: AdminSectionKey;
  title: string;
  fileName: string;
  fields: FieldDefinition<TEntry>[];
  createEmpty: () => TEntry;
};

export type ChangedSummary = {
  added: number;
  removed: number;
  modified: number;
  totalChanged: number;
};

export type ContentSectionPayload<TEntry> = {
  items: TEntry[];
};

export type DraftState<TEntry> = {
  s3Items: TEntry[];
  draftItems: TEntry[];
  lastSyncedAt: string | null;
};

export function defineCollectionSchema<TEntry extends BaseRequiredFields>(
  schema: CollectionSchema<TEntry>,
): CollectionSchema<TEntry> {
  return schema;
}