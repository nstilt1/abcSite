import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/siteUrl";
import type { ContentItem } from "@/lib/content-types";

interface BuildItemMetadataParams {
  collection: string;
  item: ContentItem | null;
}

export function buildItemMetadata({
  collection,
  item,
}: BuildItemMetadataParams): Metadata {
  if (!item) {
    return {};
  }

  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/${collection}/${item.slug}`;

  const title = item.title || item.slug;
  const description =
    typeof item.shortDescription === "string" ? item.shortDescription : "";

  const images =
    typeof item.imagePath === "string" && item.imagePath.length > 0
      ? [`${siteUrl}${item.imagePath}`]
      : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images,
    },
    twitter: {
      card: images?.length ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}