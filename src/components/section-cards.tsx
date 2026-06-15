import { Card } from '@/components/ui/card'

type Section = {
  description: string
  value: string
  footer: string
}

const sections: Section[] = [
  { description: 'LIBRARY', value: '0', footer: '3 added this week' },
  { description: 'SHARED WITH YOU', value: '0', footer: 'across 4 orgs' },
  { description: 'ORGS', value: '—', footer: '1 as admin' },
  { description: 'AI FEATURED USE', value: '0', footer: 'premium · this month' },
]

export function SectionCards() {
  return (
    <div className="px-4 lg:px-6">
      <Card className="@container/card flex flex-col gap-0 divide-y p-0 @3xl/main:flex-row @3xl/main:divide-x @3xl/main:divide-y-0">
        {sections.map((s) => (
          <div key={s.description} className="flex flex-1 flex-col gap-3 p-4">
            <div className="text-muted-foreground text-sm">{s.description}</div>
            <div className="text-2xl font-normal tabular-nums">{s.value}</div>
            <div className="text-muted-foreground font-mono text-xs">{s.footer}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}
