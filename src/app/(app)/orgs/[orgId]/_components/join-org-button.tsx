'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface JoinOrgButtonProps {
  orgId: string
  policy: 'open' | 'request' | 'invite'
  atCapacity: boolean
  alreadyRequested?: boolean
}

export function JoinOrgButton({
  orgId,
  policy,
  atCapacity,
  alreadyRequested = false,
}: JoinOrgButtonProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [requested, setRequested] = useState(alreadyRequested)
  const [error, setError] = useState<string | null>(null)

  // A standing request is a terminal state on this page until the Admin acts.
  if (requested) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" disabled>
          Requested
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          Waiting for admin approval
        </span>
      </div>
    )
  }

  // At the 1000 cap the join path is disabled — there is no room to honor it.
  if (atCapacity) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button disabled>{policy === 'open' ? 'Join' : 'Request to join'}</Button>
        <span className="font-mono text-xs text-muted-foreground">
          This org is full
        </span>
      </div>
    )
  }

  async function handleClick() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orgs/${orgId}/join`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Something went wrong')
      }
      const body = await res.json()
      if (body.status === 'requested') {
        setRequested(true)
        setSubmitting(false)
      } else {
        // Joined outright — refresh so the page renders the member view.
        router.refresh()
      }
    } catch (err) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={submitting}>
        {submitting
          ? policy === 'open'
            ? 'Joining…'
            : 'Requesting…'
          : policy === 'open'
            ? 'Join'
            : 'Request to join'}
      </Button>
      {error && <span className="font-mono text-xs text-destructive">{error}</span>}
    </div>
  )
}
