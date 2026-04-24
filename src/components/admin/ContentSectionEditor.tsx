"use client";

import { useEffect, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { postToApi } from "@/lib/post";
import type { CollectionSchema, FieldDefinition } from "@/lib/admin-content/types";
import { clearDraftState, loadDraftState, saveDraftState } from "@/lib/admin-content/local-drafts";
import { countChangedItems, deepClone, normalizeSlug, parseCsvList, stringifyCsvList } from "@/lib/admin-content/utils";
import TiptapEditor from "@/components/admin/TiptapEditor";
import TiptapPreview from "@/components/admin/TiptapPreview";

type Props<TEntry extends { slug: string; title: string; tiptap: JSONContent }> = {
  schema: CollectionSchema<TEntry>;
  initialItems: TEntry[];
  saveEndpoint: string;
};

export function ContentSectionEditor<TEntry extends { slug: string; title: string; tiptap: JSONContent }>({
  schema,
  initialItems,
  saveEndpoint,
}: Props<TEntry>) {
  const [s3Items, setS3Items] = useState<TEntry[]>(() => deepClone(initialItems));
  const [draftItems, setDraftItems] = useState<TEntry[]>(() => deepClone(initialItems));
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialItems[0]?.slug ?? null);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const persisted = loadDraftState<TEntry>(schema.section);
    if (persisted) {
      setS3Items(persisted.s3Items);
      setDraftItems(persisted.draftItems);
      setSelectedSlug(persisted.draftItems[0]?.slug ?? null);
    } else {
      setS3Items(deepClone(initialItems));
      setDraftItems(deepClone(initialItems));
      setSelectedSlug(initialItems[0]?.slug ?? null);
    }
    setMounted(true);
  }, [initialItems, schema.section]);

  useEffect(() => {
    if (!mounted) return;

    saveDraftState<TEntry>(schema.section, {
      s3Items,
      draftItems,
      lastSyncedAt: new Date().toISOString(),
    });
  }, [draftItems, mounted, s3Items, schema.section]);

  const selectedEntry = useMemo(
    () => draftItems.find((item) => item.slug === selectedSlug) ?? null,
    [draftItems, selectedSlug],
  );

  const changedSummary = useMemo(
    () => countChangedItems(s3Items, draftItems),
    [s3Items, draftItems],
  );

  const metadataFields = schema.fields.filter((field) => field.category === "metadata");
  const imageFields = schema.fields.filter((field) => field.category === "image");
  const thumbnailFields = schema.fields.filter((field) => field.category === "thumbnail");

  function replaceSelected(updated: TEntry) {
    setDraftItems((prev) => prev.map((item) => (item.slug === updated.slug ? updated : item)));
  }

  function updateSelectedField<K extends keyof TEntry>(key: K, value: TEntry[K]) {
    if (!selectedEntry) return;
    replaceSelected({ ...selectedEntry, [key]: value });
  }

  function createNewItem() {
    const next = schema.createEmpty();
    next.slug = normalizeSlug(next.slug || `${schema.section}-${Date.now()}`) as TEntry["slug"];

    setDraftItems((prev) => [next, ...prev]);
    setSelectedSlug(next.slug);
  }

  function deleteSelected() {
    if (!selectedEntry) return;

    const next = draftItems.filter((item) => item.slug !== selectedEntry.slug);
    setDraftItems(next);
    setSelectedSlug(next[0]?.slug ?? null);
  }

  async function confirmChanges() {
    setSaving(true);
    try {
      const payload = {
        [schema.section]: draftItems,
      };

      await postToApi(saveEndpoint, payload);

      const synced = deepClone(draftItems);
      setS3Items(synced);
      saveDraftState<TEntry>(schema.section, {
        s3Items: synced,
        draftItems: synced,
        lastSyncedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    const reverted = deepClone(s3Items);
    setDraftItems(reverted);
    setSelectedSlug(reverted[0]?.slug ?? null);
  }

  const refreshSite = async (type: string, data: { userId: number }) => {
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actionType: type,
                ...data
            }),
        });

        const result = await res.json();
        console.log("Success:", result);
    } catch (err) {
        console.error("Error: ", err);
    }
  };

  function resetToS3() {
    const fresh = deepClone(initialItems);
    setS3Items(fresh);
    setDraftItems(fresh);
    setSelectedSlug(fresh[0]?.slug ?? null);
    clearDraftState(schema.section);
    saveDraftState<TEntry>(schema.section, {
      s3Items: fresh,
      draftItems: fresh,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  function renderField(field: FieldDefinition<TEntry>) {
    if (!selectedEntry) return null;

    const rawValue = selectedEntry[field.key];
    const commonLabel = (
      <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
    );

    switch (field.kind) {
      case "slug":
        return (
          <div key={field.key}>
            {commonLabel}
            <Input
              value={String(rawValue ?? "")}
              onChange={(e) => {
                const value = normalizeSlug(e.target.value);
                updateSelectedField(field.key, value as TEntry[typeof field.key]);
                if (selectedSlug === selectedEntry.slug) {
                  setSelectedSlug(value);
                }
              }}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.key}>
            {commonLabel}
            <Textarea
              rows={field.rows ?? 3}
              value={String(rawValue ?? "")}
              onChange={(e) =>
                updateSelectedField(field.key, e.target.value as TEntry[typeof field.key])
              }
            />
          </div>
        );

      case "string-array-csv":
        return (
          <div key={field.key}>
            {commonLabel}
            <Input
              value={stringifyCsvList(rawValue)}
              onChange={(e) =>
                updateSelectedField(field.key, parseCsvList(e.target.value) as TEntry[typeof field.key])
              }
            />
          </div>
        );

      case "date":
        return (
          <div key={field.key}>
            {commonLabel}
            <Input
              type="date"
              value={String(rawValue ?? "")}
              onChange={(e) =>
                updateSelectedField(field.key, e.target.value as TEntry[typeof field.key])
              }
            />
          </div>
        );

      default:
        return (
          <div key={field.key}>
            {commonLabel}
            <Input
              value={String(rawValue ?? "")}
              onChange={(e) =>
                updateSelectedField(field.key, e.target.value as TEntry[typeof field.key])
              }
            />
          </div>
        );
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{schema.title}</h1>
          <p className="text-sm text-muted-foreground">
            Editing {schema.fileName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            Changed items: {changedSummary.totalChanged}
          </Badge>
          <Button variant="outline" onClick={resetToS3}>
            Reset to S3
          </Button>
          <Button onClick={() => refreshSite('frontend', { userId: 123 })}
            className="bg-blue-500 text-white p-2 rounded">Build Frontend</Button>
          <Button variant="outline" onClick={discardChanges}>
            Discard changes
          </Button>
          <Button onClick={() => void confirmChanges()} disabled={saving}>
            {saving ? "Saving..." : `Confirm changes (${changedSummary.totalChanged})`}
          </Button>
        </div>
      </div>

      <div className="grid min-h-[70vh] grid-cols-12 gap-6">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>{draftItems.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={createNewItem}>
              New item
            </Button>
            <Separator />
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {draftItems.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setSelectedSlug(item.slug)}
                  className={`w-full rounded-md border p-3 text-left ${
                    selectedSlug === item.slug ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium">{item.title || "(untitled)"}</div>
                  <div className="text-xs text-muted-foreground">{item.slug}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-5">
          <CardHeader>
            <CardTitle>Edit</CardTitle>
            <CardDescription>
              Metadata, image fields, thumbnail fields, and Tiptap content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedEntry ? (
              <div className="text-sm text-muted-foreground">Select or create an item.</div>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button variant="destructive" onClick={deleteSelected}>
                    Delete item
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Metadata</h3>
                  {metadataFields.map(renderField)}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Image fields</h3>
                  {imageFields.map(renderField)}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Thumbnail fields</h3>
                  {thumbnailFields.map(renderField)}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Tiptap content</h3>
                  <div className="rounded-md border">
                    <TiptapEditor
                      value={selectedEntry.tiptap}
                      onChange={(doc: JSONContent) =>
                        updateSelectedField("tiptap" as keyof TEntry, doc as TEntry[keyof TEntry])
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Live Tiptap preview</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedEntry ? (
              <div className="text-sm text-muted-foreground">Nothing selected.</div>
            ) : (
              <div className="prose max-w-none">
                <TiptapPreview value={selectedEntry.tiptap} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}