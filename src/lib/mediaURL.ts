import { getSiteUrl } from "./siteUrl";

export function mediaURL(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string" || !path.trim()) {
    return null;
  }

  let normalizedPath = path.trim();

  if (normalizedPath.startsWith("/")) {
    normalizedPath = normalizedPath.slice(1);
  }

  const siteUrl = getSiteUrl();
  let cdn = "";

  if (siteUrl.includes("www")) {
    cdn = siteUrl.replace("www", "cdn2");
  } else if (siteUrl.includes("//")) {
    cdn = siteUrl.replace("//", "//cdn2.");
  } else {
    cdn = siteUrl;
  }

  return `${cdn}/media/${normalizedPath}`;
}