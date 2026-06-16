import { Card } from '@/components/ui/card'

const EM_DASH = '—'

export type Section = {
  description: string
  value: number | null
  footer: string | null
}

export function SectionCards({ sections }: { sections: Section[] }) {
  return (
    <div className="px-4 lg:px-6">
      <Card className="@container/card flex flex-col gap-0 divide-y p-0 @3xl/main:flex-row @3xl/main:divide-x @3xl/main:divide-y-0">
        {sections.map((s) => (
          <div key={s.description} className="flex flex-1 flex-col gap-3 p-5">
            <div className="text-muted-foreground text-xs">{s.description}</div>
            <div className="text-2xl font-normal tabular-nums">
              {s.value ?? EM_DASH}
            </div>
            <div className="text-muted-foreground font-mono text-xs">
              {s.footer ?? EM_DASH}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
