import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Paper {
  entryId: string
  paperId: string
  title: string
  authors: string
  year: number
  keywords: string
  synopsis: string
}

interface ContinueReadingProps {
  papers: Paper[]
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
}

export function ContinueReading({ papers }: ContinueReadingProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          continue reading
        </span>
      </div>
      {papers.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <BookOpen className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium">No papers opened yet</p>
          <p className="text-muted-foreground font-mono text-xs max-w-xs">
            Papers you open appear here so you can pick up where you left off.
          </p>
        </Card>
      ) : (
      <Card className="gap-0 divide-y p-0">
        {papers.map((paper) => (
          <Link
            key={paper.entryId}
            href={`/library/${paper.paperId}`}
            className="block p-5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h2 className="truncate text-sm font-normal leading-snug">{paper.title}</h2>
                  <p className="text-muted-foreground font-mono text-xs truncate">
                    {paper.authors}
                  </p>
                </div>
                {paper.year ? (
                  <span className="text-muted-foreground font-mono text-xs shrink-0">
                    {paper.year}
                  </span>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs truncate leading-relaxed">
                {paper.synopsis}
              </p>
              {(() => {
                const keywords = parseKeywords(paper.keywords)
                return keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="bg-pill rounded-[3px] px-1.5 py-px font-mono text-xs text-muted-foreground"
                      >
                        #{k}
                      </span>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          </Link>
        ))}
      </Card>
      )}
    </div>
  )
}
