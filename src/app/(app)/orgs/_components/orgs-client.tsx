'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TabBar, type TabBarItem } from '@/components/tab-bar'
import { OrgCard, type OrgItem } from './org-card'

type Tab = 'mine' | 'discover'

export function OrgsClient({
  myOrgs,
  publicOrgs,
  initialTab = 'mine',
}: {
  myOrgs: OrgItem[]
  publicOrgs: OrgItem[]
  initialTab?: Tab
}) {
  const [active, setActive] = useState<Tab>(initialTab)
  const router = useRouter()
  const pathname = usePathname()

  function selectTab(next: Tab) {
    setActive(next)
    // Mirror the active tab in the URL so refresh/share lands on it.
    // 'mine' is the default, so keep its URL param-free.
    const url = next === 'discover' ? `${pathname}?tab=discover` : pathname
    router.replace(url, { scroll: false })
  }

  const tabs: TabBarItem<Tab>[] = [
    { value: 'mine', label: 'Your Orgs', count: myOrgs.length },
    { value: 'discover', label: 'Discover', count: publicOrgs.length },
  ]

  const orgs = active === 'mine' ? myOrgs : publicOrgs

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 lg:px-6">
        <TabBar<Tab> tabs={tabs} value={active} onChange={selectTab} />
      </div>

      <div className="px-4 lg:px-6">
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {active === 'mine'
              ? "You haven't joined any orgs yet — check Discover to find one."
              : 'No public orgs yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
