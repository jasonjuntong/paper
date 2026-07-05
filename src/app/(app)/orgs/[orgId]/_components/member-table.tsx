'use client'

import { useMemo, useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

// Sharp-cornered, mono micro-badge — matches the `Pill` treatment used across
// the org page rather than shadcn's default rounded-pill Badge.
const MICRO_BADGE = 'rounded-[3px] font-mono text-[10px] uppercase tracking-wider'

function RoleBadge({ role }: { role: MemberRow['role'] }) {
  if (role === 'admin') {
    return (
      <Badge variant="secondary" className={MICRO_BADGE}>
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={MICRO_BADGE}>
      Member
    </Badge>
  )
}

// Mono, uppercase micro column labels — the org page's header convention.
const HEAD = 'font-mono text-[11px] uppercase tracking-wider'
const META_CELL =
  'hidden text-center font-mono text-xs tabular-nums text-muted-foreground sm:table-cell'

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
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-2">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members…"
            />
          </InputGroup>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>Member</TableHead>
              <TableHead className={cn(HEAD, 'hidden text-center sm:table-cell')}>
                Joined
              </TableHead>
              <TableHead className={cn(HEAD, 'hidden text-center sm:table-cell')}>
                Shared
              </TableHead>
              <TableHead className={cn(HEAD, 'text-center')}>Role</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.uid}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-pill font-mono text-xs font-semibold text-foreground/80">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="truncate">{m.name}</span>
                        {m.uid === currentUid && (
                          <Badge className={MICRO_BADGE}>You</Badge>
                        )}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        @{m.handle}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={META_CELL}>
                  {m.joinedAt > 0 ? formatISO(m.joinedAt) : '—'}
                </TableCell>
                <TableCell className={META_CELL}>{m.sharedCount}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <RoleBadge role={m.role} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {/* Placeholder — per-member actions (kick) land in ORG-008. */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Member actions"
                  >
                    <MoreHorizontal />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>No members found</EmptyTitle>
              <EmptyDescription>No members match “{query}”.</EmptyDescription>
            </EmptyHeader>
          </Empty>
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
