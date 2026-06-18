'use client'

import { cn } from '@/lib/utils'

export type DiscoverTab = 'suggested' | 'browse'

const TABS: { value: DiscoverTab; label: string }[] = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'browse', label: 'Browse all' },
]

export function DiscoverTabs({
  current,
  counts,
  onChange,
}: {
  current: DiscoverTab
  counts: Record<DiscoverTab, number>
  onChange: (next: DiscoverTab) => void
}) {
  return (
    <div className="border-b">
      <div className="flex items-end gap-6">
        {TABS.map((tab) => {
          const active = current === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative flex items-center gap-1.5 pb-2.5 text-sm transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-[3px] bg-pill px-1.5 py-px font-mono text-[11px] tabular-nums',
                  active ? 'text-foreground/80' : 'text-muted-foreground'
                )}
              >
                {counts[tab.value]}
              </span>
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
