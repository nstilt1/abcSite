"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Plus, RefreshCw } from "lucide-react";

import { useCooldownCache } from "@/hooks/useCooldownCache";
import { dispatchSoftwareLicensor } from "@/lib/softwareLicensor/client";
import type {
  CreateOrUpdateProductResponse,
  ProductInfo,
  StoredProductData,
} from "@/lib/softwareLicensor/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FETCH_PRODUCTS_COOLDOWN_MS = 5 * 60 * 1000;

type ProductFormState = {
  productIdOrPrefix: string;
  productName: string;
  productVersion: string;
  maxMachines: number;
  isOfflineAllowed: boolean;
};

const emptyForm: ProductFormState = {
  productIdOrPrefix: "",
  productName: "",
  productVersion: "",
  maxMachines: 3,
  isOfflineAllowed: false,
};

function truncateMiddle(value: string, start = 18, end = 12): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function SoftwareLicensorProductsPage() {
  const productsCache = useCooldownCache<StoredProductData>(
    "softwareLicensor.storedProductData",
    FETCH_PRODUCTS_COOLDOWN_MS,
  );

  const storeCache = useCooldownCache<string>("softwareLicensor.storeId", 0);

  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  const [createForm, setCreateForm] = useState<ProductFormState>(emptyForm);
  const [updateForm, setUpdateForm] = useState<ProductFormState>(emptyForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const products = productsCache.value?.products ?? {};

  const productRows = useMemo(
    () =>
      Object.entries(products).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [products],
  );

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(""), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopy(value: string, label: string) {
    await copyToClipboard(value);
    setCopied(`${label} copied`);
  }

  async function fetchProducts() {
    if (productsCache.isOnCooldown) return;

    setBusy(true);
    setError("");
    setStatus("");

    try {
      productsCache.markRequested();

      const response = await dispatchSoftwareLicensor<StoredProductData>({
        action: "FetchStoredProductData",
      });

      productsCache.setValue(response);
      storeCache.setValue(response.store_id);
      setStatus("Product data fetched and cached.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function openUpdateDialog(productId: string, product: ProductInfo) {
    setEditingProductId(productId);
    setUpdateForm({
      productIdOrPrefix: productId,
      productName: product.product_name,
      productVersion: product.version,
      maxMachines: product.max_machines_per_license,
      isOfflineAllowed: product.is_offline_allowed,
    });
    setError("");
    setStatus("");
    setUpdateOpen(true);
  }

  async function submitCreateProduct() {
    await submitCreateOrUpdateProduct("create");
  }

  async function submitUpdateProduct() {
    await submitCreateOrUpdateProduct("update");
  }

  async function submitCreateOrUpdateProduct(mode: "create" | "update") {
    const form = mode === "create" ? createForm : updateForm;
    const existingProduct =
      mode === "update" && editingProductId ? products[editingProductId] : undefined;

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const response = await dispatchSoftwareLicensor<CreateOrUpdateProductResponse>({
        action: "CreateOrUpdateProduct",
        data: {
          product_id_or_prefix: form.productIdOrPrefix.trim(),
          product_name: form.productName.trim(),
          product_version: form.productVersion.trim(),
          max_machines:
            mode === "update"
              ? existingProduct?.max_machines_per_license ?? form.maxMachines
              : form.maxMachines,
          is_offline_allowed: form.isOfflineAllowed,
        },
      });

      productsCache.setValue((current) => {
        const currentProducts = current?.products ?? {};
        const oldProduct =
          currentProducts[response.product_id] ??
          (editingProductId ? currentProducts[editingProductId] : undefined);

        const nextProducts = { ...currentProducts };

        if (
          mode === "update" &&
          editingProductId &&
          editingProductId !== response.product_id
        ) {
          delete nextProducts[editingProductId];
        }

        nextProducts[response.product_id] = {
          product_name: form.productName.trim(),
          version: form.productVersion.trim(),
          is_offline_allowed: form.isOfflineAllowed,
          max_machines_per_license:
            mode === "update"
              ? oldProduct?.max_machines_per_license ?? form.maxMachines
              : form.maxMachines,
          public_key: response.product_pubkey,
        };

        return {
          store_id: current?.store_id ?? storeCache.value ?? "",
          products: nextProducts,
        };
      });

      setStatus(
        mode === "create"
          ? `Created product ${response.product_id}.`
          : `Updated product ${response.product_id}.`,
      );

      if (mode === "create") {
        setCreateOpen(false);
        setCreateForm(emptyForm);
      } else {
        setUpdateOpen(false);
        setEditingProductId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Software Licensor Products</CardTitle>
          <CardDescription>
            Fetch, create, and update licensed products. Product data is cached locally.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              {productsCache.value?.store_id && (
                <div>
                  Store ID: <strong>{productsCache.value.store_id}</strong>
                </div>
              )}

              {productsCache.lastRequestAt && (
                <div className="text-muted-foreground">
                  Last fetch:{" "}
                  {new Date(productsCache.lastRequestAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </div>
              )}

              {productsCache.isOnCooldown && (
                <div className="text-muted-foreground">
                  Fetch on cooldown until {productsCache.nextAvailableText}
                </div>
              )}

              {copied && <div>{copied}</div>}
              {status && <div>{status}</div>}
              {error && <div className="text-destructive">{error}</div>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={fetchProducts}
                disabled={busy || productsCache.isOnCooldown}
              >
                <RefreshCw className="mr-2 size-4" />
                {busy ? "Fetching..." : "Fetch Products"}
              </Button>

              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                Create Product
              </Button>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-md border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[230px]">Product ID</TableHead>
                  <TableHead className="w-[180px]">Name</TableHead>
                  <TableHead className="w-[110px]">Version</TableHead>
                  <TableHead className="w-[120px]">Max Machines</TableHead>
                  <TableHead className="w-[130px]">Offline</TableHead>
                  <TableHead>Public Key</TableHead>
                  <TableHead className="w-[110px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {productRows.map(([productId, product]) => (
                  <TableRow key={productId}>
                    <TableCell className="align-top">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="truncate font-mono text-xs"
                          title={productId}
                        >
                          {truncateMiddle(productId)}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() => handleCopy(productId, "Product ID")}
                          title="Copy product ID"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="truncate" title={product.product_name}>
                        {product.product_name}
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="truncate" title={product.version}>
                        {product.version}
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      {product.max_machines_per_license}
                    </TableCell>

                    <TableCell className="align-top">
                      {product.is_offline_allowed ? "Yes" : "No"}
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="truncate font-mono text-xs"
                          title={product.public_key}
                        >
                          {truncateMiddle(product.public_key, 24, 16)}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() => handleCopy(product.public_key, "Public key")}
                          title="Copy public key"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openUpdateDialog(productId, product)}
                      >
                        <Pencil className="mr-2 size-4" />
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {productRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No cached products yet. Click Fetch Products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>
              Creates a new product using CreateOrUpdateProduct.
            </DialogDescription>
          </DialogHeader>

          <ProductForm
            mode="create"
            value={createForm}
            onChange={setCreateForm}
            disabled={saving}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              onClick={submitCreateProduct}
              disabled={
                saving ||
                !createForm.productIdOrPrefix.trim() ||
                !createForm.productName.trim() ||
                !createForm.productVersion.trim()
              }
            >
              {saving ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Product</DialogTitle>
            <DialogDescription>
              Updates name, version, and offline activation. Max machines is preserved.
            </DialogDescription>
          </DialogHeader>

          <ProductForm
            mode="update"
            value={updateForm}
            onChange={setUpdateForm}
            disabled={saving}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              onClick={submitUpdateProduct}
              disabled={
                saving ||
                !updateForm.productIdOrPrefix.trim() ||
                !updateForm.productName.trim() ||
                !updateForm.productVersion.trim()
              }
            >
              {saving ? "Updating..." : "Update Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ProductForm({
  mode,
  value,
  onChange,
  disabled,
}: {
  mode: "create" | "update";
  value: ProductFormState;
  onChange: (value: ProductFormState) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${mode}-product-id-or-prefix`}>
          {mode === "create" ? "Product ID prefix" : "Product ID"}
        </Label>
        <Input
          id={`${mode}-product-id-or-prefix`}
          value={value.productIdOrPrefix}
          onChange={(event) =>
            onChange({ ...value, productIdOrPrefix: event.target.value })
          }
          disabled={disabled}
          placeholder="KALEIDOM"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-product-name`}>Name</Label>
        <Input
          id={`${mode}-product-name`}
          value={value.productName}
          onChange={(event) =>
            onChange({ ...value, productName: event.target.value })
          }
          disabled={disabled}
          placeholder="Kaleidomo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-product-version`}>Version</Label>
        <Input
          id={`${mode}-product-version`}
          value={value.productVersion}
          onChange={(event) =>
            onChange({ ...value, productVersion: event.target.value })
          }
          disabled={disabled}
          placeholder="1.0.0"
        />
      </div>

      {mode === "create" ? (
        <div className="space-y-2">
          <Label htmlFor="create-max-machines">Max machines per license</Label>
          <Input
            id="create-max-machines"
            type="number"
            min={1}
            value={value.maxMachines}
            onChange={(event) =>
              onChange({
                ...value,
                maxMachines: Math.max(1, Number(event.target.value)),
              })
            }
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          Max machines per license is preserved at{" "}
          <strong>{value.maxMachines}</strong>.
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={value.isOfflineAllowed}
          onCheckedChange={(checked) =>
            onChange({ ...value, isOfflineAllowed: checked === true })
          }
          disabled={disabled}
        />
        Offline activation allowed
      </label>
    </div>
  );
}