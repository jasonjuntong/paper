import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'list' | 'grid'

export function ViewToggle({ current }: { current: View }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
      <Link
        href="/library"
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
          current === 'list'
            ? 'bg-secondary text-secondary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Link>
      <Link
        href="/library?view=grid"
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
          current === 'grid'
            ? 'bg-secondary text-secondary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Link>
    </div>
  )
}
