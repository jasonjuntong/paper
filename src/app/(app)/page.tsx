import { redirect } from 'next/navigation'
import { Timestamp } from 'firebase-admin/firestore'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { AddPaperButton } from '@/components/add-paper-button'
import { ContinueReading } from '@/components/continue-reading'
import { Greeting } from '@/components/greeting'
import { PendingActivity } from '@/components/pending-activity'
import { SectionCards, type Section } from '@/components/section-cards'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const firstName = session.name?.split(' ')[0] ?? null

  const libraryRef = adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')

  // Server component: re-runs per request, so Date.now() is fine here.
  // eslint-disable-next-line react-hooks/purity
  const weekAgo = Timestamp.fromMillis(Date.now() - WEEK_MS)

  const [recentSnap, libraryCountSnap, weekCountSnap] = await Promise.all([
    libraryRef.orderBy('createdAt', 'desc').limit(3).get(),
    libraryRef.count().get(),
    libraryRef.where('createdAt', '>=', weekAgo).count().get(),
  ])

  const libraryCount = libraryCountSnap.data().count
  const weekCount = weekCountSnap.data().count

  const sections: Section[] = [
    {
      description: 'LIBRARY',
      value: libraryCount,
      footer: libraryCount === 0 ? null : `${weekCount} added this week`,
    },
    { description: 'SHARED WITH YOU', value: null, footer: 'Nothing shared yet' },
    { description: 'ORGS', value: null, footer: 'No org joined yet' },
    { description: 'AI FEATURED USE', value: null, footer: 'Premium feature' },
  ]

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
      <SectionCards sections={sections} />
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
