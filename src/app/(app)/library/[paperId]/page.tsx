import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { PaperTabs } from './_components/paper-tabs'
import { PaperActions } from './_components/paper-actions'
import { MarkOpened } from './_components/mark-opened'
import { ReadButton } from './_components/read-button'

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
}

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ paperId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const { paperId } = await params

  const [entrySnap, paperSnap] = await Promise.all([
    adminFirestore
      .collection('users')
      .doc(session.uid)
      .collection('library')
      .where('paperId', '==', paperId)
      .limit(1)
      .get(),
    adminFirestore.collection('papers').doc(paperId).get(),
  ])

  if (entrySnap.empty) notFound()

  const entryId = entrySnap.docs[0].id
  const entryData = entrySnap.docs[0].data()

  // Library entry owns display fields; global paper is fallback for old entries
  const globalData = paperSnap.exists ? paperSnap.data()! : {}
  const title = (entryData.title ?? globalData.title ?? '') as string
  const authors = (entryData.authors ?? globalData.authors ?? '') as string
  const year = (entryData.year ?? globalData.year ?? 0) as number
  const rawKeywords = (entryData.keywords ?? globalData.keywords ?? '') as string
  const keywords = parseKeywords(rawKeywords)
  const synopsis = (entryData.synopsis ?? globalData.synopsis ?? '') as string

  const paperMeta = {
    paperId,
    title,
    authors,
    year,
    keywords: rawKeywords,
    synopsis,
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6">
      <MarkOpened entryId={entryId} />
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="size-4" />
        Library
      </Link>
      <div className="flex gap-8">
        {/* Main column */}
        <div className="flex flex-1 min-w-0 flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-serif text-2xl font-normal leading-[1.2] tracking-tight max-w-3xl">
                {title}
              </h1>
              <p className="text-muted-foreground text-sm">
                {authors}
                {year ? <span className="ml-2 font-mono text-xs">· {year}</span> : null}
              </p>
           </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="bg-pill rounded-[3px] px-1.5 py-px font-mono text-xs text-muted-foreground"
                  >
                    #{k}
                  </span>
                ))}
              </div>
            )}
            <div className="w-fit">
              <ReadButton paperId={paperId} title={title} />
            </div>
          </div>

          <PaperTabs
            overview={
              synopsis ? (
                <div className="flex flex-col gap-2 max-w-3xl">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Synopsis
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/80">{synopsis}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No synopsis available.</p>
              )
            }
          />
        </div>

        {/* Sidebar */}
        <div className="shrink-0 flex flex-col gap-2">
          <PaperActions entryId={entryId} paper={paperMeta} />
        </div>
      </div>
    </div>
  )
}
