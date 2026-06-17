import { Inbox } from 'lucide-react'
import { Card } from '@/components/ui/card'

type PendingItem =
  | { type: 'invite'; org: string; from: string; expiresIn: string }
  | { type: 'join-request'; org: string; user: string; time: string }
  | { type: 'transfer'; org: string; from: string; expiresIn: string }

const mockItems: PendingItem[] = [
  { type: 'invite', org: 'RL Reading Club', from: 'F. Park', expiresIn: '5d' },
  { type: 'transfer', org: 'Neural Latent Collective', from: 'M. Larsen', expiresIn: '3d' },
  { type: 'join-request', org: 'CogSci Atlas', user: 'E. Hoffman', time: '2h ago' },
]

const labelMap: Record<PendingItem['type'], string> = {
  invite: 'Invite',
  'join-request': 'Join request',
  transfer: 'Transfer offer',
}

export function PendingActivity() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          pending
        </span>
      </div>
      {mockItems.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <Inbox className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium">Nothing pending</p>
          <p className="text-muted-foreground text-xs max-w-xs">
            Invites, join requests, and transfer offers will show up here.
          </p>
        </Card>
      ) : (
      <Card className="gap-0 divide-y p-0">
        {mockItems.map((item, i) => (
          <div key={i} className="flex items-center gap-5 overflow-hidden px-5 py-3">
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <p className="truncate text-sm">
                <span className="font-normal">{item.org}</span>
              </p>
              <p className="text-muted-foreground font-mono text-xs truncate">
                {item.type === 'join-request'
                  ? `${item.user} · ${item.time}`
                  : `from ${item.from}`}
              </p>
            </div>
            <span className="text-muted-foreground bg-pill rounded px-1.5 py-0.5 font-mono text-xs shrink-0">
              {labelMap[item.type]}
            </span>
          </div>
        ))}
      </Card>
      )}
    </div>
  )
}
