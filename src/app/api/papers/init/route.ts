import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { extractPaperMetadata } from '@/lib/groq'
import type { InitResponse } from '@/types/paper'

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

    const alreadyOwned = await adminFirestore
      .collection('users')
      .doc(session.uid)
      .collection('library')
      .where('paperId', '==', existingPaperId)
      .limit(1)
      .get()

    if (alreadyOwned.empty) {
      await adminFirestore
        .collection('users')
        .doc(session.uid)
        .collection('library')
        .doc()
        .set({
          paperId: existingPaperId,
          userId: session.uid,
          shares: [],
          createdAt: new Date(),
        })
    }

    return NextResponse.json<InitResponse>({
      status: 'duplicate',
      message: 'This paper already exists in Scolar — it has been added to your library anyway.',
    })
  }

  const draft = await extractPaperMetadata(pages)
  return NextResponse.json<InitResponse>({ status: 'ok', draft })
}
