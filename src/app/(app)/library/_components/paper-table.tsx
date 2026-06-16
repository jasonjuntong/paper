import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatAuthors, formatKeywords } from './format'

export interface PaperRow {
  entryId: string
  paperId: string
  title: string
  authors: string
  year: number
  keywords: string
  synopsis: string
  addedAt: Date
  shared: boolean
}

interface PaperTableProps {
  rows: PaperRow[]
}

export function PaperTable({ rows }: PaperTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 lg:px-6">
        <p className="text-sm text-muted-foreground">
          Your library is empty. Upload a paper to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted">
            <TableHead className="w-[42%] min-w-50 pl-5 text-xs uppercase tracking-wide">
              Title
            </TableHead>
            <TableHead className="w-[22%] min-w-50 text-xs uppercase tracking-wide">
              Authors
            </TableHead>
            <TableHead className="w-16 text-xs uppercase tracking-wide">
              Year
            </TableHead>
            <TableHead className="w-20 text-xs uppercase tracking-wide">
              Shared
            </TableHead>
            <TableHead className="w-32 pr-5 text-xs uppercase tracking-wide">
              Added
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const keywords = formatKeywords(row.keywords)
            return (
              <TableRow key={row.entryId}>
                <TableCell className="pl-5">
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-base leading-snug">{row.title}</p>
                      {keywords && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {keywords}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatAuthors(row.authors)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.year}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  —
                </TableCell>
                <TableCell className="pr-5 tabular-nums text-xs text-muted-foreground">
                  {formatDate(row.addedAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
