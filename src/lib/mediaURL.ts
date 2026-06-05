/**
 * Resolves a CDN asset path to a full URL using NEXT_PUBLIC_CDN_URL.
 *
 * - If `path` is already an absolute URL (http/https), returns it unchanged.
 * - Otherwise prepends NEXT_PUBLIC_CDN_URL (trailing slash stripped).
 * - Returns null for empty/nullish input so callers can conditionally render.
 */
export function mediaURL(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string" || !path.trim()) return null

  const trimmed = path.trim()

  // Already absolute – trust it
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  const base = (process.env.NEXT_PUBLIC_CDN_URL ?? "").replace(/\/+$/, "")
  const rel  = trimmed.startsWith("/") ? trimmed : `/${trimmed}`

  return `${base}${rel}`
}

/**
 * Normalises a source-code URL field that may be:
 *   - A full URL:             "https://github.com/owner/repo"
 *   - A GitHub shorthand:     "owner/repo"
 *
 * Returns null for empty inputs.
 */
export function resolveSourceCodeUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string" || !value.trim()) return null

  const trimmed = value.trim()

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  // owner/repo shorthand — exactly one slash, no spaces
  if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
    return `https://github.com/${trimmed}`
  }

  return trimmed
}