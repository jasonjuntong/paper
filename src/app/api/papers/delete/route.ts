import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'

const DeleteSchema = z.object({
  entryId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = DeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { entryId } = parsed.data

  const entryRef = adminFirestore
    .collection('users')
    .doc(session.uid)
    .collection('library')
    .doc(entryId)

  const entrySnap = await entryRef.get()
  if (!entrySnap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await entryRef.delete()

  return NextResponse.json({ status: 'ok' })
}
