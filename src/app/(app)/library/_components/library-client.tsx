'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { AddPaperButton } from '@/components/add-paper-button'
import { ViewToggle } from './view-toggle'
import { PaperTable, type PaperRow } from './paper-table'
import { PaperGrid } from './paper-grid'
import { LibraryTabs, type LibraryFilter } from './library-tabs'

type View = 'list' | 'grid'
const STORAGE_KEY = 'library-view'
const STORAGE_EVENT = 'library-view-change'

function subscribeView(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback)
  return () => window.removeEventListener(STORAGE_EVENT, callback)
}

function readView(): View {
  return localStorage.getItem(STORAGE_KEY) === 'grid' ? 'grid' : 'list'
}

export function LibraryClient({ rows }: { rows: PaperRow[] }) {
  const view = useSyncExternalStore<View>(subscribeView, readView, () => 'list')
  const [filter, setFilter] = useState<LibraryFilter>('all')

  const handleViewChange = (next: View) => {
    localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new Event(STORAGE_EVENT))
  }

  const counts = useMemo(() => {
    const shared = rows.filter((r) => r.shared).length
    return {
      all: rows.length,
      shared,
      private: rows.length - shared,
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'shared') return rows.filter((r) => r.shared)
    return rows.filter((r) => !r.shared)
  }, [rows, filter])

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-2xl font-normal">My Library</h2>
          <p className="text-muted-foreground font-mono text-xs">
            {rows.length} papers · last updated 2m ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddPaperButton />
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <LibraryTabs
          current={filter}
          counts={counts}
          onChange={setFilter}
          trailing={<ViewToggle current={view} onChange={handleViewChange} />}
        />
      </div>
      {view === 'grid' ? (
        <PaperGrid rows={filteredRows} />
      ) : (
        <PaperTable rows={filteredRows} />
      )}
    </div>
  )
}
