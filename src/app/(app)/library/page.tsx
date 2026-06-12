import { redirect } from 'next/navigation'
import { Timestamp } from 'firebase-admin/firestore'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { UploadButton } from './_components/upload-button'
import { PaperTable, type PaperRow } from './_components/paper-table'
import { PaperGrid } from './_components/paper-grid'
import { ViewToggle } from './_components/view-toggle'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const { view } = await searchParams
  const isGrid = view === 'grid'

  const entriesSnap = await adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .orderBy('createdAt', 'desc')
    .get()

  const rows: (PaperRow | null)[] = await Promise.all(
    entriesSnap.docs.map(async (entryDoc) => {
      const entry = entryDoc.data()
      const paperDoc = await adminFirestore.collection('papers').doc(entry.paperId).get()
      if (!paperDoc.exists) return null
      const paper = paperDoc.data()!
      return {
        entryId: entryDoc.id,
        paperId: entry.paperId,
        title: paper.title as string,
        authors: paper.authors as string,
        year: paper.year as number,
        keywords: paper.keywords as string,
        synopsis: paper.synopsis as string,
        addedAt: (entry.createdAt as Timestamp).toDate(),
      }
    })
  )

  const paperRows = rows.filter((r): r is PaperRow => r !== null)

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Library</h2>
        <div className="flex items-center gap-2">
          <ViewToggle current={isGrid ? 'grid' : 'list'} />
          <UploadButton />
        </div>
      </div>
      {isGrid ? <PaperGrid rows={paperRows} /> : <PaperTable rows={paperRows} />}
    </div>
  )
}
