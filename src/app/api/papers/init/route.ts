import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { extractPaperMetadata } from '@/lib/groq'
import { checkVisibility } from '@/lib/paper-dedup'
import type { InitResponse, ExistingPaperInfo } from '@/types/paper'

const InitSchema = z.object({
  hash: z.string().min(1),
  pages: z.array(z.string()).min(1).max(5),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = InitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { hash, pages } = parsed.data

  // Layer 1 dedup — check by file hash
  const hashSnap = await adminFirestore
    .collection('papers')
    .where('hash', '==', hash)
    .limit(1)
    .get()

  if (!hashSnap.empty) {
    const existingPaperId = hashSnap.docs[0].id
    const data = hashSnap.docs[0].data()
    const em = (data.extractedMetadata ?? {}) as Record<string, unknown>

    const paper: ExistingPaperInfo = {
      paperId: existingPaperId,
      title: (em.title ?? data.title ?? '') as string,
      authors: (em.authors ?? data.authors ?? '') as string,
      year: String(em.year ?? data.year ?? ''),
      keywords: (em.keywords ?? data.keywords ?? '') as string,
      synopsis: (em.synopsis ?? data.synopsis ?? '') as string,
    }

    const vis = await checkVisibility(session.uid, existingPaperId)

    if (vis.visibility === 'in-library') {
      return NextResponse.json<InitResponse>({
        status: 'in-library',
        paper,
        entryId: vis.entryId,
      })
    }

    if (vis.visibility === 'in-org') {
      return NextResponse.json<InitResponse>({
        status: 'in-org',
        paper,
        orgs: vis.orgs,
        existingPaperId,
      })
    }

    // Not visible — silent dedup: return extracted fields as draft
    return NextResponse.json<InitResponse>({
      status: 'ok',
      draft: {
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        keywords: paper.keywords,
        synopsis: paper.synopsis,
      },
      existingPaperId,
    })
  }

  const draft = await extractPaperMetadata(pages)
  return NextResponse.json<InitResponse>({ status: 'ok', draft, existingPaperId: null })
}
