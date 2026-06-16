import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { Button } from '@/components/ui/button'
import { PaperTabs } from './_components/paper-tabs'

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

  if (!paperSnap.exists || entrySnap.empty) notFound()

  const paper = paperSnap.data()!
  const title = paper.title as string
  const authors = paper.authors as string
  const year = paper.year as number
  const keywords = parseKeywords((paper.keywords as string) ?? '')
  const synopsis = paper.synopsis as string

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6">
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
          <Button variant="outline" size="sm" className="rounded-lg gap-2 hover:bg-[oklch(0.9491_0.0041_91.616)]">
            <Pencil className="size-3.5" />
            Edit details
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg gap-2 text-[oklch(0.434_0.140_25deg)] hover:bg-[oklch(0.576_0.186_25deg)] hover:text-white hover:border-[oklch(0.576_0.186_25deg)]">
            <Trash2 className="size-3.5" />
            Delete paper
          </Button>
        </div>
      </div>
    </div>
  )
}
