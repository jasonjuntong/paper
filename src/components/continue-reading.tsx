import Link from 'next/link'
import { Card } from '@/components/ui/card'

interface Paper {
  entryId: string
  paperId: string
  title: string
  authors: string
  synopsis: string
  progress?: number
}

interface ContinueReadingProps {
  papers: Paper[]
}

export function ContinueReading({ papers }: ContinueReadingProps) {
  if (!papers.length) return null

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          continue reading
        </span>
        <Link href="/library" className="text-muted-foreground hover:text-foreground text-xs transition-colors">
          Library
        </Link>
      </div>
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
                  <p className="text-muted-foreground font-mono text-xs">{paper.authors}</p>
                </div>
                <span className="text-muted-foreground font-mono text-xs shrink-0">
                  {paper.progress ?? 0}%
                </span>
              </div>
              <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                {paper.synopsis}
              </p>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  )
}
