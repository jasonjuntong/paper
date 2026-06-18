'use client'

import { useState } from 'react'
import { DiscoverSearch } from './discover-search'
import { DiscoverTabs, type DiscoverTab } from './discover-tabs'
import { OrgCard, type OrgItem } from './org-card'

interface DiscoverClientProps {
  suggested: OrgItem[]
  all: OrgItem[]
}

export function DiscoverClient({ suggested, all }: DiscoverClientProps) {
  const [tab, setTab] = useState<DiscoverTab>('suggested')

  const counts = { suggested: suggested.length, browse: all.length }
  const orgs = tab === 'suggested' ? suggested : all

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 lg:px-6">
        <DiscoverTabs current={tab} counts={counts} onChange={setTab} />
      </div>
      <div className="px-4 lg:px-6">
        {tab === 'suggested' && suggested.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add papers to your library to get personalized org suggestions.
          </p>
        ) : orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public orgs yet.</p>
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
