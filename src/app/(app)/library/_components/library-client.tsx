'use client'

import { useEffect, useMemo, useState } from 'react'
import { UploadButton } from './upload-button'
import { ViewToggle } from './view-toggle'
import { PaperTable, type PaperRow } from './paper-table'
import { PaperGrid } from './paper-grid'
import { LibraryTabs, type LibraryFilter } from './library-tabs'

type View = 'list' | 'grid'
const STORAGE_KEY = 'library-view'

export function LibraryClient({ rows }: { rows: PaperRow[] }) {
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<LibraryFilter>('all')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'grid' || saved === 'list') setView(saved)
  }, [])

  const handleViewChange = (next: View) => {
    setView(next)
    localStorage.setItem(STORAGE_KEY, next)
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
          <UploadButton />
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
