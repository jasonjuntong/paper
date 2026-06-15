import { Card } from '@/components/ui/card'

type Activity =
  | { type: 'shared'; actor: string; paper: string; org: string; time: string }
  | { type: 'joined'; actor: string; org: string; time: string }
  | { type: 'added'; actor: string; paper: string; time: string }

const activities: Activity[] = [
  { type: 'shared', actor: 'F. Park', paper: 'Mixture-of-Experts Routing Stability…', org: 'RL Reading Club', time: '34m' },
  { type: 'joined', actor: 'M. Larsen', org: 'CogSci Atlas', time: '2h' },
  { type: 'added', actor: 'You', paper: 'Topographic Organization of Feature Selectivity…', time: '4h' },
  { type: 'shared', actor: 'L. Marchetti', paper: 'Sparse Autoencoders Recover…', org: 'Neural Latent Collective', time: 'yesterday' },
  { type: 'shared', actor: 'E. Hoffman', paper: 'Funding Concentration in Computational Sciences…', org: 'Metascience', time: 'yesterday' },
  { type: 'joined', actor: 'Y. Okuda', org: 'Neural Latent Collective', time: '2d' },
]

function initials(name: string) {
  return name === 'You'
    ? 'YO'
    : name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function ActivityRow({ item }: { item: Activity }) {
  return (
    <div className="flex h-12 items-center gap-2.5 overflow-hidden px-4">
      <div className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
        {initials(item.actor)}
      </div>
      <p className="flex-1 truncate text-sm leading-snug">
        <span className="font-medium">{item.actor}</span>{' '}
        {item.type === 'shared' && (
          <>
            shared{' '}
            <span className="font-mono rounded border border-border/40 bg-muted px-1.5 py-0.5 text-xs">{item.paper}</span>{' '}
            in <span className="font-medium">{item.org}</span>
          </>
        )}
        {item.type === 'joined' && (
          <>
            joined in <span className="font-medium">{item.org}</span>
          </>
        )}
        {item.type === 'added' && (
          <>
            added to library{' '}
            <span className="font-mono rounded border border-border/40 bg-muted px-1.5 py-0.5 text-xs">{item.paper}</span>
</>
        )}
      </p>
      <span className="text-muted-foreground font-mono text-xs shrink-0">{item.time}</span>
    </div>
  )
}

export function RecentActivity() {
  return (
    <div className="w-2/3 px-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">recent activity</span>
        <button className="text-muted-foreground hover:text-foreground text-xs transition-colors">View all</button>
      </div>
      <Card className="gap-0 divide-y p-0">
        {activities.map((item, i) => (
          <ActivityRow key={i} item={item} />
        ))}
      </Card>
    </div>
  )
}
