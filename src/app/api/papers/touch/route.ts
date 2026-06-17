import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'

const TouchSchema = z.object({
  entryId: z.string().min(1),
})

// Records that the user opened a paper — powers the "Continue reading" section.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = TouchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const entryRef = adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .doc(parsed.data.entryId)

  const entrySnap = await entryRef.get()
  if (!entrySnap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await entryRef.update({ lastOpenedAt: new Date() })

  return NextResponse.json({ status: 'ok' })
}
