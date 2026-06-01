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

export default function MetadataTable({ rows, title = "At a glance" }: MetadataTableProps) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "")
  if (visible.length === 0) return null

  return (
    <Card className="mt-6 w-full p-0 overflow-hidden">
      {title && (
        <div className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground border-b">
          {title}
        </div>
      )}
      <Table>
        <TableBody>
          {visible.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="w-[160px] align-top font-medium whitespace-nowrap">
                {row.label}
              </TableCell>
              <TableCell className="align-top">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}