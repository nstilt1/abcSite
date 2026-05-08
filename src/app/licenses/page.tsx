"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { RefreshCw, RotateCcw } from "lucide-react";

import { RequireAuth } from "@/components/RequireAuth";
import { useCooldownCache } from "@/hooks/useCooldownCache";
import { dispatchSoftwareLicensor } from "@/lib/softwareLicensor/client";
import type { LicenseResponse } from "@/lib/softwareLicensor/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const GET_LICENSE_COOLDOWN_MS = 5 * 60 * 1000;
const REGENERATE_LICENSE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function InnerGetLicensePage() {
  const [userSub, setUserSub] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"get" | "regenerate" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSub() {
      const attributes = await fetchUserAttributes();
      const sub = attributes.sub;

      if (!cancelled) {
        if (!sub) {
          setError("Unable to determine signed-in user ID.");
          return;
        }

        setUserSub(sub);
      }
    }

    loadSub().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const licenseCacheKey = useMemo(
    () =>
      userSub
        ? `softwareLicensor.users.${userSub}.license`
        : "softwareLicensor.users.pending.license",
    [userSub],
  );

  const regenerateCacheKey = useMemo(
    () =>
      userSub
        ? `softwareLicensor.users.${userSub}.regenerateLicense`
        : "softwareLicensor.users.pending.regenerateLicense",
    [userSub],
  );

  const licenseCache = useCooldownCache<LicenseResponse>(
    licenseCacheKey,
    GET_LICENSE_COOLDOWN_MS,
  );

  const regenerateCache = useCooldownCache<LicenseResponse>(
    regenerateCacheKey,
    REGENERATE_LICENSE_COOLDOWN_MS,
  );

  async function getLicense() {
    if (!userSub || licenseCache.isOnCooldown) return;

    setBusyAction("get");
    setError("");

    try {
      licenseCache.markRequested();

      const response = await dispatchSoftwareLicensor<LicenseResponse>({
        action: "GetLicense",
      });

      licenseCache.setValue(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function regenerateLicense() {
    if (!userSub || regenerateCache.isOnCooldown) return;

    setBusyAction("regenerate");
    setError("");

    try {
      regenerateCache.markRequested();

      const response = await dispatchSoftwareLicensor<LicenseResponse>({
        action: "RegenerateLicense",
      });

      regenerateCache.setValue(response);
      licenseCache.setValue(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  }

  const license = licenseCache.value;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>My License</CardTitle>
          <CardDescription>
            View or regenerate your software license. License data is cached per signed-in account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {licenseCache.lastRequestAt && (
            <div className="rounded-md border p-3 text-sm">
              Last license request:{" "}
              {new Date(licenseCache.lastRequestAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </div>
          )}

          {licenseCache.isOnCooldown && (
            <div className="rounded-md border p-3 text-sm">
              Get License is on cooldown until {licenseCache.nextAvailableText}
            </div>
          )}

          {regenerateCache.lastRequestAt && (
            <div className="rounded-md border p-3 text-sm">
              Last regeneration request:{" "}
              {new Date(regenerateCache.lastRequestAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </div>
          )}

          {regenerateCache.isOnCooldown && (
            <div className="rounded-md border p-3 text-sm">
              Regenerate License is on cooldown until{" "}
              {regenerateCache.nextAvailableText}
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={getLicense}
              disabled={
                !userSub ||
                busyAction !== null ||
                licenseCache.isOnCooldown
              }
            >
              <RefreshCw className="mr-2 size-4" />
              {busyAction === "get" ? "Loading..." : "Get License"}
            </Button>

            <Button
              variant="destructive"
              onClick={regenerateLicense}
              disabled={
                !userSub ||
                busyAction !== null ||
                regenerateCache.isOnCooldown
              }
            >
              <RotateCcw className="mr-2 size-4" />
              {busyAction === "regenerate"
                ? "Regenerating..."
                : "Regenerate License"}
            </Button>
          </div>

          {license && (
            <div className="space-y-4 rounded-md border p-4">
              <div>
                <div className="text-sm text-muted-foreground">License code</div>
                <div className="break-all font-mono text-sm">
                  {license.license_code}
                </div>
              </div>

              {license.offline_code && (
                <div>
                  <div className="text-sm text-muted-foreground">Offline code</div>
                  <div className="break-all font-mono text-sm">
                    {license.offline_code}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="font-medium">Licensed products</div>

                {Object.entries(license.licensed_products).map(
                  ([productId, info]) => (
                    <div key={productId} className="rounded-md border p-3 text-sm">
                      <div className="break-all font-mono">{productId}</div>
                      <div>Type: {info.license_type}</div>
                      <div>Machine limit: {info.machine_limit}</div>
                      <div>Expiration / renewal: {info.expiration_or_renewal}</div>
                      <div>Online machines: {info.online_machines.length}</div>
                      <div>Offline machines: {info.offline_machines.length}</div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function GetLicensePage() {
  return (
    <RequireAuth>
      <InnerGetLicensePage />
    </RequireAuth>
  );
}