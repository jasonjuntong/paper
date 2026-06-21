import { PaperCard } from '@/components/paper-card'
import { type PaperRow } from './paper-table'

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
      <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <PaperCard
            key={row.entryId}
            href={`/library/${row.paperId}`}
            title={row.title}
            authors={row.authors}
            year={row.year}
            synopsis={row.synopsis}
            keywords={row.keywords}
          />
        ))}
      </div>
    </div>
  )
}
