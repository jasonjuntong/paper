'use client'

import { cn } from '@/lib/utils'

export type LibraryFilter = 'all' | 'shared' | 'private'

const TABS: { value: LibraryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'shared', label: 'Shared' },
  { value: 'private', label: 'Private' },
]

export function LibraryTabs({
  current,
  counts,
  onChange,
  trailing,
}: {
  current: LibraryFilter
  counts: Record<LibraryFilter, number>
  onChange: (next: LibraryFilter) => void
  trailing?: React.ReactNode
}) {
  return (
    <div className="border-b">
      <div className="flex items-end justify-between gap-6">
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
                  'bg-pill rounded-[3px] px-1.5 py-px font-mono text-[11px] tabular-nums',
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
        {trailing && <div className="pb-2.5">{trailing}</div>}
      </div>
    </div>
  )
}
