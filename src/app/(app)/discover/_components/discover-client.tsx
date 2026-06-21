'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TabBar, type TabBarItem } from '@/components/tab-bar'
import { OrgCard, type OrgItem } from '../../orgs/_components/org-card'
import { DiscoverPaperCard, type DiscoverPaper } from './discover-paper-card'

type Tab = 'orgs' | 'papers'

export function DiscoverClient({
  orgs,
  papers,
  initialTab = 'orgs',
}: {
  orgs: OrgItem[]
  papers: DiscoverPaper[]
  initialTab?: Tab
}) {
  const [active, setActive] = useState<Tab>(initialTab)
  const router = useRouter()
  const pathname = usePathname()

  function selectTab(next: Tab) {
    setActive(next)
    // Mirror the active tab in the URL so refresh/share lands on it.
    // 'orgs' is the default, so keep its URL param-free.
    const url = next === 'papers' ? `${pathname}?tab=papers` : pathname
    router.replace(url, { scroll: false })
  }

  const tabs: TabBarItem<Tab>[] = [
    { value: 'orgs', label: 'Orgs', count: orgs.length },
    { value: 'papers', label: 'Papers', count: papers.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 lg:px-6">
        <TabBar<Tab> tabs={tabs} value={active} onChange={selectTab} />
      </div>

      <div className="px-4 lg:px-6">
        {active === 'orgs' ? (
          orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No public orgs yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </div>
          )
        ) : papers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No papers to discover yet — join or create an org to start sharing.
          </p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {papers.map((paper) => (
              <DiscoverPaperCard key={paper.paperId} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
