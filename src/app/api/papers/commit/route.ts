import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { getSession } from '@/lib/session'
import { adminFirestore, adminStorage } from '@/lib/firebase/admin'
import { generatePaperEmbedding } from '@/lib/gemini'
import { normalizeTitle, normalizeFirstAuthor } from '@/lib/normalize'
import type { CommitResponse } from '@/types/paper'

const CommitSchema = z.object({
  title: z.string().min(1),
  authors: z.string().min(1),
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
  keywords: z.string().min(1),
  synopsis: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const fields = {
    title: formData.get('title'),
    authors: formData.get('authors'),
    year: formData.get('year'),
    keywords: formData.get('keywords'),
    synopsis: formData.get('synopsis'),
  }

  const parsed = CommitSchema.safeParse(fields)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid metadata', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { title, authors, year, keywords, synopsis } = parsed.data
  const hash = formData.get('hash') as string | null

  const titleNorm = normalizeTitle(title)
  const firstAuthorNorm = normalizeFirstAuthor(authors)
  const yearNum = parseInt(year, 10)

  // Layer 2 dedup — check by normalized metadata
  const metaSnap = await adminFirestore
    .collection('papers')
    .where('titleNorm', '==', titleNorm)
    .where('firstAuthorNorm', '==', firstAuthorNorm)
    .where('year', '==', yearNum)
    .limit(1)
    .get()

  if (!metaSnap.empty) {
    const existingPaperId = metaSnap.docs[0].id

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

    return NextResponse.json<CommitResponse>({
      status: 'duplicate',
      message: 'This paper already exists in Scolar — it has been added to your library anyway.',
    })
  }

  // Get uploaded PDF
  const pdfFile = formData.get('pdf') as File | null
  if (!pdfFile) return NextResponse.json({ error: 'PDF file required' }, { status: 400 })

  // Generate embedding before touching Storage — avoids orphaned files on failure
  const embeddingInput = `${title} ${synopsis} ${keywords}`
  const embeddingValues = await generatePaperEmbedding(embeddingInput)
  if (embeddingValues.length === 0) {
    return NextResponse.json({ error: 'Embedding generation failed' }, { status: 500 })
  }

  const paperId = adminFirestore.collection('papers').doc().id
  const safeFilename = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `papers/${paperId}/${safeFilename}`

  // Upload PDF to Cloud Storage
  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
  await adminStorage.bucket().file(storagePath).save(pdfBuffer, {
    contentType: 'application/pdf',
  })

  const now = new Date()
  const batch = adminFirestore.batch()

  // Create global paper document
  const paperRef = adminFirestore.collection('papers').doc(paperId)
  batch.set(paperRef, {
    hash: hash ?? '',
    title,
    authors,
    year: yearNum,
    keywords,
    synopsis,
    titleNorm,
    firstAuthorNorm,
    storagePath,
    embedding: FieldValue.vector(embeddingValues),
    createdAt: now,
  })

  // Create user library entry
  const entryRef = adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .doc()

  batch.set(entryRef, {
    paperId,
    userId: session.uid,
    shares: [],
    createdAt: now,
  })

  await batch.commit()

  return NextResponse.json<CommitResponse>({
    status: 'ok',
    entryId: entryRef.id,
    paperId,
  })
}
