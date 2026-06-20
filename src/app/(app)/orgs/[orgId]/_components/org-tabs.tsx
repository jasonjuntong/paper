'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Tab = 'papers' | 'members' | 'manage'

export function OrgTabs({
  papers,
  members,
  manage,
  paperCount,
  memberCount,
}: {
  papers: React.ReactNode
  members: React.ReactNode
  // Present only for the Admin — gates the whole tab.
  manage?: React.ReactNode
  paperCount: number
  memberCount: number
}) {
  const [active, setActive] = useState<Tab>('papers')

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'papers', label: 'Papers', count: paperCount },
    { value: 'members', label: 'Members', count: memberCount },
    ...(manage ? [{ value: 'manage' as const, label: 'Manage' }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b">
        <div className="flex items-end gap-6">
          {tabs.map((tab) => {
            const isActive = active === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActive(tab.value)}
                className={cn(
                  'relative flex items-center gap-1.5 pb-2.5 text-sm transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'rounded-[3px] bg-pill px-1.5 py-px font-mono text-[11px] tabular-nums',
                      isActive ? 'text-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {active === 'papers' && papers}
      {active === 'members' && members}
      {active === 'manage' && manage}
    </div>
  )
}
