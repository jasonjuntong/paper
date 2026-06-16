'use client'

import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'list' | 'grid'

export function ViewToggle({
  current,
  onChange,
}: {
  current: View
  onChange: (view: View) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
          current === 'list'
            ? 'bg-[oklch(0.9491_0.0041_91.616)] text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
          current === 'grid'
            ? 'bg-[oklch(0.9491_0.0041_91.616)] text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </button>
    </div>
  )
}
