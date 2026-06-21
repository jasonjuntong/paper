import Link from 'next/link'
import { Card } from '@/components/ui/card'

// Authors are stored as a single comma-joined string; show a compact lead author.
function formatAuthors(raw: string): string {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return raw
  const words = parts[0].split(' ').filter(Boolean)
  const lead =
    words.length >= 2 ? `${words[0][0]}. ${words[words.length - 1]}` : parts[0]
  const extra = parts.length - 1
  return extra > 0 ? `${lead} +${extra}` : lead
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
}

export interface PaperCardProps {
  title: string
  authors: string
  year: number | string | null
  synopsis: string
  keywords: string
  // Max keyword pills to render (default 2).
  maxKeywords?: number
  // If set, the whole card becomes a link to this href.
  href?: string
  // Optional slot appended below the card body — e.g. an action button.
  footer?: React.ReactNode
}

export function PaperCard({
  title,
  authors,
  year,
  synopsis,
  keywords,
  maxKeywords = 2,
  href,
  footer,
}: PaperCardProps) {
  const kw = parseKeywords(keywords).slice(0, maxKeywords)

  const card = (
    <Card className="relative flex cursor-pointer flex-col gap-1 overflow-hidden p-4 transition-colors hover:bg-[oklch(0.9491_0.0041_91.616)] hover:border-border/80">
      {/* author · year */}
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-mono text-xs text-muted-foreground">
          {formatAuthors(authors)}
        </p>
        {year ? (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {year}
          </span>
        ) : null}
      </div>
      <h3 className="font-base line-clamp-3 leading-[1.35] tracking-[-0.005em]">
        {title}
      </h3>
      <p className="truncate text-xs text-foreground/70">{synopsis}</p>
      {kw.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {kw.map((k) => (
            <span
              key={k}
              className="bg-pill rounded-[3px] px-1.5 py-px text-xs text-muted-foreground"
            >
              #{k}
            </span>
          ))}
        </div>
      )}
      {footer}
    </Card>
  )

  return href ? <Link href={href}>{card}</Link> : card
}
