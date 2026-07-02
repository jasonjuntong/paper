import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'
import { accountUpdateSchema } from '@/lib/account'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = accountUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid account details', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, notificationEmail } = parsed.data
  const userRef = adminFirestore.collection('users').doc(session.uid)
  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    // Keep the Auth displayName and the user doc in sync.
    await adminAuth.updateUser(session.uid, { displayName: name })
    updates.name = name
  }
  if (notificationEmail !== undefined) {
    updates['notificationPrefs.email'] = notificationEmail
  }

  await userRef.update(updates)

  return NextResponse.json({ ok: true })
}
