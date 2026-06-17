import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore, adminStorage } from '@/lib/firebase/admin'

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

  const { paperId, shares } = entrySnap.data() as {
    paperId: string
    shares?: string[]
  }

  // Atomic: delete the library entry + unshare from every org it was shared to
  const batch = adminFirestore.batch()
  batch.delete(entryRef)
  for (const orgId of shares ?? []) {
    const sharedRef = adminFirestore
      .collection('orgs')
      .doc(orgId)
      .collection('sharedPapers')
      .doc(paperId)
    batch.delete(sharedRef)
  }
  await batch.commit()

  // Orphan check — is the global paper still referenced by any library entry?
  const stillReferenced = await adminFirestore
    .collectionGroup('library')
    .where('paperId', '==', paperId)
    .limit(1)
    .get()

  if (stillReferenced.empty) {
    // Last reference gone — garbage-collect the global paper + its PDF
    const paperRef = adminFirestore.collection('papers').doc(paperId)
    const paperSnap = await paperRef.get()
    const storagePath = paperSnap.data()?.storagePath as string | undefined

    if (storagePath) {
      await adminStorage
        .bucket()
        .file(storagePath)
        .delete()
        .catch(() => undefined)
    }
    await paperRef.delete()
  }

  return NextResponse.json({ status: 'ok' })
}
