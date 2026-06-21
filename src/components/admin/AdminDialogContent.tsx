/**
 * AdminDialogContent
 *
 * A wider variant of DialogContent for admin edit forms.
 * The base DialogContent has `sm:max-w-md` baked in, which tailwind-merge
 * cannot override with a bare `max-w-4xl` because they target different
 * breakpoints. Passing `sm:max-w-4xl` here targets the same breakpoint so
 * tailwind-merge deduplicates correctly, without touching the shared dialog.tsx.
 */
import * as React from "react"
import { DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function AdminDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn("sm:max-w-4xl max-h-[90vh] overflow-y-auto", className)}
      {...props}
    />
  )
}