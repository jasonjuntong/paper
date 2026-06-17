'use client'

import { useEffect } from 'react'

// Records the paper as opened once, on actual client visit (not on prefetch).
export function MarkOpened({ entryId }: { entryId: string }) {
  useEffect(() => {
    fetch('/api/papers/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId }),
    }).catch(() => undefined)
  }, [entryId])

  return null
}
