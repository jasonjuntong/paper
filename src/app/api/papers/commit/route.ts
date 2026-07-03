import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { getSession } from '@/lib/session'
import { adminFirestore, adminStorage } from '@/lib/firebase/admin'
import { buildPaperEmbeddingInput, generatePaperEmbedding } from '@/lib/gemini'
import {
  BORDERLINE_MAX_DISTANCE,
  checkVisibility,
  classifyDedupDistance,
  ensureLibraryEntry,
} from '@/lib/paper-dedup'
import type { CommitResponse, ExistingPaperInfo } from '@/types/paper'

const CommitSchema = z.object({
  title: z.string().min(1),
  authors: z.string().min(1),
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
  keywords: z.string().min(1),
  synopsis: z.string().min(1),
  emTitle: z.string().optional(),
  emAuthors: z.string().optional(),
  emYear: z.string().optional(),
  emKeywords: z.string().optional(),
  emSynopsis: z.string().optional(),
  existingPaperId: z.string().optional(),
  // Set when the user rejected a borderline (0.85–0.92) match ("No, different
  // paper"). Skips Layer-2 entirely so the prompt can't re-fire in a loop.
  confirmedNew: z.enum(['true', 'false']).optional(),
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
    emTitle: formData.get('emTitle') ?? undefined,
    emAuthors: formData.get('emAuthors') ?? undefined,
    emYear: formData.get('emYear') ?? undefined,
    emKeywords: formData.get('emKeywords') ?? undefined,
    emSynopsis: formData.get('emSynopsis') ?? undefined,
    existingPaperId: formData.get('existingPaperId') ?? undefined,
    confirmedNew: formData.get('confirmedNew') ?? undefined,
  }

  const parsed = CommitSchema.safeParse(fields)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid paper details', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { title, authors, year, keywords, synopsis, existingPaperId } = parsed.data
  const confirmedNew = parsed.data.confirmedNew === 'true'
  const yearNum = parseInt(year, 10)
  const hash = formData.get('hash') as string | null

  // Fast path — Layer 1 hit (hash matched on init) or "Proceed anyway" from in-org
  if (existingPaperId) {
    const entryId = await ensureLibraryEntry(session.uid, existingPaperId, {
      title,
      authors,
      year: yearNum,
      keywords,
      synopsis,
    })
    return NextResponse.json<CommitResponse>({ status: 'ok', entryId, paperId: existingPaperId })
  }

  // Require extracted metadata fields for new papers
  const { emTitle, emAuthors, emYear, emKeywords, emSynopsis } = parsed.data
  if (!emTitle || !emAuthors || !emYear || !emKeywords || !emSynopsis) {
    return NextResponse.json({ error: 'Extracted paper details required' }, { status: 400 })
  }

  // Generate embedding from extracted metadata (not user's confirmed version)
  const embeddingInput = buildPaperEmbeddingInput({
    title: emTitle,
    synopsis: emSynopsis,
    keywords: emKeywords,
  })
  const embeddingValues = await generatePaperEmbedding(embeddingInput)
  if (embeddingValues.length === 0) {
    return NextResponse.json({ error: 'Embedding generation failed' }, { status: 500 })
  }

  // Layer 2 dedup — embedding similarity. Query the full borderline band (cosine
  // distance ≤ 0.15 = similarity ≥ 0.85), then classify the top hit by its exact
  // distance. `confirmedNew` (user rejected a borderline match) bypasses this.
  const nearestSnap = confirmedNew
    ? null
    : await adminFirestore
        .collection('papers')
        .findNearest({
          vectorField: 'embedding',
          queryVector: FieldValue.vector(embeddingValues),
          limit: 1,
          distanceMeasure: 'COSINE',
          distanceThreshold: BORDERLINE_MAX_DISTANCE,
          distanceResultField: 'vector_distance',
        })
        .get()

  if (nearestSnap && !nearestSnap.empty) {
    const matchedPaperId = nearestSnap.docs[0].id
    const matchedData = nearestSnap.docs[0].data()
    const tier = classifyDedupDistance(matchedData.vector_distance as number)
    const em = (matchedData.extractedMetadata ?? {}) as Record<string, unknown>

    const paper: ExistingPaperInfo = {
      paperId: matchedPaperId,
      title: (em.title ?? matchedData.title ?? '') as string,
      authors: (em.authors ?? matchedData.authors ?? '') as string,
      year: String(em.year ?? matchedData.year ?? ''),
      keywords: (em.keywords ?? matchedData.keywords ?? '') as string,
      synopsis: (em.synopsis ?? matchedData.synopsis ?? '') as string,
    }

    const vis = await checkVisibility(session.uid, matchedPaperId)

    if (tier === 'auto') {
      if (vis.visibility === 'in-library') {
        return NextResponse.json<CommitResponse>({
          status: 'in-library',
          paper,
          entryId: vis.entryId,
        })
      }

      if (vis.visibility === 'in-org') {
        return NextResponse.json<CommitResponse>({
          status: 'in-org',
          paper,
          orgs: vis.orgs,
          existingPaperId: matchedPaperId,
        })
      }

      // Silent dedup — create library entry for the matched paper
      const entryId = await ensureLibraryEntry(session.uid, matchedPaperId, {
        title,
        authors,
        year: yearNum,
        keywords,
        synopsis,
      })
      return NextResponse.json<CommitResponse>({ status: 'ok', entryId, paperId: matchedPaperId })
    }

    // Borderline (0.85–0.92): ask the user only when they can already see the
    // candidate — otherwise surfacing its title would leak a private/other-org
    // paper, so fall through and treat this upload as new.
    if (tier === 'borderline' && vis.visibility !== 'none') {
      return NextResponse.json<CommitResponse>({
        status: 'borderline',
        paper,
        existingPaperId: matchedPaperId,
      })
    }
  }

  // Genuinely new paper — upload PDF, create global paper + library entry
  const pdfFile = formData.get('pdf') as File | null
  if (!pdfFile) return NextResponse.json({ error: 'PDF file required' }, { status: 400 })

  const paperId = adminFirestore.collection('papers').doc().id
  const safeFilename = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `papers/${paperId}/${safeFilename}`

  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
  await adminStorage.bucket().file(storagePath).save(pdfBuffer, {
    contentType: 'application/pdf',
  })

  const now = new Date()
  const batch = adminFirestore.batch()

  const paperRef = adminFirestore.collection('papers').doc(paperId)
  batch.set(paperRef, {
    hash: hash ?? '',
    extractedMetadata: {
      title: emTitle,
      authors: emAuthors,
      year: parseInt(emYear, 10),
      keywords: emKeywords,
      synopsis: emSynopsis,
    },
    embedding: FieldValue.vector(embeddingValues),
    storagePath,
    createdAt: now,
  })

  const entryRef = adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .doc()

  batch.set(entryRef, {
    paperId,
    userId: session.uid,
    title,
    authors,
    year: yearNum,
    keywords,
    synopsis,
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
