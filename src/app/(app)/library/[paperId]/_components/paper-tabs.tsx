'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'ai-insights' | 'discussion'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'ai-insights', label: 'AI Insights' },
  { value: 'discussion', label: 'Discussion' },
]

export function PaperTabs({ overview }: { overview: React.ReactNode }) {
  const [active, setActive] = useState<Tab>('overview')

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b">
        <div className="flex items-end gap-6">
          {TABS.map((tab) => {
            const isActive = active === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActive(tab.value)}
                className={cn(
                  'relative pb-2.5 text-sm transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {active === 'overview' && overview}
      {active === 'ai-insights' && (
        <p className="text-sm text-muted-foreground">AI insights coming soon.</p>
      )}
      {active === 'discussion' && (
        <p className="text-sm text-muted-foreground">Discussion coming soon.</p>
      )}
    </div>
  )
}
