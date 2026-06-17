import { adminFirestore } from '@/lib/firebase/admin'
import type { OrgRef } from '@/types/paper'

export async function checkVisibility(
  uid: string,
  existingPaperId: string
): Promise<
  | { visibility: 'in-library'; entryId: string }
  | { visibility: 'in-org'; orgs: OrgRef[] }
  | { visibility: 'none' }
> {
  const librarySnap = await adminFirestore
    .collection('users')
    .doc(uid)
    .collection('library')
    .where('paperId', '==', existingPaperId)
    .limit(1)
    .get()

  if (!librarySnap.empty) {
    return { visibility: 'in-library', entryId: librarySnap.docs[0].id }
  }

  const memberSnaps = await adminFirestore
    .collectionGroup('members')
    .where('userId', '==', uid)
    .get()

  if (memberSnaps.empty) return { visibility: 'none' }

  const orgIds = memberSnaps.docs.map((d) => d.ref.path.split('/')[1])

  const orgChecks = await Promise.all(
    orgIds.map(async (orgId) => {
      const sharedDoc = await adminFirestore
        .collection('orgs')
        .doc(orgId)
        .collection('sharedPapers')
        .doc(existingPaperId)
        .get()
      if (!sharedDoc.exists) return null
      const orgDoc = await adminFirestore.collection('orgs').doc(orgId).get()
      return { id: orgId, name: (orgDoc.data()?.name as string) ?? orgId } as OrgRef
    })
  )

  const matchingOrgs = orgChecks.filter((o): o is OrgRef => o !== null)
  if (matchingOrgs.length > 0) return { visibility: 'in-org', orgs: matchingOrgs }

  return { visibility: 'none' }
}

export async function ensureLibraryEntry(
  uid: string,
  paperId: string,
  details: {
    title: string
    authors: string
    year: number
    keywords: string
    synopsis: string
  }
): Promise<string> {
  const existing = await adminFirestore
    .collection('users')
    .doc(uid)
    .collection('library')
    .where('paperId', '==', paperId)
    .limit(1)
    .get()

  if (!existing.empty) return existing.docs[0].id

  const ref = adminFirestore.collection('users').doc(uid).collection('library').doc()
  await ref.set({
    paperId,
    userId: uid,
    title: details.title,
    authors: details.authors,
    year: details.year,
    keywords: details.keywords,
    synopsis: details.synopsis,
    shares: [],
    createdAt: new Date(),
  })
  return ref.id
}
