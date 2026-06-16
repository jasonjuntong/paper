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
    const paperDoc = paperDocs[i]
    if (!paperDoc.exists) return []
    const paper = paperDoc.data()!
    const entry = entryDoc.data()
    const sharedWith = (paper.sharedWith as string[] | undefined) ?? []
    return [
      {
        entryId: entryDoc.id,
        paperId: entry.paperId as string,
        title: paper.title as string,
        authors: paper.authors as string,
        year: paper.year as number,
        keywords: paper.keywords as string,
        synopsis: paper.synopsis as string,
        addedAt: (entry.createdAt as Timestamp).toDate(),
        shared: sharedWith.length > 0,
      },
    ]
  })

  return <LibraryClient rows={paperRows} />
}
