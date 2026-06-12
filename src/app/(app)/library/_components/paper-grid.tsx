import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { formatAuthors } from './format'
import { type PaperRow, ACCENT_COLORS } from './paper-table'

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
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, i) => {
          const accent = ACCENT_COLORS[i % ACCENT_COLORS.length]
          const keywords = parseKeywords(row.keywords).slice(0, 2)
          return (
            <Card
              key={row.entryId}
              className="relative flex min-h-[130px] cursor-pointer flex-col overflow-hidden transition-colors hover:border-border/80"
            >
              <div className={cn('absolute inset-y-0 left-0 w-[3px]', accent)} />
              <div className="flex flex-1 flex-col p-4 pb-3.5">
                {/* pinned top */}
                <p className="font-mono text-xs text-muted-foreground">
                  {row.year} · {formatAuthors(row.authors)}
                </p>
                {/* middle content */}
                <h3 className="mt-[10px] line-clamp-3 text-[14px] font-medium leading-[1.35] tracking-[-0.005em]">
                  {row.title}
                </h3>
                <p className="mt-[10px] truncate text-xs text-foreground/70">
                  {row.synopsis}
                </p>
                {/* flexible spacer — min 15px, grows with card height */}
                <div className="min-h-[15px] flex-1" />
                {/* pinned bottom */}
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-[3px] bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground"
                      >
                        #{k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
