import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface PaperRow {
  entryId: string
  paperId: string
  title: string
  authors: string
  year: number
  keywords: string
  addedAt: Date
}

// Full class names so Tailwind doesn't purge them
const ACCENT_COLORS = [
  'bg-orange-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-violet-500',
  'bg-teal-400',
  'bg-pink-400',
  'bg-blue-500',
  'bg-emerald-400',
  'bg-yellow-400',
] as const

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatAuthors(raw: string): string {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return raw
  const words = parts[0].split(' ').filter(Boolean)
  const abbreviated =
    words.length >= 2
      ? `${words[0][0]}. ${words[words.length - 1]}`
      : parts[0]
  const extra = parts.length - 1
  return extra > 0 ? `${abbreviated}, +${extra}` : abbreviated
}

function formatKeywords(raw: string): string {
  return raw
    .split(',')
    .map((k) => `#${k.trim().toLowerCase().replace(/\s+/g, '-')}`)
    .filter((k) => k !== '#')
    .join(' ')
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
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[42%] min-w-[200px] pl-0 text-xs uppercase tracking-wide">
              Title
            </TableHead>
            <TableHead className="w-[22%] min-w-[120px] text-xs uppercase tracking-wide">
              Authors
            </TableHead>
            <TableHead className="w-16 text-xs uppercase tracking-wide">
              Year
            </TableHead>
            <TableHead className="w-20 text-xs uppercase tracking-wide">
              Shared
            </TableHead>
            <TableHead className="w-32 pr-0 text-xs uppercase tracking-wide">
              Added
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length]
            const keywords = formatKeywords(row.keywords)
            return (
              <TableRow key={row.entryId}>
                <TableCell className="pl-0">
                  <div className="flex items-start gap-2.5">
                    <div className={cn('mt-[3px] w-[3px] shrink-0 self-stretch rounded-full', accent)} />
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-snug">{row.title}</p>
                      {keywords && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {keywords}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatAuthors(row.authors)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.year}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  —
                </TableCell>
                <TableCell className="pr-0 tabular-nums text-sm text-muted-foreground">
                  {formatDate(row.addedAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
