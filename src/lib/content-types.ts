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

export type FilterMap = Partial<Record<string, string[]>>;

export interface ContentRegistryEntry {
  label: string;
  basePath: string;
  getAll: () => ContentItem[];
}