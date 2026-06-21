import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { CreateOrgButton } from './_components/create-org-button'
import { OrgsClient } from './_components/orgs-client'
import type { OrgItem } from './_components/org-card'

async function getMyOrgs(uid: string): Promise<OrgItem[]> {
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
    .filter((doc) => doc.exists && !doc.data()!.deletedAt)
    .map((doc) => {
      const data = doc.data()!
      return {
        id: doc.id,
        name: (data.name ?? '') as string,
        description: (data.description as string) || null,
        memberCount: (data.memberCount ?? 0) as number,
        joinPolicy: (data.joinPolicy ?? 'request') as OrgItem['joinPolicy'],
      }
    })
}

async function getPublicOrgs(): Promise<OrgItem[]> {
  const snap = await adminFirestore
    .collection('orgs')
    .where('visibility', '==', 'public')
    .get()

  return snap.docs
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: (data.name ?? '') as string,
        description: (data.description as string) || null,
        memberCount: (data.memberCount ?? 0) as number,
        joinPolicy: (data.joinPolicy ?? 'request') as OrgItem['joinPolicy'],
        createdAt: (data.createdAt?.toMillis?.() ?? 0) as number,
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt: _createdAt, ...org }) => org)
}

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const { tab } = await searchParams
  const initialTab = tab === 'discover' ? 'discover' : 'mine'

  const [myOrgs, publicOrgs] = await Promise.all([
    getMyOrgs(session.uid),
    getPublicOrgs(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl font-normal">Orgs</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Research groups you belong to and ones to discover
            </p>
          </div>
          <CreateOrgButton />
        </div>
      </div>
      <OrgsClient
        myOrgs={myOrgs}
        publicOrgs={publicOrgs}
        initialTab={initialTab}
      />
    </div>
  )
}
