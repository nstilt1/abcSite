"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/RequireAuth";
import { useCooldownCache } from "@/hooks/useCooldownCache";
import { dispatchSoftwareLicensor } from "@/lib/softwareLicensor/client";
import type { LicenseInfo, LicenseResponse, Machine } from "@/lib/softwareLicensor/types";

import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────

const GET_LICENSE_COOLDOWN_MS    = 5 * 60 * 1000;            // 5 minutes
const REGENERATE_COOLDOWN_MS     = 14 * 24 * 60 * 60 * 1000; // 2 weeks

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function maskLicenseCode(code: string, revealed: boolean): string {
  if (revealed) return code;
  return code
    .split("-")
    .map((seg, i) => (i === 0 ? seg : seg.replace(/[^-]/g, "*")))
    .join("-");
}

function formatExpiration(raw: string): string {
  if (!raw || raw === "0") return "Not yet set";
  if (/^\d+$/.test(raw)) {
    const ts = parseInt(raw, 10);
    if (ts === 0) return "Not yet set";
    return new Date(ts * 1000).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return raw;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSeconds = Math.ceil(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0)    return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0)   return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ─── MachineTable ─────────────────────────────────────────────────────────────

function MachineTable({ offline, online }: { offline: Machine[]; online: Machine[] }) {
  const rows = [
    ...offline.map((m) => ({ machine: m, method: "offline" as const })),
    ...online.map((m) => ({ machine: m, method: "online" as const })),
  ];

  if (rows.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground italic">
        No machines activated yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
            <th className="py-2 px-3 text-left font-medium">Machine ID</th>
            <th className="py-2 px-3 text-left font-medium">Computer Name</th>
            <th className="py-2 px-3 text-left font-medium">OS</th>
            <th className="py-2 px-3 text-left font-medium">Activation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ machine, method }, idx) => (
            <tr
              key={`${machine.id}-${idx}`}
              className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                {machine.id.slice(0, 12)}
              </td>
              <td className="py-2 px-3 break-words max-w-[180px]">
                {machine.computer_name}
              </td>
              <td className="py-2 px-3 text-muted-foreground">{machine.os}</td>
              <td className="py-2 px-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    method === "online"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  }`}
                >
                  {method}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LicensesClientProps {
  /**
   * Map of software_licensor_product_id → human-readable product name,
   * built server-side from downloads.json so no extra client fetch is needed.
   */
  productNames: Record<string, string>;
}

// ─── Inner page (rendered only when authenticated) ────────────────────────────

function InnerLicensesPage({ productNames }: LicensesClientProps) {
  const [userSub, setUserSub] = useState<string | null>(null);
  const [subError, setSubError] = useState("");
  const [busyAction, setBusyAction] = useState<"get" | "regenerate" | null>(null);
  const [fetchError, setFetchError] = useState("");

  const [revealed, setRevealed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ── Resolve Cognito sub for per-user cache keys ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchUserAttributes()
      .then((attrs) => {
        if (!cancelled) {
          if (!attrs.sub) {
            setSubError("Unable to determine signed-in user ID.");
          } else {
            setUserSub(attrs.sub);
          }
        }
      })
      .catch((err) => {
        if (!cancelled)
          setSubError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, []);

  // ── Per-user cache keys ───────────────────────────────────────────────────
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
    REGENERATE_COOLDOWN_MS,
  );

  // ── Auto-fetch once sub + cache are ready ────────────────────────────────
  useEffect(() => {
    if (!userSub || !licenseCache.isLoaded) return;
    if (licenseCache.value && licenseCache.isOnCooldown) return;
    getLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSub, licenseCache.isLoaded]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function getLicense() {
    if (!userSub || licenseCache.isOnCooldown || busyAction) return;
    setBusyAction("get");
    setFetchError("");
    try {
      licenseCache.markRequested();
      const response = await dispatchSoftwareLicensor<LicenseResponse>({ action: "GetLicense" });
      licenseCache.setValue(response);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function regenerateLicense() {
    if (!userSub || regenerateCache.isOnCooldown || busyAction) return;
    setBusyAction("regenerate");
    setFetchError("");
    try {
      regenerateCache.markRequested();
      const response = await dispatchSoftwareLicensor<LicenseResponse>({ action: "RegenerateLicense" });
      regenerateCache.setValue(response);
      licenseCache.setValue(response);
      toast.success("License code regenerated successfully.");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success("Your license code has been copied to your clipboard."))
      .catch(() => toast.error("Failed to copy to clipboard."));
  }

  function toggleRow(productId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  }

  // ── Derived render values ─────────────────────────────────────────────────
  const license   = licenseCache.value;
  const products  = license ? Object.entries(license.licensed_products) : [];
  const maskedCode = license ? maskLicenseCode(license.license_code, revealed) : null;
  const isLoading  = !licenseCache.isLoaded || (busyAction === "get" && !license);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight">Your License</h1>

        {licenseCache.isOnCooldown && (
          <p className="text-xs text-muted-foreground self-center">
            Data refreshes in{" "}
            <span className="font-mono tabular-nums">
              {formatCountdown(licenseCache.remainingMs)}
            </span>
          </p>
        )}
      </div>

      {/* ── Errors ── */}
      {(subError || fetchError) && (
        <p className="text-sm text-destructive">{subError || fetchError}</p>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading license data…
        </p>
      )}

      {/* ── License code block ── */}
      {maskedCode && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            License Code
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span
              onClick={() => copyToClipboard(license!.license_code)}
              title="Click to copy"
              className="inline-block rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-sm tracking-wider cursor-pointer select-all hover:bg-muted transition-colors active:scale-[0.98]"
            >
              {maskedCode}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Hide license code" : "Reveal license code"}
            >
              {revealed ? <EyeOff className="size-4 mr-1.5" /> : <Eye className="size-4 mr-1.5" />}
              {revealed ? "Hide" : "Reveal"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(license!.license_code)}
            >
              <Copy className="size-4 mr-1.5" />
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* ── Licensed products table ── */}
      {!isLoading && license && (
        products.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No licensed products found.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_120px_160px_24px] gap-x-4 items-center px-4 py-2.5 border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Product</span>
              <span>License Type</span>
              <span>Machine Limit</span>
              <span>Expiration</span>
              <span />
            </div>

            {products.map(([productId, info]: [string, LicenseInfo]) => {
              const isExpanded    = expandedRows.has(productId);
              const machineCount  = info.offline_machines.length + info.online_machines.length;
              // Prefer the human-readable name from downloads.json; fall back to
              // the raw product ID only if no mapping exists.
              const displayName   = productNames[productId] ?? productId;

              return (
                <div key={productId} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleRow(productId)}
                    className="w-full grid grid-cols-[1fr_140px_120px_160px_24px] gap-x-4 items-center px-4 py-3.5 text-left text-sm hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="font-medium break-words leading-snug">
                      {displayName}
                    </span>
                    <span className="text-muted-foreground capitalize">
                      {info.license_type}
                    </span>
                    <span className="text-muted-foreground">
                      {machineCount}&thinsp;/&thinsp;{info.machine_limit}
                    </span>
                    <span className="text-muted-foreground">
                      {formatExpiration(info.expiration_or_renewal)}
                    </span>
                    <span className="text-muted-foreground">
                      {isExpanded
                        ? <ChevronDown className="size-4" />
                        : <ChevronRight className="size-4" />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/50 bg-muted/20 px-2 py-2">
                      <MachineTable
                        offline={info.offline_machines}
                        online={info.online_machines}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Offline machine notice ── */}
      {!isLoading && license && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
          <p>
            <strong>Note:</strong> Offline-activated machines cannot be removed from your
            license — neither by regenerating your license code nor by deactivating via the app.
          </p>
          <p className="text-xs opacity-80">
            License regeneration can only be performed once every two weeks.
          </p>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-3">
        {!licenseCache.isOnCooldown && (
          <Button
            variant="outline"
            onClick={getLicense}
            disabled={!userSub || busyAction !== null}
          >
            <RefreshCw className={`size-4 mr-2 ${busyAction === "get" ? "animate-spin" : ""}`} />
            {busyAction === "get" ? "Loading…" : "Refresh License"}
          </Button>
        )}

        <Button
          variant="destructive"
          onClick={regenerateLicense}
          disabled={!userSub || busyAction !== null || regenerateCache.isOnCooldown}
        >
          <RotateCcw className={`size-4 mr-2 ${busyAction === "regenerate" ? "animate-spin" : ""}`} />
          {busyAction === "regenerate" ? "Regenerating…" : "Regenerate License"}
        </Button>

        {regenerateCache.isOnCooldown && (
          <p className="text-xs text-muted-foreground">
            Available again in{" "}
            <span className="font-mono tabular-nums">
              {formatCountdown(regenerateCache.remainingMs)}
            </span>
          </p>
        )}
      </div>

    </main>
  );
}

// ─── Exported client component ────────────────────────────────────────────────

export default function LicensesClient({ productNames }: LicensesClientProps) {
  return (
    <RequireAuth>
      <InnerLicensesPage productNames={productNames} />
    </RequireAuth>
  );
}