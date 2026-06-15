import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { AddPaperButton } from '@/components/add-paper-button'
import { ContinueReading } from '@/components/continue-reading'
import { Greeting } from '@/components/greeting'
import { PendingActivity } from '@/components/pending-activity'
import { SectionCards } from '@/components/section-cards'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const firstName = session.name?.split(' ')[0] ?? null

  const recentSnap = await adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .orderBy('createdAt', 'desc')
    .limit(3)
    .get()

  const recentPapers = (
    await Promise.all(
      recentSnap.docs.map(async (entryDoc) => {
        const entry = entryDoc.data()
        const paperDoc = await adminFirestore.collection('papers').doc(entry.paperId).get()
        if (!paperDoc.exists) return null
        const paper = paperDoc.data()!
        return {
          entryId: entryDoc.id,
          paperId: entry.paperId,
          title: paper.title as string,
          authors: paper.authors as string,
          synopsis: paper.synopsis as string,
          progress: 0,
        }
      })
    )
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <Greeting firstName={firstName} />
          <p className="text-muted-foreground font-mono text-xs">
            4 new papers across your orgs today · synced 2 min ago
          </p>
        </div>
        <AddPaperButton />
      </div>
      <SectionCards />
      <div className="flex gap-6 px-4 lg:px-6">
        <div className="flex-[3] min-w-0">
          <ContinueReading papers={recentPapers} />
        </div>
        <div className="flex-[2] min-w-0">
          <PendingActivity />
        </div>
      </div>
    </div>
  )
}
