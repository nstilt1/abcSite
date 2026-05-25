"use client";

import { useMemo, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

type PresignResponse = { uploadUrl: string; key: string; publicUrl: string };

// Folder presets — edit to match your S3 bucket structure
const FOLDER_PRESETS = [
  { label: "Images",    value: "images" },
  { label: "Thumbnails", value: "thumbs" },
  { label: "Downloads", value: "downloads" },
  { label: "Media",     value: "media/uploads" },
] as const;

// What MIME types are accepted per folder
const FOLDER_ACCEPT: Record<string, string> = {
  images:         "image/*,video/*",
  thumbs:         "image/*",
  downloads:      "*/*",
  "media/uploads":"image/*,video/*",
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function guessExt(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) throw new Error("No access token — are you signed in?");
  return token;
}

async function requestPresignedUpload(body: {
  folder: string; filename: string; contentType: string; ext: string;
}): Promise<PresignResponse> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/admin/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Presign failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`);
  }
  const parsed = JSON.parse(text) as Partial<PresignResponse>;
  if (typeof parsed.uploadUrl !== "string" || typeof parsed.key !== "string" || typeof parsed.publicUrl !== "string") {
    throw new Error("Presign response missing uploadUrl, key, or publicUrl.");
  }
  return parsed as PresignResponse;
}

function isImage(file: File) { return file.type.startsWith("image/"); }
function isVideo(file: File) { return file.type.startsWith("video/"); }


export default function MediaPage() {
  const [open, setOpen]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [folder, setFolder]       = useState("images");
  const [customFolder, setCustomFolder] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [status, setStatus]       = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");
  const filePickerOpenRef = useRef(false);

  const activeFolder = useCustom ? customFolder : folder;
  const accept       = FOLDER_ACCEPT[activeFolder] ?? "*/*";
  const canUpload    = useMemo(() => !!file && !busy && !!activeFolder, [file, busy, activeFolder]);

  async function onUpload() {
    if (!file) { console.log("STOP: no file"); return; }
    setBusy(true); setError(""); setStatus(""); setUploadedUrl("");
    
    try {
      console.log("STEP 1: getting access token");
      setStatus("Getting access token...");
      
      const accessToken = await getAccessToken();
      console.log("STEP 2: got token, length:", accessToken.length);
      setStatus("Requesting presigned URL...");
      
      console.log("STEP 3: calling presign route with folder:", activeFolder, "file:", file.name);
      
      const response = await fetch("/api/admin/presign-upload", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({
          folder:      activeFolder,
          filename:    sanitizeFilename(file.name),
          contentType: file.type || "application/octet-stream",
          ext:         guessExt(file),
        }),
      });
      
      console.log("STEP 4: presign response status:", response.status);
      const text = await response.text();
      console.log("STEP 5: presign response body:", text);
      
      if (!response.ok) {
        throw new Error(`Presign failed: ${response.status} — ${text}`);
      }
      
      const presign = JSON.parse(text) as Partial<PresignResponse>;
      console.log("STEP 6: presign parsed:", presign);
      
      if (typeof presign.uploadUrl !== "string" || typeof presign.key !== "string" || typeof presign.publicUrl !== "string") {
        throw new Error("Presign response missing uploadUrl, key, or publicUrl.");
      }
      
      setStatus("Uploading to S3...");
      console.log("STEP 7: uploading to S3 URL:", presign.uploadUrl?.substring(0, 80) + "...");
      
      const put = await fetch(presign.uploadUrl, {
        method:  "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body:    file,
      });
      
      console.log("STEP 8: S3 PUT response status:", put.status);
      
      if (!put.ok) {
        const t = await put.text().catch(() => "");
        throw new Error(`S3 upload failed: ${put.status} — ${t}`);
      }
      
      setStatus(`Done. S3 key: ${presign.key}`);
      setUploadedUrl(presign.publicUrl!);
      console.log("STEP 9: complete, public URL:", presign.publicUrl);
      
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("UPLOAD ERROR:", msg);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null); setFolder("images"); setCustomFolder("");
    setUseCustom(false); setStatus(""); setUploadedUrl(""); setError(""); setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Media</h1>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && filePickerOpenRef.current) {
            filePickerOpenRef.current = false;
            return;
          }

          if (!nextOpen && !busy) {
            setOpen(false);
            reset();
            return;
          }

          if (nextOpen) {
            setOpen(true);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>Upload file</Button>
        </DialogTrigger>

        <DialogContent 
          className="sm:max-w-[520px]"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Folder selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Destination folder</div>
              {!useCustom ? (
                <div className="flex gap-2">
                  <Select value={folder} onValueChange={setFolder} disabled={busy}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLDER_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label} ({p.value}/)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setUseCustom(true)} disabled={busy}>
                    Custom
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    placeholder="e.g. media/products/my-product"
                    disabled={busy}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => { setUseCustom(false); setCustomFolder(""); }} disabled={busy}>
                    Preset
                  </Button>
                </div>
              )}
            </div>

            {/* File input */}
            <div className="space-y-2">
              <div className="text-sm font-medium">File</div>
              <Input
                type="file"
                accept={accept}
                onPointerDown={() => {
                  filePickerOpenRef.current = true;
                }}
                onClick={() => {
                  filePickerOpenRef.current = true;
                }}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);

                  window.setTimeout(() => {
                    filePickerOpenRef.current = false;
                  }, 250);
                }}
                disabled={busy}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} &middot; {(file.size / 1024 / 1024).toFixed(2)} MB &middot; {file.type || "unknown type"}
                </p>
              )}
            </div>

            {status && <div className="rounded-md border p-3 text-sm">{status}</div>}
            {error  && <div className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</div>}

            {uploadedUrl && (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                <div className="font-medium">Uploaded</div>
                <a className="break-all underline" href={uploadedUrl} target="_blank" rel="noreferrer">
                  {uploadedUrl}
                </a>
                {file && isImage(file) && (
                  <img src={uploadedUrl} alt="preview" className="mt-2 w-full rounded-md border" />
                )}
                {file && isVideo(file) && (
                  <video src={uploadedUrl} controls className="mt-2 w-full rounded-md border" />
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={busy}
            >
              Close
            </Button>
            <Button 
              onClick={() => { console.log("Upload button clicked, file:", file?.name, "folder:", activeFolder, "canUpload:", canUpload); onUpload(); }} 
              disabled={!canUpload}
            >
              {busy ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
