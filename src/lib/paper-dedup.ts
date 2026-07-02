import { adminFirestore } from '@/lib/firebase/admin'
import type { OrgRef } from '@/types/paper'

export type Visibility =
  | { visibility: 'in-library'; entryId: string }
  | { visibility: 'in-org'; orgs: OrgRef[] }
  | { visibility: 'none' }

/**
 * Pure visibility decision, factored out of {@link checkVisibility} so it can be
 * unit-tested without Firestore. Precedence is in-library → in-org → none: a
 * paper the user already owns is never surfaced as merely org-visible.
 *
 * @param libraryEntryId  id of the user's existing library entry for this paper,
 *                        or null if it isn't in their library.
 * @param matchingOrgs    member orgs that have this paper shared (empty = none).
 */
export function decideVisibility(
  libraryEntryId: string | null,
  matchingOrgs: OrgRef[]
): Visibility {
  if (libraryEntryId) return { visibility: 'in-library', entryId: libraryEntryId }
  if (matchingOrgs.length > 0) return { visibility: 'in-org', orgs: matchingOrgs }
  return { visibility: 'none' }
}

export async function checkVisibility(
  uid: string,
  existingPaperId: string
): Promise<Visibility> {
  const librarySnap = await adminFirestore
    .collection('users')
    .doc(uid)
    .collection('library')
    .where('paperId', '==', existingPaperId)
    .limit(1)
    .get()

  const libraryEntryId = librarySnap.empty ? null : librarySnap.docs[0].id

  // Library ownership wins outright — skip the org lookups entirely.
  if (libraryEntryId) return decideVisibility(libraryEntryId, [])

  const memberSnaps = await adminFirestore
    .collectionGroup('members')
    .where('userId', '==', uid)
    .get()

  if (memberSnaps.empty) return decideVisibility(null, [])

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
  return decideVisibility(null, matchingOrgs)
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
