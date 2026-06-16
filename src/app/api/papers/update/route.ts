import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { normalizeTitle, normalizeFirstAuthor } from '@/lib/normalize'

const UpdateSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors are required'),
  year: z.string().regex(/^\d{4}$/, 'Enter a valid 4-digit year'),
  keywords: z.string().min(1, 'Keywords are required'),
  synopsis: z.string().min(1, 'Synopsis is required'),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid metadata', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { paperId, title, authors, year, keywords, synopsis } = parsed.data

  // Verify the user has this paper in their library
  const entrySnap = await adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .where('paperId', '==', paperId)
    .limit(1)
    .get()

  if (entrySnap.empty) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await adminFirestore.collection('papers').doc(paperId).update({
    title,
    authors,
    year: parseInt(year, 10),
    keywords,
    synopsis,
    titleNorm: normalizeTitle(title),
    firstAuthorNorm: normalizeFirstAuthor(authors),
  })

  return NextResponse.json({ status: 'ok' })
}
