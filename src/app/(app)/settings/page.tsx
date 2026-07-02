import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { SettingsClient } from '@/components/settings/settings-client'

export const metadata: Metadata = { title: 'Account settings — Scolar' }

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  // The session cookie carries only Auth claims — the handle and notification
  // preference live on the user doc, so read them from Firestore.
  const userSnap = await adminFirestore.collection('users').doc(session.uid).get()
  const user = userSnap.data() ?? {}

  const initial = {
    name: (user.name ?? session.name ?? '') as string,
    handle: (user.handle ?? '') as string,
    email: (user.email ?? session.email ?? '') as string,
    notificationEmail: (user.notificationPrefs?.email ?? true) as boolean,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 px-4 lg:px-6">
        <h1 className="font-serif text-2xl font-normal">Account settings</h1>
        <p className="font-mono text-xs text-muted-foreground">
          Manage your profile, notifications, and password
        </p>
      </div>
      <SettingsClient initial={initial} />
    </div>
  )
}
