import Link from 'next/link'
import { Card } from '@/components/ui/card'

const EM_DASH = '—'

export type Section = {
  description: string
  value: number | null
  footer: string | null
  href?: string
}

export function SectionCards({ sections }: { sections: Section[] }) {
  return (
    <div className="px-4 lg:px-6">
      <Card className="@container/card flex flex-col gap-0 divide-y p-0 @3xl/main:flex-row @3xl/main:divide-x @3xl/main:divide-y-0">
        {sections.map((s) => {
          const body = (
            <>
              <div className="text-muted-foreground text-xs uppercase">{s.description}</div>
              <div className="text-2xl font-normal tabular-nums">
                {s.value ?? EM_DASH}
              </div>
              <div className="text-muted-foreground font-mono text-xs">
                {s.footer}
              </div>
            </>
          )

          return s.href ? (
            <Link
              key={s.description}
              href={s.href}
              className="flex flex-1 flex-col gap-3 p-5 transition-colors hover:bg-pill"
            >
              {body}
            </Link>
          ) : (
            <div
              key={s.description}
              className="flex flex-1 flex-col gap-3 p-5 transition-colors hover:bg-pill"
            >
              {body}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
