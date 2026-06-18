import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { AppSidebar } from '@/components/app-sidebar'
import type { OrgNavItem } from '@/components/nav-orgs'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

async function getUserOrgs(uid: string): Promise<OrgNavItem[]> {
  const snap = await adminFirestore
    .collectionGroup('members')
    .where('userId', '==', uid)
    .get()

  if (snap.empty) return []

  const orgIds = snap.docs.map((doc) => doc.ref.parent.parent!.id)
  const orgDocs = await Promise.all(
    orgIds.map((id) => adminFirestore.collection('orgs').doc(id).get())
  )

  return orgDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const data = doc.data()!
      const name = data.name as string
      const mark =
        ((data.mark as string | undefined) ?? '').trim() ||
        name.slice(0, 2).toUpperCase()
      return { id: doc.id, name, mark }
    })
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const orgs = await getUserOrgs(session.uid)

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar user={session} orgs={orgs} />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-2 pt-[80px]">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
