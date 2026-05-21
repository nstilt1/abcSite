export type CollectionName = "downloads" | "blogs" | "products" | "webapps";

export interface ContentItem {
  slug: string;
  title?: string;
  shortDescription?: string;
  imagePath?: string;
  languages?: string[];
  frameworks?: string[];
  tags?: string[];
  status?: string;
  [key: string]: unknown;
}

export interface ExtendedItem extends ContentItem {
  type: CollectionName;
  url?: string;
  priceCents?: number;
  productId?: string;
  softwarelicensor?: {
    licenses: ("perpetual" | "trial" | "subscription")[];
  };
  downloads?: {
    platform: string;
    url: string;
    sha256: string;
  }[];
}

export type FilterMap = Partial<Record<string, string[]}>;


export interface ContentRegistryEntry {
  label: string;
  basePath: string;
  getAll: () => ContentItem[];
}