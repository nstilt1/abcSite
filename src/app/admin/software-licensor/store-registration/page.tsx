"use client";

import { useState } from "react";
import { dispatchSoftwareLicensor } from "@/lib/softwareLicensor/client";
import type { RegisterStoreResponse } from "@/lib/softwareLicensor/types";
import { useCooldownCache } from "@/hooks/useCooldownCache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterStorePage() {
  const storeCache = useCooldownCache<string>("softwareLicensor.storeId", 0);

  const [storeId, setStoreId] = useState(storeCache.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    setStatus("");

    try {
      const response = await dispatchSoftwareLicensor<RegisterStoreResponse>({
        action: "RegisterStore",
        data: {
          store_id: storeId.trim(),
        },
      });

      storeCache.setValue(response.store_id);
      setStoreId(response.store_id);
      setStatus(`Registered store: ${response.store_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Register Store</CardTitle>
          <CardDescription>
            Registers this store and caches the returned store ID locally.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-id">Store ID or prefix</Label>
            <Input
              id="store-id"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              placeholder="ABC"
            />
          </div>

          {storeCache.value && (
            <div className="rounded-md border p-3 text-sm">
              Cached store ID: <strong>{storeCache.value}</strong>
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
          {status && <div className="text-sm">{status}</div>}

          <Button onClick={submit} disabled={busy || !storeId.trim()}>
            {busy ? "Registering..." : "Register Store"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}