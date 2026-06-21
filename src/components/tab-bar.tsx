'use client'

import { cn } from '@/lib/utils'

export interface TabBarItem<T extends string> {
  value: T
  label: string
  // Optional pill count rendered next to the label.
  count?: number
}

interface TabBarProps<T extends string> {
  tabs: TabBarItem<T>[]
  value: T
  onChange: (next: T) => void
  // Optional element pinned to the right of the tab row (e.g. a view toggle).
  trailing?: React.ReactNode
  className?: string
}

/**
 * Underlined tab row shared across the app's tabbed pages. Controlled: owners
 * hold the active value and decide what to render per tab.
 */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  trailing,
  className,
}: TabBarProps<T>) {
  return (
    <div className={cn('border-b', className)}>
      <div className="flex items-end justify-between gap-6">
        <div className="flex items-end gap-6">
          {tabs.map((tab) => {
            const active = value === tab.value
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
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'rounded-[3px] bg-pill px-1.5 py-px font-mono text-[11px] tabular-nums',
                      active ? 'text-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
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
