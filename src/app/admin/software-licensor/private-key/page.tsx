"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StorePrivateKeyFile = {
  store_id: string;
  private_key: string;
  products?: Record<string, unknown>;
};

type ExportPrivateKeyResult = {
  store_id: string;
  private_key: string;
};

type SoftwareLicensorWasm = {
  default?: (moduleOrPath?: string) => Promise<void>;
  send_private_key: (
    url: string,
    jwt: string,
    encryptedPrivateKey: string,
    password: string,
    storeId: string,
  ) => Promise<string>;
  export_pkey: (
    url: string,
    jwt: string,
    password: string,
  ) => Promise<ExportPrivateKeyResult | string>;
};

import initWasm, {
  export_pkey,
  send_private_key,
} from "@/wasm/software_licensor_wasm";

type InitOutput = Awaited<ReturnType<typeof initWasm>>;

let wasmInitPromise: Promise<InitOutput> | null = null;

async function loadWasm(): Promise<InitOutput> {
  wasmInitPromise ??= initWasm();
  return wasmInitPromise;
}

function isStorePrivateKeyFile(value: unknown): value is StorePrivateKeyFile {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.store_id === "string" &&
    candidate.store_id.trim().length > 0 &&
    typeof candidate.private_key === "string" &&
    candidate.private_key.trim().length > 0
  );
}

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    throw new Error("No ID token available. User is not signed in.");
  }

  return idToken;
}

async function readJsonFile(file: File): Promise<StorePrivateKeyFile> {
  const isJson =
    file.type === "application/json" || file.name.toLowerCase().endsWith(".json");

  if (!isJson) {
    throw new Error("Please select a .json file.");
  }

  const text = await file.text();
  const parsed: unknown = JSON.parse(text);

  if (!isStorePrivateKeyFile(parsed)) {
    throw new Error(
      'Invalid private key file. Expected JSON with string fields "store_id" and "private_key".',
    );
  }

  return parsed;
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function PrivateKeyImportExportPage() {
  const apiUrl = "/api/admin/software-licensor-dispatch";

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImportFile(event.target.files?.[0] ?? null);
    setStatus(null);
    setError(null);
  }

  async function handleImportPrivateKey() {
    try {
      setIsBusy(true);
      setStatus(null);
      setError(null);

      if (!apiUrl) {
        throw new Error("Missing NEXT_PUBLIC_SOFTWARE_LICENSOR_DISPATCH_API.");
      }

      if (!importFile) {
        throw new Error("Please select a private key JSON file.");
      }

      if (!importPassword) {
        throw new Error("Please enter the password for the imported private key.");
      }

      const parsed = await readJsonFile(importFile);
      const jwt = await getAccessToken();
      await loadWasm();

    const response = await send_private_key(
        apiUrl,
        jwt,
        parsed.private_key,
        importPassword,
        parsed.store_id,
      );

      setStatus(response || "Private key imported successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExportPrivateKey() {
    try {
      setIsBusy(true);
      setStatus(null);
      setError(null);

      if (!apiUrl) {
        throw new Error("Missing SOFTWARE_LICENSOR_DISPATCH_API.");
      }

      if (!exportPassword) {
        throw new Error("Please enter a password to encrypt the exported private key.");
      }

      const jwt = await getAccessToken();
      await loadWasm();

      const result = await export_pkey(apiUrl, jwt, exportPassword);

      const exportData: StorePrivateKeyFile =
        typeof result === "string"
          ? JSON.parse(result)
          : {
              store_id: result.store_id,
              private_key: result.private_key,
            };

      if (!isStorePrivateKeyFile(exportData)) {
        throw new Error("WASM export returned an invalid private key payload.");
      }

      downloadJson("store_details.json", exportData);
      setStatus("Private key exported to store_details.json.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Private Key Management</CardTitle>
          <CardDescription>
            Import or export an encrypted store private key.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status && (
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="import" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import">Import Private Key</TabsTrigger>
              <TabsTrigger value="export">Export Private Key</TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="private-key-file">Private key JSON file</Label>
                <Input
                  id="private-key-file"
                  type="file"
                  accept="application/json,.json"
                  onChange={onFileChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-password">Private key password</Label>
                <Input
                  id="import-password"
                  type="password"
                  autoComplete="current-password"
                  value={importPassword}
                  onChange={(event) => setImportPassword(event.target.value)}
                />
              </div>

              <Button
                type="button"
                disabled={isBusy}
                onClick={handleImportPrivateKey}
                className="w-full"
              >
                {isBusy ? "Importing..." : "Import Private Key"}
              </Button>
            </TabsContent>

            <TabsContent value="export" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="export-password">Export password</Label>
                <Input
                  id="export-password"
                  type="password"
                  autoComplete="new-password"
                  value={exportPassword}
                  onChange={(event) => setExportPassword(event.target.value)}
                />
              </div>

              <Button
                type="button"
                disabled={isBusy}
                onClick={handleExportPrivateKey}
                className="w-full"
              >
                {isBusy ? "Exporting..." : "Export Private Key"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}