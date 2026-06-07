'use client'

import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await signOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={handleLogout}>
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
