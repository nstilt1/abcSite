"use client"

import { useEffect, useState } from "react"

interface PublishedMetaProps {
  isoDate: string
  author?: string
}

/**
 * Renders "By <author> · <date in user's local timezone>"
 * Falls back gracefully if the date is invalid.
 */
export default function PublishedMeta({ isoDate, author }: PublishedMetaProps) {
  const [formatted, setFormatted] = useState<string>("")

  useEffect(() => {
    if (!isoDate) return
    try {
      const d = new Date(isoDate)
      setFormatted(
        d.toLocaleString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      )
    } catch {
      setFormatted(isoDate)
    }
  }, [isoDate])

  const parts: string[] = []
  if (author) parts.push(`By ${author}`)
  if (formatted) parts.push(formatted)

  if (parts.length === 0) return null

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {parts.join(" · ")}
    </p>
  )
}