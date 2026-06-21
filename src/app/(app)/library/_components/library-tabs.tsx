'use client'

import { TabBar } from '@/components/tab-bar'

export type LibraryFilter = 'all' | 'shared' | 'private'

const LABELS: Record<LibraryFilter, string> = {
  all: 'All',
  shared: 'Shared',
  private: 'Private',
}

const ORDER: LibraryFilter[] = ['all', 'shared', 'private']

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
    <TabBar<LibraryFilter>
      tabs={ORDER.map((value) => ({
        value,
        label: LABELS[value],
        count: counts[value],
      }))}
      value={current}
      onChange={onChange}
      trailing={trailing}
    />
  )
}
