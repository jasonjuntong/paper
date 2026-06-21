'use client'

import { useState } from 'react'
import { TabBar, type TabBarItem } from '@/components/tab-bar'

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

  const tabs: TabBarItem<Tab>[] = [
    { value: 'papers', label: 'Papers', count: paperCount },
    { value: 'members', label: 'Members', count: memberCount },
    ...(manage ? [{ value: 'manage' as const, label: 'Manage' }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <TabBar<Tab> tabs={tabs} value={active} onChange={setActive} />

      {active === 'papers' && papers}
      {active === 'members' && members}
      {active === 'manage' && manage}
    </div>
  )
}
