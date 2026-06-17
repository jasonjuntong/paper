import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatAuthors } from './format'
import { type PaperRow } from './paper-table'

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
}

interface PaperGridProps {
  rows: PaperRow[]
}

export function PaperGrid({ rows }: PaperGridProps) {
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
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const keywords = parseKeywords(row.keywords).slice(0, 2)
          return (
            <Link key={row.entryId} href={`/library/${row.paperId}`}>
            <Card
              className="relative flex min-h-32.5 cursor-pointer flex-col overflow-hidden p-4 transition-colors hover:bg-[oklch(0.9491_0.0041_91.616)] hover:border-border/80"
            >
              <div className="flex flex-1 flex-col">
                {/* pinned top */}
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {formatAuthors(row.authors)}
                  </p>
                  {row.year ? (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {row.year}
                    </span>
                  ) : null}
                </div>
                {/* middle content */}
                <h3 className="font-base mt-1 line-clamp-3 leading-[1.35] tracking-[-0.005em]">
                  {row.title}
                </h3>
                <p className="mt-1 truncate text-xs text-foreground/70">
                  {row.synopsis}
                </p>
                {/* flexible spacer — min 15px, grows with card height */}
                <div className="min-h- flex-1" />
                {/* pinned bottom */}
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="bg-pill rounded-[3px] px-1.5 py-px text-xs text-muted-foreground"
                      >
                        #{k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
