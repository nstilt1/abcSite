"use client";

import { useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PresignResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function guessExt(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();

  if (!accessToken) {
    throw new Error("No access token available. User is not signed in.");
  }

  return accessToken;
}

async function requestPresignedUpload(body: {
  folder: string;
  filename: string;
  contentType: string;
  ext: string;
}): Promise<PresignResponse> {
  const accessToken = await getAccessToken();

  const response = await fetch("/api/admin/presign-upload", {
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
      `Presign request failed: ${response.status} ${response.statusText}${
        text ? ` - ${text}` : ""
      }`,
    );
  }

  const parsed = JSON.parse(text) as Partial<PresignResponse>;

  if (
    typeof parsed.uploadUrl !== "string" ||
    typeof parsed.key !== "string" ||
    typeof parsed.publicUrl !== "string"
  ) {
    throw new Error("Presign response missing uploadUrl, key, or publicUrl.");
  }

  return parsed as PresignResponse;
}

export default function MediaPage() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState("media/uploads");
  const [status, setStatus] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canUpload = useMemo(() => !!file && !busy, [file, busy]);

  async function onUpload() {
    setBusy(true);
    setError("");
    setStatus("");
    setUploadedUrl("");

    try {
      if (!file) throw new Error("Pick a file first.");

      const presign = await requestPresignedUpload({
        folder,
        filename: sanitizeFilename(file.name),
        contentType: file.type || "application/octet-stream",
        ext: guessExt(file),
      });

      setStatus("Uploading to S3...");

      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!put.ok) {
        const text = await put.text().catch(() => "");
        throw new Error(
          `S3 upload failed: ${put.status} ${put.statusText}${
            text ? ` - ${text}` : ""
          }`,
        );
      }

      setStatus(`Upload complete. S3 key: ${presign.key}`);
      setUploadedUrl(presign.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setFolder("media/uploads");
    setStatus("");
    setUploadedUrl("");
    setError("");
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Media</h1>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button>Upload image</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload image</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Folder</div>
              <Input
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="media/products/my-product"
                disabled={busy}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">File</div>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={busy}
              />
            </div>

            {status && <div className="rounded-md border p-3 text-sm">{status}</div>}

            {error && (
              <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {uploadedUrl && (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                <div className="font-medium">Uploaded URL</div>
                <a
                  className="break-all underline"
                  href={uploadedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {uploadedUrl}
                </a>
                <img
                  src={uploadedUrl}
                  alt="Uploaded preview"
                  className="mt-2 w-full rounded-md border"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Close
            </Button>
            <Button onClick={onUpload} disabled={!canUpload}>
              {busy ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}