'use client'

import { useState } from 'react'
import { TabBar, type TabBarItem } from '@/components/tab-bar'

type Tab = 'overview' | 'ai-insights' | 'discussion'

const TABS: TabBarItem<Tab>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'ai-insights', label: 'AI Insights' },
  { value: 'discussion', label: 'Discussion' },
]

export function PaperTabs({ overview }: { overview: React.ReactNode }) {
  const [active, setActive] = useState<Tab>('overview')

  return (
    <div className="flex flex-col gap-6">
      <TabBar<Tab> tabs={TABS} value={active} onChange={setActive} />

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
