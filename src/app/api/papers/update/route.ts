import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'

const UpdateSchema = z.object({
  entryId: z.string().min(1),
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
      { error: 'Invalid paper details', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { entryId, title, authors, year, keywords, synopsis } = parsed.data
  const yearNum = parseInt(year, 10)

  const entryRef = adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .doc(entryId)

  const entrySnap = await entryRef.get()
  if (!entrySnap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { paperId, shares } = entrySnap.data() as { paperId: string; shares: string[] }

  const updatedFields = { title, authors, year: yearNum, keywords, synopsis }
  const batch = adminFirestore.batch()

  batch.update(entryRef, updatedFields)

  // Write fan-out — keep org snapshots in sync with library entry
  for (const orgId of shares ?? []) {
    const sharedRef = adminFirestore
      .collection('orgs')
      .doc(orgId)
      .collection('sharedPapers')
      .doc(paperId)
    batch.update(sharedRef, updatedFields)
  }

  await batch.commit()

  return NextResponse.json({ status: 'ok' })
}
