// ─── Downloads / Software Products ─────────────────────────────────────────

/**
 * license_mode controls how the download page presents this software:
 *  - "free"         : no license needed, download links shown freely
 *  - "optional"     : works without a license but with restrictions; download
 *                     links always shown + optional license purchase section
 *  - "required"     : a valid license must be purchased before use; download
 *                     links are still shown (installer), license section is
 *                     prominent
 */
export type LicenseMode = "free" | "optional" | "required"

/**
 * A single license type entry.
 * `priceId`    – Stripe price ID
 * `priceCents` – display price in cents (set by admin, stored alongside priceId)
 * `label`      – human-readable name e.g. "Perpetual", "Trial"
 */
export interface LicensePriceEntry {
  priceId: string
  priceCents: number
}

export interface SoftwareLicensorAttributes {
  software_licensor_product_id: string
  /**
   * Map of license type label → { priceId, priceCents }
   * e.g. { "Perpetual": { priceId: "price_xxx", priceCents: 2999 } }
   *
   * For backwards compat the value may also be a plain string (old format).
   * Consumers should use the `parseLicenseEntry` helper.
   */
  software_licensor_license_types: Record<string, LicensePriceEntry | string>
  /** Controls how the software is gated. Defaults to "free" when absent. */
  license_mode?: LicenseMode
}

/** Type A – single cross-platform download link */
export interface DownloadInfoAllPlatforms {
  allPlatformsDownloadLink: string
  allPlatformsDownloadSha256: string
}

/** Type B – per-platform download links */
export interface DownloadInfoPerPlatform {
  windowsDownloadLink?: string
  windowsDownloadSha256?: string
  macosDownloadLink?: string
  macosDownloadSha256?: string
  linuxDownloadLink?: string
  linuxDownloadSha256?: string
}

/** A single labeled link, e.g. { label: "Google Chrome", url: "https://chrome.google.com/webstore/..." } */
export interface WebExtensionLink {
  label: string
  url: string
}

/** Type C – browser extension, distributed via store links rather than a direct file download */
export interface DownloadInfoWebExtension {
  webExtensionLinks: WebExtensionLink[]
}

export type DownloadInfo =
  | DownloadInfoAllPlatforms
  | DownloadInfoPerPlatform
  | DownloadInfoWebExtension

export function isAllPlatforms(d: DownloadInfo): d is DownloadInfoAllPlatforms {
  return "allPlatformsDownloadLink" in d
}

export function isWebExtension(d: DownloadInfo): d is DownloadInfoWebExtension {
  return "webExtensionLinks" in d
}

export function isPhysicalKaleidomo(p: Product): p is PhysicalKaleidomoProduct {
  return p.type === "physical_kaleidomo"
}
/** Normalise the dual old-string / new-object license entry format */
export function parseLicenseEntry(
  val: LicensePriceEntry | string
): LicensePriceEntry {
  if (typeof val === "string") return { priceId: val, priceCents: 0 }
  return val
}

export interface Download {
  name: string
  slug: string
  /** Tiptap JSON document */
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  dateAdded?: string
  version?: string
  visible: boolean
  sourceCodeUrl?: string
  downloadInfo: DownloadInfo
  software_licensor?: SoftwareLicensorAttributes | null
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface SoftwareProduct {
  type: "software"
  name: string
  slug: string
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  /** Derived from downloads.json where software_licensor != null */
  software_licensor: SoftwareLicensorAttributes
}

export interface InventoriedProduct {
  type: "inventoried"
  name: string
  slug: string
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  stock: number
}

export interface ApiDrivenProduct {
  type: "api_driven"
  name: string
  slug: string
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  endpointURL: string
  sourceImage: string
}

// ─── Physical (Printify) Products ─────────────────────────────────────────────

/**
 * Mirrors the CircleConfig shape from KaleidomoPageClient.tsx so admin-entered
 * presets are drop-in compatible with the existing WASM control code.
 */
export interface CircleConfig {
  heroCircleLeftX: number
  heroCircleRightX: number
  heroCircleY: number
  heroDesiredLeftRotation: number
}

/**
 * Mirrors the Preset shape from KaleidomoPageClient.tsx (see that file for
 * field semantics — animationDuration is an oscillator period, not a timer).
 */
export interface KaleidomoPreset {
  name: string
  imageIndex: number
  circle: CircleConfig
  orientationBaseSpeed: number
  animationDuration: number
  zoomMax: number
  zoomMin: number
  numZoomLoops: number
  rotationRange: number
  rotationCycles: number
  rotationFn: string
  hueRange: number
  hueCycles: number
  hueFn: string
  hueRotation: number
  tileCount: number
  offsetX: number
  offsetY: number
}

/** Which blank product this design gets printed on via Printify. */
export type MockupType = "hoodie" | "tshirt" | "tapestry"

export interface PhysicalKaleidomoProduct {
  type: "physical_kaleidomo"
  name: string
  slug: string
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  /** Source image the kaleidoscope pattern is generated from (same as SOURCE_IMAGES entries). */
  sourceImageUrl: string
  mockupType: MockupType
  /** Stripe price ID for checkout. */
  priceId: string
  /** Display price in cents. */
  priceCents: number
  /** Printify blueprint/print-provider identifiers needed to submit an order. */
  printifyBlueprintId: number
  printifyPrintProviderId: number
  printifyVariantId: number
  /** Selectable starting configurations, same shape as the web app's PRESETS array. */
  presets: KaleidomoPreset[]
}

export type Product =
  | SoftwareProduct
  | InventoriedProduct
  | ApiDrivenProduct
  | PhysicalKaleidomoProduct

// ─── Web Apps ─────────────────────────────────────────────────────────────────

export interface WebApp {
  name: string
  slug: string
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  urls: string[]
  sourceCodeLink?: string
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export interface Blog {
  name: string
  slug: string
  tiptap: object
  thumbnailUrl?: string
  heroImageUrl?: string
  shortDescription?: string
  keywords: string[]
  /** ISO 8601 datetime string (UTC), e.g. "2025-06-23T14:30:00.000Z" */
  date: string
  /** Display name of the author at publish time */
  author?: string
}

// ─── Admin section registry ───────────────────────────────────────────────────

export type AdminSection = "downloads" | "products" | "blogs" | "webapps"

export interface AdminSectionConfig {
  label: string
  section: AdminSection
  description: string
}