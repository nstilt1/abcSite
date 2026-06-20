import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

export interface MetadataRow {
  label: string
  value: React.ReactNode
}

interface MetadataTableProps {
  rows: MetadataRow[]
  title?: string
}

export default function MetadataTable({ rows, title = "" }: MetadataTableProps) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "")
  if (visible.length === 0) return null

  return (
    <Card className="mt-6 w-full p-0 overflow-hidden">
      {title && (
        <div className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground border-b">
          {title}
        </div>
      )}
      {/* max-w-0 on the value cell is the CSS table trick that lets auto layout
          distribute width from the container rather than content — the label
          column sizes to fit its text, the value column gets the rest.
          break-words handles long values that wrap; truncate on inline content
          (like the source URL) clips with ellipsis within that budget.       */}
      <Table>
        <TableBody>
          {visible.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="w-px whitespace-nowrap align-top font-medium pr-6">
                {row.label}
              </TableCell>
              <TableCell className="align-top whitespace-normal break-words max-w-0">
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}