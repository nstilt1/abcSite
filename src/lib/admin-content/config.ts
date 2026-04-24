import { getEmptyDoc } from "./utils";
import { defineCollectionSchema } from "./types";
import type { CollectionSchema } from "./types";

export type DownloadEntry = {
  slug: string;
  title: string;
  shortDescription?: string;
  version?: string;
  imagePath?: string;
  thumbPath?: string;
  fileUrl?: string;
  platform?: string;
  tags?: string[];
  tiptap: ReturnType<typeof getEmptyDoc>;
};

export type BlogEntry = {
  slug: string;
  title: string;
  shortDescription?: string;
  imagePath?: string;
  thumbPath?: string;
  publishedAt?: string;
  author?: string;
  tags?: string[];
  tiptap: ReturnType<typeof getEmptyDoc>;
};

export type ProductEntry = {
  slug: string;
  title: string;
  shortDescription?: string;
  priceLabel?: string;
  imagePath?: string;
  thumbPath?: string;
  buyUrl?: string;
  tags?: string[];
  tiptap: ReturnType<typeof getEmptyDoc>;
};

export type WebAppEntry = {
  slug: string;
  title: string;
  shortDescription?: string;
  imagePath?: string;
  thumbPath?: string;
  appUrl?: string;
  tags?: string[];
  tiptap: ReturnType<typeof getEmptyDoc>;
};

export const downloadsSchema = defineCollectionSchema<DownloadEntry>({
  section: "downloads",
  title: "Downloads",
  fileName: "downloads.json",
  fields: [
    { key: "slug", label: "Slug", kind: "slug", category: "metadata", required: true },
    { key: "title", label: "Title", kind: "text", category: "metadata", required: true },
    { key: "shortDescription", label: "Short Description", kind: "textarea", category: "metadata", rows: 3 },
    { key: "version", label: "Version", kind: "text", category: "metadata" },
    { key: "platform", label: "Platform", kind: "text", category: "metadata" },
    { key: "fileUrl", label: "File URL", kind: "text", category: "metadata" },
    { key: "tags", label: "Tags", kind: "string-array-csv", category: "metadata" },
    { key: "imagePath", label: "Image Path", kind: "image", category: "image" },
    { key: "thumbPath", label: "Thumbnail Path", kind: "thumbnail", category: "thumbnail" },
  ],
  createEmpty: () => ({
    slug: `download-${Date.now()}`,
    title: "",
    shortDescription: "",
    version: "",
    imagePath: "",
    thumbPath: "",
    fileUrl: "",
    platform: "",
    tags: [],
    tiptap: getEmptyDoc(),
  }),
});

export const blogsSchema = defineCollectionSchema<BlogEntry>({
  section: "blogs",
  title: "Blogs",
  fileName: "blogs.json",
  fields: [
    { key: "slug", label: "Slug", kind: "slug", category: "metadata", required: true },
    { key: "title", label: "Title", kind: "text", category: "metadata", required: true },
    { key: "shortDescription", label: "Short Description", kind: "textarea", category: "metadata", rows: 3 },
    { key: "publishedAt", label: "Published At", kind: "date", category: "metadata" },
    { key: "author", label: "Author", kind: "text", category: "metadata" },
    { key: "tags", label: "Tags", kind: "string-array-csv", category: "metadata" },
    { key: "imagePath", label: "Image Path", kind: "image", category: "image" },
    { key: "thumbPath", label: "Thumbnail Path", kind: "thumbnail", category: "thumbnail" },
  ],
  createEmpty: () => ({
    slug: `blog-${Date.now()}`,
    title: "",
    shortDescription: "",
    imagePath: "",
    thumbPath: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    author: "",
    tags: [],
    tiptap: getEmptyDoc(),
  }),
});

export const productsSchema = defineCollectionSchema<ProductEntry>({
  section: "products",
  title: "Products",
  fileName: "products.json",
  fields: [
    { key: "slug", label: "Slug", kind: "slug", category: "metadata", required: true },
    { key: "title", label: "Title", kind: "text", category: "metadata", required: true },
    { key: "shortDescription", label: "Short Description", kind: "textarea", category: "metadata", rows: 3 },
    { key: "priceLabel", label: "Price Label", kind: "text", category: "metadata" },
    { key: "buyUrl", label: "Buy URL", kind: "text", category: "metadata" },
    { key: "tags", label: "Tags", kind: "string-array-csv", category: "metadata" },
    { key: "imagePath", label: "Image Path", kind: "image", category: "image" },
    { key: "thumbPath", label: "Thumbnail Path", kind: "thumbnail", category: "thumbnail" },
  ],
  createEmpty: () => ({
    slug: `product-${Date.now()}`,
    title: "",
    shortDescription: "",
    priceLabel: "",
    imagePath: "",
    thumbPath: "",
    buyUrl: "",
    tags: [],
    tiptap: getEmptyDoc(),
  }),
});

export const webAppsSchema = defineCollectionSchema<WebAppEntry>({
  section: "web-apps",
  title: "Web-apps",
  fileName: "web-apps.json",
  fields: [
    { key: "slug", label: "Slug", kind: "slug", category: "metadata", required: true },
    { key: "title", label: "Title", kind: "text", category: "metadata", required: true },
    { key: "shortDescription", label: "Short Description", kind: "textarea", category: "metadata", rows: 3 },
    { key: "appUrl", label: "App URL", kind: "text", category: "metadata" },
    { key: "tags", label: "Tags", kind: "string-array-csv", category: "metadata" },
    { key: "imagePath", label: "Image Path", kind: "image", category: "image" },
    { key: "thumbPath", label: "Thumbnail Path", kind: "thumbnail", category: "thumbnail" },
  ],
  createEmpty: () => ({
    slug: `web-app-${Date.now()}`,
    title: "",
    shortDescription: "",
    imagePath: "",
    thumbPath: "",
    appUrl: "",
    tags: [],
    tiptap: getEmptyDoc(),
  }),
});

export const sectionConfig = {
  downloads: downloadsSchema,
  blogs: blogsSchema,
  products: productsSchema,
  "web-apps": webAppsSchema,
} as const;

export function isAdminSectionKey(value: string): value is keyof typeof sectionConfig {
  return value in sectionConfig;
}

export type AnyAdminSchema =
  | CollectionSchema<DownloadEntry>
  | CollectionSchema<BlogEntry>
  | CollectionSchema<ProductEntry>
  | CollectionSchema<WebAppEntry>;