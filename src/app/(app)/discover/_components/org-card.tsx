import Link from 'next/link'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui/card'

export type OrgItem = {
  id: string
  name: string
  description: string | null
  memberCount: number
  joinPolicy: 'open' | 'request' | 'invite'
}

export function OrgCard({ org }: { org: OrgItem }) {
  return (
    <Link href={`/orgs/${org.id}`}>
      <Card className="flex h-36 cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-[oklch(0.9491_0.0041_91.616)]">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium leading-snug">{org.name}</span>
          {org.joinPolicy === 'open' && (
            <span className="shrink-0 rounded-[3px] bg-pill px-1.5 py-px font-mono text-xs text-muted-foreground">
              open
            </span>
          )}
        </div>
        {org.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {org.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Users className="size-3" />
          <span>{org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}</span>
        </div>
      </Card>
    </Link>
  )
}
