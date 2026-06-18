import { adminFirestore } from '@/lib/firebase/admin'
import { DiscoverClient } from './_components/discover-client'
import { CreateOrgButton } from './_components/create-org-button'
import type { OrgItem } from './_components/org-card'

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

export default async function DiscoverPage() {
  const all = await getPublicOrgs()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl font-normal">Discover orgs</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Find and join public research groups
            </p>
          </div>
          <CreateOrgButton />
        </div>
      </div>
      <DiscoverClient suggested={[]} all={all} />
    </div>
  )
}
