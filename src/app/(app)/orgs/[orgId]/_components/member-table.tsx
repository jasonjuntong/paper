'use client'

import { useMemo, useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'

export type MemberRow = {
  uid: string
  name: string
  handle: string
  role: 'admin' | 'member'
  joinedAt: number
  sharedCount: number
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatISO(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toISOString().slice(0, 10)
}

function RoleBadge({ role }: { role: MemberRow['role'] }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-pill px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground" />
        Admin
      </span>
    )
  }
  return (
    <span className="rounded-[3px] bg-pill px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      Member
    </span>
  )
}

export function MemberTable({
  members,
  currentUid,
  totalCount,
}: {
  members: MemberRow[]
  currentUid: string
  // Full roster size; drives the "+N more" hint when the preview is capped.
  totalCount: number
}) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q)
    )
  }, [members, q])

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-0 divide-y py-0">
        {/* Column headers — the Member column doubles as the search field */}
        <div className="flex items-center gap-4 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="flex min-w-0 basis-3/5 items-center gap-3">
            <Search className="size-4 shrink-0" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members…"
              className="min-w-0 flex-1 bg-transparent font-sans text-sm normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <span className="hidden flex-1 whitespace-nowrap text-center sm:inline">
            Joined
          </span>
          <span className="hidden flex-1 whitespace-nowrap text-center sm:inline">
            Shared
          </span>
          <span className="flex-1 text-center">Role</span>
          <span className="flex-1" aria-hidden />
        </div>

        {filtered.map((m) => (
          <div key={m.uid} className="flex items-center gap-4 px-4 py-3">
            {/* Member (avatar + name + handle) */}
            <div className="flex min-w-0 basis-3/5 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pill font-mono text-xs font-semibold text-foreground/80">
                {initials(m.name)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="truncate">{m.name}</span>
                  {m.uid === currentUid && (
                    <span className="shrink-0 rounded-[3px] bg-foreground px-1 py-px font-mono text-[10px] uppercase tracking-wider text-background">
                      You
                    </span>
                  )}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  @{m.handle}
                </span>
              </div>
            </div>

            {/* Joined */}
            <span className="hidden flex-1 whitespace-nowrap text-center font-mono text-xs tabular-nums text-muted-foreground sm:inline">
              {m.joinedAt > 0 ? formatISO(m.joinedAt) : '—'}
            </span>
            {/* Shared */}
            <span className="hidden flex-1 whitespace-nowrap text-center font-mono text-xs tabular-nums text-muted-foreground sm:inline">
              {m.sharedCount}
            </span>
            {/* Role */}
            <div className="flex flex-1 justify-center">
              <RoleBadge role={m.role} />
            </div>
            {/* Actions */}
            <div className="flex flex-1 justify-end">
              <button
                type="button"
                aria-label="Member actions"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No members match “{query}”.
          </p>
        )}
      </Card>

      {!q && totalCount > members.length && (
        <p className="font-mono text-xs text-muted-foreground">
          +{totalCount - members.length} more
        </p>
      )}
    </div>
  )
}
