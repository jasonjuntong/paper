'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Crown, Globe, Lock, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Visibility = 'public' | 'private'
type JoinPolicy = 'open' | 'request' | 'invite'

// Max active (pending) invites per Org — see Org: Joining & Invites.
const INVITE_CAP = 50

const VISIBILITY_HELP: Record<Visibility, string> = {
  public: 'Currently public. Listed in Discover so anyone can find and join.',
  private: 'Currently invite-only. Members can only be added via invite.',
}

const JOIN_POLICY_HELP: Record<JoinPolicy, string> = {
  open: 'Anyone can join instantly — no approval needed.',
  request: 'Users request to join and you approve each one.',
  invite: 'Each invite expires in 7 days.',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  )
}

// A selectable option. The active value is outlined; inactive options sit on
// the muted pill surface. Both carry a border so selecting doesn't shift layout.
function OptionPill({
  active,
  disabled,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  icon?: LucideIcon
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-foreground/40 text-foreground'
          : 'cursor-pointer border-transparent bg-pill text-muted-foreground hover:text-foreground'
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
    </button>
  )
}

export function OrgManage({
  orgId,
  visibility: initialVisibility,
  joinPolicy: initialJoinPolicy,
  inviteCount,
}: {
  orgId: string
  visibility: Visibility
  joinPolicy: JoinPolicy
  inviteCount: number
}) {
  const router = useRouter()
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility)
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>(initialJoinPolicy)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Optimistically apply the change, persist it, then reconcile with the
  // authoritative pairing the server returns. Roll back on failure.
  async function persist(
    payload: { visibility?: Visibility; joinPolicy?: JoinPolicy },
    optimistic: { visibility: Visibility; joinPolicy: JoinPolicy }
  ) {
    const prev = { visibility, joinPolicy }
    setError(null)
    setVisibility(optimistic.visibility)
    setJoinPolicy(optimistic.joinPolicy)
    setSaving(true)
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        throw new Error(b?.error ?? 'Failed to save')
      }
      const data = (await res.json()) as { visibility: Visibility; joinPolicy: JoinPolicy }
      setVisibility(data.visibility)
      setJoinPolicy(data.joinPolicy)
      // Sync server-rendered parts (header badges, discover listing).
      router.refresh()
    } catch (e) {
      setVisibility(prev.visibility)
      setJoinPolicy(prev.joinPolicy)
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Visibility carries the join policy with it (spec): Public → Private forces
  // invite-only; Private → Public falls back to the `request` default.
  function selectVisibility(next: Visibility) {
    if (next === visibility || saving) return
    const nextPolicy: JoinPolicy =
      next === 'private' ? 'invite' : joinPolicy === 'invite' ? 'request' : joinPolicy
    persist({ visibility: next }, { visibility: next, joinPolicy: nextPolicy })
  }

  function selectJoinPolicy(next: JoinPolicy) {
    if (next === joinPolicy || saving) return
    persist({ joinPolicy: next }, { visibility, joinPolicy: next })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Visibility */}
      <Card className="gap-4 px-5 py-5">
        <FieldLabel>Visibility</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <OptionPill
            active={visibility === 'public'}
            disabled={saving}
            icon={Globe}
            onClick={() => selectVisibility('public')}
          >
            Public
          </OptionPill>
          <OptionPill
            active={visibility === 'private'}
            disabled={saving}
            icon={Lock}
            onClick={() => selectVisibility('private')}
          >
            Private
          </OptionPill>
        </div>
        <p className="text-sm text-muted-foreground">
          {VISIBILITY_HELP[visibility]}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </Card>

      {/* Join policy */}
      <Card className="gap-4 px-5 py-5">
        <FieldLabel>Join policy</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <OptionPill
            active={joinPolicy === 'open'}
            disabled={saving || visibility === 'private'}
            onClick={() => selectJoinPolicy('open')}
          >
            open
          </OptionPill>
          <OptionPill
            active={joinPolicy === 'request'}
            disabled={saving || visibility === 'private'}
            onClick={() => selectJoinPolicy('request')}
          >
            request
          </OptionPill>
          <OptionPill
            active={joinPolicy === 'invite'}
            disabled={saving || visibility === 'public'}
            onClick={() => selectJoinPolicy('invite')}
          >
            invite-only
          </OptionPill>
        </div>
        <p className="text-sm text-muted-foreground">
          {JOIN_POLICY_HELP[joinPolicy]}
        </p>
      </Card>

      {/* Pending invites */}
      <Card className="gap-4 px-5 py-5">
        <FieldLabel>Pending invites</FieldLabel>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-normal tabular-nums">{inviteCount}</span>
          <span className="font-mono text-sm text-muted-foreground">
            / {INVITE_CAP}
          </span>
        </div>
        <button
          type="button"
          className="flex w-fit items-center gap-1 text-sm text-foreground/80 transition-colors hover:text-foreground"
        >
          Manage invites
          <ArrowRight className="size-4" />
        </button>
      </Card>

      {/* Danger zone */}
      <Card className="gap-4 px-5 py-5">
        <FieldLabel>Danger zone</FieldLabel>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-input px-3 py-2 text-sm transition-colors hover:bg-pill"
          >
            <Crown className="size-4" />
            Step down as Admin
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-[oklch(0.434_0.140_25deg)]/40 px-3 py-2 text-sm text-[oklch(0.434_0.140_25deg)] transition-colors hover:border-[oklch(0.576_0.186_25deg)] hover:bg-[oklch(0.576_0.186_25deg)] hover:text-white"
          >
            <X className="size-4" />
            Delete org
          </button>
        </div>
      </Card>
    </div>
  )
}
