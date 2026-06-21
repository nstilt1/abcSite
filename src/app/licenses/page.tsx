import { getSoftwareDownloads } from "@/lib/contentStore";
import LicensesClient from "./LicensesClient";

/**
 * Build a productId → product name lookup from downloads.json at request time.
 * This runs on the server so no extra client-side fetch is needed.
 */
function buildProductNameMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const download of getSoftwareDownloads()) {
    const productId = download.software_licensor?.software_licensor_product_id;
    if (productId) {
      map[productId] = download.name;
    }
  }
  return map;
}

export default function LicensesPage() {
  const productNames = buildProductNameMap();
  return <LicensesClient productNames={productNames} />;
}