import { redirect } from 'next/navigation'
import { Timestamp } from 'firebase-admin/firestore'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { LibraryClient } from './_components/library-client'
import type { PaperRow } from './_components/paper-table'

export default async function LibraryPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const entriesSnap = await adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .orderBy('createdAt', 'desc')
    .get()

  const paperRefs = entriesSnap.docs.map((doc) =>
    adminFirestore.collection('papers').doc(doc.data().paperId as string)
  )
  const paperDocs =
    paperRefs.length > 0 ? await adminFirestore.getAll(...paperRefs) : []

  const paperRows: PaperRow[] = entriesSnap.docs.flatMap((entryDoc, i) => {
    const entry = entryDoc.data()
    // Library entry owns display fields; global paper is fallback for old entries
    const paperDoc = paperDocs[i]
    const paper = paperDoc?.exists ? paperDoc.data()! : {}
    const title = (entry.title ?? paper.title ?? '') as string
    const authors = (entry.authors ?? paper.authors ?? '') as string
    const year = (entry.year ?? paper.year ?? 0) as number
    const keywords = (entry.keywords ?? paper.keywords ?? '') as string
    const synopsis = (entry.synopsis ?? paper.synopsis ?? '') as string
    const shares = (entry.shares as string[] | undefined) ?? []
    return [
      {
        entryId: entryDoc.id,
        paperId: entry.paperId as string,
        title,
        authors,
        year,
        keywords,
        synopsis,
        addedAt: (entry.createdAt as Timestamp).toDate(),
        shared: shares.length > 0,
      },
    ]
  })

  return <LibraryClient rows={paperRows} />
}
